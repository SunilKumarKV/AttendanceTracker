-- DropIndex
DROP INDEX "Course_institutionId_isActive_idx";

-- DropIndex
DROP INDEX "Section_courseId_semesterId_code_key";

-- DropIndex
DROP INDEX "Section_institutionId_isActive_idx";

-- DropIndex
DROP INDEX "Semester_institutionId_isActive_idx";

-- DropIndex
DROP INDEX "Subject_institutionId_isActive_idx";

-- RenameIndex
ALTER INDEX "AttendanceSession_courseId_sectionId_subjectId_sessionDate_peri" RENAME TO "AttendanceSession_courseId_sectionId_subjectId_sessionDate__idx";
