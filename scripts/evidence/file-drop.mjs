/* The file drop's row, shot from the built React component's own markup.
 *
 * No Storybook here, unlike react.mjs: FileDrop takes its whole subject through
 * props, so it is rendered to static markup in this process and inlined in a
 * plain page with the shipped stylesheets. The pixels are the shipped
 * component's, and nothing in the shot comes from a story's own CSS. Build the
 * package first: `npm run build -w react`.
 *
 * Uploading and failed, light and dark, at 1280, 390 and 320, plus the name that
 * fits none of them at the two narrow steps — the case the stack exists for.
 *
 * argv: <checkout> <outDir>
 * why: docs/components.md#react-file-drop
 */
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// Playwright is not a dependency of this package — the kit ships no browser and
// nothing in `npm test` drives one. why: scripts/evidence/README.md
const { chromium } = await import(process.env.UI_PLAYWRIGHT || 'playwright');
const [checkout, outDir] = process.argv.slice(2);
const root = path.resolve(checkout);
mkdirSync(outDir, { recursive: true });

// Same specifier rewrite the row-height gate uses: the bundle imports the kit by
// its published name, which resolves only through the workspace alias.
const at = (rel) => JSON.stringify(pathToFileURL(path.join(root, rel)).href);
const bundle = readFileSync(path.join(root, 'react/dist/index.js'), 'utf8')
  .replace(/(['"])@apliteni\/apliteni-ui\/motion\1/g, at('src/motion.js'))
  .replace(/(['"])@apliteni\/apliteni-ui\/inline\1/g, at('src/inline.js'))
  .replace(/(['"])@apliteni\/apliteni-ui\1/g, at('src/index.js'));
const shim = path.join(root, 'react/dist/.shot-subject.mjs');
writeFileSync(shim, bundle);
let kit;
try { kit = await import(pathToFileURL(shim).href); } finally { rmSync(shim, { force: true }); }

const { createElement } = await import('react');
const { renderToStaticMarkup } = await import('react-dom/server');

const SHORT = 'statement-2026-08.pdf';
const LONG = 'frankfurt-settlement-statement-2026-08-final-revision-two-signed.pdf';
const noop = () => {};
const state = (name, kind) => kind === 'uploading'
  ? { file: { name, size: '248 KB', status: 'uploading', progress: 40 }, onRemove: noop }
  : { file: { name, size: '248 KB', status: 'error', error: 'Larger than 10 MB' }, onRetry: noop, onRemove: noop };

/* The page a product draws: the grey ground, a panel on it, the statements the
   drop feeds above the row. Nothing on the grey ground but the panel. */
const PAGE = (markup, theme) => `<!doctype html>
<html lang="en" data-theme="${theme}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&family=IBM+Plex+Sans:wght@300;400;500;600;700&display=swap">
<link rel="stylesheet" href="/src/index.css">
<link rel="stylesheet" href="/react/dist/index.css">
<style>
  html, body { margin: 0; padding: 0; background: var(--bg); color: var(--text); font-family: var(--font-sans); }
  .pg { padding: var(--space-4); }
  .panel { background: var(--surface); --ring-gap: var(--surface); border-radius: var(--radius-md);
    box-shadow: inset 0 0 0 1px var(--border); padding: var(--space-4); }
  .panel__head { font: 600 13px/1.5 var(--font-sans); color: var(--strong); margin-bottom: var(--space-3); }
  .rows__row { display: flex; justify-content: space-between; gap: var(--space-4);
    font: 400 13px/1.6 var(--font-sans); color: var(--text); padding-block: var(--space-1); }
  .rows + .ui-drop { margin-top: var(--space-3); }
</style></head>
<body><div class="pg"><div class="panel">
  <div class="panel__head">Statements</div>
  <div class="rows">
    <div class="rows__row"><span>statement-2026-07.pdf</span><span>241 KB</span></div>
    <div class="rows__row"><span>statement-2026-06.pdf</span><span>236 KB</span></div>
  </div>
  ${markup}
</div></div></body></html>`;

const pages = new Map();
const SHOTS = [];
for (const kind of ['uploading', 'failed']) {
  for (const [tag, name] of [['', SHORT], ['-longname', LONG]]) {
    const markup = renderToStaticMarkup(createElement(kit.FileDrop, state(name, kind)));
    for (const theme of ['light', 'dark']) {
      const key = `${kind}${tag}-${theme}`;
      pages.set(key, PAGE(markup, theme));
      // The long name is the case that decides the layout, so it is shot at the
      // narrow steps where it is actually cut.
      for (const width of tag ? [320, 390] : [320, 390, 1280]) {
        SHOTS.push({ key, name: `option-a-${kind}${tag}-${theme}-${width}.png`, width });
      }
    }
  }
}

const serveDir = path.join(root, '.shot-pages');
mkdirSync(serveDir, { recursive: true });
for (const [key, html] of pages) writeFileSync(path.join(serveDir, `${key}.html`), html);

const port = await new Promise((resolve, reject) => {
  const p = spawn(process.execPath, [path.join(root, 'scripts/evidence/serve.mjs'), root,
    path.join(root, 'scripts/evidence/shot.html')]);
  p.stdout.once('data', (d) => resolve(Number(String(d).trim())));
  p.stderr.on('data', (d) => process.stderr.write(d));
  p.once('error', reject);
});

// No --deterministic-mode: it hangs a page that runs modules. Hinting off is what
// keeps the raster steady between runs.
const browser = await chromium.launch({
  executablePath: process.env.UI_CHROME,
  args: ['--font-render-hinting=none', '--disable-lcd-text', '--disable-gpu'],
});
try {
  for (const shot of SHOTS) {
    const ctx = await browser.newContext({
      viewport: { width: shot.width, height: 320 }, deviceScaleFactor: 2, reducedMotion: 'reduce',
    });
    const page = await ctx.newPage();
    await page.goto(`http://127.0.0.1:${port}/.shot-pages/${shot.key}.html`, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(250);
    const panel = await page.locator('.pg');
    await panel.screenshot({ path: path.join(outDir, shot.name) });
    await ctx.close();
    console.log(shot.name);
  }
} finally {
  await browser.close();
  rmSync(serveDir, { recursive: true, force: true });
  process.exit(0);
}
