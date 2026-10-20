/* Rule: below 720px the shell's top band fits the phone, and the account menu opened
 * inside the drawer stays in the overlay, so Sign out is reachable.
 *
 * Two halves. The SOURCE half runs in CI. The BROWSER half is the measurement, because
 * only an engine answers scrollWidth and a hit test, and it is OFF unless PHONE_SHELL=1
 * since Playwright is no dependency here:
 *
 *   npm run build-storybook && npm run build-storybook -w react
 *   UI_PLAYWRIGHT=.../index.mjs PHONE_SHELL=1 node --test stories/phone-shell.test.js
 *
 * Limits: the browser half measures the Workspace band control of the React Phone story
 * and the vanilla centred rail, at 320 and 390, on a fine and a coarse pointer. Another
 * control a consumer puts in the band is not measured. The source half reads text.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => readFileSync(path.join(root, rel), 'utf8');

test('the band control is capped on a phone, and the drawer’s account menu is not portalled', () => {
  const css = read('react/src/AppShell.css');
  assert.match(css, /\.ui-react-app__band-control\s*\{[^}]*max-width:\s*max\(/, 'the band control has no width cap on a phone');
  assert.match(read('react/src/AppShell.tsx'), /ui-react-app__band-control/, 'AppShell does not wrap bandControl');
  assert.match(read('src/components/shell.js'), /portal:\s*false/, 'the drawer’s account block is portalled onto <body>, under the drawer');
});

const RUN = process.env.PHONE_SHELL === '1';

async function rig(site) {
  const pw = await import(process.env.UI_PLAYWRIGHT || 'playwright').catch(() => null);
  assert.ok(pw, 'PHONE_SHELL=1 was set and no Playwright could be resolved. Point UI_PLAYWRIGHT at one.');
  const built = path.join(root, site);
  assert.ok(existsSync(path.join(built, 'iframe.html')), `${built} holds no built Storybook. Build it first.`);
  const served = await new Promise((resolve, reject) => {
    const proc = spawn(process.execPath, [path.join(root, 'scripts/evidence/serve.mjs'), built, path.join(built, 'iframe.html')]);
    proc.stdout.once('data', (d) => resolve({ port: Number(String(d).trim()), proc }));
    proc.once('error', reject);
  });
  const browser = await pw.chromium.launch({ executablePath: process.env.UI_CHROME });
  return { served, browser };
}

test('the React Phone story does not scroll sideways at 320 and keeps every band control on screen',
  { skip: !RUN && 'set PHONE_SHELL=1' }, async () => {
    const { served, browser } = await rig('react/storybook-static');
    try {
      for (const touch of [false, true]) {
        for (const width of [320, 390]) {
          const ctx = await browser.newContext({ viewport: { width, height: 800 }, hasTouch: touch, isMobile: touch, reducedMotion: 'reduce' });
          const page = await ctx.newPage();
          await page.goto(`http://127.0.0.1:${served.port}/iframe.html?id=react-appshell--phone&viewMode=story`);
          await page.waitForSelector('.ui-react-app__band-control', { state: 'visible' });
          const m = await page.evaluate(() => {
            const sel = ['.ui-react-app__band-control', '.ui-app__bar button, .ui-app__bar [role="button"], .ui-app__bar .ui-app__user-trigger'];
            const boxes = [...document.querySelectorAll(sel[1])].filter((e) => e.checkVisibility()).map((e) => e.getBoundingClientRect());
            return {
              scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth,
              control: document.querySelector(sel[0]).getBoundingClientRect().width,
              off: boxes.filter((b) => b.right > innerWidth + 0.5 || b.left < -0.5).length, n: boxes.length,
            };
          });
          const where = `${width}px, ${touch ? 'coarse' : 'fine'}`;
          assert.ok(m.n >= 3, `${where}: only ${m.n} band controls were measured`);
          assert.ok(m.scroll <= m.client, `${where}: the page scrolls sideways (${m.scroll} over ${m.client})`);
          assert.equal(m.off, 0, `${where}: ${m.off} band controls sit off screen`);
          assert.ok(m.control >= 56, `${where}: the Workspace control is ${m.control}px wide, a sliver`);
          await ctx.close();
        }
      }
    } finally { await browser.close(); served.proc.kill(); }
  });

test('the account menu opened in the drawer is not inert, and Sign out answers a press and the arrow keys',
  { skip: !RUN && 'set PHONE_SHELL=1' }, async () => {
    const { served, browser } = await rig('storybook-static');
    try {
      for (const mode of ['pointer', 'keys']) {
        const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
        const page = await ctx.newPage();
        await page.goto(`http://127.0.0.1:${served.port}/iframe.html?id=apps-shell-layouts--rail-centered&viewMode=story`);
        await page.waitForSelector('.ui-app__menu', { state: 'visible' });
        await page.click('.ui-app__menu');
        const trigger = '.ui-app__drawer .ui-app__user-trigger';
        await page.waitForSelector(trigger, { state: 'visible' });
        if (mode === 'pointer') await page.click(trigger);
        else await page.locator(trigger).press('Enter');
        await page.waitForSelector('.ui-app__drawer .ui-dropdown__panel', { state: 'visible' });
        const m = await page.evaluate(() => {
          const a = [...document.querySelectorAll('a')].find((n) => /Sign out/.test(n.textContent) && n.checkVisibility());
          const r = a?.getBoundingClientRect();
          const hit = r && document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
          return { found: !!a, inDrawer: !!a?.closest('.ui-drawer'), inert: !!a?.closest('[inert],[aria-hidden="true"]'), hit: !!a && (hit === a || a.contains(hit)) };
        });
        assert.ok(m.found, `${mode}: Sign out is not on the page`);
        assert.ok(m.inDrawer, `${mode}: Sign out was moved out of the drawer`);
        assert.ok(!m.inert, `${mode}: Sign out sits under an inert or hidden ancestor`);
        assert.ok(m.hit, `${mode}: something else takes a press at Sign out`);
        if (mode === 'keys') {
          for (let i = 0; i < 6; i += 1) {
            if (await page.evaluate(() => /Sign out/.test(document.activeElement?.textContent || ''))) break;
            await page.locator('.ui-dropdown__panel:visible').press('ArrowDown');
          }
          assert.ok(await page.evaluate(() => /Sign out/.test(document.activeElement?.textContent || '')), 'keys: arrow keys do not reach Sign out');
        }
        await ctx.close();
      }
    } finally { await browser.close(); served.proc.kill(); }
  });
