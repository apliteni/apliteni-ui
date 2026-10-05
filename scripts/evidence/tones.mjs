/* The badge and callout tone family, shot. One static server over one checkout,
 * one Chrome, two themes, two widths — so between two checkouts only the code
 * differs, and the before side of the pair is this rig pointed at `main`.
 *
 * argv: <checkout> <outDir> [prefix=tones] [width...]
 *   Widths default to 1280 and 390, the two the kit is reviewed at.
 *
 * why: scripts/evidence/README.md
 */
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { settle } from './settle.mjs';
const { chromium } = await import(process.env.UI_PLAYWRIGHT || 'playwright');

const HERE = path.dirname(new URL(import.meta.url).pathname);
const [checkout, outDir, prefix = 'tones', ...widthArgs] = process.argv.slice(2);
if (!checkout || !outDir) throw new Error('usage: tones.mjs <checkout> <outDir> [prefix] [width...]');
const widths = (widthArgs.length ? widthArgs : ['1280', '390']).map(Number);
mkdirSync(outDir, { recursive: true });

const served = await new Promise((resolve, reject) => {
  const proc = spawn(process.execPath, [
    path.join(HERE, 'serve.mjs'), path.resolve(checkout), path.join(HERE, 'tones.html'),
  ]);
  proc.stdout.once('data', (d) => resolve({ port: Number(String(d).trim()), proc }));
  proc.stderr.on('data', (d) => process.stderr.write(d));
  proc.once('error', reject);
});

const browser = await chromium.launch({
  executablePath: process.env.UI_CHROME,
  // The pixel-test switches shoot.mjs uses, for the same reason. why: README
  args: ['--font-render-hinting=none', '--disable-lcd-text', '--deterministic-mode', '--disable-partial-raster'],
});

try {
  for (const width of widths) {
    for (const theme of ['dark', 'light']) {
      const ctx = await browser.newContext({
        viewport: { width, height: 900 }, deviceScaleFactor: 1, reducedMotion: 'reduce',
      });
      const page = await ctx.newPage();
      await page.goto(`http://127.0.0.1:${served.port}/__shot?theme=${theme}`, { waitUntil: 'load' });
      // The page builds itself from the kit's factories and sets __ready after the
      // faces land; a shot taken before that is a shot in the fallback faces.
      await page.waitForFunction(() => window.__ready === true);
      await settle(page);
      const name = `${prefix}-${width}-${theme}.png`;
      await page.screenshot({ path: path.join(outDir, name), fullPage: true });
      console.log(`  ${name}`);
      await ctx.close();
    }
  }
} finally {
  await browser.close();
  served.proc.kill();
}
