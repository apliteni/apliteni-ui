import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  external: ['react', 'react-dom', '@apliteni/apliteni-ui'],
  // Everything ships as one bundled module, so a Server Component that imports
  // the stateless Badge still pulls in the module that calls useState. Without
  // this directive a Next.js App Router build fails on the first import. The
  // banner is emitted before the import statements — anywhere else and React's
  // bundler plugins ignore it, which is why the packaging guard asserts it is
  // the first line of react/dist/index.js.
  banner: { js: '"use client";' },
});
