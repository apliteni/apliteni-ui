import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
// Playwright is not a dependency of this package — the kit ships no browser and
// nothing in `npm test` drives one. Point UI_PLAYWRIGHT at an install of it and
// UI_CHROME at the Chrome binary. why: scripts/evidence/README.md
const { chromium } = await import(process.env.UI_PLAYWRIGHT || 'playwright');
const HERE = path.dirname(new URL(import.meta.url).pathname);
const [checkout, outDir, prefix] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });
const srv = await new Promise((res, rej) => {
  const p = spawn(process.execPath, [path.join(HERE, 'serve.mjs'), checkout, path.join(HERE, 'shot.html')]);
  p.stdout.once('data', (d) => res({ port: Number(String(d).trim()), proc: p }));
  p.stderr.on('data', (d) => process.stderr.write(d));
  p.once('error', rej);
});
const browser = await chromium.launch({ executablePath: process.env.UI_CHROME });
for (const theme of ['dark', 'light']) {
  const ctx = await browser.newContext({ viewport: { width: 320, height: 440 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(`http://127.0.0.1:${srv.port}/__shot?subject=nav&theme=${theme}`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__ready === true);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(outDir, `${prefix}-${theme}.png`) });
  console.log(`  ${prefix}-${theme}.png`);
  await ctx.close();
}
await browser.close(); srv.proc.kill();
