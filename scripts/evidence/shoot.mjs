/* The rail's evidence, re-shot. One static server over the checkout under test,
 * the kit's own factories imported as modules in the page, one Chrome, one
 * viewport — so between two checkouts only the code differs.
 *
 * argv: <checkout> <outDir> [only]
 */
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { settle } from './settle.mjs';
// Playwright is not a dependency of this package — the kit ships no browser and
// nothing in `npm test` drives one. Point UI_PLAYWRIGHT at an install of it and
// UI_CHROME at the Chrome binary. why: scripts/evidence/README.md
const { chromium } = await import(process.env.UI_PLAYWRIGHT || 'playwright');

const HERE = path.dirname(new URL(import.meta.url).pathname);
const CHROME = process.env.UI_CHROME;   // Chrome for Testing, or any Chrome build
const [checkout, outDir, only] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });

const port = await new Promise((resolve, reject) => {
  const p = spawn(process.execPath, [path.join(HERE, 'serve.mjs'), checkout, path.join(HERE, 'shot.html')]);
  p.stdout.once('data', (d) => resolve({ port: Number(String(d).trim()), proc: p }));
  p.stderr.on('data', (d) => process.stderr.write(d));
  p.once('error', reject);
});

const url = (q) => `http://127.0.0.1:${port.port}/__shot?${q}`;
const browser = await chromium.launch({ executablePath: CHROME });

/** One page at the shot viewport, loaded and with both faces resolved. */
async function open(query, { width = 1280, height = 760 } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(url(query), { waitUntil: 'load' });
  await page.waitForFunction(() => window.__ready === true);
  // The fold and the menus are on a clock. Waited out rather than timed out.
  await settle(page);
  return { ctx, page };
}

const want = (name) => !only || name.includes(only);
const save = async (page, name) => {
  await page.screenshot({ path: path.join(outDir, `${name}.png`) });
  console.log(`  ${name}.png`);
};

// The server is a child process: a throw between here and the kill would leave
// it holding its port after this script exits. The settle above can throw.
try {
for (const theme of ['dark', 'light']) {
  // --- the rail on `main`, at rest. No key is pressed: the before side of the
  // pair is what the reader is handed, and `main` has no control to focus.
  if (want(`rail-before-${theme}`)) {
    const { ctx, page } = await open(`theme=${theme}`);
    await save(page, `rail-before-${theme}`);
    await ctx.close();
  }

  // --- the rail on a desktop, open. Two real Tab presses put the focus ring and
  // the name chip on the toggle: the browser's own, not a state forced on.
  if (want(`rail-after-expanded-${theme}`)) {
    const { ctx, page } = await open(`theme=${theme}&collapsed=0`);
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await settle(page);
    await save(page, `rail-after-expanded-${theme}`);
    await ctx.close();
  }

  // --- the reader's menu, opened from the keyboard. Tab to the account block,
  // then one ArrowDown, which opens it and lands focus on Sign out.
  if (want(`rail-user-menu-${theme}`)) {
    const { ctx, page } = await open(`theme=${theme}&collapsed=0`);
    for (let i = 0; i < 40; i++) {
      const on = await page.evaluate(() => document.activeElement?.className || '');
      if (on.includes('ui-app__user-trigger')) break;
      await page.keyboard.press('Tab');
    }
    await page.keyboard.press('ArrowDown');
    await settle(page);
    await save(page, `rail-user-menu-${theme}`);
    await ctx.close();
  }

  // --- folded, resting.
  if (want(`rail-collapsed-${theme}`)) {
    const { ctx, page } = await open(`theme=${theme}&collapsed=1`);
    await save(page, `rail-collapsed-${theme}`);
    await ctx.close();
  }

  // --- folded, with a folded row under the keyboard. Real Tab presses to
  // "Access & agents", so the ring and the chip are the browser's.
  if (want(`rail-collapsed-focus-${theme}`)) {
    const { ctx, page } = await open(`theme=${theme}&collapsed=1`);
    for (let i = 0; i < 40; i++) {
      await page.keyboard.press('Tab');
      const on = await page.evaluate(() => document.activeElement?.getAttribute('aria-label') || '');
      if (on === 'Access & agents') break;
    }
    await settle(page);
    await save(page, `rail-collapsed-focus-${theme}`);
    await ctx.close();
  }

  // --- the phone rail, open and folded. New this round: the state the round-9
  // finding was about, at the width where the toggle is not drawn.
  for (const [name, q] of [[`rail-phone-open-${theme}`, '0'], [`rail-phone-collapsed-${theme}`, '1']]) {
    if (!want(name)) continue;
    const { ctx, page } = await open(`theme=${theme}&collapsed=${q}`, { width: 390, height: 800 });
    await save(page, name);
    await ctx.close();
  }
}

} finally {
  await browser.close();
  port.proc.kill();
}
