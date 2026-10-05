import { defineConfig } from 'vitest/config';
import { kitAlias } from './kit-alias';
import { SlowTests } from '../scripts/slow-tests.mjs';

export default defineConfig({
  resolve: { alias: kitAlias },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    reporters: ['default', new SlowTests()],
  },
});
