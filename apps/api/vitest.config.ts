import { defineConfig } from 'vitest/config';

const includeIntegration = process.env.RUN_INTEGRATION_TESTS === 'true';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: includeIntegration ? ['src/**/*.test.ts', 'tests/**/*.test.ts'] : ['src/**/*.test.ts'],
    hookTimeout: 30_000,
    testTimeout: 30_000,
  },
});
