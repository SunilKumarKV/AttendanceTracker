-- Add HOD role safely for existing PostgreSQL databases.
DO $$
DECLARE
  role_type regtype := to_regtype('"Role"');
BEGIN
  IF role_type IS NULL THEN
    RAISE EXCEPTION 'Required enum type "Role" does not exist. Apply the base schema migration first.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum
    WHERE enumlabel = 'HOD'
      AND enumtypid = role_type
  ) THEN
    ALTER TYPE "Role" ADD VALUE 'HOD';
  END IF;
END $$;
