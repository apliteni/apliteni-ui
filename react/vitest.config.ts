import { defineConfig } from 'vitest/config';
import { kitAlias } from './kit-alias';

export default defineConfig({
  resolve: { alias: kitAlias },
  test: { globals: true, environment: 'jsdom', setupFiles: ['./src/test-setup.ts'] },
});
