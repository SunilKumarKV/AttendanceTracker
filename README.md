# AttendanceTracker V1 - Attendance MVP

AttendanceTracker is a full-stack attendance MVP for institutions. Version 1 includes secure JWT login, Super Admin/Admin/Teacher role access, class and academic setup, student and teacher management, subject assignments, date/class/subject attendance, low-attendance tracking, reports, CSV/PDF exports, and institution settings.

## Stack

- Frontend: React, TypeScript, Vite, Tailwind CSS, Playwright tests
- Backend: Node.js, Express, TypeScript, Prisma
- Database: PostgreSQL
- Auth: JWT access tokens plus refresh tokens stored in PostgreSQL

## Local Setup

1. Install dependencies:

```bash
pnpm install
cd backend
pnpm install
cd ..
```

2. Create environment files:

```bash
cp .env.example .env
cp backend/.env.example backend/.env
```

3. Create the PostgreSQL database named in `backend/.env`:

```bash
createdb attendancepro
```

4. Apply migrations and seed real development users/data:

```bash
cd backend
pnpm run prisma:migrate
pnpm run prisma:seed
cd ..
```

5. Run both apps:

```bash
cd backend
pnpm run dev
```

In another terminal:

```bash
pnpm run dev
```

Open `http://localhost:3000`.

## Environment

Frontend `.env`:

```env
VITE_API_BASE_URL=http://localhost:5000/api
VITE_APP_NAME=AttendanceTracker
```

Backend `.env` essentials:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/attendancepro?schema=public
PORT=5000
CLIENT_URL=http://localhost:3000
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
JWT_ACCESS_SECRET=replace_with_at_least_32_chars_for_production
JWT_REFRESH_SECRET=replace_with_at_least_32_chars_for_production
DEV_SEED_PASSWORD=Admin@123456
```

Optional SMTP, Sentry, analytics, Twilio, and WhatsApp provider variables are listed in `backend/.env.example`.

## Seeded Test Credentials

The development seed creates real database records: institution, admin, teacher, class, semester, section, subject, assignment, and students.

```txt
Admin: admin@attendancetracker.local
Teacher: professor@attendancetracker.local
Password: value of DEV_SEED_PASSWORD in backend/.env
```

The teacher email remains `professor@attendancetracker.local` for backward compatibility with older local data.

## V1 Features

- Role-based login for Super Admin, Admin, and Teacher roles
- JWT authentication and role-protected frontend/backend routes
- Admin dashboard with students, teachers, classes, today attendance, and low-attendance metrics
- Class, semester/year, section, subject, student, teacher, and assignment management
- Teacher attendance marking by date, class, section, and subject
- Duplicate attendance prevention for same class, section, subject, date, teacher, and period
- Optional attendance lock after submit
- Student, class, subject, date, monthly, and low-attendance reports
- Low-attendance bands below 75%, below 65%, and critical below 50%
- CSV and PDF report exports
- Institution name, academic year, minimum attendance, and notification/settings management
- Responsive sidebar UI, form validation, loading states, empty states, errors, toasts, and API error handling

## Useful Scripts

Frontend:

```bash
pnpm run dev
pnpm run typecheck
pnpm test -- --run
pnpm run test:e2e -- --reporter=line
pnpm run build
```

Backend:

```bash
cd backend
pnpm run dev
pnpm run prisma:generate
pnpm run prisma:migrate
pnpm run prisma:deploy
pnpm run prisma:seed
pnpm run seed:first-admin
pnpm run typecheck
pnpm test -- --run
pnpm run build
```

Health check:

```bash
curl http://localhost:5000/api/health
```

## Production Notes

- Use strong unique JWT secrets.
- Set `CLIENT_URL` and `CORS_ORIGINS` to deployed frontend origins.
- Run `pnpm run prisma:deploy` during backend deployment.
- Run `pnpm run seed:first-admin` once for production, then remove first-admin password variables.
- Configure SMTP/SMS/WhatsApp providers only when you are ready to send real notifications.

## Final Production Validation Notes

Run these from a clean checkout before every release:

```bash
pnpm install --frozen-lockfile
pnpm run typecheck
pnpm run lint
pnpm run test
pnpm run build
cd backend
pnpm install --frozen-lockfile
pnpm run prisma:generate
pnpm run prisma:deploy
pnpm run typecheck
pnpm run lint
pnpm run test
pnpm run build
```

Backend integration tests require a reachable PostgreSQL database using `DATABASE_URL`. Prisma generation requires access to Prisma engine binaries during first install or a preconfigured build cache.

## Version 1.1 Security Upgrade

Version 1.1 adds production security/user-control features while preserving Version 1 flows:

- Forgot password
- Reset password
- Change password
- User profile updates
- Admin audit logs
- Activity timeline
- Login history
- Stronger backend RBAC/audit visibility

### Required email environment

```env
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_password
SMTP_FROM=support@yourdomain.com
PASSWORD_RESET_URL=http://localhost:3000/reset-password
PASSWORD_RESET_TOKEN_EXPIRES_MINUTES=30
```

### PNPM-only setup

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
