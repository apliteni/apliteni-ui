/* A guideline page's evidence. The same rig as shoot.mjs — one static server
 * over the checkout under test, the story's own render call in the page, one
 * Chrome, one viewport — so between two checkouts only the code differs.
 *
 * argv: <checkout> <outDir> [side] [page]
 *
 * why: scripts/evidence/README.md
 */
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
const { chromium } = await import(process.env.UI_PLAYWRIGHT || 'playwright');

const HERE = path.dirname(new URL(import.meta.url).pathname);
const CHROME = process.env.UI_CHROME;
const [checkout, outDir, side = 'after', page = 'the-page'] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });

const server = await new Promise((resolve, reject) => {
  const p = spawn(process.execPath, [path.join(HERE, 'serve.mjs'), checkout, path.join(HERE, 'guideline.html')]);
  p.stdout.once('data', (d) => resolve({ port: Number(String(d).trim()), proc: p }));
  p.stderr.on('data', (d) => process.stderr.write(d));
  p.once('error', reject);
});

const browser = await chromium.launch({ executablePath: CHROME });

// The server is a child process: a throw between here and the kill would leave
// it holding its port after this script exits.
try {
  for (const theme of ['light', 'dark']) {
    const ctx = await browser.newContext({ viewport: { width: 1200, height: 900 }, deviceScaleFactor: 1 });
    const tab = await ctx.newPage();
    await tab.goto(`http://127.0.0.1:${server.port}/__shot?theme=${theme}&page=${page}`, { waitUntil: 'load' });
    await tab.waitForFunction(() => window.__ready === true);
    await tab.evaluate(() => document.fonts.ready);

    await tab.screenshot({ path: path.join(outDir, `${side}-page-${theme}.png`), fullPage: true });
    console.log(`  ${side}-page-${theme}.png`);

    // The first rule that draws a specimen pair, so a caption and the why under
    // it are both in the crop at life size.
    const rule = tab.locator('.gc-rule').filter({ has: tab.locator('.gc-cell__cap') }).first();
    await rule.screenshot({ path: path.join(outDir, `${side}-rule-${theme}.png`) });
    console.log(`  ${side}-rule-${theme}.png`);
    await ctx.close();
  }
} finally {
  await browser.close();
  server.proc.kill();
}
