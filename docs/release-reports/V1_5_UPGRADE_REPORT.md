# AttendanceTracker Version 1.5 Upgrade Report

## Scope
Implemented Version 1.5 staff management without changing existing student, teacher, attendance, report, communication, or portal flows.

## Added
- Staff management for office staff, lab in-charge, accountant, librarian, non-teaching staff, and custom staff roles.
- Staff profile linked to secure User account with `Role.STAFF`.
- Staff attendance with PRESENT, ABSENT, LATE, and LEAVE statuses.
- Staff leave request, admin approval/rejection, and leave history.
- Staff reports with CSV, Excel-compatible CSV, and PDF export.
- Staff dashboard for own attendance, leave status, monthly summary, and report download.
- Admin dashboard staff summary endpoint for total staff, today staff attendance, absent count, and pending staff leaves.

## PNPM Only
No npm scripts or npm lockfiles were added. Existing PNPM workspace setup is preserved.

## Local validation commands
```bash
pnpm install
pnpm prisma generate
pnpm prisma validate
pnpm prisma migrate dev
pnpm prisma db seed
pnpm build
pnpm dev
```

## Production decision
NO-GO until the commands above and the staff E2E checklist pass locally against PostgreSQL.
