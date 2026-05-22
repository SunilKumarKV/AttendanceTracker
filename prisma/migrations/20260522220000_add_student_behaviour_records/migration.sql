CREATE TYPE "BehaviourRecordType" AS ENUM ('BEHAVIOUR', 'DISCIPLINE', 'APPRECIATION');
CREATE TYPE "BehaviourTone" AS ENUM ('POSITIVE', 'NEGATIVE', 'NEUTRAL');
CREATE TYPE "DisciplineSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

CREATE TABLE "StudentBehaviourRecord" (
  "id" TEXT NOT NULL,
  "institutionId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "approvedById" TEXT,
  "recordType" "BehaviourRecordType" NOT NULL,
  "tone" "BehaviourTone" NOT NULL DEFAULT 'NEUTRAL',
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "category" TEXT,
  "severity" "DisciplineSeverity",
  "actionTaken" TEXT,
  "awardName" TEXT,
  "achievement" TEXT,
  "eventDate" TIMESTAMP(3) NOT NULL,
  "isApproved" BOOLEAN NOT NULL DEFAULT false,
  "isAdminOnly" BOOLEAN NOT NULL DEFAULT false,
  "parentNotificationRequired" BOOLEAN NOT NULL DEFAULT false,
  "parentNotifiedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StudentBehaviourRecord_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "StudentBehaviourRecord" ADD CONSTRAINT "StudentBehaviourRecord_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentBehaviourRecord" ADD CONSTRAINT "StudentBehaviourRecord_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentBehaviourRecord" ADD CONSTRAINT "StudentBehaviourRecord_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentBehaviourRecord" ADD CONSTRAINT "StudentBehaviourRecord_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "StudentBehaviourRecord_institutionId_recordType_eventDate_idx" ON "StudentBehaviourRecord"("institutionId", "recordType", "eventDate");
CREATE INDEX "StudentBehaviourRecord_studentId_eventDate_idx" ON "StudentBehaviourRecord"("studentId", "eventDate");
CREATE INDEX "StudentBehaviourRecord_createdById_createdAt_idx" ON "StudentBehaviourRecord"("createdById", "createdAt");
CREATE INDEX "StudentBehaviourRecord_severity_idx" ON "StudentBehaviourRecord"("severity");
CREATE INDEX "StudentBehaviourRecord_isApproved_isAdminOnly_idx" ON "StudentBehaviourRecord"("isApproved", "isAdminOnly");
CREATE INDEX "StudentBehaviourRecord_parentNotificationRequired_parentNotifiedAt_idx" ON "StudentBehaviourRecord"("parentNotificationRequired", "parentNotifiedAt");
