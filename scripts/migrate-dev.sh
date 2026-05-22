#!/usr/bin/env bash
set -euo pipefail
pnpm prisma validate
pnpm prisma generate
pnpm prisma migrate dev
