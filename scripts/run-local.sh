#!/usr/bin/env bash
set -euo pipefail
cp -n .env.local.example .env || true
npm install
npm run dev
