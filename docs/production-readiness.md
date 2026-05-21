# Production Readiness

## Deployment Checklist

- Frontend is deployed with `VITE_API_BASE_URL` pointing to the production API.
- Backend is deployed with `NODE_ENV=production`.
- `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, and `CLIENT_URL` are configured as secrets.
- `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` are unique and at least 32 characters.
- `CORS_ORIGINS` contains only trusted extra origins.
- `npm run prisma:deploy` runs during backend deployment.
- `npm run seed:first-admin` is run once to create the first admin account.
- First-admin seed variables are removed after use.
- Development seed command is not run in production.
- `/api/health` is monitored by the platform.
- SMTP, Sentry, and analytics are left blank until providers are fully configured.

## Backend Environment

Required production variables:

```bash
NODE_ENV=production
DATABASE_URL=
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
CLIENT_URL=https://your-frontend.example
CORS_ORIGINS=
PORT=5000
LOG_LEVEL=info
```

Optional provider variables:

```bash
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
SUPPORT_EMAIL=
SENTRY_DSN=
ANALYTICS_WRITE_KEY=
```

First-admin variables:

```bash
FIRST_ADMIN_INSTITUTION_NAME=
FIRST_ADMIN_INSTITUTION_CODE=
FIRST_ADMIN_NAME=
FIRST_ADMIN_EMAIL=
FIRST_ADMIN_PASSWORD=
```

## Safety Controls

- Environment validation blocks missing production secrets.
- Development demo seed refuses to run when `NODE_ENV=production`.
- Auth, write-heavy routes, report exports, and the full API have route-specific rate limits.
- Helmet is configured with strong defaults, API-focused CSP, frame protection, referrer policy, and production HSTS.
- CORS allows only `CLIENT_URL` and explicit `CORS_ORIGINS`.
- The logger emits structured JSON for platform log collection.
- Sentry and analytics are placeholders until provider packages are intentionally installed.
- Frontend API failures surface a safe backend-down message instead of crashing the UI.

## Database Indexes Review

The Prisma schema includes indexes for the current query patterns:

- User lookup and role filtering: `User.email`, `User.institutionId + role`, `User.isActive`.
- Student search and uniqueness: `Student.institutionId + courseId + sectionId + rollNumber`, `Student.institutionId + name`, `Student.courseId + sectionId`.
- Attendance session lookups: unique `sessionDate + courseId + subjectId + professorId`, plus indexes by institution/date, course/subject, and professor/date.
- Attendance reports: `AttendanceRecord.studentId + status`, `AttendanceRecord.sessionId + status`.
- Audit and notification history: institution/date, actor, entity, status, and student indexes.

Before high-volume production use, review slow query logs after real traffic and add focused compound indexes for the most common filter combinations.

## Backup And Export Strategy

- Enable managed PostgreSQL automated daily backups.
- Retain at least 7 daily backups and one monthly backup for institutional reporting requirements.
- Test restore into a non-production database before launch and quarterly afterward.
- Store CSV/PDF report exports as generated artifacts only; do not treat browser downloads as backups.
- Keep Prisma migrations in source control and run `prisma migrate deploy` during release.

## Final Production Checklist

- Lint passes.
- Tests pass.
- Frontend build passes.
- Backend build passes.
- Production env validation passes on boot.
- Health check passes after deploy.
- Login/logout works against production API.
- Admin can create professor/student records.
- Professor can create and lock attendance.
- Reports load from database data.
- Notification logs are created even when SMTP is disabled.
- No demo data, fake production data, hardcoded credentials, or webhook URLs remain in production code.
