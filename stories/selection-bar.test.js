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
 * sets it back. The focus must go to More, and then to the first enabled action that came out
 * of More. The showcase has no disabled action, so react/src/SelectionBar.test.tsx holds the
 * disabled case.
 *
 * Before each walk it measures the bar's two ends. The count's pill and the last control stand
 * as far from the bar's end as from its top, and that gap is more than 0. The bar's corner is
 * the pill's corner and that gap, so the curves share a centre. rev_604d2230cca9/d61
 * The pill's corner is that of a pill of one line, half the height of Clear. Each line of the
 * count keeps the pill's side padding. Clear stands inside the pill, and its corner is the
 * pill's corner less its inset, also with the pointer on it. rev_972adb4864fb/d80, d81
 * Clear's ground stands inside the pill's edge with an even gap of at least 3px where its box
 * meets the pill, on hover and on press. #911
 * At normal text the ends are round, and the two ends match: the same gap and an inner shape
 * of the same height. It measures the ends again at 360×800 with the text at 200%, in light
 * and dark, in every story that draws a bar: there the count takes two lines and the bar is
 * taller than the control at its end. At 280, 300, 330 and 360px wide it draws each of these
 * stories again with the text already at 200%. That bar must settle at the height, the corner
 * and the end of the bar that grew.
 *
 * Its limits: one engine, the default accent, and the light theme except for the 200% ends.
 * The 200% text doubles the kit's --text-* sizes, as a reader's text zoom does not exactly. The layout shift is
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
import { DOUBLE_TEXT } from './lib/double-text.js';

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
// Each end of the bar: the gap from the bar's end to the pill or the last control, the gap
// from the bar's top to it, its height, the bar's corner and half its height. Border box to
// border box. Then the pill's corner, the half of Clear, the side gaps of each line of the
// count, and Clear's box, its corner and its ground. A line beside Clear ends at Clear.
const ENDS = () => {
  const bar = document.querySelector('.ui-selection-bar');
  const box = bar.getBoundingClientRect();
  const count = bar.querySelector(':scope > .ui-selection-bar__count');
  const pill = count.getBoundingClientRect();
  const button = count.querySelector('.ui-selection-bar__control');
  const clear = button.getBoundingClientRect();
  const last = [...bar.querySelectorAll(':scope > .ui-selection-bar__actions .ui-selection-bar__control, :scope > .ui-dropdown > .ui-selection-bar__control')].pop().getBoundingClientRect();
  const range = document.createRange();
  range.selectNodeContents(count.querySelector('.ui-selection-bar__tally'));
  // A count is more than one text node, so the boxes on one line join into that line.
  const rows = [];
  for (const { left, right, top, bottom } of range.getClientRects()) {
    const row = rows.find((r) => Math.abs(r.top - top) < 1);
    if (row) Object.assign(row, { left: Math.min(row.left, left), right: Math.max(row.right, right) });
    else rows.push({ left, right, top, bottom });
  }
  const lines = rows.map((line) => {
    const beside = clear.top < line.bottom && clear.bottom > line.top && clear.left >= line.right;
    return [line.left - pill.left, (beside ? clear.left : pill.right) - line.right];
  });
  const look = getComputedStyle(button);
  return { corner: parseFloat(getComputedStyle(bar).borderTopLeftRadius), half: box.height / 2,
    start: [pill.left - box.left, pill.top - box.top, pill.height], end: [box.right - last.right, last.top - box.top, last.height],
    pill: parseFloat(getComputedStyle(count).borderTopLeftRadius), clearHalf: clear.height / 2, lines,
    clear: { inset: [clear.left - pill.left, pill.right - clear.right, clear.top - pill.top, pill.bottom - clear.bottom],
      band: ['Left', 'Right', 'Top', 'Bottom'].map((side) => parseFloat(look[`border${side}Width`])),
      clip: look.backgroundClip, corner: parseFloat(look.borderTopLeftRadius), ground: look.backgroundColor } };
};
// The words' side padding in the pill.
const PAD = 8;
// `twin`: the two ends match, as at normal text. Large text that wraps the count makes the pill
// taller than the control at the end, so there each end only keeps its own centre, and the bar
// is a rounded box.
async function ends(page, label, { twin = true } = {}) {
  const { corner, half, start, end, pill, clearHalf, lines, clear } = await page.evaluate(ENDS);
  const found = [];
  const apart = (a, b) => Math.abs(a - b) > 0.5;
  if (twin && corner < half - 0.5) found.push(`${label}: the bar's ends are not round, a ${corner}px corner on a ${half * 2}px bar`);
  for (const [name, [inline, block]] of [['start', start], ['end', end]]) {
    if (apart(inline, block)) found.push(`${label}: the ends share no centre, the ${name} gap is ${inline}px and the top gap ${block}px`);
    if (!(inline > 0.5)) found.push(`${label}: the ${name} touches the bar's end, a ${inline}px gap`);
  }
  if (twin && (apart(start[0], end[0]) || apart(start[2], end[2]))) {
    found.push(`${label}: the ends differ, a ${start[0]}px gap to a ${start[2]}px pill and a ${end[0]}px gap to a ${end[2]}px control`);
  }
  if (apart(corner, pill + start[1])) found.push(`${label}: the bar corner shares no centre with the pill, ${corner}px for a ${pill}px pill corner and a ${start[1]}px gap`);
  if (apart(pill, clearHalf)) found.push(`${label}: the pill corner is not that of one line, ${pill}px for a ${clearHalf * 2}px Clear`);
  for (const [i, [left, right]] of lines.entries()) {
    if (left < PAD - 0.5 || right < PAD - 0.5) found.push(`${label}: line ${i + 1} of the count loses its padding, ${left}px and ${right}px at the sides`);
  }
  if (clear.inset.some((gap) => gap < -0.5)) found.push(`${label}: Clear stands out of the pill, insets ${JSON.stringify(clear.inset)}`);
  // Clear's corner: the inset at the side of the pill it stands on, and at the bottom.
  const inset = Math.max(Math.min(clear.inset[0], clear.inset[1]), clear.inset[3]);
  if (apart(clear.corner, Math.max(0, pill - inset))) found.push(`${label}: Clear's ground shares no centre with the pill, a ${clear.corner}px corner for a ${pill}px pill corner and a ${inset}px inset`);
  // Clear's ground is its padding box. Where its box meets the pill's edge, the ground keeps
  // the same gap of at least 3px, so the ground stands inside the pill's 1px edge, and its
  // corner is the box's corner less that gap. #911
  const met = clear.inset.map((gap, side) => [gap, side]).filter(([gap]) => gap < 0.5).map(([gap, side]) => gap + clear.band[side]);
  if (clear.clip !== 'padding-box' || met.some((gap) => gap < 3 - 0.5)) found.push(`${label}: Clear's ground meets the pill's edge, gaps ${JSON.stringify(met)} with a ${clear.clip} ground`);
  if (met.length && Math.max(...met) - Math.min(...met) > 0.5) found.push(`${label}: Clear's ground has an uneven gap, ${JSON.stringify(met)}`);
  return found;
}
// The pointer on Clear: its ground shows, with the pill's corner.
async function hovered(page, label, options) {
  await page.locator('.ui-selection-bar > .ui-selection-bar__count > .ui-selection-bar__control').hover();
  await page.waitForFunction(() => getComputedStyle(document.querySelector('.ui-selection-bar > .ui-selection-bar__count > .ui-selection-bar__control')).backgroundColor !== 'rgba(0, 0, 0, 0)');
  await page.evaluate(frames);
  const found = await ends(page, `${label} Clear hovered`, options);
  // The press: the pointer leaves before it goes up, so Clear is not clicked. A press eases,
  // so the read waits for Clear's own transitions to end.
  await page.mouse.down();
  await page.evaluate(frames);
  await page.waitForFunction(() => document.querySelector('.ui-selection-bar > .ui-selection-bar__count > .ui-selection-bar__control').getAnimations().every((a) => a.playState !== 'running'));
  found.push(...await ends(page, `${label} Clear pressed`, options));
  await page.mouse.move(0, 0);
  await page.mouse.up();
  return found;
}

