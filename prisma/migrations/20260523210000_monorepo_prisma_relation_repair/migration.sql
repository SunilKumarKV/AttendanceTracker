-- Monorepo migration repair: add deferred relations whose target tables are created by later feature migrations.
-- This keeps fresh shadow DB migration replay safe while preserving final schema integrity.

DO $$ BEGIN
  IF to_regclass('"StaffProfile"') IS NOT NULL
    AND to_regclass('"LibraryBookIssue"') IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LibraryBookIssue_staffId_fkey') THEN
    ALTER TABLE "LibraryBookIssue"
    ADD CONSTRAINT "LibraryBookIssue_staffId_fkey"
    FOREIGN KEY ("staffId") REFERENCES "StaffProfile"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF to_regclass('"StaffProfile"') IS NOT NULL
    AND to_regclass('"LabEquipmentIssue"') IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LabEquipmentIssue_staffId_fkey') THEN
    ALTER TABLE "LabEquipmentIssue"
    ADD CONSTRAINT "LabEquipmentIssue_staffId_fkey"
    FOREIGN KEY ("staffId") REFERENCES "StaffProfile"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF to_regclass('"Lab"') IS NOT NULL
    AND to_regclass('"LabEquipment"') IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LabEquipment_labId_fkey') THEN
    ALTER TABLE "LabEquipment"
    ADD CONSTRAINT "LabEquipment_labId_fkey"
    FOREIGN KEY ("labId") REFERENCES "Lab"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
