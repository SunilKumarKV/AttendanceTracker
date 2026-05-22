# Deployment

## Web

Deploy `apps/web` to Vercel/Netlify/static hosting.

Build command:

```bash
pnpm --filter @attendance/web build
```

Output directory:

```txt
apps/web/dist
```

Required web env:

```txt
VITE_API_BASE_URL=https://api.your-domain.com/api
```

## API

Deploy `apps/api` to Render/Railway/Fly/AWS.

Build command:

```bash
pnpm --filter @attendance/api prisma:generate
pnpm --filter @attendance/api build
```

Start command:

```bash
pnpm --filter @attendance/api start
```

Production migration command:

```bash
pnpm --filter @attendance/api prisma:deploy
```

## Prisma

The schema and migrations live at repository root under `prisma/`. API scripts already pass `--schema ../../prisma/schema.prisma`.

Do not run `prisma migrate reset` against production.
