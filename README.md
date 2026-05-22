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
npm install
cd backend
npm install
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
npm run prisma:migrate
npm run prisma:seed
cd ..
```

5. Run both apps:

```bash
cd backend
npm run dev
```

In another terminal:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Environment

Frontend `.env`:

```env
VITE_API_BASE_URL=http://localhost:5001/api
VITE_APP_NAME=AttendanceTracker
```

Backend `.env` essentials:

```env
DATABASE_URL=postgresql://sunilkumarkv@localhost:5432/attendancepro?schema=public
PORT=5001
CLIENT_URL=http://localhost:3000
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
JWT_ACCESS_SECRET=change_me_local_access_secret
JWT_REFRESH_SECRET=change_me_local_refresh_secret
DEV_SEED_PASSWORD=Admin@123456
```

Optional SMTP, Sentry, analytics, Twilio, and WhatsApp provider variables are listed in `backend/.env.example`.

## Seeded Test Credentials

The development seed creates real database records: institution, admin, teacher, class, semester, section, subject, assignment, and students.

```txt
Admin: admin@attendancetracker.local
Teacher: professor@attendancetracker.local
Password: Admin@123456
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
npm run dev
npm run typecheck
npm test -- --run
npm run test:e2e -- --reporter=line
npm run build
```

Backend:

```bash
cd backend
npm run dev
npm run prisma:generate
npm run prisma:migrate
npm run prisma:deploy
npm run prisma:seed
npm run seed:first-admin
npm run typecheck
npm test -- --run
npm run build
```

Health check:

```bash
curl http://localhost:5001/api/health
```

## Production Notes

- Use strong unique JWT secrets.
- Set `CLIENT_URL` and `CORS_ORIGINS` to deployed frontend origins.
- Run `npm run prisma:deploy` during backend deployment.
- Run `npm run seed:first-admin` once for production, then remove first-admin password variables.
- Configure SMTP/SMS/WhatsApp providers only when you are ready to send real notifications.
