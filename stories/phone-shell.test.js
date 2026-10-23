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
 * Limits: the browser half measures the Workspace button at 320 and 390, a Dropdown
 * panel at 390, the brand at 720 and 721, the vanilla centred rail at 390,
 * and native Tab in a shadow-root drawer at 390.
 * Other band controls are not measured. The source half checks declarations and markup.
 * The PHONE_BAND browser half measures the first visible band item in the invoice
 * list and both menu shells at 390 and 720. It needs two served Storybooks.
 * It does not measure a vanilla shell without a menu; that factory has no such state.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => readFileSync(path.join(root, rel), 'utf8');

test('the band control is capped on a phone, and the drawer’s account menu is not portalled', () => {
  const css = read('react/src/AppShell.css');
  assert.match(css, /\.ui-react-app__band-control\s*\{[^}]*max-width:/, 'the band control has no width cap on a phone');
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
            const sel = ['.ui-react-app__band-control', '.ui-app__bar button, .ui-app__bar [role="button"], .ui-app__bar .ui-app__user-trigger, .ui-app__bar .ui-app__brand--band'];
            const boxes = [...document.querySelectorAll(sel[1])].filter((e) => e.checkVisibility()).map((e) => e.getBoundingClientRect());
            return {
              scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth,
              control: document.querySelector(sel[0]).getBoundingClientRect().width,
              off: boxes.filter((b) => b.right > innerWidth + 0.5 || b.left < -0.5).length, n: boxes.length,
              brand: !!document.querySelector('.ui-app__bar .ui-app__brand--band')?.checkVisibility(),
              brandHref: document.querySelector('.ui-app__bar .ui-app__brand--band')?.getAttribute('href'),
              workspace: (() => { const label = document.querySelector('.ui-react-app__band-control .ui-btn__label'); return { name: label?.textContent, overflow: label?.scrollWidth > label?.clientWidth, ellipsis: label && getComputedStyle(label).textOverflow }; })(),
              short: document.querySelector('.ui-app__search-short')?.getBoundingClientRect().width,
              tap: ['.ui-app__menu', '.ui-app__brand--band', '.ui-app__search',
                '.ui-react-app__band-control .ui-btn', '.ui-app__bar .toggle', '.ui-app__user-trigger']
                .map((selector) => {
                  const el = document.querySelector(selector);
                  const rect = el.getBoundingClientRect();
                  const pseudo = getComputedStyle(el, '::after');
                  const hit = (x, y) => { const target = document.elementFromPoint(x, y); return target === el || el.contains(target); };
                  const x = rect.left + rect.width / 2;
                  const y = rect.top + rect.height / 2;
                  return { selector, width: Math.max(rect.width, parseFloat(pseudo.width) || 0),
                    height: Math.max(rect.height, parseFloat(pseudo.height) || 0),
                    edges: [hit(x - 21.5, y), hit(x + 21.5, y), hit(x, y - 21.5), hit(x, y + 21.5)] };
                }),
            };
          });
          const where = `${width}px, ${touch ? 'coarse' : 'fine'}`;
          assert.ok(m.n >= 3, `${where}: only ${m.n} band controls were measured`);
          assert.ok(m.brand && m.brandHref, `${where}: the brand link is hidden`);
          assert.ok(m.short >= 39, `${where}: Search is clipped (${m.short}px, band ${m.control}px, scroll ${m.scroll}px)`);
          assert.equal(m.workspace.name, 'Workspace', `${where}: the control lost its full name`);
          if (width === 320) {
            assert.ok(m.workspace.overflow, `${where}: Workspace should shorten visibly`);
            assert.equal(m.workspace.ellipsis, 'ellipsis', `${where}: Workspace has no ellipsis`);
          }
          assert.ok(m.scroll <= m.client, `${where}: the page scrolls sideways (${m.scroll} over ${m.client})`);
          assert.equal(m.off, 0, `${where}: ${m.off} band controls sit off screen`);
          if (touch) for (const target of m.tap) {
            assert.ok(target.width >= 44 && target.height >= 44,
              `${where}: ${target.selector} has only ${target.width} by ${target.height}px to tap`);
            assert.ok(target.edges.every(Boolean), `${where}: ${target.selector} loses a tap at its 44px edge`);
          }
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

