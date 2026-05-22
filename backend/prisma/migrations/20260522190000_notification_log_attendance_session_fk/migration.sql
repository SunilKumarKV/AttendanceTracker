-- Link notification logs to attendance sessions for audit/report traceability.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'NotificationLog_attendanceSessionId_fkey'
  ) THEN
    ALTER TABLE "NotificationLog"
    ADD CONSTRAINT "NotificationLog_attendanceSessionId_fkey"
    FOREIGN KEY ("attendanceSessionId") REFERENCES "AttendanceSession"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
