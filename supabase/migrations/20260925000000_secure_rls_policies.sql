-- Migration: Secure Row Level Security (RLS) Policies
-- File: supabase/migrations/20260925000000_secure_rls_policies.sql
-- Description:
--   1. Implements safe SECURITY DEFINER helper functions (is_admin, is_assigned_teacher).
--   2. Drops all insecure, overly-permissive, and redundant RLS policies.
--   3. Implements strict role-based and class-assignment-based RLS policies across all tables.
--   4. Eliminates anonymous access to core school tables.
--   5. Restricts admin management tables to admins only while preserving teacher attendance workflows.
--   6. Enforces storage avatar security (admins manage, public views).

--------------------------------------------------------------------------------
-- 1. HELPER FUNCTIONS (SECURITY DEFINER)
--------------------------------------------------------------------------------

-- Checks if the calling user has role 'admin' in public.profiles.
-- SECURITY DEFINER with search_path = public prevents recursive RLS evaluations on profiles.
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

-- Checks if the calling teacher is assigned to a specific class.
-- SECURITY DEFINER with search_path = public avoids recursive RLS lookups on teacher_class_assignments.
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

-- Secure function permissions
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_assigned_teacher(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_assigned_teacher(uuid) TO authenticated;

--------------------------------------------------------------------------------
-- 2. DROP INSECURE / REDUNDANT / OVERLAPPING POLICIES
--------------------------------------------------------------------------------

-- attendance_records
DROP POLICY IF EXISTS "Allow all for attendance_records" ON public.attendance_records;
DROP POLICY IF EXISTS "Authenticated users can manage attendance records" ON public.attendance_records;
DROP POLICY IF EXISTS "Authenticated users can view attendance records" ON public.attendance_records;

-- attendance_sessions
DROP POLICY IF EXISTS "Allow all for attendance_sessions" ON public.attendance_sessions;
DROP POLICY IF EXISTS "Authenticated users can manage attendance sessions" ON public.attendance_sessions;
DROP POLICY IF EXISTS "Authenticated users can view attendance sessions" ON public.attendance_sessions;

-- classes
DROP POLICY IF EXISTS "Allow read access to classes for all users" ON public.classes;
DROP POLICY IF EXISTS "Authenticated users can manage classes" ON public.classes;
DROP POLICY IF EXISTS "Authenticated users can view active classes" ON public.classes;

-- profiles
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- students
DROP POLICY IF EXISTS "Allow read access to students for all users" ON public.students;
DROP POLICY IF EXISTS "Authenticated users can manage students" ON public.students;
DROP POLICY IF EXISTS "Authenticated users can view students" ON public.students;

-- teacher_class_assignments
DROP POLICY IF EXISTS "Authenticated users can manage assignments" ON public.teacher_class_assignments;
DROP POLICY IF EXISTS "Authenticated users can view assignments" ON public.teacher_class_assignments;

-- storage.objects (avatars)
DROP POLICY IF EXISTS "Enable authenticated delete" ON storage.objects;
DROP POLICY IF EXISTS "Enable authenticated upload" ON storage.objects;
DROP POLICY IF EXISTS "Public avatars access" ON storage.objects;

--------------------------------------------------------------------------------
-- 3. PROFILES POLICIES
--------------------------------------------------------------------------------

-- SELECT: Admins can view all profiles; Teachers can only view their own profile.
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_admin());

-- INSERT: Admins can insert/provision profiles (e.g. dataService.createTeacher).
-- Regular signup profile creation is handled via the handle_new_user SECURITY DEFINER trigger.
CREATE POLICY "profiles_insert_admin" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

-- UPDATE: Admins can update any profile; Teachers can update own profile WITHOUT changing role.
CREATE POLICY "profiles_update" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.is_admin())
  WITH CHECK (
    public.is_admin() OR 
    (id = auth.uid() AND role = 'teacher'::public.user_role)
  );

-- DELETE: Only admins can delete profiles.
CREATE POLICY "profiles_delete_admin" ON public.profiles
  FOR DELETE TO authenticated
  USING (public.is_admin());

--------------------------------------------------------------------------------
-- 4. CLASSES POLICIES
--------------------------------------------------------------------------------

-- SELECT: Admins view all classes; Teachers view only assigned classes.
CREATE POLICY "classes_select" ON public.classes
  FOR SELECT TO authenticated
  USING (public.is_admin() OR public.is_assigned_teacher(id));

-- WRITE: Admins only can insert, update, or soft-delete classes.
CREATE POLICY "classes_insert_admin" ON public.classes
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "classes_update_admin" ON public.classes
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "classes_delete_admin" ON public.classes
  FOR DELETE TO authenticated
  USING (public.is_admin());

--------------------------------------------------------------------------------
-- 5. TEACHER CLASS ASSIGNMENTS POLICIES
--------------------------------------------------------------------------------