test('a Dropdown band control opens a panel that receives the pointer',
  { skip: !RUN && 'set PHONE_SHELL=1' }, async () => {
    const { served, browser } = await rig('react/storybook-static');
    try {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
      const page = await ctx.newPage();
      await page.goto(`http://127.0.0.1:${served.port}/iframe.html?id=react-appshell--phone-dropdown&viewMode=story`);
      await page.locator('.ui-react-app__band-control .ui-dropdown__trigger').click();
      const row = page.locator('.ui-react-app__band-control [data-dd-item]').first();
      await row.waitFor({ state: 'visible' });
      const hit = await row.evaluate((el) => {
        const r = el.getBoundingClientRect();
        const target = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        return el === target || el.contains(target);
      });
      assert.ok(hit, 'the band clipped the open Dropdown panel');
      await row.click();
      assert.equal(await page.locator('.ui-react-app__band-control .ui-dropdown__trigger').getAttribute('aria-expanded'), 'false');
      await ctx.close();
    } finally { await browser.close(); served.proc.kill(); }
  });

test('the brand link and reading column hold at the 720px boundary',
  { skip: !RUN && 'set PHONE_SHELL=1' }, async () => {
    const { served, browser } = await rig('react/storybook-static');
    try {
      for (const width of [720, 721]) {
        const ctx = await browser.newContext({ viewport: { width, height: 800 }, reducedMotion: 'reduce' });
        const page = await ctx.newPage();
        await page.goto(`http://127.0.0.1:${served.port}/iframe.html?id=react-appshell--phone&viewMode=story`);
        await page.waitForSelector('.ui-react-app .ui-app__main');
        const result = await page.evaluate(() => {
          const bar = document.querySelector('.ui-app__bar .ui-app__brand--band');
          const rail = document.querySelector('.ui-app__rail .ui-app__brand');
          const main = document.querySelector('.ui-app__main').getBoundingClientRect();
          return { bar: bar?.checkVisibility(), rail: rail?.checkVisibility(),
            href: (bar?.checkVisibility() ? bar : rail)?.getAttribute('href'),
            mainLeft: main.left, mainRight: main.right,
            scroll: document.documentElement.scrollWidth };
        });
        assert.equal(result.bar, width === 720, `${width}px: wrong band brand state`);
        assert.equal(result.rail, width === 721, `${width}px: wrong rail brand state`);
        assert.ok(result.href, `${width}px: the home link is gone`);
        assert.ok(result.mainLeft >= 0 && result.mainRight <= width + 0.5, `${width}px: the reading column leaves the viewport`);
        assert.ok(result.scroll <= width, `${width}px: the page scrolls sideways`);
        await ctx.close();
      }
    } finally { await browser.close(); served.proc.kill(); }
  });

test('a shadow-root drawer advances Tab, wraps Shift+Tab, and isolates the page',
  { skip: !RUN && 'set PHONE_SHELL=1' }, async () => {
    const pw = await import(process.env.UI_PLAYWRIGHT || 'playwright');
    const served = await new Promise((resolve, reject) => {
      const proc = spawn(process.execPath, [path.join(root, 'scripts/evidence/serve.mjs'), root,
        path.join(root, 'stories/phone-shadow.fixture.html')]);
      proc.stdout.once('data', (d) => resolve({ port: Number(String(d).trim()), proc }));
      proc.once('error', reject);
    });
    const browser = await pw.chromium.launch({ executablePath: process.env.UI_CHROME });
    try {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
      await page.goto(`http://127.0.0.1:${served.port}/__shot`);
      const menu = page.locator('#host .ui-app__menu');
      await menu.click();
      const state = () => page.evaluate(() => {
        const shadow = document.querySelector('#host').shadowRoot;
        return { active: shadow.activeElement?.getAttribute('aria-label') || shadow.activeElement?.textContent.trim(),
          outsideInert: document.querySelector('#outside').inert };
      });
      assert.deepEqual(await state(), { active: 'Close', outsideInert: true });
      await page.keyboard.press('Tab');
      assert.equal((await state()).active, 'Overview', 'forward Tab stayed on Close');
      await page.keyboard.press('Shift+Tab');
      assert.equal((await state()).active, 'Close', 'reverse Tab left the drawer');
      await page.keyboard.press('Shift+Tab');
      assert.equal((await state()).active, 'Reports', 'reverse Tab did not wrap to the last link');
      await page.keyboard.press('Tab');
      assert.equal((await state()).active, 'Close', 'forward Tab did not wrap to Close');
      await page.keyboard.press('Escape');
      assert.equal((await state()).outsideInert, false, 'closing left the page inert');
    } finally { await browser.close(); served.proc.kill(); }
  });

