# Contributing

Thank you for contributing.

## Local Setup

```bash
corepack enable
pnpm install
cp .env.example .env
pnpm prisma generate
pnpm prisma migrate dev
pnpm prisma db seed
pnpm dev
```

## Contribution Rules

- Follow existing code conventions
- Use PNPM only
- Do not commit secrets
- Keep changes production-safe
- Test affected functionality before submitting changes

## Pull Requests

Use the provided pull request template.
