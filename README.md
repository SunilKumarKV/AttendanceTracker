# AttendanceTracker

AttendanceTracker is a full-stack attendance management system for institutions. The app includes role-based admin and professor workflows, student and professor management, attendance sessions, reports, notifications, profile/settings, and production-oriented deployment tooling.

## Project Structure

- `src/` contains the Vite + React frontend.
- `backend/` contains the Node.js + Express + TypeScript API.
- `backend/prisma/` contains the PostgreSQL schema, migrations, and seed scripts.
- `tests/e2e/` contains Playwright browser tests.

## Frontend Setup

Prerequisites:

- Node.js 20 recommended
- npm

Install dependencies:

```bash
npm install
```

Create a frontend environment file:

```bash
cp .env.example .env.local
```

Frontend environment variables:

```bash
VITE_API_BASE_URL=http://localhost:5000/api
VITE_APP_NAME=AttendanceTracker
```

Frontend scripts:

- `npm run dev` starts the Vite development server.
- `npm run build` creates a production build in `dist/`.
- `npm run preview` serves the production build locally.
- `npm run lint` runs ESLint and TypeScript checks.
- `npm run lint:strict` runs the gradual strict TypeScript config.
- `npm test` runs frontend unit tests.
- `npm run test:e2e` runs Playwright tests.

## Backend Setup

The backend uses Node.js, Express, TypeScript, PostgreSQL, and Prisma.

```bash
cd backend
npm install
cp .env.example .env
```

Required backend environment variables:

```bash
DATABASE_URL=
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
CLIENT_URL=http://localhost:5173
CORS_ORIGINS=
PORT=5000
LOG_LEVEL=info
SENTRY_DSN=
ANALYTICS_WRITE_KEY=
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
SUPPORT_EMAIL=
```

Production secrets:

- Use unique `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` values with at least 32 characters.
- Set `CLIENT_URL` to the deployed frontend URL.
- Set `CORS_ORIGINS` to any additional allowed origins as a comma-separated list.
- Leave SMTP/Sentry/analytics empty until providers are configured; the app uses safe no-op fallbacks.

Backend scripts:

- `npm run dev` starts the API in watch mode.
- `npm run build` compiles TypeScript into `dist/`.
- `npm run start` runs the compiled production server.
- `npm run prisma:migrate` runs local development migrations.
- `npm run prisma:deploy` applies existing migrations in production.
- `npm run prisma:generate` generates the Prisma client.
- `npm run prisma:seed` seeds development admin/professor accounts and refuses to run in production.
- `npm run seed:first-admin` creates the first production admin from environment variables.
- `npm run lint` runs ESLint and TypeScript checks.
- `npm test` runs backend unit and integration tests.

Health check:

```bash
curl http://localhost:5000/api/health
```

## First Production Admin

Set these variables in the backend environment before running the first-admin seed:

```bash
FIRST_ADMIN_INSTITUTION_NAME=
FIRST_ADMIN_INSTITUTION_CODE=
FIRST_ADMIN_NAME=
FIRST_ADMIN_EMAIL=
FIRST_ADMIN_PASSWORD=
```

Then run:

```bash
cd backend
npm run seed:first-admin
```

## Deployment

Frontend:

- Vercel can use `vercel.json`.
- Build command: `npm run build`
- Output directory: `dist`
- Required env: `VITE_API_BASE_URL`, `VITE_APP_NAME`

Backend:

- Render can use `render.yaml`.
- Railway can use `backend/railway.json`.
- Build command: `npm ci && npm run prisma:generate && npm run build && npm run prisma:deploy`
- Start command: `npm run start`
- Health check: `/api/health`

## CI/CD

GitHub Actions runs install, lint, gradual typecheck, tests, Prisma migration deploy for CI PostgreSQL, and builds for both frontend and backend.

## Production Checklist

- Configure frontend env variables in Vercel.
- Configure backend env variables in Render/Railway.
- Use production PostgreSQL with backups enabled.
- Run `npm run prisma:deploy` during backend deploy.
- Run `npm run seed:first-admin` once, then remove first-admin password variables.
- Confirm `/api/health` passes.
- Confirm production CORS only allows the deployed frontend.
- Confirm SMTP is configured before enabling email delivery.
- Confirm Sentry/analytics providers are installed before setting DSNs/write keys.
- Confirm no development seed runs in production.
- Confirm no hardcoded credentials or webhook URLs are present in production code.
- Run lint, tests, frontend build, and backend build before release.

More deployment and safety notes live in `docs/production-readiness.md`.
