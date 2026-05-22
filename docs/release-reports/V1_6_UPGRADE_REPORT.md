# AttendanceTracker v1.6 Upgrade Report

## Scope
Upgraded the existing PNPM-only AttendanceTracker project from v1.5 to v1.6 with academic operations features.

## Added
- Exam timetable management
- Class timetable management with teacher period conflict prevention
- Notices and announcements with role/class/section targeting
- Academic resource sharing by class/section/subject
- Teacher resource upload authorization for assigned subject resources
- Basic lab management with lab in-charge assignment
- Lab timetable management
- Student/parent academic feed visibility
- Admin dashboard academic summary counters

## Validation Status
This package contains source and migration changes. Run local PNPM + PostgreSQL validation:

```bash
pnpm install
pnpm prisma generate
pnpm prisma validate
pnpm prisma migrate dev
pnpm build
pnpm dev
```

## Decision
NO-GO until local migration/build/E2E validation passes in your PostgreSQL environment.
