# AttendanceTracker v2.0 Upgrade Report

## Root architecture changes
- Added platform-level institution management for real multi-institution SaaS operations.
- Added subscription plan/status/limits directly to `Institution`.
- Added tenant-aware login institution-code validation.
- Added Super Admin platform APIs and UI.
- Added institution-admin onboarding from the platform dashboard.
- Added plan-limit enforcement for student and teacher creation.

## Migration strategy
- Safe additive migration only.
- Existing `Institution` rows are preserved.
- Existing v1 data already linked by `institutionId` remains intact.
- New subscription fields receive defaults.
- Existing institutions get fallback academic year and trial end date.

## Validation required locally
Run PNPM + PostgreSQL validation:

```bash
pnpm install
pnpm prisma generate
pnpm prisma validate
pnpm prisma migrate dev
pnpm build
pnpm dev
```

Then test:
- Create two institutions.
- Create one admin for each institution.
- Login using institution code.
- Confirm Institution A admin cannot see Institution B students/classes/reports.
- Confirm teacher APIs are scoped by JWT institutionId.
- Confirm Super Admin can view platform dashboard.
- Confirm plan limits block extra students/teachers when limits are reached.
