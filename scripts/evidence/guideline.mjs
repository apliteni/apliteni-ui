/* A guideline page's evidence. The same rig as shoot.mjs — one static server
 * over the checkout under test, the story's own render call in the page, one
 * Chrome, one viewport — so between two checkouts only the code differs.
 *
 * argv: <checkout> <outDir> [side] [page] [heading] [widths]
 *   heading is a rule's own heading, for a page whose changed rule is not the
 *   first one that draws a pair.
 *   widths is a comma-separated list of viewport widths, 1200 by default. A
 *   width other than the default is in the file name, because a page whose
 *   specimen pair drops single-file on a phone is two pictures, not one. The
 *   default keeps its bare name so the images already committed under
 *   docs/evidence/ stay reproducible by the command that shot them.
 *
 * why: scripts/evidence/README.md
 */
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
const { chromium } = await import(process.env.UI_PLAYWRIGHT || 'playwright');

const HERE = path.dirname(new URL(import.meta.url).pathname);
const CHROME = process.env.UI_CHROME;
const [checkout, outDir, side = 'after', page = 'the-page', heading, widths = '1200'] = process.argv.slice(2);
const WIDTHS = widths.split(',').map((w) => Number(w.trim())).filter((w) => w > 0);
if (!WIDTHS.length) throw new Error(`no usable viewport width in "${widths}"`);
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
  for (const width of WIDTHS) {
    for (const theme of ['light', 'dark']) {
      const ctx = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1 });
      const tab = await ctx.newPage();
      await tab.goto(`http://127.0.0.1:${server.port}/__shot?theme=${theme}&page=${page}`, { waitUntil: 'load' });
      await tab.waitForFunction(() => window.__ready === true);
      await tab.evaluate(() => document.fonts.ready);

      const name = (kind) => `${side}-${kind}-${width === 1200 ? '' : `${width}-`}${theme}.png`;
      await tab.screenshot({ path: path.join(outDir, name('page')), fullPage: true });
      console.log(`  ${name('page')}`);

      // A named rule, or else the first one that draws a specimen pair, so a
      // caption and the why under it are both in the crop at life size.
      const rule = heading
        ? tab.locator('.gc-rule').filter({ has: tab.locator('.gc-imperative', { hasText: heading }) }).first()
        : tab.locator('.gc-rule').filter({ has: tab.locator('.gc-cell__cap') }).first();
      if (await rule.count() === 0) {
        throw new Error(heading
          ? `no rule on ${page} headed "${heading}"`
          : `no rule on ${page} draws a specimen pair — name a heading to crop a text-only rule`);
      }
      await rule.screenshot({ path: path.join(outDir, name('rule')) });
      console.log(`  ${name('rule')}`);
      await ctx.close();
    }
  }
} finally {
  await browser.close();
  server.proc.kill();
}
