-- DB-level guard against duplicate attendance sessions for the same teacher/class/subject/date/period.
-- Shadow-DB safe: no-op when replayed before the base table exists in damaged local migration history.
-- Note: PostgreSQL allows multiple NULL values in unique indexes, so service-layer duplicate checks remain required for unsectioned sessions.
DO $$
BEGIN
  IF to_regclass('"AttendanceSession"') IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'i'
      AND c.relname = 'AttendanceSession_prof_course_section_subject_date_period_key'
      AND n.nspname = current_schema()
  ) THEN
    CREATE UNIQUE INDEX "AttendanceSession_prof_course_section_subject_date_period_key"
    ON "AttendanceSession"("professorId", "courseId", "sectionId", "subjectId", "sessionDate", "period");
  END IF;
END $$;
