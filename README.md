# AttendanceTracker

Production-ready attendance management platform built with a scalable PNPM monorepo architecture.

## Overview

AttendanceTracker is designed as a modern institute attendance management system for students, teachers, administrators, reporting workflows, and production deployment.

This repository uses a production-focused monorepo architecture with shared packages, Prisma database management, CI validation, and deployment documentation.

## Core Features

- Student attendance tracking
- Teacher/admin management workflows
- Role-based application architecture
- Shared frontend/backend TypeScript packages
- PostgreSQL + Prisma database layer
- PNPM monorepo architecture
- CI validation pipeline
- Production deployment documentation
- Scalable package separation for long-term maintenance

## Architecture

```txt
apps/web        React + Vite frontend
apps/api        Node.js + Express backend
packages/shared Shared types/constants
packages/ui     Reusable UI components
packages/config Shared config
prisma          Schema, migrations, seed
scripts         Setup helpers
docs            Architecture / API / Security / Deployment
```

## Tech Stack

### Frontend
- React
- Vite
- TypeScript

### Backend
- Node.js
- Express
- TypeScript

### Database
- PostgreSQL
- Prisma ORM

### Tooling
- PNPM
- GitHub Actions
- ESLint
- Turbo

## Local Setup

### Requirements
- Node.js 20+
- PNPM 10+
- PostgreSQL 14+

### Install

```bash
corepack enable
corepack prepare pnpm@10.15.0 --activate
pnpm install
cp .env.example .env
```

### Database

```bash
pnpm prisma validate
pnpm prisma generate
pnpm prisma migrate dev
pnpm prisma db seed
```

### Run Development

```bash
pnpm dev
```

Web: http://localhost:3000  
API: http://localhost:5001/api

## Validation Commands

```bash
pnpm lint
pnpm type-check
pnpm build
```

## Production Engineering Standards

This repository includes:

- Pull request template
- Bug report template
- Feature request template
- Security policy
- Contribution guide
- MIT license
- CI pipeline
- Production documentation

## Documentation

See:

- docs/architecture.md
- docs/deployment.md
- docs/api.md
- docs/security.md

## Contribution

Please review CONTRIBUTING.md before contributing.

## Security

Please review SECURITY.md for responsible disclosure.

## License

MIT
