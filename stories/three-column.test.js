/* Rule: on the three-column page, each key, click, send and move between columns keeps the
 * focus on a shown control of the page, moves no shell chrome by more than 1px, keeps the
 * cumulative layout shift under 0.1 and causes no sideways scroll. Escape closes the title
 * menu and puts the focus back on its title. The columns hold: three above 860px, the open
 * column and its parent from 561px to 860px, and the open column alone at 560px and below.
 *
 * Off unless THREE_COLUMN=1: Playwright and web-vitals are not dependencies of this
 * package, CI does not run it, and the result is reported by hand in the pull request.
 *
 *   npm run build-storybook
 *   UI_PLAYWRIGHT=… UI_WEB_VITALS=…/web-vitals/dist/web-vitals.iife.js THREE_COLUMN=1 \
 *     node --test stories/three-column.test.js
 *
 * It opens two stories in a new context at each of ten window sizes and on six devices: the
 * Galaxy Z Fold 7 and Flip 7 and their cover screens from Playwright's list, and a two-screen
 * phone of 466×678 and 890×626 at scale 3 with touch. react-three-column-page--month-checks
 * walks the Wizard in column 2, a check that opens its rows, a search, the back link and a new
 * month. react-three-column-page--title-menu walks the back link, a folder, the title menu
 * and Escape, and a file. The shell chrome is every fixed or sticky element outside the page,
 * found in the page.
 *
 * At each subject it also runs axe's label-content-name-mismatch rule on the page, so a row's
 * name starts with its visible words. Where two or three columns show, it checks that their
 * header rows have one top and one height, that each column after the first draws the 1px
 * line and the first draws none, and that each column reaches the foot of the window and
 * scrolls alone.
 *
 * Its limits: one engine, the light theme and the default accent. The layout shift is
 * web-vitals' onCLS, which does not count a shift within 500ms of an input, so a shift
 * that a press causes on purpose is not measured. The month close page opens no layer, so
 * there Escape is checked to leave the focus and the depth as they were.
 * why: docs/components.md#three-column-page
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

// The state after one action: the focused control, the shell chrome's places, the
// layout shift so far, the page's sideways overflow and the depth.
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
    chrome, cls: window.__cls, depth: page.dataset.depth, over: doc.scrollWidth - doc.clientWidth,
  };
};
const frames = () => new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(ok, 0))));

// The actions, in order. Each runs only where its control is shown, and names the state
// it waits for, so no step waits on time.
const depth = (page, n) => page.locator(`.ui-columns[data-depth="${n}"]`).waitFor();
const back = async (page) => {
  const link = page.getByRole('link', { name: /^Back to / });
  if (!await link.isVisible()) return false;
  const from = await page.locator('.ui-columns').getAttribute('data-depth');
  await link.click();
  await depth(page, Number(from) - 1);
};
const step = (page, n) => page.getByRole('button', { name: new RegExp(`, step ${n} of 5$`) });
const MONTH = [
  ['key: Down', async (page) => { await step(page, 1).focus(); await page.keyboard.press('ArrowDown'); await step(page, 2).and(page.locator(':focus')).waitFor(); }],
  ['key: Home', async (page) => { await page.keyboard.press('Home'); await step(page, 1).and(page.locator(':focus')).waitFor(); }],
  ['click: Check', async (page) => { await page.getByRole('button', { name: 'Check', exact: true }).click(); await page.locator('[aria-current="step"][aria-label$="step 2 of 5"]:focus').waitFor(); }],
  ['key: Enter', async (page) => { await page.keyboard.press('Enter'); await depth(page, 3); }],
  ['send: search', async (page) => { const box = page.getByRole('searchbox', { name: 'Search rows' }); await box.fill('Aster'); await box.press('Enter'); await page.locator('tbody tr').filter({ hasText: 'Birch Studio' }).waitFor({ state: 'detached' }); }],
  ['screen: back', back],
  ['screen: back again', back],
  ['click: September', async (page) => { await page.getByRole('button', { name: 'September' }).click(); await page.locator('[aria-pressed="true"]', { hasText: 'September' }).waitFor({ state: 'attached' }); await depth(page, 2); }],
  ['key: Escape', async (page) => { await step(page, 2).focus(); await page.keyboard.press('Escape'); }],
];
const title = (page) => page.locator('[data-column="2"] .ui-columns__menu');
const LIBRARY = [
  ['screen: back', back],
  ['screen: back again', back],
  ['click: Projects', async (page) => { await page.getByRole('button', { name: 'Projects 6 files' }).click(); await page.getByRole('navigation', { name: 'Files in Projects' }).waitFor(); await depth(page, 2); }],
  ['click: title menu', async (page) => { await title(page).click(); await page.locator('[data-column="2"] .ui-dropdown.open [role="menu"]').waitFor(); }],
  ['key: Escape', async (page) => { await page.keyboard.press('Escape'); await page.locator('[data-column="2"] .ui-columns__menu[aria-expanded="false"]:focus').waitFor(); }],
  ['click: Plan', async (page) => { await page.getByRole('button', { name: 'Plan 24 Nov' }).click(); await page.getByRole('region', { name: 'Plan' }).waitFor(); await depth(page, 3); }],
];
// Each story, the actions it walks, and the columns each width shows before any action.
const STORIES = [
  { id: 'react-three-column-page--month-checks', actions: MONTH, shows: { wide: ['1', '2', '3'], tablet: ['1', '2'], phone: ['2'] },
    // The back link shows from depth 2 on a phone and at depth 3 on a tablet.
    backs: { wide: 0, tablet: 1, phone: 2 } },
  { id: 'react-three-column-page--title-menu', actions: LIBRARY, shows: { wide: ['1', '2', '3'], tablet: ['2', '3'], phone: ['3'] },
    backs: { wide: 0, tablet: 1, phone: 2 } },
];

// Opens a story in a new context, with onCLS listening from the first paint.
async function open(browser, port, vitals, context, story) {
  const ctx = await browser.newContext({ ...context, timezoneId: 'UTC' });
  await ctx.addInitScript({ content: `${vitals}\nwindow.__cls = 0; webVitals.onCLS((m) => { window.__cls = m.value; }, { reportAllChanges: true });` });
  const page = await ctx.newPage();
  await page.goto(`http://127.0.0.1:${port}/iframe.html?id=${story}&viewMode=story&globals=theme:light`);
  await page.waitForFunction((id) => window.__STORYBOOK_PREVIEW__?.currentRender?.phase === 'finished'
    && window.__STORYBOOK_PREVIEW__.currentRender.id === id, story);
  await page.locator('.ui-columns').waitFor();
  return { ctx, page };
}

const AXE = readFileSync(path.join(root, 'node_modules/axe-core/axe.min.js'), 'utf8');
// The page's own checks before any action: axe's name rule, and where two or three columns
// show, one header row height, the lines between the columns, and a scroll box for each.
async function inspect(page, label) {
  const found = [];
  await page.addScriptTag({ content: AXE });
  const axe = await page.evaluate(() => window.axe.run(document, { runOnly: { type: 'rule', values: ['label-content-name-mismatch'] } })
    .then((r) => ({ ran: r.passes.length + r.violations.length + r.incomplete.length, bad: r.violations.flatMap((v) => v.nodes.map((n) => n.target.join(' '))) })));
  if (axe.ran === 0) found.push(`${label}: axe label-content-name-mismatch measured nothing`);
  for (const target of axe.bad) found.push(`${label}: label-content-name-mismatch on ${target}`);
  const cols = await page.evaluate(() => [...document.querySelectorAll('.ui-columns__col')].filter((c) => c.checkVisibility()).map((c) => {
    const head = c.querySelector(':scope > .ui-columns__head').getBoundingClientRect();
    const r = c.getBoundingClientRect();
    const cs = getComputedStyle(c);
    return { n: c.dataset.column, top: head.top, height: head.height, line: parseFloat(cs.borderInlineStartWidth), bottom: r.bottom, scroll: cs.overflowY, foot: innerHeight };
  }));
  if (cols.length > 1) {
    for (const c of cols) {
      if (Math.abs(c.top - cols[0].top) > 1 || Math.abs(c.height - cols[0].height) > 1) found.push(`${label}: the header rows differ: column ${c.n} is ${c.height}px at ${c.top}`);
      if (Math.abs(c.bottom - c.foot) > 1) found.push(`${label}: the line of column ${c.n} stops at ${Math.round(c.bottom)}px, not at the foot`);
      if (c.scroll !== 'auto') found.push(`${label}: column ${c.n} does not scroll alone`);
    }
    cols.forEach((c, i) => { if ((c.line === 1) !== (i > 0)) found.push(`${label}: column ${c.n} ${i ? 'draws no line' : 'draws a line'} before it`); });
  }
  return { found, shown: cols.map((c) => c.n), measured: cols.length > 1 };
}

// Runs every action and returns the findings and the actions that ran.
async function walk(page, label, actions, { only } = {}) {
  const found = [];
  const ran = [];
  await page.evaluate(frames);
  let before = await page.evaluate(READ);
  if (before.chrome.length === 0) found.push(`${label}: no shell chrome found to hold still`);
  for (const [name, run] of actions.filter(([name]) => !only || only.includes(name))) {
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
    if (name === 'key: Escape' && after.depth !== before.depth) found.push(`${label} ${name}: Escape changed the depth`);
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
  const ids = Object.keys(JSON.parse(readFileSync(path.join(build, 'index.json'), 'utf8')).entries);
  for (const story of STORIES) assert.ok(ids.includes(story.id), `the Storybook build has no ${story.id}`);

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
    let measured = 0;
    for (const [label, context] of subjects) {
      for (const story of STORIES) {
        const { ctx, page } = await open(browser, server.port, vitals, context, story.id);
        const width = await page.evaluate(() => innerWidth);
        const kind = width > 860 ? 'wide' : width > 560 ? 'tablet' : 'phone';
        const own = await inspect(page, `${label} ${story.id}`);
        findings.push(...own.found);
        if (own.shown.join() !== story.shows[kind].join()) findings.push(`${label} ${story.id}: shows ${own.shown.join(', ')} at ${width}px, expected ${story.shows[kind].join(', ')}`);
        measured += own.measured ? 1 : 0;
        views[kind] += 1;
        const { found, ran } = await walk(page, `${label} ${story.id}`, story.actions);
        findings.push(...found);
        // Every action runs, less the back links that this width does not show.
        const want = story.actions.length - (2 - story.backs[kind]);
        assert.equal(ran.length, want, `${label} ${story.id}: ${ran.length} of ${want} actions ran: ${ran.join(', ')}`);
        table.push(`${label} ${width}px ${kind} ${story.id.replace('react-three-column-page--', '')}: ${ran.length} actions, ${found.length ? 'fail' : 'pass'}`);
        await ctx.close();
      }
    }
    process.stdout.write(`${table.join('\n')}\n`);
    // THREE_COLUMN_ONLY=<label> runs one size while a fault is found; it skips the counts.
    if (!process.env.THREE_COLUMN_ONLY) assert.equal(table.length, (SIZES.length + DEVICES.length + DUO.length) * STORIES.length, 'a size or a device was not measured');
    if (!process.env.THREE_COLUMN_ONLY) assert.ok(views.wide >= 8 && views.tablet >= 4 && views.phone >= 8, `too few sizes in a band: ${JSON.stringify(views)}`);
    if (!process.env.THREE_COLUMN_ONLY) assert.ok(measured >= 12, `the header rows and lines were measured at only ${measured} subjects`);
    assert.deepEqual(findings, []);

    // The mutations: each check must see its own failure.
    const caught = [];
    const [month, library] = STORIES;
    const mutate = async (context, story, setup, only, says) => {
      const { ctx, page } = await open(browser, server.port, vitals, context, story.id);
      await setup(page);
      const { found } = await walk(page, 'mutated', story.actions, { only });
      caught.push([says, found.some((f) => f.includes(says))]);
      await ctx.close();
    };
    const wide = { viewport: { width: 1280, height: 800 } };
    const phone = { viewport: { width: 390, height: 844 } };
    const inspected = async (context, setup, says) => {
      const { ctx, page } = await open(browser, server.port, vitals, context, month.id);
      await setup(page);
      caught.push([says, (await inspect(page, 'mutated')).found.some((f) => f.includes(says))]);
      await ctx.close();
    };
    // The name this rule caught: the place before the visible words.
    await inspected(wide, (page) => page.evaluate(() => document.querySelectorAll('.ui-wizard__step').forEach((b, i) => {
      b.setAttribute('aria-label', `Step ${i + 1} of 5: ${b.querySelector('.ui-wizard__name').textContent.replace(/^\d+\. /, '')}, ${b.querySelector('.ui-wizard__state').textContent}`);
    })), 'label-content-name-mismatch');
    await inspected(wide, (page) => page.addStyleTag({ content: '[data-column="3"] > .ui-columns__head { min-height: 0; }' }), 'header rows differ');
    await inspected(wide, (page) => page.addStyleTag({ content: '.ui-columns { flex: none; height: 50vh; }' }), 'not at the foot');
    await inspected(wide, (page) => page.addStyleTag({ content: '.ui-columns__col { overflow-y: visible; }' }), 'scroll alone');
    await inspected({ viewport: { width: 820, height: 1180 } }, (page) => page.addStyleTag({ content: '.ui-columns__col { border-inline-start: 1px solid; }' }), 'draws a line');
    await mutate(wide, month, (page) => page.addStyleTag({ content: '[data-column="3"] { min-width: 1400px; }' }), ['key: Down'], 'sideways');
    await mutate(wide, month, (page) => page.evaluate(() => document.addEventListener('click', () => setTimeout(() => document.activeElement.blur()), true)), ['click: September'], 'focus left');
    // The move that hides the focused row on a phone, without the page's own focus move.
    await mutate(phone, library, (page) => page.evaluate(() => {
      const keep = HTMLElement.prototype.focus;
      HTMLElement.prototype.focus = function focus(...args) { if (!this.matches('h2, .ui-columns__menu')) keep.apply(this, args); };
    }), ['screen: back', 'screen: back again', 'click: Projects'], 'focus left');
    await mutate(wide, month, (page) => page.evaluate(() => document.addEventListener('keydown', () => {
      for (const e of document.querySelectorAll('body *')) if (getComputedStyle(e).position === 'sticky' && !e.closest('.ui-columns')) e.style.translate = '0 4px';
    })), ['key: Down'], 'moved');
    // A block that pushes the page down with no input, as a late banner would.
    await mutate(wide, month, async (page) => {
      await page.evaluate(() => { const block = document.createElement('div'); block.style.height = '400px'; document.querySelector('.ui-columns').before(block); });
      await page.evaluate(frames);
    }, ['key: Down'], 'layout shift');
    assert.deepEqual(caught.filter(([, seen]) => !seen).map(([says]) => says), [], 'a mutation passed: this walk cannot see it');
  } finally {
    await browser.close();
    server.proc.kill();
  }
});
