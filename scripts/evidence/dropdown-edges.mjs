/* #572, shot: a dropdown panel at the two ends of a row, at the width it was
 * reported at and at a desktop one, in both layers and both themes.
 *
 * Same rig as the rest of this folder — one static server, one Chrome, one
 * viewport — but over the two Storybook builds rather than over `shot.html`: the
 * subject is a row of triggers at the screen's edges, and React's half of it only
 * exists where React is running. The viewport is the frame on purpose: a panel
 * that is off the screen has to look off the screen.
 * why: scripts/evidence/README.md
 *
 * argv: <checkout> <outDir> [prefix]
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { settle } from './settle.mjs';
// Playwright is not a dependency of this package. why: scripts/evidence/README.md
const { chromium } = await import(process.env.UI_PLAYWRIGHT || 'playwright');

const HERE = path.dirname(new URL(import.meta.url).pathname);
const [checkoutArg, outDir, prefix = 'dropdown-edges'] = process.argv.slice(2);
const checkout = path.resolve(checkoutArg || '.');
mkdirSync(outDir, { recursive: true });

const HALVES = [
  { half: 'vanilla', dir: path.join(checkout, 'storybook-static'), id: 'components-dropdown--near-the-screen-edges', make: 'npm run build-storybook' },
  { half: 'react', dir: path.join(checkout, 'react/storybook-static'), id: 'react-dropdown--near-the-screen-edges', make: 'npm run build-storybook -w react' },
];
for (const h of HALVES) {
  if (!existsSync(path.join(h.dir, 'index.json'))) throw new Error(`no Storybook build at ${h.dir} — run: ${h.make}`);
}

const serve = (root) => new Promise((res, rej) => {
  const p = spawn(process.execPath, [path.join(HERE, 'serve.mjs'), root, path.join(HERE, 'shot.html')]);
  p.stdout.once('data', (d) => res({ port: Number(String(d).trim()), proc: p }));
  p.stderr.on('data', (d) => process.stderr.write(d));
  p.once('error', rej);
});

const browser = await chromium.launch({ executablePath: process.env.UI_CHROME });
const servers = [];
try {
  for (const h of HALVES) {
    const srv = await serve(h.dir);
    servers.push(srv);
    for (const width of [375, 1280]) {
      for (const theme of ['dark', 'light']) {
        // The first trigger in the row is `align: 'end'`, so its panel reaches back
        // towards the screen's start; the last is `align: 'start'` and runs past its
        // end. One image each, because a panel is only in one place at a time.
        for (const [which, pick] of [['start', 0], ['end', -1]]) {
          const name = `${prefix}-${h.half}-${width}-${theme}-${which}`;
          const ctx = await browser.newContext({ viewport: { width, height: 520 }, deviceScaleFactor: 2 });
          const page = await ctx.newPage();
          await page.goto(
            `http://127.0.0.1:${srv.port}/iframe.html?id=${h.id}&viewMode=story&globals=theme:${theme}`,
            { waitUntil: 'load' },
          );
          await page.waitForSelector('[data-dropdown-panel]', { state: 'attached' });
          await settle(page);
          await page.evaluate((at) => {
            const triggers = [...document.querySelectorAll('[data-dropdown-trigger]')];
            (at < 0 ? triggers[triggers.length + at] : triggers[at]).click();
          }, pick);
          await settle(page);
          await page.screenshot({ path: path.join(outDir, `${name}.png`) });
          console.log(`  ${name}.png`);
          await ctx.close();
        }
      }
    }
  }
} finally {
  await browser.close();
  for (const s of servers) s.proc.kill();
}
