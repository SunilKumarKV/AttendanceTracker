ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "parentName" TEXT;
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "parentEmail" TEXT;
CREATE INDEX IF NOT EXISTS "Student_parentEmail_idx" ON "Student"("parentEmail");
