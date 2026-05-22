# AttendanceTracker v1.8 Upgrade Report

## Scope
Version 1.8 adds production-oriented library, lab equipment, equipment issue/return, and maintenance management while preserving existing PNPM-only setup and previous v1.x modules.

## Backend
- Added `libraryLab.routes.ts`
- Added `libraryLab.controller.ts`
- Added `libraryLab.service.ts`
- Added authenticated APIs under `/api/library-lab/*`
- Added stock decrement/increment through Prisma transactions for issue/return flows
- Added access control for admin, librarian, and lab in-charge staff roles
- Added PDF/CSV/Excel-compatible report export endpoint

## Prisma
- Added models:
  - `LibraryBook`
  - `LibraryBookIssue`
  - `LabEquipment`
  - `LabEquipmentIssue`
  - `MaintenanceRequest`
- Added enums:
  - `LibraryIssueTargetType`
  - `LibraryIssueStatus`
  - `EquipmentCondition`
  - `EquipmentIssueTargetType`
  - `EquipmentIssueStatus`
  - `MaintenanceStatus`
- Added migration:
  - `backend/prisma/migrations/20260522211500_v1_8_library_lab_maintenance/migration.sql`

## Frontend
- Added `src/api/libraryLab.ts`
- Added `src/components/LibraryLabManagement.tsx`
- Added `/library-lab` route
- Added sidebar navigation for admin and staff users

## Validation status
This sandbox does not have PNPM installed and cannot run PostgreSQL/Prisma validation. Run locally:

```bash
pnpm install
pnpm prisma generate
pnpm prisma validate
pnpm prisma migrate dev
pnpm build
pnpm dev
```

## E2E checklist
- Add book
- Issue book
- Return book
- Add lab equipment
- Issue equipment
- Return equipment
- Create maintenance request
- Update maintenance status
- Export reports
- Verify admin/librarian/lab in-charge access rules

## Decision
NO-GO until local PNPM + PostgreSQL validation passes.
