// Bundles each layout into one HTML file with the kit's built CSS and JS inlined.
// Usage: KIT_MODULES=<folder with @apliteni/apliteni-ui@0.164.0, react@19, react-dom@19 and esbuild> node build.mjs
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const nodePaths = [process.env.KIT_MODULES];
const { build } = await import(join(process.env.KIT_MODULES, 'esbuild', 'lib', 'main.js'));
const kit = join(process.env.KIT_MODULES, '@apliteni', 'apliteni-ui');
const fonts = 'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&family=IBM+Plex+Sans:wght@300;400;500;600;700&display=swap';

const css = await build({
  stdin: { contents: `@import "${kit}/src/index.css"; @import "${kit}/react/dist/index.css"; @import "./glue.css";`, resolveDir: here, loader: 'css' },
  bundle: true, write: false, nodePaths,
});

for (const [id, name] of [['a', 'Equal providers'], ['b', 'Last provider first'], ['c', 'Error as its own step']]) {
  const js = await build({
    entryPoints: [join(here, `layout-${id}.tsx`)], bundle: true, write: false, format: 'iife', minify: true,
    jsx: 'automatic', alias: { '@apliteni/apliteni-ui/react': join(kit, 'react', 'dist', 'index.js') }, define: { 'process.env.NODE_ENV': '"production"' }, nodePaths,
  });
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Sign-in layout ${id.toUpperCase()}: ${name}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${fonts}">
<style>${css.outputFiles[0].text}</style></head>
<body><div id="root"></div><script>${js.outputFiles[0].text.replaceAll('</script', '<\\/script')}</script></body></html>
`;
  writeFileSync(join(here, '..', `layout-${id}.html`), html);
  console.log(`layout-${id}.html`, Math.round(html.length / 1024), 'KB');
}