const layoutCss = read('src/styles/layout.css');
const phoneCss = layoutCss.slice(layoutCss.indexOf('@media (max-width: 720px)'));
const menuSelector = '.ui-app__bar:has(> .ui-app__menu:first-child)';

test('a phone band without a leading menu keeps the page column inset', () => {
  assert.ok(/\.ui-app__bar\s*\{\s*padding-inline:\s*var\(--space-4\);\s*\}/.test(phoneCss), 'the default phone band lost its 16px start inset');
  assert.ok(/\.ui-react-app \.ui-app__bar:not\(:has\(> \.ui-app__menu:first-child\)\)\s*\{\s*padding-inline-start:\s*var\(--space-4\);\s*\}/.test(read('react/src/AppShell.css')), 'the narrow React band restores 16px without a menu');
  const doc = new JSDOM('<header class="ui-app__bar"><a class="ui-app__brand"></a><button class="ui-app__search"></button></header>').window.document;
  assert.ok(!doc.querySelector('.ui-app__bar').matches(menuSelector));
});

test('a phone band with a leading menu keeps the menu inset', () => {
  assert.ok(/\.ui-app__bar:has\(> \.ui-app__menu:first-child\)\s*\{\s*padding-inline-start:\s*var\(--space-2\);\s*\}/.test(phoneCss), 'the menu band lost its 8px start inset');
  const doc = new JSDOM('<header class="ui-app__bar"><button class="ui-app__menu"></button><a class="ui-app__brand"></a></header>').window.document;
  assert.ok(doc.querySelector('.ui-app__bar').matches(menuSelector));
});

const BAND_RUN = process.env.PHONE_BAND === '1';
async function bandMeasure(browser, base, story, width) {
  const context = await browser.newContext({ viewport: { width, height: 844 }, deviceScaleFactor: 2 });
  try {
    const page = await context.newPage();
    await page.goto(`${base}/iframe.html?id=${story}&viewMode=story`);
    await page.waitForSelector('.ui-app__bar', { state: 'visible' });
    return await page.evaluate(() => {
      const bar = document.querySelector('.ui-app__bar');
      const first = [...bar.children].find((el) => el.checkVisibility());
      const main = document.querySelector('.ui-app__main');
      return {
        menu: first.classList.contains('ui-app__menu'),
        firstX: first.getBoundingClientRect().x,
        columnX: main.getBoundingClientRect().x + parseFloat(getComputedStyle(main).paddingLeft),
      };
    });
  } finally { await context.close(); }
}

test('the invoice list starts at the page column at both phone widths',
  { skip: !BAND_RUN && 'set PHONE_BAND=1' }, async () => {
    const pw = await import(process.env.UI_PLAYWRIGHT || 'playwright');
    const browser = await pw.chromium.launch({ executablePath: process.env.UI_CHROME });
    try {
      for (const width of [390, 720]) {
        const m = await bandMeasure(browser, process.env.PHONE_BAND_REACT_URL, 'apps-invoice-flow-prototype--invoice-table', width);
        assert.equal(m.menu, false, `${width}px: the invoice list unexpectedly has a menu`);
        assert.equal(m.columnX, 16, `${width}px: the page column moved`);
        assert.equal(m.firstX, m.columnX, `${width}px: the first visible band item misses the page column`);
      }
    } finally { await browser.close(); }
  });

test('React and vanilla menu bands keep the 8px start inset',
  { skip: !BAND_RUN && 'set PHONE_BAND=1' }, async () => {
    const pw = await import(process.env.UI_PLAYWRIGHT || 'playwright');
    const browser = await pw.chromium.launch({ executablePath: process.env.UI_CHROME });
    try {
      for (const width of [390, 720]) {
        for (const [base, story] of [
          [process.env.PHONE_BAND_REACT_URL, 'react-appshell--centered'],
          [process.env.PHONE_BAND_VANILLA_URL, 'apps-shell-layouts--topbar-centered'],
        ]) {
          const m = await bandMeasure(browser, base, story, width);
          assert.equal(m.menu, true, `${story} at ${width}px: the menu is missing`);
          assert.equal(m.columnX, 16, `${story} at ${width}px: the page column moved`);
          assert.equal(m.firstX, 8, `${story} at ${width}px: the menu lost its start inset`);
        }
      }
    } finally { await browser.close(); }
  });
