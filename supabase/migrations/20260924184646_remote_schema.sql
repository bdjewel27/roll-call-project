SET local check_function_bodies = off;

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT EXECUTE ON FUNCTIONS TO PUBLIC;

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" REVOKE ALL ON FUNCTIONS FROM "anon";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" REVOKE ALL ON FUNCTIONS FROM "authenticated";

REVOKE ALL ON SCHEMA "public" FROM "pg_database_owner";

COMMENT ON SCHEMA "public" IS NULL;

CREATE TABLE "public"."attendance_records" (
  "id"         uuid NOT NULL DEFAULT gen_random_uuid(),
  "session_id" uuid NOT NULL,
  "student_id" uuid NOT NULL,
  "class_id"   uuid NOT NULL,
  "remark"     text,
  CONSTRAINT "attendance_records_pkey" PRIMARY KEY (id),
  CONSTRAINT "uq_records_session_student" UNIQUE (session_id, student_id)
);

ALTER TABLE "public"."attendance_records"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."attendance_sessions" (
  "id"        uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "class_id"  uuid                     NOT NULL,
  "date"      date                     NOT NULL,
  "marked_by" uuid,
  "marked_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "attendance_sessions_pkey" PRIMARY KEY (id),
  CONSTRAINT "uq_sessions_class_date" UNIQUE (class_id, date),
  CONSTRAINT "uq_sessions_id_class" UNIQUE (id, class_id)
);

ALTER TABLE "public"."attendance_sessions"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."classes" (
  "id"            uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "name"          text                     NOT NULL,
  "grade"         text                     NOT NULL,
  "section"       text                     NOT NULL,
  "room"          text,
  "academic_year" text                     NOT NULL,
  "is_active"     boolean                  NOT NULL DEFAULT true,
  "created_at"    timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "classes_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."classes"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."profiles" (
  "id"         uuid                     NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "full_name"  text                     NOT NULL,
  "email"      text                     NOT NULL,
  "phone"      text,
  "subject"    text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "profiles_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."profiles"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."students" (
  "id"             uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "roll_no"        text                     NOT NULL,
  "full_name"      text                     NOT NULL,
  "gender"         text,
  "class_id"       uuid                     NOT NULL,
  "is_active"      boolean                  NOT NULL DEFAULT true,
  "guardian_name"  text,
  "guardian_phone" text,
  "created_at"     timestamp with time zone NOT NULL DEFAULT now(),
  "avatar_url"     text,
  CONSTRAINT "students_gender_check" CHECK ((gender = ANY (ARRAY['Male'::text, 'Female'::text, 'Other'::text]))),
  CONSTRAINT "students_pkey" PRIMARY KEY (id),
  CONSTRAINT "uq_students_class_roll" UNIQUE (class_id, roll_no),
  CONSTRAINT "uq_students_id_class" UNIQUE (id, class_id)
);

ALTER TABLE "public"."students"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."teacher_class_assignments" (
  "teacher_id"  uuid                     NOT NULL,
  "class_id"    uuid                     NOT NULL,
  "assigned_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "teacher_class_assignments_pkey" PRIMARY KEY (teacher_id, class_id)
);

ALTER TABLE "public"."teacher_class_assignments"
  ENABLE ROW LEVEL SECURITY;

CREATE TYPE "public"."attendance_status" AS ENUM (
  'present',
  'absent',
  'late',
  'leave'
);

ALTER TABLE "public"."attendance_records"
  ADD COLUMN "status" public.attendance_status NOT NULL DEFAULT 'absent'::public.attendance_status;

CREATE TYPE "public"."user_role" AS ENUM (
  'admin',
  'teacher'
);

ALTER TABLE "public"."profiles"
  ADD COLUMN "role" public.user_role NOT NULL DEFAULT 'teacher'::public.user_role;

CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
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
$function$;

ALTER TABLE "public"."attendance_records"
  ADD CONSTRAINT "fk_records_session_class" FOREIGN KEY (session_id, class_id) REFERENCES public.attendance_sessions(id, class_id) ON DELETE CASCADE;

