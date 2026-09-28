-- Migration: Atomic Attendance Save Function
-- File: supabase/migrations/20260925234500_atomic_save_attendance.sql
-- Description:
--   Implements public.save_attendance_atomic RPC to replace the non-atomic
--   client-side DELETE + INSERT attendance save flow.
--   Enforces role-based authorization, validates auth.uid(), prevents impersonation,
--   and ensures full transactional atomicity for attendance replacement.

--------------------------------------------------------------------------------
-- 1. ATOMIC ATTENDANCE SAVE FUNCTION (SECURITY DEFINER)
--------------------------------------------------------------------------------

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

  -- 3. Enforce role-based authorization and teacher attribution
  IF public.is_admin() THEN
    -- Admin can mark for any class; attribution can be supplied teacher or admin caller
    IF p_teacher_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.profiles WHERE id = p_teacher_id) THEN
      v_marked_by := p_teacher_id;
    ELSE
      v_marked_by := v_caller_id;
    END IF;
  ELSIF public.is_assigned_teacher(p_class_id) THEN
    -- Teacher can only mark classes assigned to them; always attributed to the authenticated caller
    v_marked_by := v_caller_id;
  ELSE
    RAISE EXCEPTION 'Forbidden: User is not authorized to save attendance for class %', p_class_id
      USING ERRCODE = '42501';
  END IF;

  -- 4. Find or create attendance session (concurrency-safe via unique constraint on class_id, date)
  INSERT INTO public.attendance_sessions (class_id, date, marked_by, marked_at)
  VALUES (p_class_id, p_date, v_marked_by, now())
  ON CONFLICT (class_id, date)
  DO UPDATE SET id = attendance_sessions.id
  RETURNING id INTO v_session_id;

  -- 5. Delete existing records for this session inside the transaction
  DELETE FROM public.attendance_records
  WHERE session_id = v_session_id;

  -- 6. Insert replacement records atomically
  IF p_records IS NOT NULL AND jsonb_typeof(p_records) = 'array' AND jsonb_array_length(p_records) > 0 THEN
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
  END IF;

  -- 7. Return execution summary
  RETURN jsonb_build_object(
    'session_id', v_session_id,
    'class_id', p_class_id,
    'date', p_date,
    'records_saved', v_record_count
  );
END;
$$;

--------------------------------------------------------------------------------
-- 2. PERMISSIONS & GRANTS
--------------------------------------------------------------------------------

REVOKE ALL ON FUNCTION public.save_attendance_atomic(uuid, date, jsonb, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_attendance_atomic(uuid, date, jsonb, uuid) TO authenticated;
