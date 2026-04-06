import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    fileParallelism: false, // running tests synchronously to avoid database inconsistencies across multiple tests during setup/teardown
  },
});
