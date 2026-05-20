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

## Status

Phase 1 is a branding and configuration cleanup pass. The app is still using the existing frontend flows and mock fallback data; application logic has not been changed in this phase.
