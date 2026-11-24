/* Rule: on the three-column page, each key, click, send and change of view keeps the
 * focus on a shown control of the page, moves no shell chrome by more than 1px, keeps
 * the cumulative layout shift under 0.1 and causes no sideways scroll. The collapse order
 * holds: the list beside the steps above 860px, the list as its own view at 860px and
 * below, and one area at a time at 560px and below.
 *
 * Off unless THREE_COLUMN=1: Playwright and web-vitals are not dependencies of this
 * package, CI does not run it, and the result is reported by hand in the pull request.
 *
 *   npm run build-storybook
 *   UI_PLAYWRIGHT=… UI_WEB_VITALS=…/web-vitals/dist/web-vitals.iife.js THREE_COLUMN=1 \
 *     node --test stories/three-column.test.js
 *
 * It opens react-three-column-page--month-checks in a new context at each of ten window
 * sizes and on six devices: the Galaxy Z Fold 7 and Flip 7 and their cover screens from
 * Playwright's list, and a two-screen phone of 466×678 and 890×626 at scale 3 with touch.
 * The shell chrome is every fixed or sticky element outside the page, found in the page.
 *
 * Its limits: one engine, the light theme and the default accent. The layout shift is
 * web-vitals' onCLS, which does not count a shift within 500ms of an input, so a shift
 * that a press causes on purpose is not measured. The page opens no layer, so Escape is
 * checked to leave the focus and the view as they were, not to close a layer.
 * why: docs/components.md#three-column-page
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const STORY = 'react-three-column-page--month-checks';
const SIZES = [[390, 844], [844, 390], [820, 1180], [1280, 800], [1920, 1080], [360, 800], [466, 678], [984, 1016], [1536, 864], [2560, 1440]];
const DEVICES = ['Galaxy Z Fold 7', 'Galaxy Z Fold 7 Cover', 'Galaxy Z Flip 7', 'Galaxy Z Flip 7 Cover'];
const DUO = [[466, 678], [890, 626]];

// The state after one action: the focused control, the shell chrome's places, the
// layout shift so far and the page's sideways overflow.
const READ = () => {
  const el = document.activeElement;
  const page = document.querySelector('.ui-columns');
  const shown = el && el !== document.body && page.contains(el) && el.checkVisibility();
  const chrome = [...document.querySelectorAll('body *')]
    .filter((e) => !page.contains(e) && ['fixed', 'sticky'].includes(getComputedStyle(e).position))
    .map((e) => { const r = e.getBoundingClientRect(); return { name: `${e.tagName.toLowerCase()}.${[...e.classList].join('.')}`, x: r.left, y: r.top }; });
  const doc = document.scrollingElement;
  return {
    focus: shown ? (el.getAttribute('aria-label') || el.textContent.trim().slice(0, 40)) : null,
    chrome, cls: window.__cls, view: page.dataset.view, over: doc.scrollWidth - doc.clientWidth,
  };
};
const frames = () => new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(ok, 0))));

// The actions, in order. Each runs only where its control is shown, and names the state
// it waits for, so no step waits on time.
const step = (page, n) => page.getByRole('button', { name: new RegExp(`^Step ${n} of 5:`) });
const linksShown = (page) => page.getByRole('group', { name: 'Page columns' }).isVisible();
const ACTIONS = [
  ['key: Down', async (page) => { await step(page, 1).focus(); await page.keyboard.press('ArrowDown'); await step(page, 2).and(page.locator(':focus')).waitFor(); }],
  ['key: Enter', async (page) => { await page.keyboard.press('Enter'); await page.locator('[aria-expanded="true"][aria-label^="Step 2 of 5"]').waitFor(); }],
  ['key: End', async (page) => { await page.keyboard.press('End'); await step(page, 5).and(page.locator(':focus')).waitFor(); }],
  ['key: Home', async (page) => { await page.keyboard.press('Home'); await step(page, 1).and(page.locator(':focus')).waitFor(); }],
  ['key: Space', async (page) => { await page.keyboard.press(' '); await page.locator('[aria-expanded="true"][aria-label^="Step 1 of 5"]').waitFor(); }],
  ['click: Check', async (page) => { await page.getByRole('button', { name: 'Check', exact: true }).click(); await page.locator('[aria-current="step"][aria-label^="Step 2 of 5"]:focus').waitFor(); }],
  ['screen: Rows', async (page) => { if (!await linksShown(page)) return false; await page.getByRole('button', { name: 'Rows', exact: true }).click(); await page.locator('[data-area="work"] > h2:focus').waitFor(); }],
  ['send: search', async (page) => { const box = page.getByRole('searchbox', { name: 'Search rows' }); await box.fill('Aster'); await box.press('Enter'); await page.locator('tbody tr').filter({ hasText: 'Birch Studio' }).waitFor({ state: 'detached' }); }],
  ['screen: Months', async (page) => { if (!await linksShown(page)) return false; await page.getByRole('button', { name: 'Months', exact: true }).click(); await page.locator('[data-area="nav"] > h2:focus').waitFor(); }],
  ['click: September', async (page) => { await page.getByRole('button', { name: 'September' }).click(); await page.locator('[aria-pressed="true"]', { hasText: 'September' }).waitFor(); }],
  ['screen: Checks', async (page) => { if (!await linksShown(page)) return false; await page.getByRole('button', { name: 'Checks', exact: true }).click(); await page.locator('[data-area="steps"] > h2:focus').waitFor(); }],
  ['key: Escape', async (page) => { await step(page, 2).focus(); await page.keyboard.press('Escape'); }],
];

// Opens the story in a new context, with onCLS listening from the first paint.
async function open(browser, port, vitals, context) {
  const ctx = await browser.newContext({ ...context, timezoneId: 'UTC' });
  await ctx.addInitScript({ content: `${vitals}\nwindow.__cls = 0; webVitals.onCLS((m) => { window.__cls = m.value; }, { reportAllChanges: true });` });
  const page = await ctx.newPage();
  await page.goto(`http://127.0.0.1:${port}/iframe.html?id=${STORY}&viewMode=story&globals=theme:light`);
  await page.waitForFunction((id) => window.__STORYBOOK_PREVIEW__?.currentRender?.phase === 'finished'
    && window.__STORYBOOK_PREVIEW__.currentRender.id === id, STORY);
  await page.locator('.ui-columns').waitFor();
  return { ctx, page };
}

// Runs every action and returns the findings and the actions that ran.
async function walk(page, label, { only } = {}) {
  const found = [];
  const ran = [];
  await page.evaluate(frames);
  let before = await page.evaluate(READ);
  if (before.chrome.length === 0) found.push(`${label}: no shell chrome found to hold still`);
  for (const [name, run] of ACTIONS.filter(([name]) => !only || only.includes(name))) {
    if (await run(page) === false) continue;
    await page.evaluate(frames);
    const after = await page.evaluate(READ);
    ran.push(name);
    if (!after.focus) found.push(`${label} ${name}: the focus left the page's shown controls`);
    for (const c of after.chrome) {
      const was = before.chrome.find((b) => b.name === c.name);
      if (was && Math.max(Math.abs(c.x - was.x), Math.abs(c.y - was.y)) > 1) found.push(`${label} ${name}: ${c.name} moved ${Math.round(c.x - was.x)},${Math.round(c.y - was.y)}px`);
    }
    if (!(after.cls < 0.1)) found.push(`${label} ${name}: the layout shift is ${after.cls}`);
    if (after.over > 0) found.push(`${label} ${name}: the page scrolls ${after.over}px sideways`);
    if (name === 'key: Escape' && (after.view !== before.view || !after.focus?.startsWith('Step 2 of 5'))) found.push(`${label} ${name}: Escape changed the page`);
    before = after;
  }
  return { found, ran };
}

test('the three-column page keeps focus, chrome, layout and width through each interaction', {
  skip: process.env.THREE_COLUMN !== '1' && 'set THREE_COLUMN=1',
}, async () => {
  const { serve, playwright } = await import('./lib/dropdown-contain.js');
  const pw = await playwright();
  assert.ok(pw, 'THREE_COLUMN=1 was set and no Playwright could be resolved. Point UI_PLAYWRIGHT at one.');
  assert.ok(process.env.UI_WEB_VITALS && existsSync(process.env.UI_WEB_VITALS), 'point UI_WEB_VITALS at web-vitals/dist/web-vitals.iife.js');
  const vitals = readFileSync(process.env.UI_WEB_VITALS, 'utf8');
  const build = path.join(root, 'storybook-static');
  assert.ok(existsSync(path.join(build, 'index.json')), `no Storybook build at ${build} — run: npm run build-storybook`);

  const subjects = (process.env.THREE_COLUMN_ONLY ? (s) => s.filter(([label]) => label === process.env.THREE_COLUMN_ONLY) : (s) => s)([
    ...SIZES.map(([width, height]) => [`${width}×${height}`, { viewport: { width, height } }]),
    ...DEVICES.map((name) => { assert.ok(pw.devices[name], `Playwright has no device "${name}"`); return [name, pw.devices[name]]; }),
    ...DUO.map(([width, height]) => [`two-screen ${width}×${height}`, { viewport: { width, height }, deviceScaleFactor: 3, hasTouch: true, isMobile: true }]),
  ]);
  const browser = await pw.chromium.launch({ executablePath: process.env.UI_CHROME });
  const server = await serve(build, path.join(build, 'iframe.html'));
  try {
    const findings = [];
    const table = [];
    const views = { wide: 0, tablet: 0, phone: 0 };
    for (const [label, context] of subjects) {
      const { ctx, page } = await open(browser, server.port, vitals, context);
      const width = await page.evaluate(() => innerWidth);
      // The collapse order at this width, read before any action.
      const shown = await page.evaluate(() => ['nav', 'steps', 'work'].filter((key) => document.querySelector(`[data-area="${key}"]`).checkVisibility()));
      const kind = width > 860 ? 'wide' : width > 560 ? 'tablet' : 'phone';
      const expected = { wide: ['nav', 'steps', 'work'], tablet: ['steps', 'work'], phone: ['steps'] }[kind];
      if (shown.join() !== expected.join()) findings.push(`${label}: shows ${shown.join(', ')} at ${width}px, expected ${expected.join(', ')}`);
      views[kind] += 1;
      const { found, ran } = await walk(page, label);
      findings.push(...found);
      // Every action runs on a tablet or a phone. Above 860px the links are hidden.
      const want = ACTIONS.length - (kind === 'wide' ? 3 : 0);
      assert.equal(ran.length, want, `${label}: ${ran.length} of ${want} actions ran: ${ran.join(', ')}`);
      table.push(`${label} ${width}px ${kind}: ${ran.length} actions, ${found.length ? 'fail' : 'pass'}`);
      await ctx.close();
    }
    process.stdout.write(`${table.join('\n')}\n`);
    // THREE_COLUMN_ONLY=<label> runs one size while a fault is found; it skips the counts.
    if (!process.env.THREE_COLUMN_ONLY) assert.equal(table.length, SIZES.length + DEVICES.length + DUO.length, 'a size or a device was not measured');
    if (!process.env.THREE_COLUMN_ONLY) assert.ok(views.wide >= 4 && views.tablet >= 2 && views.phone >= 4, `too few sizes in a band: ${JSON.stringify(views)}`);
    assert.deepEqual(findings, []);

    // The mutations: each check must see its own failure.
    const caught = [];
    const mutate = async (context, setup, only, says) => {
      const { ctx, page } = await open(browser, server.port, vitals, context);
      await setup(page);
      const { found } = await walk(page, 'mutated', { only });
      caught.push([says, found.some((f) => f.includes(says))]);
      await ctx.close();
    };
    const wide = { viewport: { width: 1280, height: 800 } };
    await mutate(wide, (page) => page.addStyleTag({ content: '.ui-columns__area--work { min-width: 1400px; }' }), ['key: Down'], 'sideways');
    await mutate(wide, (page) => page.evaluate(() => document.addEventListener('click', () => setTimeout(() => document.activeElement.blur()), true)), ['click: September'], 'focus left');
    await mutate(wide, (page) => page.evaluate(() => document.addEventListener('keydown', () => {
      for (const e of document.querySelectorAll('body *')) if (getComputedStyle(e).position === 'sticky' && !e.closest('.ui-columns')) e.style.translate = '0 4px';
    })), ['key: Down'], 'moved');
    // A block that pushes the page down with no input, as a late banner would.
    await mutate(wide, async (page) => {
      await page.evaluate(() => { const block = document.createElement('div'); block.style.height = '400px'; document.querySelector('.ui-columns').before(block); });
      await page.evaluate(frames);
    }, ['key: Down'], 'layout shift');
    assert.deepEqual(caught.filter(([, seen]) => !seen).map(([says]) => says), [], 'a mutation passed: this walk cannot see it');
  } finally {
    await browser.close();
    server.proc.kill();
  }
});
