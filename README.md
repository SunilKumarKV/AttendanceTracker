# AttendanceTracker

AttendanceTracker is a Vite + React attendance management app for college workflows. It includes role-aware pages for admins and professors, student management, attendance marking, notifications, reports, and settings.

## Setup

Prerequisites:

- Node.js 18 or newer
- npm

Install dependencies:

```bash
npm install
```

Create a local environment file:

```bash
cp .env.example .env.local
```

The default API base URL is:

```bash
VITE_API_BASE_URL=http://localhost:5000/api
```

## Scripts

- `npm run dev` starts the Vite development server on port 3000.
- `npm run build` creates a production build in `dist/`.
- `npm run preview` serves the production build locally.
- `npm run clean` removes the `dist/` directory.
- `npm run lint` runs TypeScript checks without emitting files.

## Backend Setup

The backend lives in `backend/` and uses Node.js, Express, TypeScript, PostgreSQL, and Prisma.

Install backend dependencies:

```bash
cd backend
npm install
```

Create a backend environment file:

```bash
cp .env.example .env
```

Configure these values before running database commands:

```bash
DATABASE_URL=
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
CLIENT_URL=http://localhost:5173
PORT=5000
```

Generate the Prisma client:

```bash
npm run prisma:generate
```

Run migrations:

```bash
npm run prisma:migrate
```

Start the backend in development:

```bash
npm run dev
```

Backend scripts:

- `npm run dev` starts the Express API with `tsx` watch mode.
- `npm run build` compiles TypeScript into `dist/`.
- `npm run start` runs the compiled server.
- `npm run prisma:migrate` runs Prisma migrations.
- `npm run prisma:generate` generates the Prisma client.
- `npm run prisma:seed` runs the seed script.

Health check:

```bash
curl http://localhost:5000/api/health
```

## Status

Phase 1 is a branding and configuration cleanup pass. The app is still using the existing frontend flows and mock fallback data; application logic has not been changed in this phase.