// The ends at 200% text: the count must take two lines, or the case is not the one measured.
const LARGE = { viewport: { width: 360, height: 800 } };
async function doubled(page, label) {
  assert.ok(await page.evaluate(DOUBLE_TEXT) > 0, `${label}: no --text-* size to double`);
  await page.evaluate(frames);
  const { tally, line } = await page.evaluate(() => {
    const count = document.querySelector('.ui-selection-bar__count');
    return { tally: count.getBoundingClientRect().height, line: count.querySelector('.ui-selection-bar__control').getBoundingClientRect().height };
  });
  assert.ok(tally > line * 1.5, `${label}: the count stays on one line, ${tally}px for a ${line}px control`);
  return [...await ends(page, label, { twin: false }), ...await hovered(page, label, { twin: false })];
}

// The bar that grew to 200% text, and the same story drawn again with the text at 200%. The
// first draw must settle as the bar that grew: the same height, corner and ends.
const FIRST = [280, 300, 330, 360];
// The bar's height and its two ends, once its height and its corner stay the same for three frames.
const still = async (page) => {
  await page.waitForFunction(() => {
    const bar = document.querySelector('.ui-selection-bar:not([data-grown])');
    if (!bar) return false;
    const key = `${bar.getBoundingClientRect().height}/${getComputedStyle(bar).borderTopLeftRadius}`;
    window.__still = window.__still?.[0] === key ? [key, window.__still[1] + 1] : [key, 0];
    return window.__still[1] >= 3;
  }, null, { polling: 'raf' });
  return page.evaluate(() => ({ height: document.querySelector('.ui-selection-bar:not([data-grown])').getBoundingClientRect().height }));
};
async function firstDraw(page, story, label, mutate) {
  assert.ok(await page.evaluate(DOUBLE_TEXT) > 0, `${label}: no --text-* size to double`);
  const grown = { ...await still(page), ...await page.evaluate(ENDS) };
  if (mutate) await page.addStyleTag({ content: mutate });
  await page.evaluate((id) => {
    document.querySelector('.ui-selection-bar').dataset.grown = '';
    window.__STORYBOOK_ADDONS_CHANNEL__.emit('forceRemount', { storyId: id });
  }, story);
  await page.locator('.ui-selection-bar:not([data-grown])').waitFor();
  const first = { ...await still(page), ...await page.evaluate(ENDS) };
  const found = [];
  const apart = (a, b) => [a].flat().some((value, i) => Math.abs(value - [b].flat()[i]) > 0.5);
  if (apart(first.height, grown.height) || apart(first.corner, grown.corner) || apart(first.end, grown.end)) {
    found.push(`${label}: the first draw differs, a ${first.height}px bar with a ${first.corner}px corner and ends ${JSON.stringify(first.end)}, and the bar that grew ${grown.height}px with ${grown.corner}px and ${JSON.stringify(grown.end)}`);
  }
  return [...found, ...await ends(page, label, { twin: false })];
}

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

