import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.test.ts'],
    testTimeout: 60000, // 60s timeout for integration tests
    hookTimeout: 30000, // 30s for hooks
  },
  resolve: {
    alias: {
      '@llm-wiki/core': resolve(__dirname, '../packages/core/src'),
      '@llm-wiki/server': resolve(__dirname, '../packages/server/src'),
    },
  },
});
