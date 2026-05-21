# AttendanceTracker Functional QA Report

Date: 2026-05-21

## Environment

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:5001`
- Database: local PostgreSQL from `backend/.env`
- Seed users: development admin and professor from `backend/prisma/seed.ts`

## Results

| Feature | Status | Issue found | Root cause | Files changed | How tested |
| --- | --- | --- | --- | --- | --- |
| Local setup and health | Fixed | Frontend pointed to `5001` while backend used `5000`; port `5000` was occupied by macOS AirTunes. | Local env mismatch plus occupied system port. | `.env`, `backend/.env` | Started backend/frontend, verified `GET /api/health` returns 200 on `5001`. |
| Backend env validation | Fixed | Blank optional `SMTP_PORT=` blocked backend startup. | Zod number coercion converted empty string to `0`. | `backend/src/config/env.ts` | Restarted backend and verified no startup error with blank SMTP env. |
| Build/typecheck/lint scripts | Fixed | Required `npm run typecheck` command did not exist. | Scripts only had `lint` and `lint:strict`. | `package.json`, `backend/package.json` | Ran frontend/backend `npm run typecheck`. |
| Lint warnings | Fixed | Unused imports and hook dependency warnings. | Phase 13 gradual lint config exposed existing warnings. | `backend/src/services/report.service.ts`, `src/components/ManageProfessors.tsx`, `src/components/MarkAttendance.tsx`, `src/components/Notifications.tsx`, `src/components/Reports.tsx`, `src/components/Students.tsx`, `src/pages/PublicPages.tsx` | Ran frontend and backend `npm run lint` with zero warnings/errors. |
| Auth | Working | None after setup. | N/A | N/A | Tested admin login, professor login, wrong password, refresh token, logout, protected API rejection. |
| Role-based UI routes | Fixed | Admin could see professor attendance route; professor could see notifications route even though API rejected them. | Frontend used broad `ProtectedRoute` and sidebar links that did not match backend role policy. | `src/App.tsx`, `src/components/MainLayout.tsx` | Browser smoke: admin blocked from `/mark-attendance`; professor blocked from `/students` and `/notifications`. |
| Admin dashboard | Working | None found. | N/A | N/A | API and UI smoke verified dashboard loads real data. |
| Professor CRUD | Working | Submit button label differs from initial QA assumption. | UI uses `Register Professor`; behavior works. | N/A | UI created professor; API search/pagination/update/delete endpoints verified. |
| Student CRUD | Working | None found. | N/A | N/A | UI created student; API duplicate roll number returned 409. |
| Student import | Fixed | `xlsx` dependency had high-severity advisories with no fix. | Vulnerable SheetJS package used for Excel parsing. | `package.json`, `package-lock.json`, `src/components/Students.tsx` | Replaced with `read-excel-file/browser`; audit now reports zero production vulnerabilities; build/lint pass. |
| Class/subject/semester/section/assignment APIs | Working | No dedicated admin UI screen exists for these CRUD resources. | Backend APIs exist, but frontend only consumes them indirectly for filters/attendance. | N/A | Direct API CRUD verification for classes, subjects, semesters, sections, and assignments. |
| Professor dashboard | Working | Seed professor has no assignments until admin creates them. | Expected empty-state behavior. | N/A | UI and API verified assigned professor sees assignments. |
| Attendance creation | Working | None found. | N/A | N/A | UI verified assigned professor marks attendance with remarks and saves. |
| Duplicate attendance prevention | Working | Duplicate create returns 409. | Expected behavior. | N/A | Direct API duplicate create test. |
| Locked attendance | Working | Locked sessions reject edits with 409. | Expected behavior. | N/A | UI lock verified; API edit-after-lock verified. |
| Reports | Working | None found. | N/A | N/A | API overview/student/class/subject/low attendance verified; CSV/PDF export returned 200; UI reports page loads. |
| Notifications | Fixed | Attendance save did not create absent/low-attendance notification logs. | Notification service existed but was not wired into attendance persistence. | `backend/src/services/professor.service.ts` | Created absent attendance; verified `Absent Alert` and `Low Attendance` logs are created with skipped delivery when SMTP is absent. |
| Missing SMTP fallback | Working | None after env fix. | N/A | N/A | Test notification and attendance-triggered notifications logged as `Skipped`, backend did not crash. |
| Profile and settings | Working | None found. | N/A | N/A | API and UI smoke verified profile/settings load and save. |
| Responsive/mobile navigation | Working | None found in smoke test. | N/A | N/A | Browser smoke at 390px opened mobile navigation without console errors. |
| Security checks | Fixed | Production audit reported `xlsx` vulnerability. | Vulnerable frontend dependency. | `package.json`, `package-lock.json`, `src/components/Students.tsx` | `npm audit --omit=dev` passes for frontend and backend. |
| Deployment docs/config | Working | None found. | N/A | `README.md`, `docs/production-readiness.md`, `vercel.json`, `render.yaml`, `backend/railway.json`, `.github/workflows/ci.yml` | Verified docs/config files exist and reference env/deployment/checklist items. |

## Pending Items

- Build a first-class admin UI for class/course, subject, semester, section, and professor-subject assignment CRUD. Backend APIs work, but the React admin panel does not expose full CRUD screens for these resources.
- Add an automated scheduled job/worker for monthly notification alerts. The notification service and test endpoint work, but no scheduler is running monthly jobs.
- Add deeper accessibility testing with a dedicated tool such as axe; current pass used labels, keyboard submission, route checks, and Playwright smoke coverage.

## Commands Run

```bash
npm install
cd backend && npm install
cd backend && npx prisma generate
cd backend && npx prisma migrate dev --name qa_verification --skip-seed
cd backend && npm run prisma:seed
cd backend && npm run dev
npm run dev
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build
cd backend && npm run lint
cd backend && npm run typecheck
cd backend && npm test
cd backend && npm run build
npm audit --omit=dev
cd backend && npm audit --omit=dev
```

## Production Readiness Decision

AttendanceTracker is much closer to production readiness after this pass, but it is not fully production-ready until the pending admin academic CRUD UI and automated monthly notification scheduling are completed.
