#!/usr/bin/env bash
set -euo pipefail
corepack enable
corepack prepare pnpm@10.15.0 --activate
pnpm install
if [ ! -f .env ]; then cp .env.example .env; fi
pnpm prisma generate
pnpm prisma migrate dev
pnpm prisma db seed
