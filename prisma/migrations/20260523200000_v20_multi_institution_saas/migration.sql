-- Version 2.0 multi-institution SaaS upgrade.
-- Safe additive migration: preserves existing institution rows and data links.

DO $$ BEGIN
  CREATE TYPE "SubscriptionPlan" AS ENUM ('FREE_TRIAL', 'BASIC', 'PRO', 'ENTERPRISE');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELLED', 'EXPIRED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "Institution" ADD COLUMN IF NOT EXISTS "logoUrl" TEXT;
ALTER TABLE "Institution" ADD COLUMN IF NOT EXISTS "contactPerson" TEXT;
ALTER TABLE "Institution" ADD COLUMN IF NOT EXISTS "academicYear" TEXT;
ALTER TABLE "Institution" ADD COLUMN IF NOT EXISTS "subscriptionPlan" "SubscriptionPlan" NOT NULL DEFAULT 'FREE_TRIAL';
ALTER TABLE "Institution" ADD COLUMN IF NOT EXISTS "subscriptionStatus" "SubscriptionStatus" NOT NULL DEFAULT 'TRIALING';
ALTER TABLE "Institution" ADD COLUMN IF NOT EXISTS "trialEndsAt" TIMESTAMP(3);
ALTER TABLE "Institution" ADD COLUMN IF NOT EXISTS "studentLimit" INTEGER NOT NULL DEFAULT 100;
ALTER TABLE "Institution" ADD COLUMN IF NOT EXISTS "teacherLimit" INTEGER NOT NULL DEFAULT 10;
ALTER TABLE "Institution" ADD COLUMN IF NOT EXISTS "staffLimit" INTEGER NOT NULL DEFAULT 10;
ALTER TABLE "Institution" ADD COLUMN IF NOT EXISTS "featureFlags" JSONB;

UPDATE "Institution"
SET "academicYear" = COALESCE("academicYear", '2026-27'),
    "trialEndsAt" = COALESCE("trialEndsAt", NOW() + interval '14 days')
WHERE "academicYear" IS NULL OR "trialEndsAt" IS NULL;

CREATE INDEX IF NOT EXISTS "Institution_subscriptionStatus_idx" ON "Institution"("subscriptionStatus");
CREATE INDEX IF NOT EXISTS "Institution_subscriptionPlan_idx" ON "Institution"("subscriptionPlan");
