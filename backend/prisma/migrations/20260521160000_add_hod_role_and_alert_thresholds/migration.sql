-- Add HOD role for department-level report management.
-- Important: PostgreSQL enum type was created as quoted "Role" in the base migration.
-- The regtype check must also use the quoted name, otherwise Prisma shadow DB fails with:
-- ERROR: type "role" does not exist
DO $$
BEGIN
  IF to_regtype('"Role"') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_enum
      WHERE enumlabel = 'HOD'
        AND enumtypid = '"Role"'::regtype
    ) THEN
      ALTER TYPE "Role" ADD VALUE 'HOD';
    END IF;
  END IF;
END $$;
