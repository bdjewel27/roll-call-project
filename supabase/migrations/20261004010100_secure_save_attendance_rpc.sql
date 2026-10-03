-- Migration: Secure save_attendance_atomic RPC
-- Description:
--   1. Validates that p_records is not empty or null BEFORE any deletion of existing session records.
--   2. Binds marked_by strictly to auth.uid(), preventing client-spoofed teacher attribution.
--   3. Updates marked_by and marked_at on session upsert conflicts.

CREATE OR REPLACE FUNCTION public.save_attendance_atomic(
  p_class_id uuid,
  p_date date,
  p_records jsonb,
  p_teacher_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id uuid;
  v_marked_by uuid;
  v_session_id uuid;
  v_record_count integer := 0;
BEGIN
  -- 1. Verify caller authentication
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Caller must be authenticated'
      USING ERRCODE = '42501';
  END IF;

  -- 2. Verify class exists
  IF NOT EXISTS (SELECT 1 FROM public.classes WHERE id = p_class_id) THEN
    RAISE EXCEPTION 'Class not found: %', p_class_id
      USING ERRCODE = 'P0002';
  END IF;

  -- 3. Validate attendance records payload: cannot be empty or null
  IF p_records IS NULL OR jsonb_typeof(p_records) <> 'array' OR jsonb_array_length(p_records) = 0 THEN
    RAISE EXCEPTION 'Validation error: Attendance records cannot be empty or null'
      USING ERRCODE = '22023';
  END IF;

  -- 4. Enforce role-based authorization: admin or assigned teacher
  IF NOT (public.is_admin() OR public.is_assigned_teacher(p_class_id)) THEN
    RAISE EXCEPTION 'Forbidden: User is not authorized to save attendance for class %', p_class_id
      USING ERRCODE = '42501';
  END IF;

  -- Audit security: marked_by is strictly determined by auth.uid(), never spoofable by client input
  v_marked_by := v_caller_id;

  -- 5. Find or create attendance session (concurrency-safe via unique constraint on class_id, date)
  INSERT INTO public.attendance_sessions (class_id, date, marked_by, marked_at)
  VALUES (p_class_id, p_date, v_marked_by, now())
  ON CONFLICT (class_id, date)
  DO UPDATE SET
    marked_by = EXCLUDED.marked_by,
    marked_at = EXCLUDED.marked_at
  RETURNING id INTO v_session_id;

  -- 6. Delete existing records for this session inside the transaction
  DELETE FROM public.attendance_records
  WHERE session_id = v_session_id;

  -- 7. Insert replacement records atomically
  INSERT INTO public.attendance_records (
    session_id,
    student_id,
    class_id,
    status,
    remark
  )
  SELECT
    v_session_id,
    (COALESCE(elem->>'student_id', elem->>'studentId'))::uuid,
    p_class_id,
    LOWER(elem->>'status')::public.attendance_status,
    NULLIF(TRIM(elem->>'remark'), '')
  FROM jsonb_array_elements(p_records) AS elem;

  GET DIAGNOSTICS v_record_count = ROW_COUNT;

  -- 8. Return execution summary
  RETURN jsonb_build_object(
    'session_id', v_session_id,
    'class_id', p_class_id,
    'date', p_date,
    'records_saved', v_record_count
  );
END;
$$;

REVOKE ALL ON FUNCTION public.save_attendance_atomic(uuid, date, jsonb, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_attendance_atomic(uuid, date, jsonb, uuid) TO authenticated;
