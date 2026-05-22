#!/usr/bin/env bash
set -euo pipefail
cp -n .env.local.example .env || true
npm install
npm run prisma:generate
npm run prisma:migrate
npm run seed
npm run dev
