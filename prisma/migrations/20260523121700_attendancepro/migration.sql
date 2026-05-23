-- DropIndex
DROP INDEX IF EXISTS "Institution_subscriptionPlan_idx";

-- DropIndex
DROP INDEX IF EXISTS "Institution_subscriptionStatus_idx";

-- RenameIndex
ALTER INDEX IF EXISTS "ClassTimetable_institutionId_courseId_sectionId_dayOfWeek_perio" RENAME TO "ClassTimetable_institutionId_courseId_sectionId_dayOfWeek_p_key";

-- RenameIndex
ALTER INDEX IF EXISTS "ExamTimetable_institutionId_courseId_sectionId_subjectId_examDa" RENAME TO "ExamTimetable_institutionId_courseId_sectionId_subjectId_ex_key";
