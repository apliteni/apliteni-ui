/* Rule: a filter chip keeps its width through each key, click and reload, so the content under
 * the bar does not move. Each chip takes the width of its longest value, up to its cap: 128px,
 * or the filter's own `maxWidth`. While a
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
 * It opens react-filterbar--reloading and react-filterbar--long-options at each of ten window
 * sizes and on six devices: the
 * Galaxy Z Fold 7 and Flip 7 and their cover screens from Playwright's list, and a two-screen
 * phone of 466×678 and 890×626 at scale 3 with touch. The story turns the bar off for 600ms
 * after each change. A ResizeObserver records each chip's width and the toolbar's height from
 * the first paint, so a change that lasts only while the bar is off is also caught. Each action waits for the bar
 * to turn on again.
 *
 * The second test opens react-filterbar--long-options at 1440×900 in both themes, with the 32px
 * group gap of the product in #915. The search, the bar and the 192px control share one line,
 * with the filters' own caps and with the 128px default on every chip. A long pick ends with an
 * ellipsis, keeps its full name and title, and does not move the next chip. A chip takes the
 * accent edge under the pointer, pressed and open, and not under the keyboard's focus ring.
 *
 * Its limits: one engine and the default accent. The walk uses the light theme. The layout shift is
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
const LONG = 'react-filterbar--long-options';
const SIZES = [[390, 844], [844, 390], [820, 1180], [1280, 800], [1920, 1080], [360, 800], [466, 678], [984, 1016], [1536, 864], [2560, 1440]];
const DEVICES = ['Galaxy Z Fold 7', 'Galaxy Z Fold 7 Cover', 'Galaxy Z Flip 7', 'Galaxy Z Flip 7 Cover'];
const DUO = [[466, 678], [890, 626]];
const CAP = 128;

// The state after one action: the chips' widths now and every width they had since the last
// read, the card's top, the fixed elements' places, the open menu and the focus, the layout
// shift so far and the page's sideways overflow.
const READ = () => {
  const chips = [...document.querySelectorAll('.ui-filter-bar__chip')];
  // The long row has no card, so its toolbar stands in. A place in the page, not in the view,
  // so a menu that scrolls a short view is not counted as a move.
  const card = document.querySelector('.ui-card') || document.querySelector('.ui-toolbar');
  const open = document.querySelector('.ui-filter-bar .ui-dropdown.open');
  const fixed = [...document.querySelectorAll('body *')].filter((e) => getComputedStyle(e).position === 'fixed')
    .map((e) => { const r = e.getBoundingClientRect(); return { name: `${e.tagName.toLowerCase()}.${[...e.classList].join('.')}`, x: r.left, y: r.top }; });
  const seen = window.__widths;
  window.__widths = {};
  const doc = document.scrollingElement;
  return {
    widths: chips.map((c) => c.getBoundingClientRect().width), seen,
    row: document.querySelector('.ui-toolbar').getBoundingClientRect().height,
    card: card.getBoundingClientRect().top + window.scrollY, fixed, open: Boolean(open),
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
const RELOADING = [
  ['click: Office', async (page) => { await chip(page, 'Office').click(); await page.locator('.ui-dropdown.open').waitFor(); }],
  ['key: Escape', async (page) => { await page.keyboard.press('Escape'); await page.locator('.ui-dropdown.open').waitFor({ state: 'detached' }); }],
  ['key: Enter', async (page) => { await chip(page, 'Office').focus(); await page.keyboard.press('Enter'); await page.locator('.ui-dropdown.open').waitFor(); }],
  ['key: Down', async (page) => { await page.keyboard.press('ArrowDown'); await page.getByRole('option', { name: 'Any office' }).and(page.locator(':focus')).waitFor(); }],
  ['key: Down again', async (page) => { await page.keyboard.press('ArrowDown'); await page.getByRole('option', { name: 'Lisbon' }).and(page.locator(':focus')).waitFor(); }],
  ['key: Enter on a value', async (page) => { await page.keyboard.press('Enter'); await reloaded(page); }],
  ['click: Team', async (page) => { await chip(page, 'Team').click(); await page.locator('.ui-dropdown.open').waitFor(); }],
  ['click: Company overhead', async (page) => { await page.getByRole('option', { name: 'Company overhead' }).click(); await reloaded(page); }],
  // A chip has no remove mark: the first row clears its value. rev_8f3cc2e115a3
  ['click: Office again', async (page) => { await chip(page, 'Office').click(); await page.locator('.ui-dropdown.open').waitFor(); }],
  ['click: Any office', async (page) => { await page.getByRole('option', { name: 'Any office' }).click(); await reloaded(page); }],
  ['click: Clear all', async (page) => { await page.getByRole('button', { name: 'Clear all' }).click(); await reloaded(page); }],
];
// The long row has no reload, so each pick waits for the chip's new name.
const picked = (page, name) => chip(page, 'Category').and(page.getByRole('button', { name: `Category: ${name}` })).waitFor();
const LONG_ACTIONS = [
  ['click: Category', async (page) => { await chip(page, 'Category').click(); await page.locator('.ui-dropdown.open').waitFor(); }],
  ['key: Escape', async (page) => { await page.keyboard.press('Escape'); await page.locator('.ui-dropdown.open').waitFor({ state: 'detached' }); }],
  ['key: Enter', async (page) => { await chip(page, 'Category').focus(); await page.keyboard.press('Enter'); await page.locator('.ui-dropdown.open').waitFor(); }],
  ['key: Down', async (page) => { await page.keyboard.press('ArrowDown'); await page.getByRole('option', { name: 'Any category' }).and(page.locator(':focus')).waitFor(); }],
  ['key: Down again', async (page) => { await page.keyboard.press('ArrowDown'); await page.getByRole('option', { name: 'Software' }).and(page.locator(':focus')).waitFor(); }],
  ['key: Enter on a value', async (page) => { await page.keyboard.press('Enter'); await picked(page, 'Software'); }],
  ['click: Category again', async (page) => { await chip(page, 'Category').click(); await page.locator('.ui-dropdown.open').waitFor(); }],
  ['click: the longest value', async (page) => { await page.getByRole('option', { name: 'Professional advisory services' }).click(); await picked(page, 'Professional advisory services'); }],
  ['click: Clear all', async (page) => { await page.getByRole('button', { name: 'Clear all' }).click(); await picked(page, 'any'); }],
];
// Each story the walk opens: its chips by id, the cap of each, and its actions in order.
const STORIES = [
  { id: STORY, chips: ['office', 'team', 'status'], caps: [CAP, CAP, CAP], actions: RELOADING },
  { id: LONG, chips: ['month', 'unit', 'category', 'amount', 'source'], caps: [144, CAP, 160, CAP, CAP], actions: LONG_ACTIONS },
];

// Opens the story in a new context, with onCLS and the width record listening from the first paint.
async function open(browser, port, vitals, context, story = STORY, theme = 'light') {
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
  await page.goto(`http://127.0.0.1:${port}/iframe.html?id=${story}&viewMode=story&globals=theme:${theme}`);
  await page.waitForFunction((id) => window.__STORYBOOK_PREVIEW__?.currentRender?.phase === 'finished'
    && window.__STORYBOOK_PREVIEW__.currentRender.id === id, story);
  await page.locator('.ui-filter-bar__chip').first().waitFor();
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  return { ctx, page };
}

async function walk(page, label, { only, subject = STORIES[0] } = {}) {
  const found = [];
  const ran = [];
  await page.evaluate(frames);
  const start = await page.evaluate(READ);
  if (start.widths.length !== subject.chips.length) found.push(`${label}: ${start.widths.length} chips, expected ${subject.chips.length}`);
  start.widths.forEach((w, i) => { if (w > subject.caps[i] + 0.5) found.push(`${label}: a chip is ${w}px wide, over the ${subject.caps[i]}px cap`); });
  let before = start;
  for (const [name, run] of subject.actions.filter(([n]) => !only || only.includes(n))) {
    await run(page);
    await page.evaluate(frames);
    const after = await page.evaluate(READ);
    ran.push(name);
    after.widths.forEach((w, i) => { if (Math.abs(w - start.widths[i]) > 0.5) found.push(`${label} ${name}: chip ${i + 1} is ${w}px, was ${start.widths[i]}px`); });
    for (const [id, ws] of Object.entries(after.seen || {})) {
      // The row's height, or one chip's width, at each frame it changed in.
      const want = id === 'row' ? start.row : start.widths[subject.chips.indexOf(id)];
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

// What both tests need: Playwright, web-vitals and a Storybook build that holds both stories.
async function setup() {
  const { serve, playwright } = await import('./lib/dropdown-contain.js');
  const pw = await playwright();
  assert.ok(pw, 'CHIP_WIDTH=1 was set and no Playwright could be resolved. Point UI_PLAYWRIGHT at one.');
  const vitalsPath = process.env.UI_WEB_VITALS;
  assert.ok(vitalsPath && existsSync(vitalsPath), 'point UI_WEB_VITALS at web-vitals/dist/web-vitals.iife.js');
  const build = path.join(root, 'storybook-static');
  assert.ok(existsSync(path.join(build, 'index.json')), `no Storybook build at ${build}. Run: npm run build-storybook`);
  const built = Object.keys(JSON.parse(readFileSync(path.join(build, 'index.json'), 'utf8')).entries);
  for (const { id } of STORIES) assert.ok(built.includes(id), `the Storybook build has no ${id}`);
  return { serve, pw, vitals: readFileSync(vitalsPath, 'utf8'), build };
}

test('a filter chip keeps its width through each key, click and reload', {
  skip: process.env.CHIP_WIDTH !== '1' && 'set CHIP_WIDTH=1',
}, async () => {
  const { serve, pw, vitals, build } = await setup();

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
    for (const subject of STORIES) for (const [label, context] of subjects) {
      const { ctx, page } = await open(browser, server.port, vitals, context, subject.id);
      const widths = await page.evaluate(() => [...document.querySelectorAll('.ui-filter-bar__chip')].map((c) => Math.round(c.getBoundingClientRect().width)));
      const { found, ran } = await walk(page, `${subject.id} ${label}`, { subject });
      findings.push(...found);
      assert.equal(ran.length, subject.actions.length, `${label}: ${ran.length} of ${subject.actions.length} actions ran`);
      table.push(`${subject.id} ${label}: chips ${widths.join(', ')}px, ${ran.length} actions, ${found.length ? 'fail' : 'pass'}`);
      await ctx.close();
    }
    process.stdout.write(`${table.join('\n')}\n`);
    assert.equal(table.length, STORIES.length * (SIZES.length + DEVICES.length + DUO.length), 'a size or a device was not measured');
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
    // No cap: a long value widens the chip past 128px.
    await mutate('.ui-filter-bar { --ui-filter-chip-max: none; } .ui-filter-bar__chip { min-width: 260px; }', ['key: Escape'], 'over the');
    // The card moves for the length of a reload when the bar grows while it is off.
    await mutate('.ui-filter-bar[aria-busy="true"] { padding-bottom: 20px; }', ['click: Team', 'click: Company overhead'], 'the row above the card was');
    assert.deepEqual(caught.filter(([, seen]) => !seen).map(([says]) => says), [], 'a mutation passed: this walk cannot see it');
  } finally {
    await browser.close();
    server.proc.kill();
  }
});

// The product's row in #915: a 32px gap between the search, the bar and the control.
const GROUP_GAP = '.ui-toolbar { column-gap: 32px; }';
// Every chip at the kit's default cap, over the filters' own.
const DEFAULT_CAPS = '.ui-filter-bar__chip { --ui-filter-chip-max: 128px !important; }';
const ROW = () => {
  const box = (el) => { const r = el.getBoundingClientRect(); return { top: Math.round(r.top), left: r.left, width: r.width }; };
  const tool = document.querySelector('.ui-toolbar');
  const parts = [...tool.children].map(box);
  return { parts, chips: [...document.querySelectorAll('.ui-filter-bar__chip')].map(box) };
};
// The chip's edge and the accent, both as the engine resolves them.
const EDGE = (id) => {
  const chip = document.querySelector(`[data-filter-id="${id}"]`);
  const probe = document.createElement('i');
  probe.style.color = 'var(--accent)';
  chip.append(probe);
  const accent = getComputedStyle(probe).color;
  probe.remove();
  return { edge: getComputedStyle(chip).borderTopColor, accent };
};
const VALUE = (id) => {
  const value = document.querySelector(`[data-filter-id="${id}"] .ui-dropdown__value`);
  return { cut: value.scrollWidth > value.clientWidth, overflow: getComputedStyle(value).textOverflow };
};

test('five long filters fit one line at 1440px, cut a long value and answer the pointer', {
  skip: process.env.CHIP_WIDTH !== '1' && 'set CHIP_WIDTH=1',
}, async () => {
  const { serve, pw, vitals, build } = await setup();
  const browser = await pw.chromium.launch({ executablePath: process.env.UI_CHROME });
  const server = await serve(build, path.join(build, 'iframe.html'));
  // One look at the row. Returns what is wrong, so a mutation can prove the check sees it.
  const look = async (theme, css = '') => {
    const found = [];
    const { ctx, page } = await open(browser, server.port, vitals, { viewport: { width: 1440, height: 900 } }, LONG, theme);
    await page.addStyleTag({ content: `${GROUP_GAP}${css}` });
    await page.evaluate(frames);
    const line = async (what) => {
      const { parts } = await page.evaluate(ROW);
      if (parts.length !== 3) found.push(`${theme} ${what}: ${parts.length} groups in the row, expected 3`);
      if (new Set(parts.map((p) => p.top)).size !== 1) found.push(`${theme} ${what}: the row takes ${new Set(parts.map((p) => p.top)).size} lines`);
      if (Math.abs(parts[0].width - 320) > 0.5) found.push(`${theme} ${what}: the search is ${parts[0].width}px, not 320px`);
      if (Math.abs(parts[2].width - 192) > 0.5) found.push(`${theme} ${what}: the control is ${parts[2].width}px, not 192px`);
    };
    await line('with the filters\' caps');
    const { chips } = await page.evaluate(ROW);
    const want = STORIES[1].caps;
    // Unit, Category, Amount and Source each have a value longer than the cap, so each stands at it.
    for (const i of [1, 2, 3, 4]) if (Math.abs(chips[i].width - want[i]) > 0.5) found.push(`${theme}: chip ${i + 1} is ${chips[i].width}px, not its ${want[i]}px cap`);
    if (chips[0].width > want[0] + 0.5) found.push(`${theme}: chip 1 is ${chips[0].width}px, over its ${want[0]}px cap`);
    // A pick of the longest value: an ellipsis, the full name and title, and no move of the next chip.
    await chip(page, 'Category').click();
    await page.locator('.ui-dropdown.open').waitFor();
    const opened = await page.evaluate(EDGE, 'category');
    if (opened.edge !== opened.accent) found.push(`${theme}: an open chip keeps its resting edge`);
    await page.getByRole('option', { name: 'Professional advisory services' }).click();
    await picked(page, 'Professional advisory services');
    await page.evaluate(frames);
    const after = await page.evaluate(ROW);
    if (Math.abs(after.chips[3].left - chips[3].left) > 0.5) found.push(`${theme}: the pick moved the next chip ${after.chips[3].left - chips[3].left}px`);
    const value = await page.evaluate(VALUE, 'category');
    if (!value.cut || value.overflow !== 'ellipsis') found.push(`${theme}: the long value is not cut with an ellipsis`);
    const trigger = page.getByRole('button', { name: 'Category: Professional advisory services', exact: true });
    if (await trigger.count() !== 1) found.push(`${theme}: no trigger has the full name`);
    else if (await trigger.getAttribute('title') !== 'Category: Professional advisory services') found.push(`${theme}: the title does not hold the full value`);
    await line('after a long pick');
    // The pointer: the accent edge under it and while pressed, and not under the keyboard's ring.
    await page.mouse.move(0, 0);
    const rest = await page.evaluate(EDGE, 'unit');
    if (rest.edge === rest.accent) found.push(`${theme}: a chip at rest has the accent edge`);
    await chip(page, 'Unit').hover();
    await page.evaluate(frames);
    const hover = await page.evaluate(EDGE, 'unit');
    if (hover.edge !== hover.accent) found.push(`${theme}: a hovered chip keeps its resting edge ${hover.edge}`);
    await page.mouse.down();
    const pressed = await page.evaluate(EDGE, 'unit');
    if (pressed.edge !== pressed.accent) found.push(`${theme}: a pressed chip keeps its resting edge`);
    await page.mouse.up();
    await page.keyboard.press('Escape');
    await page.mouse.move(0, 0);
    await chip(page, 'Month').focus();
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Tab');
    await chip(page, 'Month').and(page.locator(':focus-visible')).waitFor();
    await chip(page, 'Month').hover();
    await page.evaluate(frames);
    const ring = await page.evaluate(EDGE, 'month');
    if (ring.edge === ring.accent) found.push(`${theme}: a chip under the focus ring takes a second accent line`);
    await ctx.close();
    return found;
  };
  try {
    const findings = [];
    for (const theme of ['light', 'dark']) {
      findings.push(...await look(theme));
      findings.push(...(await look(theme, DEFAULT_CAPS)).filter((f) => !/cap$|chip \d is/.test(f)));
    }
    assert.deepEqual(findings, []);
    // Each mutation puts back one cause of #915 or of a silent chip, and the look has to see it.
    const caught = [];
    for (const [css, says] of [
      ['.ui-filter-bar { --ui-filter-chip-max: 224px; }', 'lines'],
      ['.ui-filter-bar__chip:has(*) { border-color: var(--control-edge) !important; }', 'hovered chip'],
      ['.ui-filter-bar__fit > * { text-overflow: clip; }', 'ellipsis'],
      ['.ui-filter-bar__fit > [aria-hidden="true"] { display: none; }', 'moved the next chip'],
    ]) caught.push([says, (await look('light', css)).some((f) => f.includes(says))]);
    assert.deepEqual(caught.filter(([, seen]) => !seen).map(([says]) => says), [], 'a mutation passed: this look cannot see it');
  } finally {
    await browser.close();
    server.proc.kill();
  }
});
