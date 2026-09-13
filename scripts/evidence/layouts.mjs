/* The two shell layouts and the two content widths, re-shot (#308). Same rig as
 * shoot.mjs — one static server over the checkout under test, the kit's own
 * factories imported as modules in the page, one Chrome, one viewport — so
 * between any two of these images only the option under test differs.
 *
 * argv: <checkout> <outDir> [only]
 */
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
// Playwright is not a dependency of this package — the kit ships no browser and
// nothing in `npm test` drives one. why: scripts/evidence/README.md
const { chromium } = await import(process.env.UI_PLAYWRIGHT || 'playwright');

const HERE = path.dirname(new URL(import.meta.url).pathname);
const [checkout, outDir, only] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });

const srv = await new Promise((res, rej) => {
  const p = spawn(process.execPath, [path.join(HERE, 'serve.mjs'), checkout, path.join(HERE, 'shot.html')]);
  p.stdout.once('data', (d) => res({ port: Number(String(d).trim()), proc: p }));
  p.stderr.on('data', (d) => process.stderr.write(d));
  p.once('error', rej);
});

const browser = await chromium.launch({ executablePath: process.env.UI_CHROME });

async function open(query, { width = 1280, height = 760 } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(`http://127.0.0.1:${srv.port}/__shot?subject=layouts&${query}`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__ready === true);
  await page.evaluate(() => document.fonts.ready);
  // The fold, the menus and the palette are on a clock; nothing here is mid-travel.
  await page.waitForTimeout(500);
  return { ctx, page };
}

const want = (name) => !only || name.includes(only);
const save = async (page, name) => {
  await page.screenshot({ path: path.join(outDir, `${name}.png`) });
  console.log(`  ${name}.png`);
};

/** Tab until the focus lands on `sel`, so the ring is the browser's own. */
async function tabTo(page, sel) {
  for (let i = 0; i < 40; i++) {
    if (await page.evaluate((s) => !!document.activeElement?.matches(s), sel)) return true;
    await page.keyboard.press('Tab');
  }
  return false;
}

for (const theme of ['dark', 'light']) {
  // --- the matrix: both layouts at both widths, at rest.
  for (const layout of ['rail', 'topbar']) {
    for (const width of ['wide', 'centered']) {
      const name = `shell-${layout}-${width}-${theme}`;
      if (!want(name)) continue;
      const { ctx, page } = await open(`theme=${theme}&layout=${layout}&width=${width}&collapsed=0`);
      await save(page, name);
      await ctx.close();
    }
  }

  // --- the topbar layout folded: the toggle is at the rail's foot now, so this is
  // the state the move is about.
  if (want(`shell-topbar-folded-${theme}`)) {
    const { ctx, page } = await open(`theme=${theme}&layout=topbar&width=wide&collapsed=1`);
    await save(page, `shell-topbar-folded-${theme}`);
    await ctx.close();
  }

  // --- the search field under the keyboard. Real Tab presses, so the ring is the
  // browser's rather than a state forced on.
  if (want(`shell-topbar-search-${theme}`)) {
    const { ctx, page } = await open(`theme=${theme}&layout=topbar&width=wide&collapsed=0`);
    if (!await tabTo(page, '.ui-app__search')) throw new Error('the search field is not reachable by Tab');
    await page.waitForTimeout(300);
    await save(page, `shell-topbar-search-${theme}`);
    await ctx.close();
  }

  // --- the reader's menu, opened from the band with the keyboard: one ArrowDown
  // opens it and lands focus on Sign out.
  if (want(`shell-topbar-menu-${theme}`)) {
    const { ctx, page } = await open(`theme=${theme}&layout=topbar&width=wide&collapsed=0`);
    if (!await tabTo(page, '.ui-app__bar .ui-app__user-trigger')) throw new Error('the reader block is not reachable by Tab');
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(400);
    await save(page, `shell-topbar-menu-${theme}`);
    await ctx.close();
  }

  // --- a phone, one per layout: below 720px the rail is the strip either way and
  // the rail's foot goes with the control it holds.
  for (const layout of ['rail', 'topbar']) {
    const name = `shell-${layout}-phone-${theme}`;
    if (!want(name)) continue;
    const { ctx, page } = await open(`theme=${theme}&layout=${layout}&width=wide&collapsed=0`, { width: 390, height: 800 });
    await save(page, name);
    await ctx.close();
  }
}

await browser.close();
srv.proc.kill();
