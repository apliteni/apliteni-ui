// Serves the repository so variants.html can import the kit's ES modules and the
// React modal's .tsx straight from source. A review prototype's server, not the
// kit's build: the kit ships CSS and HTML-string factories and has no Vite build
// of its own (Storybook and site/build.mjs are the two that exist).
//
//   npx vite --config docs/reviews/295-elevation/vite.config.js
//
// The alias is react/kit-alias.ts restated in JS, for the same reason that file
// gives: `@apliteni/apliteni-ui` is this repository, so there is no node_modules
// copy to resolve to and the dev server is pointed at the working tree.
import { fileURLToPath } from 'node:url';

const src = (file) => fileURLToPath(new URL(`../../../src/${file}`, import.meta.url));

export default {
  root: fileURLToPath(new URL('../../..', import.meta.url)),
  server: { port: 5295, strictPort: true },
  resolve: {
    alias: [
      { find: '@apliteni/apliteni-ui/css', replacement: src('index.css') },
      { find: /^@apliteni\/apliteni-ui$/, replacement: src('index.js') },
    ],
  },
};
