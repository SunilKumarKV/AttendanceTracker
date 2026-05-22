CREATE TABLE IF NOT EXISTS "LoginHistory" (
  "id" TEXT NOT NULL,
  "institutionId" TEXT,
  "userId" TEXT,
  "email" TEXT NOT NULL,
  "success" BOOLEAN NOT NULL,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "LoginHistory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "LoginHistory_institutionId_createdAt_idx" ON "LoginHistory"("institutionId", "createdAt");
CREATE INDEX IF NOT EXISTS "LoginHistory_userId_createdAt_idx" ON "LoginHistory"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "LoginHistory_email_createdAt_idx" ON "LoginHistory"("email", "createdAt");
CREATE INDEX IF NOT EXISTS "LoginHistory_success_createdAt_idx" ON "LoginHistory"("success", "createdAt");

DO $$ BEGIN
  ALTER TABLE "LoginHistory" ADD CONSTRAINT "LoginHistory_institutionId_fkey"
  FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "LoginHistory" ADD CONSTRAINT "LoginHistory_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
