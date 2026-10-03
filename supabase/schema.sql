-- =============================================================================
-- ROLL CALL ATTENDANCE — DATABASE SCHEMA & RLS POLICIES
-- =============================================================================
-- Consolidated PostgreSQL / Supabase Schema Definition
-- Includes:
--   1. Extensions & Custom Types
--   2. Tables, Primary Keys, Foreign Keys, & Constraints
--   3. Performance Indexes
--   4. Triggers & Security Definer Helper Functions
--   5. Row Level Security (RLS) Configuration & Policies
--   6. Storage (Avatars) Policies
--   7. Role Grants & Table Comments
-- =============================================================================

SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = off;

--------------------------------------------------------------------------------
-- 1. EXTENSIONS & CUSTOM ENUM TYPES
--------------------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";

DO $$ BEGIN
  CREATE TYPE public.user_role AS ENUM ('admin', 'teacher');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.attendance_status AS ENUM ('present', 'absent', 'late', 'leave');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

--------------------------------------------------------------------------------
-- 2. CORE APPLICATION TABLES
--------------------------------------------------------------------------------

-- 2.1 Table: profiles
-- Extends auth.users 1:1 with app-level role and contact information.
CREATE TABLE IF NOT EXISTS public.profiles (
  id          uuid                     NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role        public.user_role         NOT NULL DEFAULT 'teacher'::public.user_role,
  full_name   text                     NOT NULL,
  email       text                     NOT NULL,
  phone       text,
  subject     text,
  created_at  timestamp with time zone NOT NULL DEFAULT now()
);

-- 2.2 Table: classes
-- Represents academic classes/sections with soft-delete support.
CREATE TABLE IF NOT EXISTS public.classes (
  id            uuid                     NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name          text                     NOT NULL,
  grade         text                     NOT NULL,
  section       text                     NOT NULL,
  room          text,
  academic_year text                     NOT NULL DEFAULT '2026-2027',
  is_active     boolean                  NOT NULL DEFAULT true,
  created_at    timestamp with time zone NOT NULL DEFAULT now()
);

-- 2.3 Table: teacher_class_assignments
-- Many-to-many junction between faculty (profiles) and classes.
CREATE TABLE IF NOT EXISTS public.teacher_class_assignments (
  teacher_id  uuid                     NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  class_id    uuid                     NOT NULL REFERENCES public.classes(id)  ON DELETE CASCADE,
  assigned_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT teacher_class_assignments_pkey PRIMARY KEY (teacher_id, class_id)
);

-- 2.4 Table: students
-- Enrolled student roster. Preserves history via soft-delete flag (is_active).
CREATE TABLE IF NOT EXISTS public.students (
  id             uuid                     NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  roll_no        text                     NOT NULL,
  full_name      text                     NOT NULL,
  gender         text,
  class_id       uuid                     NOT NULL REFERENCES public.classes(id) ON DELETE RESTRICT,
  is_active      boolean                  NOT NULL DEFAULT true,
  guardian_name  text,
  guardian_phone text,
  avatar_url     text,
  created_at     timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT students_gender_check CHECK ((gender = ANY (ARRAY['Male'::text, 'Female'::text, 'Other'::text]))),
  CONSTRAINT uq_students_class_roll UNIQUE (class_id, roll_no),
  CONSTRAINT uq_students_id_class UNIQUE (id, class_id)
);

-- 2.5 Table: attendance_sessions
-- Daily roll-call session per class, recording submitter and timestamp.
CREATE TABLE IF NOT EXISTS public.attendance_sessions (
  id        uuid                     NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id  uuid                     NOT NULL REFERENCES public.classes(id) ON DELETE RESTRICT,
  date      date                     NOT NULL,
  marked_by uuid                     REFERENCES public.profiles(id) ON DELETE SET NULL,
  marked_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT uq_sessions_class_date UNIQUE (class_id, date),
  CONSTRAINT uq_sessions_id_class UNIQUE (id, class_id)
);

