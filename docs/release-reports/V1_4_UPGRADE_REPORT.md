# AttendanceTracker Version 1.4 Upgrade Report

## Scope
Upgraded the existing PNPM-only AttendanceTracker codebase from v1.3 to v1.4 with student and parent portal access.

## Features Added
- Student login role support.
- Parent login role support.
- Student dashboard with attendance summary, subject-wise attendance, monthly attendance, leave/correction status, notifications, and report download.
- Parent dashboard with secure mapped-child selection, child attendance summary, monthly/subject report, notifications, and report download.
- Student profile portal page.
- Parent-child secure mapping model.
- Admin backend APIs to create/update student and parent portal access.
- Backend access control ensuring students see only their own data and parents see only mapped children.

## Validation Status
This sandbox cannot install PNPM dependencies or connect to your PostgreSQL instance, so local validation is required:

```bash
pnpm install
pnpm prisma generate
pnpm prisma validate
pnpm prisma migrate dev
pnpm prisma db seed
pnpm build
pnpm dev
```

## Go / No-Go
NO-GO until the commands above pass and portal E2E testing is completed locally.
