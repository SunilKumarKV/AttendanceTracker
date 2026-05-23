DO $$ BEGIN
  CREATE TYPE "LibraryIssueTargetType" AS ENUM ('STUDENT', 'STAFF');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "LibraryIssueStatus" AS ENUM ('ISSUED', 'RETURNED', 'LATE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "EquipmentCondition" AS ENUM ('GOOD', 'DAMAGED', 'UNDER_REPAIR');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "EquipmentIssueTargetType" AS ENUM ('STUDENT', 'STAFF', 'CLASS');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "EquipmentIssueStatus" AS ENUM ('ISSUED', 'RETURNED', 'LOST', 'DAMAGED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "MaintenanceStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'RESOLVED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "LibraryBook" (
  "id" TEXT NOT NULL,
  "institutionId" TEXT NOT NULL,
  "courseId" TEXT,
  "subjectId" TEXT,
  "title" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "author" TEXT,
  "publisher" TEXT,
  "isbn" TEXT,
  "accessionNumber" TEXT NOT NULL,
  "totalQuantity" INTEGER NOT NULL DEFAULT 1,
  "availableQuantity" INTEGER NOT NULL DEFAULT 1,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LibraryBook_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "LibraryBookIssue" (
  "id" TEXT NOT NULL,
  "institutionId" TEXT NOT NULL,
  "bookId" TEXT NOT NULL,
  "targetType" "LibraryIssueTargetType" NOT NULL,
  "studentId" TEXT,
  "staffId" TEXT,
  "issuedById" TEXT NOT NULL,
  "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "dueDate" TIMESTAMP(3) NOT NULL,
  "returnDate" TIMESTAMP(3),
  "status" "LibraryIssueStatus" NOT NULL DEFAULT 'ISSUED',
  "fineAmount" DECIMAL(10,2),
  "remarks" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LibraryBookIssue_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "LabEquipment" (
  "id" TEXT NOT NULL,
  "institutionId" TEXT NOT NULL,
  "labId" TEXT,
  "name" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "assetCode" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "availableQuantity" INTEGER NOT NULL DEFAULT 1,
  "condition" "EquipmentCondition" NOT NULL DEFAULT 'GOOD',
  "remarks" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LabEquipment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "LabEquipmentIssue" (
  "id" TEXT NOT NULL,
  "institutionId" TEXT NOT NULL,
  "equipmentId" TEXT NOT NULL,
  "targetType" "EquipmentIssueTargetType" NOT NULL,
  "studentId" TEXT,
  "staffId" TEXT,
  "courseId" TEXT,
  "sectionId" TEXT,
  "issuedById" TEXT NOT NULL,
  "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "dueDate" TIMESTAMP(3),
  "returnDate" TIMESTAMP(3),
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "status" "EquipmentIssueStatus" NOT NULL DEFAULT 'ISSUED',
  "damageRemarks" TEXT,
  "responsibilityNotes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LabEquipmentIssue_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "MaintenanceRequest" (
  "id" TEXT NOT NULL,
  "institutionId" TEXT NOT NULL,
  "equipmentId" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "status" "MaintenanceStatus" NOT NULL DEFAULT 'PENDING',
  "assignedToId" TEXT,
  "createdById" TEXT NOT NULL,
  "cost" DECIMAL(10,2),
  "resolvedAt" TIMESTAMP(3),
  "remarks" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MaintenanceRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "LibraryBook_institutionId_accessionNumber_key" ON "LibraryBook"("institutionId", "accessionNumber");
CREATE INDEX IF NOT EXISTS "LibraryBook_institutionId_category_isActive_idx" ON "LibraryBook"("institutionId", "category", "isActive");
CREATE INDEX IF NOT EXISTS "LibraryBook_isbn_idx" ON "LibraryBook"("isbn");
CREATE INDEX IF NOT EXISTS "LibraryBook_courseId_subjectId_idx" ON "LibraryBook"("courseId", "subjectId");
CREATE INDEX IF NOT EXISTS "LibraryBook_availableQuantity_idx" ON "LibraryBook"("availableQuantity");
CREATE INDEX IF NOT EXISTS "LibraryBookIssue_institutionId_status_dueDate_idx" ON "LibraryBookIssue"("institutionId", "status", "dueDate");
CREATE INDEX IF NOT EXISTS "LibraryBookIssue_bookId_status_idx" ON "LibraryBookIssue"("bookId", "status");
CREATE INDEX IF NOT EXISTS "LibraryBookIssue_studentId_idx" ON "LibraryBookIssue"("studentId");
CREATE INDEX IF NOT EXISTS "LibraryBookIssue_staffId_idx" ON "LibraryBookIssue"("staffId");
CREATE UNIQUE INDEX IF NOT EXISTS "LabEquipment_institutionId_assetCode_key" ON "LabEquipment"("institutionId", "assetCode");
CREATE INDEX IF NOT EXISTS "LabEquipment_institutionId_category_condition_idx" ON "LabEquipment"("institutionId", "category", "condition");
CREATE INDEX IF NOT EXISTS "LabEquipment_labId_idx" ON "LabEquipment"("labId");
CREATE INDEX IF NOT EXISTS "LabEquipment_availableQuantity_idx" ON "LabEquipment"("availableQuantity");
CREATE INDEX IF NOT EXISTS "LabEquipmentIssue_institutionId_status_dueDate_idx" ON "LabEquipmentIssue"("institutionId", "status", "dueDate");
CREATE INDEX IF NOT EXISTS "LabEquipmentIssue_equipmentId_status_idx" ON "LabEquipmentIssue"("equipmentId", "status");
CREATE INDEX IF NOT EXISTS "LabEquipmentIssue_studentId_idx" ON "LabEquipmentIssue"("studentId");
CREATE INDEX IF NOT EXISTS "LabEquipmentIssue_staffId_idx" ON "LabEquipmentIssue"("staffId");
CREATE INDEX IF NOT EXISTS "LabEquipmentIssue_courseId_sectionId_idx" ON "LabEquipmentIssue"("courseId", "sectionId");
CREATE INDEX IF NOT EXISTS "MaintenanceRequest_institutionId_status_createdAt_idx" ON "MaintenanceRequest"("institutionId", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "MaintenanceRequest_equipmentId_idx" ON "MaintenanceRequest"("equipmentId");
CREATE INDEX IF NOT EXISTS "MaintenanceRequest_assignedToId_idx" ON "MaintenanceRequest"("assignedToId");

ALTER TABLE "LibraryBook" ADD CONSTRAINT "LibraryBook_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LibraryBook" ADD CONSTRAINT "LibraryBook_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LibraryBook" ADD CONSTRAINT "LibraryBook_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LibraryBookIssue" ADD CONSTRAINT "LibraryBookIssue_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LibraryBookIssue" ADD CONSTRAINT "LibraryBookIssue_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "LibraryBook"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LibraryBookIssue" ADD CONSTRAINT "LibraryBookIssue_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;
DO $$ BEGIN
  IF to_regclass('"StaffProfile"') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LibraryBookIssue_staffId_fkey') THEN
    ALTER TABLE "LibraryBookIssue" ADD CONSTRAINT "LibraryBookIssue_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "StaffProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
ALTER TABLE "LibraryBookIssue" ADD CONSTRAINT "LibraryBookIssue_issuedById_fkey" FOREIGN KEY ("issuedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LabEquipment" ADD CONSTRAINT "LabEquipment_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
DO $$ BEGIN
  IF to_regclass('"Lab"') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LabEquipment_labId_fkey') THEN
    ALTER TABLE "LabEquipment" ADD CONSTRAINT "LabEquipment_labId_fkey" FOREIGN KEY ("labId") REFERENCES "Lab"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
ALTER TABLE "LabEquipmentIssue" ADD CONSTRAINT "LabEquipmentIssue_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LabEquipmentIssue" ADD CONSTRAINT "LabEquipmentIssue_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "LabEquipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LabEquipmentIssue" ADD CONSTRAINT "LabEquipmentIssue_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;
DO $$ BEGIN
  IF to_regclass('"StaffProfile"') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LabEquipmentIssue_staffId_fkey') THEN
    ALTER TABLE "LabEquipmentIssue" ADD CONSTRAINT "LabEquipmentIssue_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "StaffProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
ALTER TABLE "LabEquipmentIssue" ADD CONSTRAINT "LabEquipmentIssue_issuedById_fkey" FOREIGN KEY ("issuedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MaintenanceRequest" ADD CONSTRAINT "MaintenanceRequest_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MaintenanceRequest" ADD CONSTRAINT "MaintenanceRequest_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "LabEquipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MaintenanceRequest" ADD CONSTRAINT "MaintenanceRequest_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MaintenanceRequest" ADD CONSTRAINT "MaintenanceRequest_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
