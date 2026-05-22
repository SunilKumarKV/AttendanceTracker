DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum
    WHERE enumlabel = 'TEACHER'
      AND enumtypid = '"Role"'::regtype
  ) THEN
    ALTER TYPE "Role" ADD VALUE 'TEACHER';
  END IF;
END $$;