-- 2.6 Table: attendance_records
-- Individual student attendance statuses per session.
-- Composite foreign keys guarantee session-class and student-class integrity.
CREATE TABLE IF NOT EXISTS public.attendance_records (
  id         uuid                    NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id uuid                    NOT NULL,
  student_id uuid                    NOT NULL,
  class_id   uuid                    NOT NULL,
  status     public.attendance_status NOT NULL DEFAULT 'absent'::public.attendance_status,
  remark     text,
  CONSTRAINT uq_records_session_student UNIQUE (session_id, student_id),
  CONSTRAINT fk_records_session_class FOREIGN KEY (session_id, class_id)
    REFERENCES public.attendance_sessions(id, class_id) ON DELETE CASCADE,
  CONSTRAINT fk_records_student_class FOREIGN KEY (student_id, class_id)
    REFERENCES public.students(id, class_id) ON DELETE CASCADE
);

--------------------------------------------------------------------------------
-- 3. PERFORMANCE INDEXES
--------------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles USING btree (role);

CREATE INDEX IF NOT EXISTS idx_classes_active ON public.classes USING btree (is_active);

CREATE INDEX IF NOT EXISTS idx_tca_teacher ON public.teacher_class_assignments USING btree (teacher_id);
CREATE INDEX IF NOT EXISTS idx_tca_class ON public.teacher_class_assignments USING btree (class_id);

CREATE INDEX IF NOT EXISTS idx_students_class_id ON public.students USING btree (class_id);
CREATE INDEX IF NOT EXISTS idx_students_class_active ON public.students USING btree (class_id, is_active);

CREATE INDEX IF NOT EXISTS idx_sessions_class_date ON public.attendance_sessions USING btree (class_id, date);
CREATE INDEX IF NOT EXISTS idx_sessions_date ON public.attendance_sessions USING btree (date);
CREATE INDEX IF NOT EXISTS idx_sessions_marked_by ON public.attendance_sessions USING btree (marked_by);

CREATE INDEX IF NOT EXISTS idx_records_session_id ON public.attendance_records USING btree (session_id);
CREATE INDEX IF NOT EXISTS idx_records_student_id ON public.attendance_records USING btree (student_id);
CREATE INDEX IF NOT EXISTS idx_records_class_id ON public.attendance_records USING btree (class_id);

--------------------------------------------------------------------------------
-- 4. FUNCTIONS & TRIGGERS
--------------------------------------------------------------------------------

-- 4.1 Trigger Function: handle_new_user
-- Automatically provisions public.profiles record upon Supabase Auth sign-up.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    role,
    phone,
    subject
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      split_part(NEW.email, '@', 1)
    ),
    'teacher'::public.user_role,
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'subject'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    role = COALESCE(EXCLUDED.role, public.profiles.role);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 4.2 Helper Function: is_admin
-- Checks if calling authenticated user has admin role without recursive RLS lookup.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'::public.user_role
  );
$$;

-- 4.3 Helper Function: is_assigned_teacher
-- Checks if calling teacher is assigned to the specified class.
CREATE OR REPLACE FUNCTION public.is_assigned_teacher(lookup_class_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.teacher_class_assignments
    WHERE teacher_id = auth.uid() AND class_id = lookup_class_id
  );
$$;

-- 4.4 RPC Function: save_attendance_atomic
-- Wraps session creation/updating and student record replacement into a single atomic transaction.
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
    IF p_teacher_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.profiles WHERE id = p_teacher_id) THEN
      v_marked_by := p_teacher_id;
    ELSE
      v_marked_by := v_caller_id;
    END IF;
  ELSIF public.is_assigned_teacher(p_class_id) THEN
    v_marked_by := v_caller_id;
  ELSE
    RAISE EXCEPTION 'Forbidden: User is not authorized to save attendance for class %', p_class_id
      USING ERRCODE = '42501';
  END IF;

  -- 4. Upsert attendance session
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

  -- 7. Return summary
  RETURN jsonb_build_object(
    'session_id', v_session_id,
    'class_id', p_class_id,
    'date', p_date,
    'records_saved', v_record_count
  );
END;
$$;

--------------------------------------------------------------------------------
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
--------------------------------------------------------------------------------