async function open(browser, port, vitals, context, { story = STORY, theme = 'light' } = {}) {
  const ctx = await browser.newContext({ ...context, timezoneId: 'UTC' });
  await ctx.addInitScript({ content: `${vitals}\nwindow.__cls = 0; webVitals.onCLS((m) => { window.__cls = m.value; }, { reportAllChanges: true });` });
  const page = await ctx.newPage();
  await page.goto(`http://127.0.0.1:${port}/iframe.html?id=${story}&viewMode=story&globals=theme:${theme}`);
  await page.waitForFunction((id) => window.__STORYBOOK_PREVIEW__?.currentRender?.phase === 'finished'
    && window.__STORYBOOK_PREVIEW__.currentRender.id === id, story);
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
  const ids = Object.keys(JSON.parse(readFileSync(path.join(build, 'index.json'), 'utf8')).entries);
  assert.ok(ids.includes(STORY), `the Storybook build has no ${STORY}`);
  // Every story that draws a bar: the showcase and the component's own stories.
  const bars = [STORY, ...ids.filter((id) => id.startsWith('react-selectionbar--'))];
  assert.equal(bars.length, 5, `the bar stories are ${bars.join(', ')}`);

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
      const shape = [...await ends(page, label), ...await hovered(page, label)];
      findings.push(...shape);
      const { found, ran } = await walk(page, label).catch((error) => { throw new Error(`${label}: ${error.message}`, { cause: error }); });
      findings.push(...found);
      assert.equal(ran.length, ACTIONS.length, `${label}: ${ran.length} of ${ACTIONS.length} actions ran`);
      await ctx.close();
      const resized = await open(browser, server.port, vitals, context);
      const moves = await walk(resized.page, label, { steps: RESIZES }).catch((error) => { throw new Error(`${label}: ${error.message}`, { cause: error }); });
      findings.push(...moves.found);
      assert.equal(moves.ran.length, RESIZES.length, `${label}: ${moves.ran.length} of ${RESIZES.length} resizes ran`);
      table.push(`${label} ${width}px: ends, ${ran.length} actions and ${moves.ran.length} resizes, ${shape.length + found.length + moves.found.length ? 'fail' : 'pass'}`);
      await resized.ctx.close();
    }
    // At 200% text the count takes two lines, so the bar is taller than the control at its end.
    const large = [];
    for (const story of bars) {
      for (const theme of ['light', 'dark']) {
        const { ctx, page } = await open(browser, server.port, vitals, LARGE, { story, theme });
        const label = `${story} ${theme} 360×800 text 200%`;
        const shape = await doubled(page, label);
        findings.push(...shape);
        large.push(`${label}: ends, ${shape.length ? 'fail' : 'pass'}`);
        await ctx.close();
        for (const width of FIRST) {
          const drawn = await open(browser, server.port, vitals, { viewport: { width, height: 800 } }, { story, theme });
          const at = `${story} ${theme} ${width}×800 text 200% first draw`;
          const again = await firstDraw(drawn.page, story, at);
          findings.push(...again);
          large.push(`${at}: ${again.length ? 'fail' : 'pass'}`);
          await drawn.ctx.close();
        }
      }
    }
    process.stdout.write(`${[...table, ...large].join('\n')}\n`);
    assert.equal(table.length, SIZES.length + DEVICES.length + DUO.length, 'a size or a device was not measured');
    assert.equal(large.length, bars.length * 2 * (1 + FIRST.length), 'a bar story, a theme or a width was not measured at 200% text');
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
    // A bar with the old 12px corner, as before #911's review, an end 2px wider than the top,
    // a pill flush with the bar's start, words with no side padding, and Clear's round ground of
    // 3d47a2fd.
    for (const [says, content] of [
      ['not round', '.ui-selection-bar { border-radius: var(--radius-md); }'],
      ['no centre', '.ui-selection-bar.ui-selection-bar { padding-right: calc(var(--space-3) + 2px); }'],
      ['touches', '.ui-selection-bar.ui-selection-bar { padding-left: 0; border-left: 0; }'],
      ['loses its padding', '.ui-selection-bar .ui-selection-bar__tally { padding-inline: 2px; }'],
      ['Clear\'s ground', '.ui-selection-bar .ui-selection-bar__count > .ui-selection-bar__control.ui-selection-bar__control { border-radius: var(--radius-pill); }'],
      // Clear's ground on the pill's edge, as at 2650959e, and a press that moves it 1px.
      ['meets the pill\'s edge', '.ui-selection-bar .ui-selection-bar__count > .ui-selection-bar__control.ui-selection-bar__control { border-width: 1px; }'],
      ['uneven gap', '.ui-selection-bar .ui-selection-bar__count > .ui-selection-bar__control.ui-selection-bar__control:active { transform: translateY(1px); }'],
    ]) {
      const { ctx, page } = await open(browser, server.port, vitals, phone);
      await page.addStyleTag({ content });
      const found = [...await ends(page, 'mutated'), ...await hovered(page, 'mutated')];
      caught.push([says, found.some((f) => f.includes(says)), found]);
      await ctx.close();
    }
    // A pill whose edge takes room, as at c9e6fa7c: each end keeps its centre, but the pill
    // is 2px taller than More and its gap 1px smaller.
    {
      const { ctx, page } = await open(browser, server.port, vitals, phone);
      await page.addStyleTag({ content: '.ui-selection-bar .ui-selection-bar__count { outline: 0; border: 1px solid var(--inverse-edge); }' });
      await page.evaluate(frames);
      await page.evaluate(frames);
      const found = await ends(page, 'mutated');
      caught.push(['ends differ', found.some((f) => f.includes('ends differ')), found]);
      await ctx.close();
    }
    // At 200% text: a bar whose parts stand in the middle, as before #911's second review, so
    // the end control stands lower than its side gap. A stadium pill and bar, as at 3d47a2fd,
    // whose curve the words of a wrapped count enter.
    for (const [says, content] of [
      ['no centre', '.ui-selection-bar.ui-selection-bar { align-items: center; }'],
      ['not that of one line', '.ui-selection-bar .ui-selection-bar__count.ui-selection-bar__count { border-radius: var(--radius-pill); }'],
      ['bar corner', '.ui-selection-bar.ui-selection-bar { border-radius: var(--radius-pill); }'],
    ]) {
      const { ctx, page } = await open(browser, server.port, vitals, LARGE);
      await page.addStyleTag({ content });
      const found = await doubled(page, 'mutated');
      caught.push([says, found.some((f) => f.includes(says)), found]);
      await ctx.close();
    }
    // A first draw that keeps the corner of normal text, as a corner read before the text grew.
    {
      const { ctx, page } = await open(browser, server.port, vitals, { viewport: { width: 330, height: 800 } });
      const found = await firstDraw(page, STORY, 'mutated', '.ui-selection-bar:not([data-grown]) { --ui-selection-corner: 16px !important; }');
      caught.push(['first draw differs', found.some((f) => f.includes('first draw differs')), found]);
      await ctx.close();
    }
    assert.deepEqual(caught.filter(([, seen]) => !seen).map(([says, , found]) => `${says}: ${JSON.stringify(found)}`), [], 'a mutation passed or failed for another reason: this walk cannot see it');
    const [, , lost] = caught.find(([says]) => says === 'focus left');
    assert.ok(lost.length && lost.every((f) => f.includes('focus left') && !/^TimeoutError/.test(f)), `the focus mutation failed for another reason: ${JSON.stringify(lost)}`);
  } finally {
    await browser.close();
    server.proc.kill();
  }
});
