# Architecture

AttendanceTracker is organized as a production PNPM monorepo.

- `apps/web`: React/Vite SPA responsible for role-based dashboards and user workflows.
- `apps/api`: Express API responsible for authentication, authorization, tenant enforcement, attendance, reports, communication, portals, staff, academic operations, and analytics.
- `prisma`: single source of truth for schema, migrations, and seed scripts.
- `packages/shared`: shared constants/types that can be adopted safely by web and API.
- `packages/ui`: reserved for reusable components extracted only when safe.
- `packages/config`: shared TypeScript/config base.

The API remains the authority for RBAC and tenant isolation. The frontend only hides/shows UI for usability; it is not the security boundary.