-- Enable RLS on all public tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_class_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

-- 5.1 Policies: profiles
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "profiles_insert_admin" ON public.profiles;
CREATE POLICY "profiles_insert_admin" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
CREATE POLICY "profiles_update" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.is_admin())
  WITH CHECK (
    public.is_admin() OR 
    (id = auth.uid() AND role = 'teacher'::public.user_role)
  );

DROP POLICY IF EXISTS "profiles_delete_admin" ON public.profiles;
CREATE POLICY "profiles_delete_admin" ON public.profiles
  FOR DELETE TO authenticated
  USING (public.is_admin());

-- 5.2 Policies: classes
DROP POLICY IF EXISTS "classes_select" ON public.classes;
CREATE POLICY "classes_select" ON public.classes
  FOR SELECT TO authenticated
  USING (public.is_admin() OR public.is_assigned_teacher(id));

DROP POLICY IF EXISTS "classes_insert_admin" ON public.classes;
CREATE POLICY "classes_insert_admin" ON public.classes
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "classes_update_admin" ON public.classes;
CREATE POLICY "classes_update_admin" ON public.classes
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "classes_delete_admin" ON public.classes;
CREATE POLICY "classes_delete_admin" ON public.classes
  FOR DELETE TO authenticated
  USING (public.is_admin());

-- 5.3 Policies: teacher_class_assignments
DROP POLICY IF EXISTS "tca_select" ON public.teacher_class_assignments;
CREATE POLICY "tca_select" ON public.teacher_class_assignments
  FOR SELECT TO authenticated
  USING (public.is_admin() OR teacher_id = auth.uid());

DROP POLICY IF EXISTS "tca_insert_admin" ON public.teacher_class_assignments;
CREATE POLICY "tca_insert_admin" ON public.teacher_class_assignments
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "tca_delete_admin" ON public.teacher_class_assignments;
CREATE POLICY "tca_delete_admin" ON public.teacher_class_assignments
  FOR DELETE TO authenticated
  USING (public.is_admin());

-- 5.4 Policies: students
DROP POLICY IF EXISTS "students_select" ON public.students;
CREATE POLICY "students_select" ON public.students
  FOR SELECT TO authenticated
  USING (public.is_admin() OR public.is_assigned_teacher(class_id));

DROP POLICY IF EXISTS "students_insert_admin" ON public.students;
CREATE POLICY "students_insert_admin" ON public.students
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "students_update_admin" ON public.students;
CREATE POLICY "students_update_admin" ON public.students
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "students_delete_admin" ON public.students;
CREATE POLICY "students_delete_admin" ON public.students
  FOR DELETE TO authenticated
  USING (public.is_admin());

-- 5.5 Policies: attendance_sessions
DROP POLICY IF EXISTS "sessions_select" ON public.attendance_sessions;
CREATE POLICY "sessions_select" ON public.attendance_sessions
  FOR SELECT TO authenticated
  USING (public.is_admin() OR public.is_assigned_teacher(class_id));

DROP POLICY IF EXISTS "sessions_insert" ON public.attendance_sessions;
CREATE POLICY "sessions_insert" ON public.attendance_sessions
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin() OR 
    (public.is_assigned_teacher(class_id) AND (marked_by IS NULL OR marked_by = auth.uid()))
  );

DROP POLICY IF EXISTS "sessions_update" ON public.attendance_sessions;
CREATE POLICY "sessions_update" ON public.attendance_sessions
  FOR UPDATE TO authenticated
  USING (public.is_admin() OR public.is_assigned_teacher(class_id))
  WITH CHECK (public.is_admin() OR public.is_assigned_teacher(class_id));

DROP POLICY IF EXISTS "sessions_delete_admin" ON public.attendance_sessions;
CREATE POLICY "sessions_delete_admin" ON public.attendance_sessions
  FOR DELETE TO authenticated
  USING (public.is_admin());

-- 5.6 Policies: attendance_records
DROP POLICY IF EXISTS "records_select" ON public.attendance_records;
CREATE POLICY "records_select" ON public.attendance_records
  FOR SELECT TO authenticated
  USING (public.is_admin() OR public.is_assigned_teacher(class_id));

