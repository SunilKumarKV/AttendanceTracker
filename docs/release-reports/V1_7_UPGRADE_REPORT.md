# AttendanceTracker v1.7 Upgrade Report

## Added
- Student behaviour records for positive, negative, and neutral notes.
- Discipline tracking with category, severity, action taken, and parent notification flag.
- Appreciation records for achievements and good performance.
- Behaviour reports with CSV, Excel-compatible XLS, and PDF export endpoints.
- Parent/student portal visibility for approved non-sensitive records.
- Dashboard behaviour counters.
- Backend RBAC for admin, teacher, parent, and student access.

## PNPM
This project remains PNPM-only. Do not use npm.

## Local validation commands
```bash
pnpm install
pnpm prisma generate
pnpm prisma validate
pnpm prisma migrate dev
pnpm build
pnpm dev
```

## E2E validation required locally
- Teacher adds behaviour note for assigned student.
- Admin views all records.
- Parent sees only approved child records.
- Student sees only own approved appreciation/behaviour records.
- Export behaviour report in CSV, Excel-compatible XLS, and PDF.
- Unauthorized records are blocked.
