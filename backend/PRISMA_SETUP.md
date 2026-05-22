# Prisma setup and validation

This backend uses Prisma with PostgreSQL. Prisma versions are pinned exactly in `package.json` and `pnpm-lock.yaml` to avoid accidental CLI/client/engine mismatches.

## Required local versions

- Node.js: `>=20.11.0 <23`
- pnpm: `>=9 <11`
- PostgreSQL: running locally or reachable through `DATABASE_URL`

## Clean setup

```bash
cd backend
rm -rf node_modules
pnpm install --frozen-lockfile
cp .env.example .env
# update DATABASE_URL in .env
pnpm prisma generate
pnpm prisma validate
pnpm prisma migrate dev
```

## Why `postinstall` was removed

Prisma generation is intentionally run as an explicit command instead of a pnpm `postinstall` hook. This makes CI/deployment failures visible at the correct step and prevents pnpm install from hanging or failing silently when the Prisma engine binary cannot be downloaded due to network/DNS restrictions.

## If engine download fails

Check network access from the machine running the command:

```bash
curl -I https://binaries.prisma.sh
```

Then retry:

```bash
pnpm run prisma:generate
pnpm run prisma:validate
```
