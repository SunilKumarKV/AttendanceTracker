ALTER TABLE "Course" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Semester" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Subject" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Section" ADD COLUMN "code" TEXT;
ALTER TABLE "Section" ADD COLUMN "capacity" INTEGER;
ALTER TABLE "Section" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

UPDATE "Section" SET "code" = "name" WHERE "code" IS NULL;

CREATE INDEX "Course_institutionId_isActive_idx" ON "Course"("institutionId", "isActive");
CREATE INDEX "Semester_institutionId_isActive_idx" ON "Semester"("institutionId", "isActive");
CREATE INDEX "Subject_institutionId_isActive_idx" ON "Subject"("institutionId", "isActive");
CREATE INDEX "Section_institutionId_isActive_idx" ON "Section"("institutionId", "isActive");
CREATE UNIQUE INDEX "Section_courseId_semesterId_code_key" ON "Section"("courseId", "semesterId", "code");