DROP POLICY IF EXISTS "records_insert" ON public.attendance_records;
CREATE POLICY "records_insert" ON public.attendance_records
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() OR public.is_assigned_teacher(class_id));

DROP POLICY IF EXISTS "records_update" ON public.attendance_records;
CREATE POLICY "records_update" ON public.attendance_records
  FOR UPDATE TO authenticated
  USING (public.is_admin() OR public.is_assigned_teacher(class_id))
  WITH CHECK (public.is_admin() OR public.is_assigned_teacher(class_id));

DROP POLICY IF EXISTS "records_delete" ON public.attendance_records;
CREATE POLICY "records_delete" ON public.attendance_records
  FOR DELETE TO authenticated
  USING (public.is_admin() OR public.is_assigned_teacher(class_id));

--------------------------------------------------------------------------------
-- 6. STORAGE (AVATARS) POLICIES
--------------------------------------------------------------------------------

DROP POLICY IF EXISTS "Public avatars access" ON storage.objects;
CREATE POLICY "Public avatars access" ON storage.objects
  FOR SELECT TO PUBLIC
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "avatars_admin_insert" ON storage.objects;
CREATE POLICY "avatars_admin_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND public.is_admin());

DROP POLICY IF EXISTS "avatars_admin_update" ON storage.objects;
CREATE POLICY "avatars_admin_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND public.is_admin())
  WITH CHECK (bucket_id = 'avatars' AND public.is_admin());

DROP POLICY IF EXISTS "avatars_admin_delete" ON storage.objects;
CREATE POLICY "avatars_admin_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND public.is_admin());

--------------------------------------------------------------------------------
-- 7. PRIVILEGES & ACCESS GRANTS
--------------------------------------------------------------------------------

-- Revoke anonymous access on all core tables
REVOKE ALL ON TABLE public.attendance_records FROM anon;
REVOKE ALL ON TABLE public.attendance_sessions FROM anon;
REVOKE ALL ON TABLE public.classes FROM anon;
REVOKE ALL ON TABLE public.profiles FROM anon;
REVOKE ALL ON TABLE public.students FROM anon;
REVOKE ALL ON TABLE public.teacher_class_assignments FROM anon;

-- Function execution permissions
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_assigned_teacher(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_assigned_teacher(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.save_attendance_atomic(uuid, date, jsonb, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_attendance_atomic(uuid, date, jsonb, uuid) TO authenticated;

--------------------------------------------------------------------------------
-- 8. TABLE & COLUMN DOCUMENTATION
--------------------------------------------------------------------------------

COMMENT ON TABLE  public.profiles          IS 'App-level user profiles linked 1:1 to auth.users.';
COMMENT ON COLUMN public.profiles.role     IS 'Role discriminator: admin or teacher.';
COMMENT ON COLUMN public.profiles.subject  IS 'Department/Subject taught; NULL for admin users.';

COMMENT ON TABLE  public.classes           IS 'Classroom sections. Soft-deletes supported via is_active.';
COMMENT ON COLUMN public.classes.is_active IS 'False indicates an archived/inactive class retaining past records.';

COMMENT ON TABLE  public.teacher_class_assignments IS 'Many-to-many junction between teachers (profiles) and classes.';

COMMENT ON TABLE  public.students          IS 'Student roster enrolled in classes. Hard deletes on class restricted.';
COMMENT ON COLUMN public.students.is_active IS 'False indicates an inactive or transferred student.';

COMMENT ON TABLE  public.attendance_sessions IS 'Daily roll-call session per class. Deletion of classes with sessions restricted.';
COMMENT ON COLUMN public.attendance_sessions.marked_by IS 'Teacher (profile ID) who submitted the attendance session.';

COMMENT ON TABLE  public.attendance_records  IS 'Per-student attendance records. Enforces class consistency via composite FKs.';
COMMENT ON COLUMN public.attendance_records.class_id IS 'Denormalized class reference ensuring student and session classes match.';
COMMENT ON COLUMN public.attendance_records.status IS 'present | absent | late | leave';
