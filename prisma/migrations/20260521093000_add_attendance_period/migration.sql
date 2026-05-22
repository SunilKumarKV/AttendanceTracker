ALTER TABLE "AttendanceSession" ADD COLUMN "period" TEXT NOT NULL DEFAULT 'Session 1';

DROP INDEX IF EXISTS "AttendanceSession_sessionDate_courseId_subjectId_professorI_key";

CREATE INDEX "AttendanceSession_courseId_sectionId_subjectId_sessionDate_period_idx" ON "AttendanceSession"("courseId", "sectionId", "subjectId", "sessionDate", "period");
