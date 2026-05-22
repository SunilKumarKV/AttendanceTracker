ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'STUDENT';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'PARENT';

ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "portalUserId" TEXT;

CREATE TABLE IF NOT EXISTS "ParentProfile" (
  "id" TEXT NOT NULL,
  "institutionId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "phone" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ParentProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ParentStudent" (
  "id" TEXT NOT NULL,
  "institutionId" TEXT NOT NULL,
  "parentProfileId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ParentStudent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Student_portalUserId_key" ON "Student"("portalUserId");
CREATE INDEX IF NOT EXISTS "Student_portalUserId_idx" ON "Student"("portalUserId");
CREATE UNIQUE INDEX IF NOT EXISTS "ParentProfile_userId_key" ON "ParentProfile"("userId");
CREATE INDEX IF NOT EXISTS "ParentProfile_institutionId_idx" ON "ParentProfile"("institutionId");
CREATE UNIQUE INDEX IF NOT EXISTS "ParentStudent_parentProfileId_studentId_key" ON "ParentStudent"("parentProfileId", "studentId");
CREATE INDEX IF NOT EXISTS "ParentStudent_institutionId_idx" ON "ParentStudent"("institutionId");
CREATE INDEX IF NOT EXISTS "ParentStudent_studentId_idx" ON "ParentStudent"("studentId");

ALTER TABLE "Student" ADD CONSTRAINT "Student_portalUserId_fkey" FOREIGN KEY ("portalUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ParentProfile" ADD CONSTRAINT "ParentProfile_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ParentProfile" ADD CONSTRAINT "ParentProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ParentStudent" ADD CONSTRAINT "ParentStudent_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ParentStudent" ADD CONSTRAINT "ParentStudent_parentProfileId_fkey" FOREIGN KEY ("parentProfileId") REFERENCES "ParentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ParentStudent" ADD CONSTRAINT "ParentStudent_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
