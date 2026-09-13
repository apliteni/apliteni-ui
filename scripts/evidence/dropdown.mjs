/* The dropdown panel's head and foot, re-shot. Same rig as the rail's: one
 * static server over the checkout under test, the kit's own factories imported
 * as modules in the page, one Chrome, one viewport — so between two checkouts
 * only the code differs. why: scripts/evidence/README.md
 *
 * argv: <checkout> <outDir> [prefix] [only]
 */
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
// Playwright is not a dependency of this package — the kit ships no browser and
// nothing in `npm test` drives one. Point UI_PLAYWRIGHT at an install of it and
// UI_CHROME at the Chrome binary. why: scripts/evidence/README.md
const { chromium } = await import(process.env.UI_PLAYWRIGHT || 'playwright');

const HERE = path.dirname(new URL(import.meta.url).pathname);
const [checkout, outDir, prefix = 'dropdown', only] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });

const srv = await new Promise((res, rej) => {
  const p = spawn(process.execPath, [path.join(HERE, 'serve.mjs'), checkout, path.join(HERE, 'shot.html')]);
  p.stdout.once('data', (d) => res({ port: Number(String(d).trim()), proc: p }));
  p.stderr.on('data', (d) => process.stderr.write(d));
  p.once('error', rej);
});

// The two panels shot.html builds, and the height each needs with its panel
// open. Narrow: a dropdown is a popover, and a 1280-wide plate of empty page
// around a 280px panel says nothing about it.
const PANELS = { 'head-foot': 355, 'foot-controls': 400 };

const browser = await chromium.launch({ executablePath: process.env.UI_CHROME });
for (const [panel, height] of Object.entries(PANELS)) {
  for (const theme of ['dark', 'light']) {
    const name = `${prefix}-${panel}-${theme}`;
    if (only && !name.includes(only)) continue;
    const ctx = await browser.newContext({ viewport: { width: 420, height }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.goto(`http://127.0.0.1:${srv.port}/__shot?subject=dropdown&panel=${panel}&theme=${theme}`, { waitUntil: 'load' });
    await page.waitForFunction(() => window.__ready === true);
    await page.evaluate(() => document.fonts.ready);
    // The panel is rendered open rather than opened, but it still carries the
    // entry transition; nothing here is mid-travel.
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(outDir, `${name}.png`) });
    console.log(`  ${name}.png`);
    await ctx.close();
  }
}
await browser.close(); srv.proc.kill();
