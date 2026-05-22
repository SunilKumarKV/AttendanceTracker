# AttendanceTracker Version 1.1 Upgrade Report

## Scope
Upgraded the existing PNPM-only AttendanceTracker project from Version 1 to Version 1.1 without rewriting working Version 1 modules.

## Root architecture changes
- Added secure password reset flow using the existing `PasswordResetToken` Prisma model.
- Added SMTP-backed password reset email delivery.
- Added `LoginHistory` persistence for successful and failed login attempts.
- Extended audit logging coverage for authentication, profile, password, student import, CRUD, assignments, reports, and settings.
- Added admin security/audit UI for activity timeline and login history.
- Kept Version 1 attendance, reports, exports, settings, and assignment flows intact.

## Prisma schema changes
- Added `LoginHistory` model.
- Added relations:
  - `Institution.loginHistory`
  - `User.loginHistory`
- Added indexes for institution, user, email, success status, and timestamp filtering.

## Migration changes
- Added migration: `backend/prisma/migrations/20260523110000_v11_auth_audit_login_history/migration.sql`

## Backend APIs added
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`
- `GET /api/admin/audit-logs`
- `GET /api/admin/activity-timeline`
- `GET /api/admin/login-history`

## Frontend pages/components added
- `src/components/ForgotPassword.tsx`
- `src/components/ResetPassword.tsx`
- `src/components/AuditLogs.tsx`
- Added routes:
  - `/forgot-password`
  - `/reset-password`
  - `/audit-logs`
- Added sidebar link: Security Logs.

## Security improvements
- Forgot password prevents email enumeration by returning a generic success response.
- Reset tokens are securely generated, SHA-256 hashed, expiry-limited, and invalidated after use.
- Password reset revokes active refresh tokens.
- Change password validates current password and revokes active refresh tokens.
- Successful and failed login attempts are stored with IP and user agent when available.
- Auth actions are audit logged.
- Invalid student import files are returned as 400 errors instead of uncaught upload errors.

## PNPM commands
```bash
corepack enable
corepack prepare pnpm@10.15.0 --activate
pnpm install
pnpm prisma generate
pnpm prisma validate
pnpm prisma migrate dev
pnpm prisma db seed
pnpm build
pnpm dev
```

## Validation note
This sandbox cannot install PNPM or download package/Prisma engines because external registry access is blocked. Run the commands above locally. No npm commands are required.

## GO / NO-GO
NO-GO until local `pnpm build`, `pnpm prisma migrate dev`, and Version 1.1 E2E tests pass on your PostgreSQL database. After those pass, Version 1.1 is GO.
