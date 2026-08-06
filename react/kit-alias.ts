import { fileURLToPath } from 'node:url';

// `@apliteni/apliteni-ui` is not a dependency of this workspace — it *is* this
// workspace's package. In the published tarball `react/dist/index.js` sits inside
// @apliteni/apliteni-ui, so the bare specifier resolves to the package itself. In
// the repo there is no node_modules copy to resolve to, so the dev tooling (vitest,
// Storybook) is pointed at the very same files. Same source either way — which is
// the point: the class-name parity tests now compare React output against the
// working tree, not against whatever version happens to be published on npm.
const src = (file: string) => fileURLToPath(new URL(`../src/${file}`, import.meta.url));

export const kitAlias = [
  { find: '@apliteni/apliteni-ui/css', replacement: src('index.css') },
  { find: /^@apliteni\/apliteni-ui$/, replacement: src('index.js') },
];
