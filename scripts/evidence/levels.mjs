/* #490's subject: the three levels of the elevation ladder on one screen — the
 * rail, a grid of cards, and a menu open over them — plus 1x crops of the three
 * edges the issue is about. Same rig as the rest: one static server over the
 * checkout under test, the kit's own factories imported as modules in the page,
 * one Chrome, one viewport, so between two checkouts only the code differs.
 * why: scripts/evidence/README.md
 *
 * argv: <checkout> <outDir> [prefix] [only]
 */
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { settle } from './settle.mjs';
// Playwright is not a dependency of this package — the kit ships no browser and
// nothing in `npm test` drives one. Point UI_PLAYWRIGHT at an install of it and
// UI_CHROME at the Chrome binary. why: scripts/evidence/README.md
const { chromium } = await import(process.env.UI_PLAYWRIGHT || 'playwright');

const HERE = path.dirname(new URL(import.meta.url).pathname);
const [checkout, outDir, prefix = 'levels', only] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });

const srv = await new Promise((res, rej) => {
  const p = spawn(process.execPath, [path.join(HERE, 'serve.mjs'), checkout, path.join(HERE, 'levels.html')]);
  p.stdout.once('data', (d) => res({ port: Number(String(d).trim()), proc: p }));
  p.stderr.on('data', (d) => process.stderr.write(d));
  p.once('error', rej);
});

/* 1280 is the desktop the shell is laid out for; 390 is the phone width where the
 * rail folds to its glyph column and the grid falls to one card. Both themes,
 * because the rule this subject is about is now a different device per theme and
 * "dark is untouched" is a claim a capture has to be able to refute. */
const WIDTHS = { 1280: 1280, 390: 390 };

/* The edges the issue names, cropped at 1x off the full shot so the crop is the
 * same pixels a reader sees — a re-shot crop is a second rendering, not a
 * detail of the first. Boxes are in CSS px on the 1280 screen. */
const CROPS = {
  // the top-left corner of the second card, on the page
  'card-edge': { x: 735, y: 230, width: 240, height: 120 },
  // the rail's right edge, against the page, clear of every row
  'rail-edge': { x: 180, y: 560, width: 180, height: 120 },
  // the menu's bottom edge, where it crosses the card it covers
  'menu-edge': { x: 400, y: 340, width: 280, height: 110 },
};

const browser = await chromium.launch({ executablePath: process.env.UI_CHROME });

// The server is a child process: a throw between here and the kill would leave
// it holding its port after this script exits.
try {
  for (const [label, width] of Object.entries(WIDTHS)) {
    for (const theme of ['light', 'dark']) {
      const name = `${prefix}-${label}-${theme}`;
      if (only && !name.includes(only)) continue;
      const ctx = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1 });
      const page = await ctx.newPage();
      await page.goto(`http://127.0.0.1:${srv.port}/__shot?theme=${theme}`, { waitUntil: 'load' });
      await page.waitForFunction(() => window.__ready === true);
      await settle(page);
      await page.screenshot({ path: path.join(outDir, `${name}.png`), fullPage: false });
      console.log(`  ${name}.png`);
      // The crops come off the same rendering, at 1x, at the desktop width only —
      // a 390 screen has no rail edge to crop.
      if (width === 1280 && theme === 'light') {
        for (const [part, clip] of Object.entries(CROPS)) {
          await page.screenshot({ path: path.join(outDir, `${prefix}-crop-${part}.png`), clip });
          console.log(`  ${prefix}-crop-${part}.png`);
        }
      }
      await ctx.close();
    }
  }

  /* The fields card sits below a 900px fold, and it carries the subject this
   * change has to leave alone: an enabled control beside a disabled one. Shot
   * tall, in light, and cropped to the pair. */
  const name = `${prefix}-states-light`;
  if (!only || name.includes(only)) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 1400 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.goto(`http://127.0.0.1:${srv.port}/__shot?theme=light`, { waitUntil: 'load' });
    await page.waitForFunction(() => window.__ready === true);
    await settle(page);
    await page.screenshot({ path: path.join(outDir, `${name}.png`) });
    console.log(`  ${name}.png`);
    await page.screenshot({
      path: path.join(outDir, `${prefix}-crop-disabled.png`),
      clip: { x: 395, y: 740, width: 360, height: 270 },
    });
    console.log(`  ${prefix}-crop-disabled.png`);
    await ctx.close();
  }
} finally {
  await browser.close();
  srv.proc.kill();
}
