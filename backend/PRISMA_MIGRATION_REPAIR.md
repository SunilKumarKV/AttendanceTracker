# Prisma migration repair for P3006 / P1014

If `pnpm prisma migrate dev` fails with:

```text
Migration `20260522162319_seed_migration` failed to apply cleanly to the shadow database.
P1014: The underlying table for model `AttendanceSession_prof_course_section_subject_date_period_key` does not exist.
```

Root cause: a local accidental migration folder was generated from a seed/dev command name and should not be part of the migration history. The production-safe migration in this repository is:

```text
20260522170000_add_attendance_session_duplicate_guard
```

## Fix local development database

From `backend/`:

```bash
# 1) Stop backend server first.

# 2) Remove only the accidental local migration folder if it exists.
rm -rf prisma/migrations/20260522162319_seed_migration

# 3) If this is a local/dev database only, reset and replay clean migrations.
pnpm prisma migrate reset

# 4) Then validate normal migration flow.
pnpm prisma validate
pnpm prisma generate
pnpm prisma migrate dev
pnpm run prisma:seed
```

Do not delete committed migration folders. Do not run `migrate reset` on production data.
