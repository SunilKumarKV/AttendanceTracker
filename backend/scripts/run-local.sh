#!/usr/bin/env bash
set -euo pipefail
cp -n .env.local.example .env || true
pnpm install
pnpm run prisma:generate
pnpm run prisma:migrate
pnpm run seed
pnpm run dev