ALTER TABLE "public"."attendance_sessions"
  ADD CONSTRAINT "attendance_sessions_class_id_fkey" FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE RESTRICT;

ALTER TABLE "public"."attendance_sessions"
  ADD CONSTRAINT "attendance_sessions_marked_by_fkey" FOREIGN KEY (marked_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE "public"."students"
  ADD CONSTRAINT "students_class_id_fkey" FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE RESTRICT;

ALTER TABLE "public"."attendance_records"
  ADD CONSTRAINT "fk_records_student" FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;

ALTER TABLE "public"."teacher_class_assignments"
  ADD CONSTRAINT "teacher_class_assignments_class_id_fkey" FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE;

ALTER TABLE "public"."teacher_class_assignments"
  ADD CONSTRAINT "teacher_class_assignments_teacher_id_fkey" FOREIGN KEY (teacher_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

CREATE INDEX idx_attendance_records_session ON public.attendance_records USING btree (session_id);

CREATE INDEX idx_attendance_records_student ON public.attendance_records USING btree (student_id);

CREATE INDEX idx_attendance_sessions_class ON public.attendance_sessions USING btree (class_id);

CREATE INDEX idx_attendance_sessions_date ON public.attendance_sessions USING btree (date);

CREATE INDEX idx_classes_active ON public.classes USING btree (is_active);

CREATE INDEX idx_profiles_role ON public.profiles USING btree (ROLE);

CREATE INDEX idx_records_class_id ON public.attendance_records USING btree (class_id);

CREATE INDEX idx_records_session_id ON public.attendance_records USING btree (session_id);

CREATE INDEX idx_records_student_id ON public.attendance_records USING btree (student_id);

CREATE INDEX idx_sessions_class_date ON public.attendance_sessions USING btree (class_id, date);

CREATE INDEX idx_sessions_marked_by ON public.attendance_sessions USING btree (marked_by);

CREATE INDEX idx_students_class_active ON public.students USING btree (class_id, is_active);

CREATE INDEX idx_students_class_id ON public.students USING btree (class_id);

CREATE INDEX idx_tca_class ON public.teacher_class_assignments USING btree (class_id);

CREATE INDEX idx_tca_teacher ON public.teacher_class_assignments USING btree (teacher_id);

CREATE INDEX idx_teacher_assignments ON public.teacher_class_assignments USING btree (teacher_id);

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

CREATE POLICY "Allow all for attendance_records" ON "public"."attendance_records"
  FOR ALL
  TO "anon", "authenticated"
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can manage attendance records" ON "public"."attendance_records"
  FOR ALL
  TO "authenticated"
  USING (true);

CREATE POLICY "Authenticated users can view attendance records" ON "public"."attendance_records"
  FOR SELECT
  TO "authenticated"
  USING (true);

CREATE POLICY "Allow all for attendance_sessions" ON "public"."attendance_sessions"
  FOR ALL
  TO "anon", "authenticated"
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can manage attendance sessions" ON "public"."attendance_sessions"
  FOR ALL
  TO "authenticated"
  USING (true);

CREATE POLICY "Authenticated users can view attendance sessions" ON "public"."attendance_sessions"
  FOR SELECT
  TO "authenticated"
  USING (true);

CREATE POLICY "Allow read access to classes for all users" ON "public"."classes"
  FOR SELECT
  TO PUBLIC
  USING (true);

CREATE POLICY "Authenticated users can manage classes" ON "public"."classes"
  FOR ALL
  TO "authenticated"
  USING (true);

CREATE POLICY "Authenticated users can view active classes" ON "public"."classes"
  FOR SELECT
  TO "authenticated"
  USING (true);

CREATE POLICY "Admins can delete profiles" ON "public"."profiles"
  FOR DELETE
  TO "authenticated"
  USING (true);

CREATE POLICY "Admins can update profiles" ON "public"."profiles"
  FOR UPDATE
  TO "authenticated"
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable insert for authenticated users" ON "public"."profiles"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (true);

CREATE POLICY "Users can update their own profile" ON "public"."profiles"
  FOR UPDATE
  TO "authenticated"
  USING ((auth.uid() = id));

CREATE POLICY "Users can view all profiles" ON "public"."profiles"
  FOR SELECT
  TO "authenticated"
  USING (true);

CREATE POLICY "Allow read access to students for all users" ON "public"."students"
  FOR SELECT
  TO PUBLIC
  USING (true);

CREATE POLICY "Authenticated users can manage students" ON "public"."students"
  FOR ALL
  TO "authenticated"
  USING (true);

CREATE POLICY "Authenticated users can view students" ON "public"."students"
  FOR SELECT
  TO "authenticated"
  USING (true);

CREATE POLICY "Authenticated users can manage assignments" ON "public"."teacher_class_assignments"
  FOR ALL
  TO "authenticated"
  USING (true);

CREATE POLICY "Authenticated users can view assignments" ON "public"."teacher_class_assignments"
  FOR SELECT
  TO "authenticated"
  USING (true);

CREATE POLICY "Enable authenticated delete" ON "storage"."objects"
  FOR DELETE
  TO "authenticated"
  USING ((bucket_id = 'avatars'::text));

CREATE POLICY "Enable authenticated upload" ON "storage"."objects"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((bucket_id = 'avatars'::text));

CREATE POLICY "Public avatars access" ON "storage"."objects"
  FOR SELECT
  TO PUBLIC
  USING ((bucket_id = 'avatars'::text));

COMMENT ON COLUMN "public"."attendance_records"."class_id" IS 'Denormalized class reference ensuring student and session classes match.';

COMMENT ON COLUMN "public"."attendance_records"."status" IS 'present | absent | late | leave';

COMMENT ON COLUMN "public"."attendance_sessions"."marked_by" IS 'Teacher (profile ID) who submitted the attendance session.';

COMMENT ON COLUMN "public"."classes"."is_active" IS 'False indicates an archived/inactive class retaining past records.';

COMMENT ON COLUMN "public"."profiles"."role" IS 'Role discriminator: admin or teacher.';

COMMENT ON COLUMN "public"."profiles"."subject" IS 'Department/Subject taught; NULL for admin users.';

COMMENT ON COLUMN "public"."students"."is_active" IS 'False indicates an inactive or transferred student.';

COMMENT ON TABLE "public"."attendance_records" IS 'Per-student attendance records. Linked to students and sessions with preserved historical class integrity.';

COMMENT ON TABLE "public"."attendance_sessions" IS 'Daily roll-call session per class. Deletion of classes with sessions restricted.';

COMMENT ON TABLE "public"."classes" IS 'Classroom sections. Soft-deletes supported via is_active.';

COMMENT ON TABLE "public"."profiles" IS 'App-level user profiles linked 1:1 to auth.users.';

COMMENT ON TABLE "public"."students" IS 'Student roster enrolled in classes. Hard deletes on class restricted.';

COMMENT ON TABLE "public"."teacher_class_assignments" IS 'Many-to-many junction between teachers (profiles) and classes.';

GRANT EXECUTE ON FUNCTION "public"."handle_new_user"() TO "anon", "authenticated", "postgres";

REVOKE ALL ON SCHEMA "public" FROM PUBLIC;

GRANT CREATE, USAGE ON SCHEMA "public" TO PUBLIC;

REVOKE ALL ON SCHEMA "public" FROM "postgres";

GRANT CREATE, USAGE ON SCHEMA "public" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."attendance_records" TO "anon", "authenticated", "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."attendance_sessions" TO "anon", "authenticated", "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."classes" TO "anon", "authenticated", "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."profiles" TO "anon", "authenticated", "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."students" TO "anon", "authenticated", "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."teacher_class_assignments" TO "anon", "authenticated", "postgres";

GRANT USAGE ON TYPE "public"."attendance_status" TO "postgres";

GRANT USAGE ON TYPE "public"."user_role" TO "postgres";

