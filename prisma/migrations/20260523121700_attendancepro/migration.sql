-- DropIndex
DROP INDEX "Institution_subscriptionPlan_idx";

-- DropIndex
DROP INDEX "Institution_subscriptionStatus_idx";

-- RenameIndex
ALTER INDEX "ClassTimetable_institutionId_courseId_sectionId_dayOfWeek_perio" RENAME TO "ClassTimetable_institutionId_courseId_sectionId_dayOfWeek_p_key";

-- RenameIndex
ALTER INDEX "ExamTimetable_institutionId_courseId_sectionId_subjectId_examDa" RENAME TO "ExamTimetable_institutionId_courseId_sectionId_subjectId_ex_key";
