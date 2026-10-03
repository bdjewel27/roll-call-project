-- Migration: Allow transferring students between classes while preserving attendance history
-- Description:
--   Drops composite foreign key fk_records_student_class (student_id, class_id)
--   that prevented updating students.class_id whenever past attendance records existed.
--   Replaces it with fk_records_student on (student_id) REFERENCES public.students(id) ON DELETE CASCADE.
--   Preserves historical attendance session associations and prevents constraint errors on class transfer.

ALTER TABLE public.attendance_records
  DROP CONSTRAINT IF EXISTS fk_records_student_class;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_records_student'
  ) THEN
    ALTER TABLE public.attendance_records
      ADD CONSTRAINT fk_records_student
      FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;
  END IF;
END $$;
