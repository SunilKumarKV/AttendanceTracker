ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'STAFF';

CREATE TABLE IF NOT EXISTS "StaffProfile" (
  "id" TEXT NOT NULL,
  "institutionId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "employeeCode" TEXT NOT NULL,
  "staffRole" TEXT NOT NULL,
  "department" TEXT,
  "designation" TEXT,
  "phone" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StaffProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "StaffProfile_userId_key" ON "StaffProfile"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "StaffProfile_institutionId_employeeCode_key" ON "StaffProfile"("institutionId", "employeeCode");
CREATE INDEX IF NOT EXISTS "StaffProfile_institutionId_staffRole_isActive_idx" ON "StaffProfile"("institutionId", "staffRole", "isActive");
CREATE INDEX IF NOT EXISTS "StaffProfile_userId_idx" ON "StaffProfile"("userId");

ALTER TABLE "StaffProfile" ADD CONSTRAINT "StaffProfile_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StaffProfile" ADD CONSTRAINT "StaffProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "StaffAttendanceRecord" (
  "id" TEXT NOT NULL,
  "institutionId" TEXT NOT NULL,
  "staffId" TEXT NOT NULL,
  "markedById" TEXT NOT NULL,
  "attendanceDate" TIMESTAMP(3) NOT NULL,
  "status" TEXT NOT NULL,
  "remarks" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StaffAttendanceRecord_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "StaffAttendanceRecord_staffId_attendanceDate_key" ON "StaffAttendanceRecord"("staffId", "attendanceDate");
CREATE INDEX IF NOT EXISTS "StaffAttendanceRecord_institutionId_attendanceDate_idx" ON "StaffAttendanceRecord"("institutionId", "attendanceDate");
CREATE INDEX IF NOT EXISTS "StaffAttendanceRecord_staffId_attendanceDate_idx" ON "StaffAttendanceRecord"("staffId", "attendanceDate");
CREATE INDEX IF NOT EXISTS "StaffAttendanceRecord_status_idx" ON "StaffAttendanceRecord"("status");

ALTER TABLE "StaffAttendanceRecord" ADD CONSTRAINT "StaffAttendanceRecord_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StaffAttendanceRecord" ADD CONSTRAINT "StaffAttendanceRecord_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "StaffProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StaffAttendanceRecord" ADD CONSTRAINT "StaffAttendanceRecord_markedById_fkey" FOREIGN KEY ("markedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "StaffLeaveRequest" (
  "id" TEXT NOT NULL,
  "institutionId" TEXT NOT NULL,
  "staffId" TEXT NOT NULL,
  "requestedById" TEXT,
  "reviewedById" TEXT,
  "fromDate" TIMESTAMP(3) NOT NULL,
  "toDate" TIMESTAMP(3) NOT NULL,
  "reason" TEXT NOT NULL,
  "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
  "adminNote" TEXT,
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StaffLeaveRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "StaffLeaveRequest_institutionId_status_createdAt_idx" ON "StaffLeaveRequest"("institutionId", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "StaffLeaveRequest_staffId_fromDate_toDate_idx" ON "StaffLeaveRequest"("staffId", "fromDate", "toDate");

ALTER TABLE "StaffLeaveRequest" ADD CONSTRAINT "StaffLeaveRequest_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StaffLeaveRequest" ADD CONSTRAINT "StaffLeaveRequest_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "StaffProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StaffLeaveRequest" ADD CONSTRAINT "StaffLeaveRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StaffLeaveRequest" ADD CONSTRAINT "StaffLeaveRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
