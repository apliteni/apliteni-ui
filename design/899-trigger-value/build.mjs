// This build changes only the review artifact. It never writes to the kit.
import { build } from 'esbuild';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const result = await build({
  entryPoints: [path.join(here, 'prototype.tsx')], bundle: true, write: false,
  alias: { '@apliteni/apliteni-ui': path.join(root, 'src/index.js') },
  outfile: 'prototype.js', minify: true, jsx: 'automatic', define: { 'process.env.NODE_ENV': '"production"' },
  plugins: [{ name: 'proposed-trigger', setup(build) {
    build.onResolve({ filter: /^proposal:Dropdown$/ }, () => ({ path: 'Dropdown', namespace: 'proposal' }));
    build.onLoad({ filter: /.*/, namespace: 'proposal' }, async () => {
      let contents = await readFile(path.join(root, 'react/src/Dropdown.tsx'), 'utf8');
      contents = contents.replaceAll('{label && <span className="ui-dropdown__pre">{label}</span>}', '');
      // The current ariaLabel names a normal panel, but does not name its trigger.
      // This proposal preserves custom trigger naming and adds name plus value outside Field.
      contents = contents.replace('aria-label={ariaLabel && triggerContent != null ? ariaLabel : undefined}',
        'aria-label={ariaLabel && !fieldName ? (triggerContent != null ? ariaLabel : `${ariaLabel}: ${shown ?? placeholder}`) : undefined}');
      return { contents, loader: 'tsx', resolveDir: path.join(root, 'react/src') };
    });
  } }],
});
const js = result.outputFiles.find(file => file.path.endsWith('.js')).text;
const css = result.outputFiles.find(file => file.path.endsWith('.css')).text;
const fonts = await readFile(path.join(here, 'fonts.css'), 'utf8');
await writeFile(path.join(here, 'index.html'), `<!doctype html><html lang="en" data-theme="light"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Dropdown trigger comparison</title><style>${fonts}\n${css}</style></head><body><div id="root"></div><script>${js.replaceAll('</script', '<\\/script')}</script></body></html>`);
