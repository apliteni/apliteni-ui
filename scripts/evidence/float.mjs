/* The floating step's evidence, before and after. Same rig as shoot.mjs; the two
 * subjects are the ones docs/reviews/295-popover-variants.html measured.
 *
 * argv: <checkout> <outDir> [prefix=after] [only]
 * why: scripts/evidence/README.md
 * why: docs/specification.md#elevation
 */
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
const { chromium } = await import(process.env.UI_PLAYWRIGHT || 'playwright');

const HERE = path.dirname(new URL(import.meta.url).pathname);
const CHROME = process.env.UI_CHROME;
const [checkout, outDir, prefix = 'after', only] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });

const port = await new Promise((resolve, reject) => {
  const p = spawn(process.execPath, [path.join(HERE, 'serve.mjs'), checkout, path.join(HERE, 'float.html')]);
  p.stdout.once('data', (d) => resolve(Number(String(d).trim())));
  p.stderr.on('data', (d) => process.stderr.write(d));
  p.once('error', reject);
});

const browser = await chromium.launch({ executablePath: CHROME });

/* The cell rather than the viewport: a drop falls outside the card, so the frame
 * has to carry the ground beside it. .fl-cell is the card plus that margin. */
for (const frame of ['list', 'form']) {
  for (const theme of ['dark', 'light']) {
    for (const width of [1440, 390]) {
      const name = `${prefix}-${frame}-${theme}-${width}`;
      if (only && !name.includes(only)) continue;
      const ctx = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1 });
      const page = await ctx.newPage();
      await page.goto(`http://127.0.0.1:${port}/__shot?frame=${frame}&theme=${theme}`, { waitUntil: 'load' });
      await page.waitForFunction(() => window.__ready === true);
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(300);
      await page.locator('.fl-cell').screenshot({ path: path.join(outDir, `${name}.png`) });
      console.log(`  ${name}.png`);
      await ctx.close();
    }
  }
}

await browser.close();
process.exit(0);
