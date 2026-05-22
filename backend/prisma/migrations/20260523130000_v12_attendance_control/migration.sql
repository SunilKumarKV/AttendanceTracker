CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TABLE "AttendancePolicy" (
  "id" TEXT NOT NULL,
  "institutionId" TEXT NOT NULL,
  "lockAfterHours" INTEGER NOT NULL DEFAULT 24,
  "workingDays" INTEGER[] NOT NULL DEFAULT ARRAY[1,2,3,4,5,6]::INTEGER[],
  "adminOverrideEnabled" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AttendancePolicy_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Holiday" (
  "id" TEXT NOT NULL,
  "institutionId" TEXT NOT NULL,
  "academicYear" TEXT NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Holiday_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AttendanceCorrectionRequest" (
  "id" TEXT NOT NULL,
  "institutionId" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "attendanceRecordId" TEXT,
  "studentId" TEXT,
  "requestedById" TEXT NOT NULL,
  "reviewedById" TEXT,
  "currentStatus" "AttendanceStatus",
  "requestedStatus" "AttendanceStatus",
  "reason" TEXT NOT NULL,
  "adminNote" TEXT,
  "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AttendanceCorrectionRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LeaveRequest" (
  "id" TEXT NOT NULL,
  "institutionId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
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
  CONSTRAINT "LeaveRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AttendancePolicy_institutionId_key" ON "AttendancePolicy"("institutionId");
CREATE INDEX "AttendancePolicy_institutionId_idx" ON "AttendancePolicy"("institutionId");
CREATE UNIQUE INDEX "Holiday_institutionId_date_key" ON "Holiday"("institutionId", "date");
CREATE INDEX "Holiday_institutionId_academicYear_idx" ON "Holiday"("institutionId", "academicYear");
CREATE INDEX "Holiday_date_idx" ON "Holiday"("date");
CREATE INDEX "AttendanceCorrectionRequest_institutionId_status_createdAt_idx" ON "AttendanceCorrectionRequest"("institutionId", "status", "createdAt");
CREATE INDEX "AttendanceCorrectionRequest_sessionId_idx" ON "AttendanceCorrectionRequest"("sessionId");
CREATE INDEX "AttendanceCorrectionRequest_requestedById_idx" ON "AttendanceCorrectionRequest"("requestedById");
CREATE INDEX "AttendanceCorrectionRequest_studentId_idx" ON "AttendanceCorrectionRequest"("studentId");
CREATE INDEX "LeaveRequest_institutionId_status_createdAt_idx" ON "LeaveRequest"("institutionId", "status", "createdAt");
CREATE INDEX "LeaveRequest_studentId_fromDate_toDate_idx" ON "LeaveRequest"("studentId", "fromDate", "toDate");

ALTER TABLE "AttendancePolicy" ADD CONSTRAINT "AttendancePolicy_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Holiday" ADD CONSTRAINT "Holiday_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AttendanceCorrectionRequest" ADD CONSTRAINT "AttendanceCorrectionRequest_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AttendanceCorrectionRequest" ADD CONSTRAINT "AttendanceCorrectionRequest_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AttendanceSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AttendanceCorrectionRequest" ADD CONSTRAINT "AttendanceCorrectionRequest_attendanceRecordId_fkey" FOREIGN KEY ("attendanceRecordId") REFERENCES "AttendanceRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AttendanceCorrectionRequest" ADD CONSTRAINT "AttendanceCorrectionRequest_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AttendanceCorrectionRequest" ADD CONSTRAINT "AttendanceCorrectionRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AttendanceCorrectionRequest" ADD CONSTRAINT "AttendanceCorrectionRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
