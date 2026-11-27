/* Rule: a pick on the selection bar applies at once and the rows stay selected. The keyboard
 * stays in the bar and in the list it opens, the first Escape closes the list and the second
 * clears the selection and sends the focus to Select all. Each key and click keeps the bar
 * within 1px of where it stood, keeps the cumulative layout shift under 0.1 and causes no
 * sideways scroll.
 *
 * Off unless SELECTION_BAR=1: Playwright and web-vitals are not dependencies of this package,
 * CI does not run it, and the result is reported by hand in the pull request.
 *
 *   npm run build-storybook
 *   UI_PLAYWRIGHT=… UI_WEB_VITALS=…/web-vitals/dist/web-vitals.iife.js SELECTION_BAR=1 \
 *     node --test stories/selection-bar.test.js
 *
 * It opens apps-selected-rows--default (ten documents, two selected) in a new context at
 * each of ten window sizes and on six devices: the Galaxy Z Fold 7 and Flip 7 and their cover
 * screens from Playwright's list, and a two-screen phone of 466×678 and 890×626 at scale 3 with
 * touch. The script puts the focus on Clear, then the walk presses Tab to the first list,
 * ArrowDown, ArrowDown and Enter on Ready, ArrowDown, Escape and Escape. Then it clicks a row's box, clicks the
 * first list and presses Escape. A walk that cannot reach the focus it waits for stops, and its
 * error says that the focus left. A second walk in a new context sets the window to 1280×800,
 * puts the focus on Archive, sets the window to 390×844, where Archive goes into More, and
 * sets it back. The focus must go to More, and then to the first action that came out of More.
 *
 * Its limits: one engine, the light theme and the default accent. The layout shift is
 * web-vitals' onCLS, which does not count a shift within 500ms of an input. The resize walk
 * does not compare where the bar stands, because a new window size moves it. The source half is
 * in react/src/SelectionBar.test.tsx and react/src/showcases/SelectedRows.test.tsx, and the
 * pick's effect on the rows is proved there, not here.
 * why: docs/components.md#selection-bar
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SIZES = [[390, 844], [844, 390], [820, 1180], [1280, 800], [1920, 1080], [360, 800], [466, 678], [984, 1016], [1536, 864], [2560, 1440]];
const DEVICES = ['Galaxy Z Fold 7', 'Galaxy Z Fold 7 Cover', 'Galaxy Z Flip 7', 'Galaxy Z Flip 7 Cover'];
const DUO = [[466, 678], [890, 626]];
const STORY = 'apps-selected-rows--default';

// The bar's state: where it stands, the focus, the count, an open list, Field guide's status,
// the layout shift so far and the page's sideways overflow. A stuck bar stands on the window's
// bottom edge, so it is read in window coordinates; a bar under the last row is read in page
// coordinates, so a scroll the walk causes is not a move.
const READ = () => {
  const bar = document.querySelector('.ui-selection-bar');
  const room = document.querySelector('.ui-selection-room');
  const doc = document.scrollingElement;
  const box = bar?.getBoundingClientRect();
  const stuck = room ? Math.abs(innerHeight - room.getBoundingClientRect().bottom) < 1 : null;
  const active = document.activeElement;
  const row = document.querySelector('input[aria-label="Select Field guide"]')?.closest('tr');
  const heads = [...(row?.closest('table').tHead.rows[0].cells ?? [])].map((th) => th.textContent.trim());
  return {
    cls: window.__cls, over: doc.scrollWidth - doc.clientWidth,
    bar: Boolean(bar), stuck,
    bottom: box ? (stuck ? innerHeight - box.bottom : box.bottom + scrollY) : null, left: box ? box.left + (stuck ? 0 : scrollX) : null,
    inside: Boolean(bar?.contains(active)),
    selectAll: active === document.querySelector('thead input[type="checkbox"]'),
    tally: bar?.querySelector('.ui-selection-bar__tally').textContent ?? null,
    open: Boolean(bar?.querySelector('.ui-dropdown.open')),
    status: row?.cells[heads.indexOf('Status')]?.textContent.trim() ?? null,
  };
};
const frames = () => new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(ok, 0))));
const FOCUS_LEFT = 'the focus left the control that the walk waits for';
const focused = async (page, locator) => {
  try {
    await page.locator(':focus').and(locator).waitFor();
  } catch (error) {
    if (error.name !== 'TimeoutError') throw error;
    const at = await page.evaluate(() => (document.activeElement === document.body ? 'the page body' : document.activeElement.outerHTML.slice(0, 80)));
    throw new Error(`${FOCUS_LEFT}, and is on ${at}`, { cause: error });
  }
};
// The bar has come in: it has ended its own entrance animation.
const settled = (page) => page.waitForFunction(() => document.querySelector('.ui-selection-bar').getAnimations().every((a) => a.playState === 'finished'));
// The first list on the bar: Status, or More when Status does not fit.
const list = (page) => page.locator('.ui-selection-bar .ui-dropdown__trigger').first();
const shut = (page) => page.waitForFunction(() => !document.querySelector('.ui-selection-bar .ui-dropdown.open'));
// More lists the actions by name, and its Status row opens the Status picker.
const inMore = (page) => page.evaluate(() => Boolean(document.querySelector('.ui-selection-bar .ui-dropdown__trigger')?.closest('.ui-selection-bar > .ui-dropdown')));
const firstRow = (page) => page.locator('.ui-selection-bar .ui-dropdown.open [role="menuitem"]').first();

// [name, run, the state the action must leave]
const ACTIONS = [
  ['key: Tab to the first list', async (page) => { await page.keyboard.press('Tab'); await focused(page, list(page)); }, { inside: true, open: false }],
  ['key: ArrowDown opens the list', async (page) => {
    await page.keyboard.press('ArrowDown');
    await focused(page, page.locator('.ui-selection-bar .ui-dropdown.open [role="menuitem"]').first());
  }, { inside: true, open: true }],
  ['key: ArrowDown and Enter pick Ready', async (page) => {
    if (await inMore(page)) {
      await page.keyboard.press('Enter');
      await focused(page, firstRow(page).and(page.getByRole('menuitem', { name: 'Draft' })));
    }
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await shut(page);
    await focused(page, list(page));
  }, { inside: true, open: false, tally: '2 selected', status: 'Ready' }],
  ['key: ArrowDown opens the list again', async (page) => {
    await page.keyboard.press('ArrowDown');
    await focused(page, page.locator('.ui-selection-bar .ui-dropdown.open [role="menuitem"]').first());
  }, { inside: true, open: true }],
  ['key: Escape closes the list', async (page) => {
    await page.keyboard.press('Escape');
    await shut(page);
    await focused(page, list(page));
  }, { inside: true, open: false, tally: '2 selected' }],
  ['key: Escape clears the selection', async (page) => {
    await page.keyboard.press('Escape');
    await page.locator('.ui-selection-bar').waitFor({ state: 'detached' });
    await focused(page, page.locator('thead input[type="checkbox"]'));
  }, { bar: false, selectAll: true }],
  ['click: select a row', async (page) => {
    await page.getByRole('checkbox', { name: 'Select Access checklist' }).click();
    await page.locator('.ui-selection-bar').waitFor();
    await settled(page);
  }, { bar: true, tally: '1 selected' }],
  ['click: the first list', async (page) => {
    await list(page).click();
    await page.locator('.ui-selection-bar .ui-dropdown.open').waitFor();
  }, { inside: true, open: true }],
  ['key: Escape closes the clicked list', async (page) => {
    await page.keyboard.press('Escape');
    await shut(page);
  }, { inside: true, open: false, tally: '1 selected' }],
];

// The window size changes. The focus follows Archive into More, and then goes to the first
// action that comes out of More.
const more = (page) => page.locator('.ui-selection-bar > .ui-dropdown > .ui-dropdown__trigger');
const action = (page, name) => page.locator('.ui-selection-bar__actions').getByRole('button', { name });
const ORDER = ['Status', 'Owner', 'Tags', 'Move', 'Archive'];
let standing = 0;
const RESIZES = [
  ['resize: 1280×800 and the focus on Archive', async (page) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await action(page, 'Archive').focus();
    await focused(page, action(page, 'Archive'));
  }, { inside: true }],
  ['resize: 390×844 moves Archive into More', async (page) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await focused(page, more(page));
    standing = await page.locator('.ui-selection-bar__actions > *').count();
  }, { inside: true }],
  ['resize: 1280×800 moves the actions out of More', async (page) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await focused(page, action(page, ORDER[standing]));
  }, { inside: true }],
];

async function open(browser, port, vitals, context) {
  const ctx = await browser.newContext({ ...context, timezoneId: 'UTC' });
  await ctx.addInitScript({ content: `${vitals}\nwindow.__cls = 0; webVitals.onCLS((m) => { window.__cls = m.value; }, { reportAllChanges: true });` });
  const page = await ctx.newPage();
  await page.goto(`http://127.0.0.1:${port}/iframe.html?id=${STORY}&viewMode=story&globals=theme:light`);
  await page.waitForFunction((id) => window.__STORYBOOK_PREVIEW__?.currentRender?.phase === 'finished'
    && window.__STORYBOOK_PREVIEW__.currentRender.id === id, STORY);
  await page.locator('.ui-selection-bar').waitFor();
  await settled(page);
  await page.waitForFunction(() => document.fonts.status === 'loaded');
  return { ctx, page };
}

async function walk(page, label, { only, steps = ACTIONS } = {}) {
  const found = [];
  const ran = [];
  await page.getByRole('button', { name: 'Clear' }).focus();
  await page.evaluate(frames);
  let before = await page.evaluate(READ);
  for (const [name, run, want] of steps.filter(([n]) => !only || only.includes(n))) {
    await run(page);
    await page.evaluate(frames);
    const after = await page.evaluate(READ);
    ran.push(name);
    const at = `${label} ${name}`;
    for (const [key, value] of Object.entries(want)) {
      if (after[key] === value) continue;
      if (key === 'inside') found.push(`${at}: the focus left the bar`);
      else found.push(`${at}: ${key} is ${JSON.stringify(after[key])}, not ${JSON.stringify(value)}`);
    }
    // The bar stands where it stood while it shows. A bar that leaves and comes back, or that a
    // scroll sticks or frees, is not compared.
    if (steps === ACTIONS && before.bar && after.bar && before.stuck === after.stuck) {
      const moved = Math.max(Math.abs(after.bottom - before.bottom), Math.abs(after.left - before.left));
      if (moved > 1) found.push(`${at}: the bar moved ${Math.round(moved)}px`);
    }
    if (!(after.cls < 0.1)) found.push(`${at}: the layout shift is ${after.cls}`);
    if (after.over > 0) found.push(`${at}: the page scrolls ${after.over}px sideways`);
    before = after;
  }
  return { found, ran };
}

test('a pick applies at once, the keyboard stays in the bar, and Escape closes the list before it clears', {
  skip: process.env.SELECTION_BAR !== '1' && 'set SELECTION_BAR=1',
}, async () => {
  const { serve, playwright } = await import('./lib/dropdown-contain.js');
  const pw = await playwright();
  assert.ok(pw, 'SELECTION_BAR=1 was set and no Playwright could be resolved. Point UI_PLAYWRIGHT at one.');
  assert.ok(process.env.UI_WEB_VITALS && existsSync(process.env.UI_WEB_VITALS), 'point UI_WEB_VITALS at web-vitals/dist/web-vitals.iife.js');
  const vitals = readFileSync(process.env.UI_WEB_VITALS, 'utf8');
  const build = path.join(root, 'storybook-static');
  assert.ok(existsSync(path.join(build, 'index.json')), `no Storybook build at ${build} — run: npm run build-storybook`);
  assert.ok(Object.keys(JSON.parse(readFileSync(path.join(build, 'index.json'), 'utf8')).entries).includes(STORY), `the Storybook build has no ${STORY}`);

  const subjects = [
    ...SIZES.map(([width, height]) => [`${width}×${height}`, { viewport: { width, height } }]),
    ...DEVICES.map((name) => { assert.ok(pw.devices[name], `Playwright has no device "${name}"`); return [name, pw.devices[name]]; }),
    ...DUO.map(([width, height]) => [`two-screen ${width}×${height}`, { viewport: { width, height }, deviceScaleFactor: 3, hasTouch: true, isMobile: true }]),
  ];
  const browser = await pw.chromium.launch({ executablePath: process.env.UI_CHROME });
  const server = await serve(build, path.join(build, 'iframe.html'));
  try {
    const findings = [];
    const table = [];
    for (const [label, context] of subjects) {
      const { ctx, page } = await open(browser, server.port, vitals, context);
      const width = await page.evaluate(() => innerWidth);
      const { found, ran } = await walk(page, label).catch((error) => { throw new Error(`${label}: ${error.message}`, { cause: error }); });
      findings.push(...found);
      assert.equal(ran.length, ACTIONS.length, `${label}: ${ran.length} of ${ACTIONS.length} actions ran`);
      await ctx.close();
      const resized = await open(browser, server.port, vitals, context);
      const moves = await walk(resized.page, label, { steps: RESIZES }).catch((error) => { throw new Error(`${label}: ${error.message}`, { cause: error }); });
      findings.push(...moves.found);
      assert.equal(moves.ran.length, RESIZES.length, `${label}: ${moves.ran.length} of ${RESIZES.length} resizes ran`);
      table.push(`${label} ${width}px: ${ran.length} actions and ${moves.ran.length} resizes, ${found.length + moves.found.length ? 'fail' : 'pass'}`);
      await resized.ctx.close();
    }
    process.stdout.write(`${table.join('\n')}\n`);
    assert.equal(table.length, SIZES.length + DEVICES.length + DUO.length, 'a size or a device was not measured');
    assert.deepEqual(findings, []);

    // The mutations: each check must see its own failure.
    const caught = [];
    const phone = { viewport: { width: 390, height: 844 } };
    const mutate = async (setup, only, says, steps = ACTIONS) => {
      const { ctx, page } = await open(browser, server.port, vitals, phone);
      page.setDefaultTimeout(3000);
      await setup(page);
      const { found } = await walk(page, 'mutated', { only, steps }).catch((error) => ({ found: [String(error)] }));
      caught.push([says, found.some((f) => f.includes(says)), found]);
      await ctx.close();
    };
    const first = ['key: Tab to the first list'];
    await mutate((page) => page.evaluate(() => document.addEventListener('keydown', () => setTimeout(() => document.activeElement.blur()), true)), first, 'focus left');
    await mutate((page) => page.addStyleTag({ content: '#storybook-root { min-width: 200vw; }' }), first, 'sideways');
    await mutate((page) => page.evaluate(() => document.addEventListener('keydown', () => { document.querySelector('.ui-selection-room').style.transform = 'translateY(-40px)'; }, true)), first, 'bar moved');
    await mutate(async (page) => {
      // The table drops with no input, as a late banner over it would push it. A focus by
      // script is no input, so the shift counts.
      await page.evaluate(() => {
        const banner = document.createElement('div');
        banner.style.height = '300px';
        const table = document.querySelector('.ui-table-scroll');
        table.parentElement.insertBefore(banner, table);
      });
      await page.evaluate(frames);
    }, first, 'layout shift');
    // A bar that lets Escape out of the open list closes the list and clears in one key.
    await mutate((page) => page.evaluate(() => document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      const open = document.querySelector('.ui-selection-bar .ui-dropdown.open');
      if (open) open.closest('.ui-selection-bar').querySelector('.ui-selection-bar__count button').click();
    }, true)), ['key: Tab to the first list', 'key: ArrowDown opens the list', 'key: Escape closes the list'], 'focus left');
    // A bar that moves no focus when a resize moves its actions, as before #911's review: only
    // the walk's own focus on Archive goes through.
    await mutate((page) => page.evaluate(() => {
      const focus = HTMLElement.prototype.focus;
      HTMLElement.prototype.focus = function (...options) {
        if (!this.closest('.ui-selection-bar') || this.textContent === 'Archive') focus.apply(this, options);
      };
    }), null, 'focus left', RESIZES);
    assert.deepEqual(caught.filter(([, seen]) => !seen).map(([says, , found]) => `${says}: ${JSON.stringify(found)}`), [], 'a mutation passed or failed for another reason: this walk cannot see it');
    const [, , lost] = caught.find(([says]) => says === 'focus left');
    assert.ok(lost.length && lost.every((f) => f.includes('focus left') && !/^TimeoutError/.test(f)), `the focus mutation failed for another reason: ${JSON.stringify(lost)}`);
  } finally {
    await browser.close();
    server.proc.kill();
  }
});
