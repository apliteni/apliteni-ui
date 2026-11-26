/* Rule: a filter chip keeps its width through each key, click and reload, so the content under
 * the bar does not move. Each chip takes the width of its longest value, up to 224px. While a
 * menu is open, the focus stays in it, and Escape closes it. No fixed element moves by more
 * than 1px, the cumulative layout shift stays under 0.1, and the page does not scroll sideways.
 * The name of an empty chip keeps its weight while the bar is off. This walk does not see that,
 * because the hidden lines hold the heavier weight. src/styles/filter-bar.test.js holds it.
 *
 * Off unless CHIP_WIDTH=1: Playwright and web-vitals are not dependencies of this package, CI
 * does not run it, and the result is reported by hand in the pull request.
 *
 *   npm run build-storybook
 *   UI_PLAYWRIGHT=… UI_WEB_VITALS=…/web-vitals/dist/web-vitals.iife.js CHIP_WIDTH=1 \
 *     node --test stories/filter-chip-width.test.js
 *
 * It opens react-filterbar--reloading at each of ten window sizes and on six devices: the
 * Galaxy Z Fold 7 and Flip 7 and their cover screens from Playwright's list, and a two-screen
 * phone of 466×678 and 890×626 at scale 3 with touch. The story turns the bar off for 600ms
 * after each change. A ResizeObserver records each chip's width and the toolbar's height from
 * the first paint, so a change that lasts only while the bar is off is also caught. Each action waits for the bar
 * to turn on again.
 *
 * Its limits: one engine, the light theme and the default accent. The layout shift is
 * web-vitals' onCLS, which does not count a shift within 500ms of an input, so the gate also
 * reads the card's top under the bar after each action. The focus after a reload is not
 * checked: a bar that turns off drops the focus of its own controls, and that is outside #885.
 * why: docs/components.md#filter-bar
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const STORY = 'react-filterbar--reloading';
const SIZES = [[390, 844], [844, 390], [820, 1180], [1280, 800], [1920, 1080], [360, 800], [466, 678], [984, 1016], [1536, 864], [2560, 1440]];
const DEVICES = ['Galaxy Z Fold 7', 'Galaxy Z Fold 7 Cover', 'Galaxy Z Flip 7', 'Galaxy Z Flip 7 Cover'];
const DUO = [[466, 678], [890, 626]];
const CAP = 224;
const MEMBERS = 3;

// The state after one action: the chips' widths now and every width they had since the last
// read, the card's top, the fixed elements' places, the open menu and the focus, the layout
// shift so far and the page's sideways overflow.
const READ = () => {
  const chips = [...document.querySelectorAll('.ui-filter-bar__chip')];
  const card = document.querySelector('.ui-card');
  const open = document.querySelector('.ui-filter-bar .ui-dropdown.open');
  const fixed = [...document.querySelectorAll('body *')].filter((e) => getComputedStyle(e).position === 'fixed')
    .map((e) => { const r = e.getBoundingClientRect(); return { name: `${e.tagName.toLowerCase()}.${[...e.classList].join('.')}`, x: r.left, y: r.top }; });
  const seen = window.__widths;
  window.__widths = {};
  const doc = document.scrollingElement;
  return {
    widths: chips.map((c) => c.getBoundingClientRect().width), seen,
    row: document.querySelector('.ui-toolbar').getBoundingClientRect().height,
    card: card.getBoundingClientRect().top, fixed, open: Boolean(open),
    focusIn: Boolean(open && open.contains(document.activeElement)),
    cls: window.__cls, over: doc.scrollWidth - doc.clientWidth,
  };
};
const frames = () => new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(ok, 0))));

// The actions, in order. Each names the state it waits for, so no step waits on time.
const chip = (page, name) => page.getByRole('button', { name: new RegExp(`^${name}: `) });
const reloaded = async (page) => {
  await page.locator('.ui-filter-bar[aria-busy="true"]').waitFor({ state: 'attached' });
  await page.locator('.ui-filter-bar[aria-busy="true"]').waitFor({ state: 'detached' });
};
const ACTIONS = [
  ['click: Office', async (page) => { await chip(page, 'Office').click(); await page.locator('.ui-dropdown.open').waitFor(); }],
  ['key: Escape', async (page) => { await page.keyboard.press('Escape'); await page.locator('.ui-dropdown.open').waitFor({ state: 'detached' }); }],
  ['key: Enter', async (page) => { await chip(page, 'Office').focus(); await page.keyboard.press('Enter'); await page.locator('.ui-dropdown.open').waitFor(); }],
  ['key: Down', async (page) => { await page.keyboard.press('ArrowDown'); await page.getByRole('option', { name: 'Any office' }).and(page.locator(':focus')).waitFor(); }],
  ['key: Down again', async (page) => { await page.keyboard.press('ArrowDown'); await page.getByRole('option', { name: 'Lisbon' }).and(page.locator(':focus')).waitFor(); }],
  ['key: Enter on a value', async (page) => { await page.keyboard.press('Enter'); await reloaded(page); }],
  ['click: Team', async (page) => { await chip(page, 'Team').click(); await page.locator('.ui-dropdown.open').waitFor(); }],
  ['click: Company overhead', async (page) => { await page.getByRole('option', { name: 'Company overhead' }).click(); await reloaded(page); }],
  ['click: Remove Office filter', async (page) => { await page.getByRole('button', { name: 'Remove Office filter' }).click(); await reloaded(page); }],
  ['click: Clear all', async (page) => { await page.getByRole('button', { name: 'Clear all' }).click(); await reloaded(page); }],
];

// Opens the story in a new context, with onCLS and the width record listening from the first paint.
async function open(browser, port, vitals, context) {
  const ctx = await browser.newContext({ ...context, timezoneId: 'UTC' });
  await ctx.addInitScript({ content: `${vitals}\nwindow.__cls = 0; webVitals.onCLS((m) => { window.__cls = m.value; }, { reportAllChanges: true });
    window.__widths = {};
    const watch = new ResizeObserver((entries) => { for (const e of entries) {
      const r = e.target.getBoundingClientRect();
      const id = e.target.dataset.filterId;
      (window.__widths[id || 'row'] ||= []).push(id ? r.width : r.height); } });
    new MutationObserver(() => document.querySelectorAll('.ui-filter-bar__chip, .ui-toolbar').forEach((c) => watch.observe(c)))
      .observe(document, { childList: true, subtree: true });` });
  const page = await ctx.newPage();
  await page.goto(`http://127.0.0.1:${port}/iframe.html?id=${STORY}&viewMode=story&globals=theme:light`);
  await page.waitForFunction((id) => window.__STORYBOOK_PREVIEW__?.currentRender?.phase === 'finished'
    && window.__STORYBOOK_PREVIEW__.currentRender.id === id, STORY);
  await page.locator('.ui-filter-bar__chip').first().waitFor();
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  return { ctx, page };
}

async function walk(page, label, { only } = {}) {
  const found = [];
  const ran = [];
  await page.evaluate(frames);
  const start = await page.evaluate(READ);
  if (start.widths.length !== MEMBERS) found.push(`${label}: ${start.widths.length} chips, expected ${MEMBERS}`);
  for (const w of start.widths) if (w > CAP + 0.5) found.push(`${label}: a chip is ${w}px wide, over the ${CAP}px cap`);
  let before = start;
  for (const [name, run] of ACTIONS.filter(([n]) => !only || only.includes(n))) {
    await run(page);
    await page.evaluate(frames);
    const after = await page.evaluate(READ);
    ran.push(name);
    after.widths.forEach((w, i) => { if (Math.abs(w - start.widths[i]) > 0.5) found.push(`${label} ${name}: chip ${i + 1} is ${w}px, was ${start.widths[i]}px`); });
    for (const [id, ws] of Object.entries(after.seen || {})) {
      // The row's height, or one chip's width, at each frame it changed in.
      const want = id === 'row' ? start.row : start.widths[['office', 'team', 'status'].indexOf(id)];
      const what = id === 'row' ? 'the row above the card was' : `chip ${id} was`;
      for (const w of ws) if (Math.abs(w - want) > 0.5) { found.push(`${label} ${name}: ${what} ${w}px for a while, not ${want}px`); break; }
    }
    if (Math.abs(after.card - start.card) > 0.5) found.push(`${label} ${name}: the card under the bar moved ${after.card - start.card}px`);
    for (const c of after.fixed) {
      const was = before.fixed.find((b) => b.name === c.name);
      if (was && Math.max(Math.abs(c.x - was.x), Math.abs(c.y - was.y)) > 1) found.push(`${label} ${name}: ${c.name} moved ${c.x - was.x},${c.y - was.y}px`);
    }
    if (after.open && !after.focusIn) found.push(`${label} ${name}: the focus left the open menu`);
    if (name === 'key: Escape' && after.open) found.push(`${label} ${name}: Escape left the menu open`);
    if (!(after.cls < 0.1)) found.push(`${label} ${name}: the layout shift is ${after.cls}`);
    if (after.over > 0) found.push(`${label} ${name}: the page scrolls ${after.over}px sideways`);
    before = after;
  }
  return { found, ran };
}

test('a filter chip keeps its width through each key, click and reload', {
  skip: process.env.CHIP_WIDTH !== '1' && 'set CHIP_WIDTH=1',
}, async () => {
  const { serve, playwright } = await import('./lib/dropdown-contain.js');
  const pw = await playwright();
  assert.ok(pw, 'CHIP_WIDTH=1 was set and no Playwright could be resolved. Point UI_PLAYWRIGHT at one.');
  assert.ok(process.env.UI_WEB_VITALS && existsSync(process.env.UI_WEB_VITALS), 'point UI_WEB_VITALS at web-vitals/dist/web-vitals.iife.js');
  const vitals = readFileSync(process.env.UI_WEB_VITALS, 'utf8');
  const build = path.join(root, 'storybook-static');
  assert.ok(existsSync(path.join(build, 'index.json')), `no Storybook build at ${build}. Run: npm run build-storybook`);
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
      const widths = await page.evaluate(() => [...document.querySelectorAll('.ui-filter-bar__chip')].map((c) => Math.round(c.getBoundingClientRect().width)));
      const { found, ran } = await walk(page, label);
      findings.push(...found);
      assert.equal(ran.length, ACTIONS.length, `${label}: ${ran.length} of ${ACTIONS.length} actions ran`);
      table.push(`${label}: chips ${widths.join(', ')}px, ${ran.length} actions, ${found.length ? 'fail' : 'pass'}`);
      await ctx.close();
    }
    process.stdout.write(`${table.join('\n')}\n`);
    assert.equal(table.length, SIZES.length + DEVICES.length + DUO.length, 'a size or a device was not measured');
    assert.deepEqual(findings, []);

    // Each mutation puts back one cause of a jump, and the walk has to see it.
    const caught = [];
    const mutate = async (css, only, says) => {
      const { ctx, page } = await open(browser, server.port, vitals, { viewport: { width: 1280, height: 800 } });
      await page.addStyleTag({ content: css });
      const { found } = await walk(page, 'mutated', { only });
      caught.push([says, found.some((f) => f.includes(says))]);
      await ctx.close();
    };
    // Not mutated here: the name's heavier weight while the bar is off. The hidden lines are
    // drawn at the value's weight, which is the heavier one, so the width does not show it.
    // src/styles/filter-bar.test.js holds the weight.
    // A chip as wide as its value.
    await mutate('.ui-filter-bar__fit > [aria-hidden="true"] { display: none; }', ['click: Team', 'click: Company overhead'], 'chip 2 is');
    // A remove mark and Clear all that take no room while they do not show.
    await mutate('.ui-filter-bar .is-reserved { display: none; }', ['click: Team', 'click: Company overhead'], 'chip 2 is');
    // No cap: a long value widens the chip past 224px.
    await mutate('.ui-filter-bar { --ui-filter-chip-max: none; } .ui-filter-bar__chip { min-width: 260px; }', ['key: Escape'], 'over the');
    // The card moves for the length of a reload when the bar grows while it is off.
    await mutate('.ui-filter-bar[aria-busy="true"] { padding-bottom: 20px; }', ['click: Team', 'click: Company overhead'], 'the row above the card was');
    assert.deepEqual(caught.filter(([, seen]) => !seen).map(([says]) => says), [], 'a mutation passed: this walk cannot see it');
  } finally {
    await browser.close();
    server.proc.kill();
  }
});
