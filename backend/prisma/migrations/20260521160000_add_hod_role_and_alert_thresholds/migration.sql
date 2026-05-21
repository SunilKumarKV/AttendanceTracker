-- Add HOD role for department-level report management.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'HOD' AND enumtypid = 'Role'::regtype) THEN
    ALTER TYPE "Role" ADD VALUE 'HOD';
  END IF;
END $$;
