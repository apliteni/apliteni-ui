/* The inline code chip's evidence (#537). The same rig as shoot.mjs — one static
 * server over the checkout under test, the kit's own factories imported as
 * modules in the page, one Chrome, one viewport — so between two checkouts only
 * the code differs, and the before side of a pair is this rig pointed at `main`.
 *
 * Three grounds in one frame: a sentence on the page, the same sentence inside a
 * card, and the kit's own case — `deniedState()`'s `need`, which is where the
 * chip was found missing. Both widths, both themes, plus a 1x crop of the card
 * alone, which is the pair the issue is about.
 *
 * argv: <checkout> <outDir> [side]
 *
 * why: scripts/evidence/README.md
 */
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { settle } from './settle.mjs';
const { chromium } = await import(process.env.UI_PLAYWRIGHT || 'playwright');

const HERE = path.dirname(new URL(import.meta.url).pathname);
const [checkout, outDir, side = 'after'] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });

const WIDTHS = [[1280, 420], [390, 560]];

const server = await new Promise((resolve, reject) => {
  const p = spawn(process.execPath, [path.join(HERE, 'serve.mjs'), checkout, path.join(HERE, 'code-chip.html')]);
  p.stdout.once('data', (d) => resolve({ port: Number(String(d).trim()), proc: p }));
  p.stderr.on('data', (d) => process.stderr.write(d));
  p.once('error', reject);
});

const browser = await chromium.launch({
  executablePath: process.env.UI_CHROME,
  // The pixel-test switches shoot.mjs uses, for the same reason. why: README
  args: ['--font-render-hinting=none', '--disable-lcd-text', '--deterministic-mode', '--disable-partial-raster'],
});

// The server is a child process: a throw between here and the kill would leave
// it holding its port after this script exits.
try {
  for (const theme of ['dark', 'light']) {
    for (const [width, height] of WIDTHS) {
      const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
      const tab = await ctx.newPage();
      await tab.goto(`http://127.0.0.1:${server.port}/__shot?theme=${theme}`, { waitUntil: 'load' });
      await tab.waitForFunction(() => window.__ready === true);
      await settle(tab);

      const name = `${side}-${theme}-${width}`;
      await tab.screenshot({ path: path.join(outDir, `${name}.png`), fullPage: true });
      console.log(`  ${name}.png`);

      // The chip inside a card at 1x, which is the pair the issue is about.
      if (width === 1280) {
        await tab.locator('#cc-card').screenshot({ path: path.join(outDir, `${side}-crop-card-${theme}.png`) });
        console.log(`  ${side}-crop-card-${theme}.png`);
      }
      await ctx.close();
    }
  }
} finally {
  await browser.close();
  server.proc.kill();
}
