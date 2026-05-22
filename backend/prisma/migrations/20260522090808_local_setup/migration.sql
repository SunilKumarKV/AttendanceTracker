-- Safe cleanup/rename migration. Older dev databases may or may not contain
-- these indexes, so use IF EXISTS and a guarded rename for shadow DB safety.
DROP INDEX IF EXISTS "Course_institutionId_isActive_idx";
DROP INDEX IF EXISTS "Section_courseId_semesterId_code_key";
DROP INDEX IF EXISTS "Section_institutionId_isActive_idx";
DROP INDEX IF EXISTS "Semester_institutionId_isActive_idx";
DROP INDEX IF EXISTS "Subject_institutionId_isActive_idx";

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class WHERE relname = 'AttendanceSession_courseId_sectionId_subjectId_sessionDate_peri'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_class WHERE relname = 'AttendanceSession_courseId_sectionId_subjectId_sessionDate__idx'
  ) THEN
    ALTER INDEX "AttendanceSession_courseId_sectionId_subjectId_sessionDate_peri"
    RENAME TO "AttendanceSession_courseId_sectionId_subjectId_sessionDate__idx";
  END IF;
END $$;
