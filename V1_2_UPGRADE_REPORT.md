# AttendanceTracker Version 1.2 Upgrade Report

## Scope
Upgraded the existing PNPM-only AttendanceTracker project from v1.1 to v1.2 without rewriting existing v1/v1.1 flows.

## Files changed
- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/20260523130000_v12_attendance_control/migration.sql`
- `backend/src/services/attendanceControl.service.ts`
- `backend/src/services/professor.service.ts`
- `backend/src/services/adminCrud.service.ts`
- `backend/src/controllers/admin.controller.ts`
- `backend/src/controllers/professor.controller.ts`
- `backend/src/routes/admin.routes.ts`
- `backend/src/routes/professor.routes.ts`
- `backend/src/validators/admin.validator.ts`
- `backend/src/validators/attendance.validator.ts`
- `src/api/admin.ts`
- `src/api/professor.ts`
- `src/App.tsx`
- `src/components/MainLayout.tsx`
- `src/components/Dashboard.tsx`
- `src/components/AttendanceControl.tsx`
- `src/components/TeacherRequests.tsx`

## Prisma changes
Added:
- `RequestStatus` enum
- `AttendancePolicy`
- `Holiday`
- `AttendanceCorrectionRequest`
- `LeaveRequest`

Updated relations:
- `Institution`
- `User`
- `Student`
- `AttendanceSession`
- `AttendanceRecord`

## Backend APIs added
Admin:
- `GET /api/attendance-policy`
- `PATCH /api/attendance-policy`
- `GET /api/attendance-calendar/today`
- `GET /api/holidays`
- `POST /api/holidays`
- `PATCH /api/holidays/:id`
- `DELETE /api/holidays/:id`
- `GET /api/correction-requests`
- `POST /api/correction-requests/:id/approve`
- `POST /api/correction-requests/:id/reject`
- `GET /api/leave-requests`
- `POST /api/leave-requests/:id/approve`
- `POST /api/leave-requests/:id/reject`

Teacher:
- `GET /api/attendance/correction-requests`
- `POST /api/attendance/correction-requests`
- `GET /api/attendance/leave-requests`
- `POST /api/attendance/leave-requests`

## Frontend pages/components added
- Admin Attendance Control page: `/attendance-control`
- Teacher Requests page: `/teacher-requests`
- Dashboard v1.2 cards for pending corrections, pending leaves, and today working/holiday status

## Business rules implemented
- Teacher correction request with required reason
- Admin approve/reject correction requests
- Correction history stored
- Direct attendance editing blocked when locked/frozen
- Configurable lock-after-hours policy
- Holiday calendar blocks attendance marking
- Weekend/non-working day rule blocks attendance marking
- Leave request creation and admin approval/rejection
- Approved leave automatically marks matching attendance records as `EXCUSED`
- In-app notification log entries created for correction/leave actions

## PNPM validation commands
Run locally:

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

## Test results
This sandbox does not have PNPM installed and cannot download Prisma engines, so local runtime/database validation must be completed on your machine.

Required local v1.2 validation:
- teacher correction request
- admin approve/reject correction
- attendance lock rule
- holiday attendance block
- weekend attendance block
- leave request approval
- reports with approved leave shown as `EXCUSED`
- dashboard counts

## Decision
NO-GO until local PNPM + PostgreSQL validation passes.
