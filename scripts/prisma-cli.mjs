#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const apiDir = path.join(repoRoot, 'apps', 'api');
const schemaFromApi = '../../prisma/schema.prisma';
const rootEnvPath = path.join(repoRoot, '.env');

if (existsSync(rootEnvPath)) {
  const envText = readFileSync(rootEnvPath, 'utf8');
  for (const rawLine of envText.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const equalsIndex = line.indexOf('=');
    if (equalsIndex === -1) continue;
    const key = line.slice(0, equalsIndex).trim();
    let value = line.slice(equalsIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Usage: pnpm prisma <command> [args]');
  process.exit(1);
}

const hasSchema = args.some((arg) => arg === '--schema' || arg.startsWith('--schema='));
const prismaArgs = hasSchema ? args : [...args, '--schema', schemaFromApi];

const result = spawnSync('pnpm', ['--dir', apiDir, 'exec', 'prisma', ...prismaArgs], {
  cwd: repoRoot,
  env: process.env,
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}
process.exit(result.status ?? 1);
