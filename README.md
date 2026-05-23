# AttendanceTracker SaaS Monorepo

AttendanceTracker is a PNPM/Turbo monorepo containing the React web app, Express API, shared packages, Prisma schema, migrations, and production documentation.

## Structure

```txt
apps/web        React + Vite frontend
apps/api        Node.js + Express backend
packages/shared Shared TypeScript constants/types
packages/ui     Safe reusable UI package scaffold
packages/config Shared TS/config base files
prisma          Prisma schema, migrations, seed scripts
docs            Architecture, deployment, API, security docs
scripts         Local setup helper scripts
```

## Requirements

- Node.js 20 LTS or 22 LTS
- PNPM 10.x via Corepack
- PostgreSQL 14+

## Setup

```bash
corepack enable
corepack prepare pnpm@10.15.0 --activate
pnpm install
cp .env.example .env
pnpm prisma generate
pnpm prisma migrate dev
pnpm prisma db seed
pnpm dev
```

Web: http://localhost:3000  
API: http://localhost:5001/api

## Main Commands

```bash
pnpm dev
pnpm build
pnpm lint
pnpm type-check
pnpm prisma generate
pnpm prisma validate
pnpm prisma migrate dev
pnpm prisma db seed
```

## Deployment

See `docs/deployment.md`.

## Security

See `docs/security.md`.