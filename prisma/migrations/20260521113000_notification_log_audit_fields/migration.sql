ALTER TABLE "NotificationLog"
ADD COLUMN "attendanceSessionId" TEXT,
ADD COLUMN "recipientType" TEXT,
ADD COLUMN "type" TEXT,
ADD COLUMN "reason" TEXT;

CREATE INDEX "NotificationLog_attendanceSessionId_idx" ON "NotificationLog"("attendanceSessionId");
CREATE INDEX "NotificationLog_type_idx" ON "NotificationLog"("type");
