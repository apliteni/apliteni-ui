/* The back link's label, shot. One static server over the checkout under test,
 * `backLink()` imported as a module in the page, one Chrome, one viewport — so
 * between two checkouts only the code differs and the before side of a pair is
 * this rig pointed at `main`. why: scripts/evidence/README.md
 *
 * argv: <checkout> <outDir> [prefix]   prefix defaults to `back-label`
 */
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
const { chromium } = await import(process.env.UI_PLAYWRIGHT || 'playwright');

const HERE = path.dirname(new URL(import.meta.url).pathname);
const [checkout, outDir, prefix = 'back-label'] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });

const port = await new Promise((resolve, reject) => {
  const p = spawn(process.execPath, [path.join(HERE, 'serve.mjs'), checkout, path.join(HERE, 'back.html')]);
  p.stdout.once('data', (d) => resolve({ port: Number(String(d).trim()), proc: p }));
  p.stderr.on('data', (d) => process.stderr.write(d));
  p.once('error', reject);
});

// Small enough that the subject fills the frame, at 2x so the ellipsis is legible
// in a PR body: three characters are the whole point of the image.
const browser = await chromium.launch({ executablePath: process.env.UI_CHROME });
const ctx = await browser.newContext({ viewport: { width: 560, height: 340 }, deviceScaleFactor: 2 });

for (const theme of ['dark', 'light']) {
  for (const subject of ['short', 'long']) {
    const page = await ctx.newPage();
    await page.goto(`http://127.0.0.1:${port.port}/__shot?theme=${theme}&subject=${subject}`, { waitUntil: 'load' });
    await page.waitForFunction(() => window.__ready === true);
    await page.evaluate(() => document.fonts.ready);
    const name = `${prefix}-${subject}-${theme}`;
    await page.screenshot({ path: path.join(outDir, `${name}.png`) });
    console.log(`  ${name}.png`);
    await page.close();
  }
}

await browser.close();
port.proc.kill();
