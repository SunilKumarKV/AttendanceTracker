CREATE TABLE "ExamTimetable" (
  "id" TEXT NOT NULL,
  "institutionId" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "sectionId" TEXT,
  "subjectId" TEXT NOT NULL,
  "invigilatorId" TEXT,
  "examTitle" TEXT NOT NULL,
  "examDate" TIMESTAMP(3) NOT NULL,
  "startTime" TEXT NOT NULL,
  "endTime" TEXT NOT NULL,
  "room" TEXT,
  "academicYear" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ExamTimetable_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ClassTimetable" (
  "id" TEXT NOT NULL,
  "institutionId" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "sectionId" TEXT,
  "subjectId" TEXT NOT NULL,
  "teacherId" TEXT NOT NULL,
  "dayOfWeek" INTEGER NOT NULL,
  "period" TEXT NOT NULL,
  "startTime" TEXT NOT NULL,
  "endTime" TEXT NOT NULL,
  "room" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ClassTimetable_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Notice" (
  "id" TEXT NOT NULL,
  "institutionId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "targetRole" TEXT,
  "courseId" TEXT,
  "sectionId" TEXT,
  "expiresAt" TIMESTAMP(3),
  "publishedById" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Notice_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AcademicResource" (
  "id" TEXT NOT NULL,
  "institutionId" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "sectionId" TEXT,
  "subjectId" TEXT NOT NULL,
  "uploadedById" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "resourceType" TEXT NOT NULL,
  "resourceUrl" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AcademicResource_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Lab" (
  "id" TEXT NOT NULL,
  "institutionId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "location" TEXT,
  "capacity" INTEGER,
  "inChargeId" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Lab_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LabTimetable" (
  "id" TEXT NOT NULL,
  "institutionId" TEXT NOT NULL,
  "labId" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "sectionId" TEXT,
  "subjectId" TEXT,
  "dayOfWeek" INTEGER NOT NULL,
  "startTime" TEXT NOT NULL,
  "endTime" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LabTimetable_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ExamTimetable_institutionId_courseId_sectionId_subjectId_examDate_startTime_key" ON "ExamTimetable"("institutionId", "courseId", "sectionId", "subjectId", "examDate", "startTime");
CREATE INDEX "ExamTimetable_institutionId_examDate_idx" ON "ExamTimetable"("institutionId", "examDate");
CREATE INDEX "ExamTimetable_courseId_sectionId_idx" ON "ExamTimetable"("courseId", "sectionId");
CREATE INDEX "ExamTimetable_subjectId_idx" ON "ExamTimetable"("subjectId");
CREATE INDEX "ExamTimetable_invigilatorId_idx" ON "ExamTimetable"("invigilatorId");

CREATE UNIQUE INDEX "ClassTimetable_institutionId_courseId_sectionId_dayOfWeek_period_key" ON "ClassTimetable"("institutionId", "courseId", "sectionId", "dayOfWeek", "period");
CREATE UNIQUE INDEX "ClassTimetable_teacherId_dayOfWeek_period_key" ON "ClassTimetable"("teacherId", "dayOfWeek", "period");
CREATE INDEX "ClassTimetable_institutionId_dayOfWeek_isActive_idx" ON "ClassTimetable"("institutionId", "dayOfWeek", "isActive");
CREATE INDEX "ClassTimetable_teacherId_dayOfWeek_idx" ON "ClassTimetable"("teacherId", "dayOfWeek");
CREATE INDEX "ClassTimetable_courseId_sectionId_idx" ON "ClassTimetable"("courseId", "sectionId");

CREATE INDEX "Notice_institutionId_targetRole_isActive_idx" ON "Notice"("institutionId", "targetRole", "isActive");
CREATE INDEX "Notice_courseId_sectionId_idx" ON "Notice"("courseId", "sectionId");
CREATE INDEX "Notice_expiresAt_idx" ON "Notice"("expiresAt");

CREATE INDEX "AcademicResource_institutionId_courseId_sectionId_idx" ON "AcademicResource"("institutionId", "courseId", "sectionId");
CREATE INDEX "AcademicResource_subjectId_idx" ON "AcademicResource"("subjectId");
CREATE INDEX "AcademicResource_uploadedById_idx" ON "AcademicResource"("uploadedById");
CREATE INDEX "AcademicResource_resourceType_idx" ON "AcademicResource"("resourceType");

CREATE UNIQUE INDEX "Lab_institutionId_code_key" ON "Lab"("institutionId", "code");
CREATE INDEX "Lab_institutionId_isActive_idx" ON "Lab"("institutionId", "isActive");
CREATE INDEX "Lab_inChargeId_idx" ON "Lab"("inChargeId");

CREATE UNIQUE INDEX "LabTimetable_labId_dayOfWeek_startTime_endTime_key" ON "LabTimetable"("labId", "dayOfWeek", "startTime", "endTime");
CREATE INDEX "LabTimetable_institutionId_dayOfWeek_idx" ON "LabTimetable"("institutionId", "dayOfWeek");
CREATE INDEX "LabTimetable_courseId_sectionId_idx" ON "LabTimetable"("courseId", "sectionId");

ALTER TABLE "ExamTimetable" ADD CONSTRAINT "ExamTimetable_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExamTimetable" ADD CONSTRAINT "ExamTimetable_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExamTimetable" ADD CONSTRAINT "ExamTimetable_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ExamTimetable" ADD CONSTRAINT "ExamTimetable_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExamTimetable" ADD CONSTRAINT "ExamTimetable_invigilatorId_fkey" FOREIGN KEY ("invigilatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ClassTimetable" ADD CONSTRAINT "ClassTimetable_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClassTimetable" ADD CONSTRAINT "ClassTimetable_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClassTimetable" ADD CONSTRAINT "ClassTimetable_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ClassTimetable" ADD CONSTRAINT "ClassTimetable_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClassTimetable" ADD CONSTRAINT "ClassTimetable_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Notice" ADD CONSTRAINT "Notice_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Notice" ADD CONSTRAINT "Notice_publishedById_fkey" FOREIGN KEY ("publishedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AcademicResource" ADD CONSTRAINT "AcademicResource_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AcademicResource" ADD CONSTRAINT "AcademicResource_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AcademicResource" ADD CONSTRAINT "AcademicResource_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AcademicResource" ADD CONSTRAINT "AcademicResource_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AcademicResource" ADD CONSTRAINT "AcademicResource_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Lab" ADD CONSTRAINT "Lab_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Lab" ADD CONSTRAINT "Lab_inChargeId_fkey" FOREIGN KEY ("inChargeId") REFERENCES "StaffProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "LabTimetable" ADD CONSTRAINT "LabTimetable_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LabTimetable" ADD CONSTRAINT "LabTimetable_labId_fkey" FOREIGN KEY ("labId") REFERENCES "Lab"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LabTimetable" ADD CONSTRAINT "LabTimetable_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LabTimetable" ADD CONSTRAINT "LabTimetable_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LabTimetable" ADD CONSTRAINT "LabTimetable_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
