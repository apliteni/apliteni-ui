import { build } from 'esbuild';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');
// Cached font data makes each output work without network access or same-origin permission.
const fonts = await readFile(resolve(here, 'fonts.css'), 'utf8');
const sheet = await build({ entryPoints: [resolve(root, 'src/index.css')], bundle: true, write: false, minify: true });
const extra = await readFile(resolve(here, 'prototype.css'), 'utf8');
for (const variant of ['main', 'shared', 'product', 'current']) {
  const result = await build({ entryPoints: [resolve(here, 'prototype.tsx')], bundle: true,
    write: false, minify: true, jsx: 'automatic', define: { 'process.env.NODE_ENV': '"production"' },
    alias: { '@apliteni/apliteni-ui': resolve(root, 'src/index.js') },
    plugins: variant === 'main' ? [] : [{ name: 'proposed-filter-behavior', setup(builder) {
      builder.onLoad({ filter: /\/react\/src\/FilterBar\.tsx$/ }, async ({ path }) => {
        let contents = await readFile(path, 'utf8');
        // A production API is proposed in contract.md. This transform changes only the study bundle.
        contents = contents.replace('variant="select" ariaLabel=', 'variant="select" title={filterChipName(filter)} ariaLabel=');
        if (variant === 'current') contents = contents.replace('new Set(chipLines(filter))', 'new Set([filter.label, filterChipText(filter)])');
        return { contents, loader: 'tsx', resolveDir: dirname(path) };
      });
    } }],
  });
  const css = `${fonts}\n${sheet.outputFiles[0].text}\n${extra}`;
  const js = result.outputFiles[0].text.replaceAll('</script', '<\\/script');
  await writeFile(resolve(here, `${variant}.html`), `<!doctype html>
<html lang="en" data-theme="light" data-variant="${variant}"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>FilterBar / ${variant}</title><style>${css}</style></head>
<body><div id="root"></div><script>${js}</script></body></html>\n`);
}