-- SELECT: Admins view all assignments; Teachers view their own assigned class links.
CREATE POLICY "tca_select" ON public.teacher_class_assignments
  FOR SELECT TO authenticated
  USING (public.is_admin() OR teacher_id = auth.uid());

-- WRITE: Admins only can assign or unassign teachers.
CREATE POLICY "tca_insert_admin" ON public.teacher_class_assignments
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "tca_delete_admin" ON public.teacher_class_assignments
  FOR DELETE TO authenticated
  USING (public.is_admin());

--------------------------------------------------------------------------------
-- 6. STUDENTS POLICIES
--------------------------------------------------------------------------------

-- SELECT: Admins view all students; Teachers view students in their assigned classes.
CREATE POLICY "students_select" ON public.students
  FOR SELECT TO authenticated
  USING (public.is_admin() OR public.is_assigned_teacher(class_id));

-- WRITE: Admins only can create, edit, or delete students.
CREATE POLICY "students_insert_admin" ON public.students
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "students_update_admin" ON public.students
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "students_delete_admin" ON public.students
  FOR DELETE TO authenticated
  USING (public.is_admin());

--------------------------------------------------------------------------------
-- 7. ATTENDANCE SESSIONS POLICIES
--------------------------------------------------------------------------------

-- SELECT: Admins view all sessions; Teachers view sessions for assigned classes.
CREATE POLICY "sessions_select" ON public.attendance_sessions
  FOR SELECT TO authenticated
  USING (public.is_admin() OR public.is_assigned_teacher(class_id));

-- INSERT: Admins or assigned teachers marking roll call for their class.
CREATE POLICY "sessions_insert" ON public.attendance_sessions
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin() OR 
    (public.is_assigned_teacher(class_id) AND (marked_by IS NULL OR marked_by = auth.uid()))
  );

-- UPDATE: Admins or assigned teachers.
CREATE POLICY "sessions_update" ON public.attendance_sessions
  FOR UPDATE TO authenticated
  USING (public.is_admin() OR public.is_assigned_teacher(class_id))
  WITH CHECK (public.is_admin() OR public.is_assigned_teacher(class_id));

-- DELETE: Admins only.
CREATE POLICY "sessions_delete_admin" ON public.attendance_sessions
  FOR DELETE TO authenticated
  USING (public.is_admin());

--------------------------------------------------------------------------------
-- 8. ATTENDANCE RECORDS POLICIES
--------------------------------------------------------------------------------

-- SELECT: Admins view all records; Teachers view records for assigned classes.
CREATE POLICY "records_select" ON public.attendance_records
  FOR SELECT TO authenticated
  USING (public.is_admin() OR public.is_assigned_teacher(class_id));

-- INSERT: Admins or assigned teachers inserting student roll-call records.
CREATE POLICY "records_insert" ON public.attendance_records
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() OR public.is_assigned_teacher(class_id));

-- UPDATE: Admins or assigned teachers updating records.
CREATE POLICY "records_update" ON public.attendance_records
  FOR UPDATE TO authenticated
  USING (public.is_admin() OR public.is_assigned_teacher(class_id))
  WITH CHECK (public.is_admin() OR public.is_assigned_teacher(class_id));

-- DELETE: Admins or assigned teachers.
-- Required because dataService.saveAttendance purges existing session records before re-inserting.
CREATE POLICY "records_delete" ON public.attendance_records
  FOR DELETE TO authenticated
  USING (public.is_admin() OR public.is_assigned_teacher(class_id));

--------------------------------------------------------------------------------
-- 9. STORAGE POLICIES (AVATARS BUCKET)
--------------------------------------------------------------------------------

-- SELECT: Public access to avatar images preserved for student roster images and UI rendering.
CREATE POLICY "Public avatars access" ON storage.objects
  FOR SELECT TO PUBLIC
  USING (bucket_id = 'avatars');

-- INSERT: Only Admins can upload student photos in StudentManagement.
CREATE POLICY "avatars_admin_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND public.is_admin());

-- UPDATE: Only Admins can update avatar photos.
CREATE POLICY "avatars_admin_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND public.is_admin())
  WITH CHECK (bucket_id = 'avatars' AND public.is_admin());

-- DELETE: Only Admins can delete avatar photos.
CREATE POLICY "avatars_admin_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND public.is_admin());

--------------------------------------------------------------------------------
-- 10. REVOKE ANONYMOUS TABLE PRIVILEGES
--------------------------------------------------------------------------------

REVOKE ALL ON TABLE public.attendance_records FROM anon;
REVOKE ALL ON TABLE public.attendance_sessions FROM anon;
REVOKE ALL ON TABLE public.classes FROM anon;
REVOKE ALL ON TABLE public.profiles FROM anon;
REVOKE ALL ON TABLE public.students FROM anon;
REVOKE ALL ON TABLE public.teacher_class_assignments FROM anon;
