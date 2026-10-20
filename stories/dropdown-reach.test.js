/* Rule: every floating panel the kit draws caps its height at the room between
 * its trigger and the viewport edge it opens towards, scrolls inside that cap,
 * and keeps the wheel over it from reaching the page underneath. That is #489.
 *
 * The source half below runs in CI. The browser half at the foot of the file is
 * opt-in and states its own limits there, the way stories/dropdown-contain.test.js's
 * does for the horizontal axis.
 * why: docs/components.md#the-dropdown-panel
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { JSDOM, VirtualConsole } from 'jsdom';
import { dropdownStop } from '../src/logic/dropdown.js';
import { dropdown, wireDropdown, dropdownAvail, dropdownHeightFit, dropdownReveal } from '../src/components/dropdown.js';
import { serve, playwright, openStory } from './lib/dropdown-contain.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => readFileSync(path.join(root, rel), 'utf8');
const decomment = (src) => src.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));

const SHEET = 'src/styles/dropdown.css';
const css = decomment(read(SHEET));

/* -- The arithmetic ---------------------------------------------------------- */

test('a menu opened 300px above the bottom of a phone is capped short of its content', () => {
  // The issue's own acceptance case: a 390x844 phone, a trigger ending 300px
  // above the bottom. 12 rows run well past this; the cap has to be short of
  // their full height and still end inside the viewport.
  const avail = dropdownAvail({
    anchorTop: 513, anchorBottom: 544, viewport: 844, gap: 9, inset: 8, min: 120,
  });
  assert.equal(avail, 300 - 9 - 8, 'the 300px below, less the trigger gap and the edge inset');
  const bottom = 544 + 9 + avail;
  assert.equal(bottom, 844 - 8, 'the panel ends one edge-inset above the viewport\'s bottom edge');
});

test('a room too small for the floor even after spending the inset is left uncapped', () => {
  // A trigger with its bottom 27px of raw room past the gap — short of the
  // 120px floor even once the whole inset is spent. Design review on #641:
  // capping here drew a 27px sliver hiding 446px of rows, worse than the
  // content-height panel it replaced. Infinity means "measure nothing," so the
  // sheet's own fallback stands and the panel keeps its content height.
  const avail = dropdownAvail({
    anchorTop: 777, anchorBottom: 808, viewport: 844, gap: 9, inset: 8, min: 120,
  });
  assert.equal(avail, Infinity, 'below the floor even spending the whole inset, the panel is left uncapped');
});

test('a trigger with no room left is also left uncapped, not pinned to a nought-pixel sliver', () => {
  // The gap alone already reaches the edge: there is no room the floor could
  // spend without passing it, and none to show a usable panel with either.
  const avail = dropdownAvail({
    anchorTop: 808, anchorBottom: 839, viewport: 844, gap: 9, inset: 8, min: 120,
  });
  assert.equal(avail, Infinity);
});

test('the floor leaves a tight room uncapped the same way above the trigger as below it', () => {
  // `up` measures from the trigger's own top, the same shape in both directions.
  const avail = dropdownAvail({
    anchorTop: 36, anchorBottom: 67, viewport: 844, gap: 9, inset: 8, min: 120, up: true,
  });
  assert.equal(avail, Infinity, 'below the floor even spending the whole inset, the panel is left uncapped');
});

/* -- The stylesheet ----------------------------------------------------------- */

test('the floor a capped panel keeps is one named number', () => {
  const declared = [...css.matchAll(/--ui-dropdown-min:\s*([^;]+);/g)].map((m) => m[1].trim());
  assert.deepEqual(
    declared, ['120px'],
    `${SHEET} declares --ui-dropdown-min ${declared.length} times. The wiring reads this property `
    + 'off the panel, so a second declaration is two different floors for one panel.',
  );
});

test('every panel caps its height at the smaller of what was asked and what is left', () => {
  const panel = css.split(/\.ui-dropdown__panel\s*\{/)[1]?.split('}')[0] ?? '';
  assert.match(
    panel, /max-height:\s*min\(\s*var\(--ui-dropdown-cap,\s*var\(--ui-dropdown-fit,\s*var\(--ui-dropdown-max\)\)\)/,
    `${SHEET}'s .ui-dropdown__panel no longer caps itself at min(cap, avail). Unset, a panel took `
    + 'its content\'s height until it ran off the screen — #489.',
  );
  assert.match(panel, /overflow-y:\s*auto/, 'the panel has to scroll once it is capped');
  assert.match(
    panel, /overscroll-behavior:\s*contain/,
    'without this, the wheel over a capped panel keeps going once it reaches the panel\'s own end, '
    + 'and scrolls the page underneath — the second half of #489.',
  );
});

test('every panel has a standard cap of 300px, which `scroll: <n>` replaces', () => {
  const panel = css.split(/\.ui-dropdown__panel\s*\{/)[1]?.split('\n}')[0] ?? '';
  const declared = panel.match(/--ui-dropdown-max:\s*([^;]+);/g) ?? [];
  assert.equal(declared.length, 1, `${SHEET} declares --ui-dropdown-max ${declared.length} times, and the standard cap is one number`);
  assert.match(declared[0], /--ui-dropdown-max:\s*300px/);
  assert.doesNotMatch(
    panel, /--ui-dropdown-cap\s*:/,
    'the panel declares the consumer\'s property itself, so `scroll: <n>` could no longer win and an unset cap would read as set.',
  );
});

test('a panel below the floor keeps its cap, and only lets the wheel reach the page', () => {
  const rule = css.split(/\.ui-dropdown__panel\.is-unbounded\s*\{/)[1]?.split('}')[0] ?? '';
  assert.doesNotMatch(
    rule, /max-height/,
    `${SHEET}'s .is-unbounded sets max-height, which lifts the 300px cap where the room is below the floor. A panel is never taller than the cap.`,
  );
  assert.doesNotMatch(rule, /overflow-y:\s*visible/, 'an uncapped overflow shows the rows past the cap');
  assert.match(rule, /overscroll-behavior:\s*auto/, 'the wheel has to reach the page once the panel is at its own end');
});

test('`.is-scroll` asks for the standard cap through the cap property, not through max-height directly', () => {
  assert.doesNotMatch(
    css, /\.is-scroll\s*\{[^}]*max-height/,
    '.is-scroll sets max-height directly, which would outrank the panel\'s own min() and put it '
    + 'back past the viewport edge whenever the measured room is smaller than 300px.',
  );
  const rule = css.split(/\.ui-dropdown__panel\.is-scroll\s*\{/)[1]?.split('}')[0] ?? '';
  assert.match(rule, /--ui-dropdown-cap:\s*var\(--ui-dropdown-fit,\s*var\(--ui-dropdown-max\)\)/);
});

test('the search list reads the same cap property, so a field above it does not widen the room', () => {
  const list = css.split(/\n\.ui-dropdown__list\s*\{/)[1]?.split('}')[0] ?? '';
  assert.match(list, /max-height:\s*var\(--ui-dropdown-cap,\s*var\(--ui-dropdown-fit,\s*var\(--ui-dropdown-max,\s*300px\)\)\)/);
  assert.match(list, /overscroll-behavior:\s*contain/);
});

test('a search panel is a column, so the cap lands on the rows and not on the field', () => {
  const rule = css.split(/\.ui-dropdown__panel--search\s*\{/)[1]?.split('}')[0] ?? '';
  assert.match(rule, /display:\s*flex/);
  assert.match(rule, /flex-direction:\s*column/);
  assert.match(css, /\.ui-dropdown__panel--search\s*>\s*\.ui-dropdown__list\s*\{[^}]*flex:\s*1/);
});

test('the cap stops in the middle of a row, whatever the row height', () => {
  for (const height of [38.25, 55.09375]) {
    const rows = Array.from({ length: 30 }, (_, i) => ({ top: 6 + i * height, height }));
    const stop = dropdownStop({ rows, below: 6, content: 6 + 30 * height + 6, ceiling: 300 });
    const shown = (stop - 6 - 6) / height;
    assert.ok(stop <= 300, `${height}px rows: the stop is ${stop}px, past the 300px ceiling`);
    assert.ok(Math.abs((shown % 1) - 0.5) < 0.05, `${height}px rows: the stop leaves ${shown} rows, not a whole number and a half`);
  }
});

test('a list that fits under the ceiling has nothing to cut', () => {
  const rows = [{ top: 6, height: 38 }, { top: 44, height: 38 }];
  assert.equal(dropdownStop({ rows, below: 6, content: 94, ceiling: 300 }), null);
});

test('both kits stop the cap at a half row before they size the panel', () => {
  for (const [file, call] of [['src/components/dropdown.js', 'dropdownSnap(dd, panel)'], ['react/src/Dropdown.tsx', 'dropdownSnap(root.current, el)']]) {
    const src = decomment(read(file));
    assert.ok(src.includes(call), `${file} no longer calls ${call}, so its panel is cut wherever 300px falls.`);
  }
});

/* -- The wiring, in JSDOM ----------------------------------------------------- */

const quiet = new VirtualConsole();
quiet.on('jsdomError', () => {});
const MENU = [{ label: 'Settings' }, { label: 'Billing' }, { label: 'Sign out' }];
const TWELVE = Array.from({ length: 12 }, (_, i) => ({ label: `Row ${i + 1}` }));
const click = (window, el) =>
  el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));

/** A wired dropdown on a `view.h`-tall phone, with its trigger `bottom` px down. */
function phone(html, { bottom, view = 844 }) {
  const dom = new JSDOM(`<!doctype html><html><body><main>${html}</main></body></html>`, {
    pretendToBeVisual: true, virtualConsole: quiet,
  });
  const { window } = dom;
  for (const key of ['window', 'document', 'HTMLElement', 'Element', 'Node', 'getComputedStyle']) {
    Object.defineProperty(globalThis, key, { value: window[key] ?? window, configurable: true, writable: true });
  }
  Object.defineProperty(window, 'innerWidth', { value: 390, configurable: true });
  Object.defineProperty(window, 'innerHeight', { value: view, configurable: true });
  Object.defineProperty(window.document.documentElement, 'clientWidth', { value: 390, configurable: true });
  const doc = window.document;
  const trigger = doc.querySelector('[data-dropdown-trigger]');
  const panel = doc.querySelector('[data-dropdown-panel]');
  trigger.getBoundingClientRect = () => ({
    top: bottom - 31, bottom, left: 16, right: 176, width: 160, height: 31, x: 16, y: bottom - 31,
  });
  wireDropdown(doc);
  return { window, doc, trigger, panel };
}

test('opening writes the measured room onto the panel', () => {
  const { window, trigger, panel } = phone(
    dropdown({ value: 'Account', variant: 'menu', items: TWELVE }), { bottom: 544 },
  );
  click(window, trigger);
  assert.equal(panel.style.getPropertyValue('--ui-dropdown-avail'), `${844 - 544 - 9 - 8}px`);
});

test('a portalled panel is measured the same way as an in-place one', () => {
  const { window, trigger, panel } = phone(
    dropdown({ value: 'Account', variant: 'menu', items: TWELVE, portal: true }), { bottom: 544 },
  );
  click(window, trigger);
  assert.equal(panel.style.getPropertyValue('--ui-dropdown-avail'), `${844 - 544 - 9 - 8}px`);
});

test('the room is re-measured on scroll, because the trigger moves and the viewport edge does not', () => {
  const { window, trigger, panel } = phone(
    dropdown({ value: 'Account', variant: 'menu', items: TWELVE }), { bottom: 200 },
  );
  click(window, trigger);
  assert.equal(panel.style.getPropertyValue('--ui-dropdown-avail'), `${844 - 200 - 9 - 8}px`);
  trigger.getBoundingClientRect = () => ({
    top: 569, bottom: 600, left: 16, right: 176, width: 160, height: 31, x: 16, y: 569,
  });
  window.dispatchEvent(new window.Event('scroll'));
  assert.equal(panel.style.getPropertyValue('--ui-dropdown-avail'), `${844 - 600 - 9 - 8}px`);
});

test('dropdownHeightFit answers nothing when there is nothing to measure', () => {
  assert.equal(dropdownHeightFit(null, null), null);
  assert.equal(dropdownHeightFit(undefined, undefined), null);
});

test('a dropdown rendered already open is capped at wiring time, with no click to do it', () => {
  const { panel } = phone(
    dropdown({ value: 'Account', variant: 'menu', items: TWELVE, open: true }), { bottom: 544 },
  );
  assert.equal(panel.style.getPropertyValue('--ui-dropdown-avail'), `${844 - 544 - 9 - 8}px`);
});

test('a trigger too close to the edge for the floor writes no avail, rather than a sliver', () => {
  // The design review's own case: the trigger's bottom 36px above the viewport's,
  // short of the 120px floor even spending the whole inset. #641
  const { window, trigger, panel } = phone(
    dropdown({ value: 'Account', variant: 'menu', items: TWELVE }), { bottom: 844 - 36 },
  );
  click(window, trigger);
  assert.equal(
    panel.style.getPropertyValue('--ui-dropdown-avail'), '',
    'below the floor, the property is removed so the sheet\'s own fallback stands',
  );
});

/* -- A scrolling body, in JSDOM ------------------------------------------------ */
/* Mocked rectangles check the arithmetic and the wiring. Where the panel really
 * lands is the browser half's measurement. */

/** A 540px-tall scrolling body from y=100 to y=640, with a 400px panel in it. */
function scrollingBody({ bottom, portal = false }) {
  const t = phone(
    `<div id="body" style="overflow-y:auto">${dropdown({ value: 'Account', variant: 'menu', items: TWELVE, portal })}</div>`,
    { bottom },
  );
  const body = t.doc.getElementById('body');
  body.getBoundingClientRect = () => ({ top: 100, bottom: 640, left: 0, right: 390, width: 390, height: 540 });
  Object.defineProperty(body, 'clientHeight', { value: 540, configurable: true });
  Object.defineProperty(t.panel, 'offsetHeight', { value: 400, configurable: true });
  return { ...t, body };
}

test('a scrolling body gives the panel the whole body less the trigger, not what is under it', () => {
  const { window, trigger, panel } = scrollingBody({ bottom: 600 });
  click(window, trigger);
  assert.equal(panel.style.getPropertyValue('--ui-dropdown-avail'), `${540 - 8 - 48 - 31 - 9}px`);
});

test('a panel that runs past the body is scrolled into view by the least distance', () => {
  const { window, trigger, body } = scrollingBody({ bottom: 600 });
  click(window, trigger);
  // panel end = 600 + 9 + 400, plus the 48px the shadow needs, less the body's end at 640
  assert.equal(body.scrollTop, 600 + 9 + 400 + 48 - 640);
});

test('an open panel in a scrolling body reserves the inset below itself, so the body can scroll to it', () => {
  const { window, trigger, body } = scrollingBody({ bottom: 600 });
  const dd = body.querySelector('.ui-dropdown');
  click(window, trigger);
  assert.equal(dd.style.getPropertyValue('--ui-dropdown-reach'), `${9 + 400 + 48 - 1}px`);
  const spot = css.match(/\.ui-dropdown\[style\*="--ui-dropdown-reach"\]::after\s*\{([^}]*)\}/)?.[1] ?? '';
  assert.match(spot, /margin-top:\s*var\(--ui-dropdown-reach\)/, `${SHEET} no longer draws the spot that lets the body scroll the inset below an open panel.`);
  assert.match(spot, /position:\s*absolute/);
  assert.match(spot, /pointer-events:\s*none/);
});

const later = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const escape = (window, el) => el.dispatchEvent(
  // A plain Event with a key: this gate measures scroll distance, so it is not a key gate.
  Object.assign(new window.Event('keydown', { bubbles: true, cancelable: true }), { key: 'Escape' }),
);

test('the reserved inset stays through the fade, so closing does not move the field', async () => {
  const { window, trigger, body, panel } = scrollingBody({ bottom: 600 });
  const dd = body.querySelector('.ui-dropdown');
  click(window, trigger);
  escape(window, trigger);
  assert.equal(dd.classList.contains('open'), false);
  assert.equal(dd.style.getPropertyValue('--ui-dropdown-reach'), `${9 + 400 + 48 - 1}px`);
  assert.equal(panel.hasAttribute('data-dd-shut'), false, 'the panel is still laid out for its fade');
});

test('a shut panel adds no scroll room: it is collapsed when wired and again once its fade is over', async () => {
  const { window, trigger, body, panel } = scrollingBody({ bottom: 600 });
  const dd = body.querySelector('.ui-dropdown');
  assert.equal(panel.hasAttribute('data-dd-shut'), true, 'a panel nobody has opened is collapsed from the start');
  click(window, trigger);
  assert.equal(panel.hasAttribute('data-dd-shut'), false, 'an open panel has its box, so it can be measured');
  body.scrollTop = 0;
  escape(window, trigger);
  assert.equal(panel.hasAttribute('data-dd-shut'), false);
  await later(120);
  assert.equal(panel.hasAttribute('data-dd-shut'), true, 'the fade is over, so the box goes');
  assert.equal(dd.style.getPropertyValue('--ui-dropdown-reach'), '', 'and so does the room reserved below it');
  click(window, trigger);
  assert.equal(panel.hasAttribute('data-dd-shut'), false, 'opening again gives the box back');
  assert.equal(dd.style.getPropertyValue('--ui-dropdown-reach'), `${9 + 400 + 48 - 1}px`);
});

test('a body scrolled into the room under the panel keeps that room until the reader scrolls out of it', async () => {
  const { window, trigger, body, panel } = scrollingBody({ bottom: 600 });
  // A body whose end moves with the panel's box, and which clamps its scroll the way a browser does.
  let top = 0;
  Object.defineProperty(body, 'scrollHeight', { get: () => (panel.hasAttribute('data-dd-shut') ? 700 : 1200), configurable: true });
  Object.defineProperty(body, 'scrollTop', {
    get: () => Math.min(top, Math.max(0, body.scrollHeight - 540)),
    set: (v) => { top = v; },
    configurable: true,
  });
  click(window, trigger);
  body.scrollTop = 400;
  escape(window, trigger);
  await later(120);
  assert.equal(panel.hasAttribute('data-dd-shut'), false, 'collapsing now would slide the field down 240px, so the room stays');
  assert.equal(body.scrollTop, 400, 'and the field has not moved');
  body.scrollTop = 100;
  body.dispatchEvent(new window.Event('scroll'));
  assert.equal(panel.hasAttribute('data-dd-shut'), true, 'the reader is out of the room, so it goes');
  assert.equal(body.scrollTop, 100);
});

test('a panel in a page that nothing scrolls inside is collapsed too, and a portalled panel is left alone', () => {
  const plain = phone(dropdown({ value: 'Account', variant: 'menu', items: TWELVE }), { bottom: 600 });
  assert.equal(plain.panel.hasAttribute('data-dd-shut'), true);
  const portalled = phone(dropdown({ value: 'Account', variant: 'menu', items: TWELVE, portal: true }), { bottom: 600 });
  assert.equal(portalled.panel.hasAttribute('data-dd-shut'), false, 'a fixed panel adds no scroll room, and the portal measures it shut');
});

test('a trigger too close to the edge for the floor marks its panel unbounded, with or without a consumer cap', () => {
  for (const scroll of [false, true]) {
    const { window, trigger, panel } = phone(
      dropdown({ value: 'Account', variant: 'menu', items: TWELVE, scroll }), { bottom: 844 - 36 },
    );
    click(window, trigger);
    assert.equal(panel.classList.contains('is-unbounded'), true, `scroll: ${scroll}`);
  }
});

test('a trigger in a page reserves the end room too, and a portalled panel reserves nothing', () => {
  const plain = phone(dropdown({ value: 'Account', variant: 'menu', items: TWELVE }), { bottom: 600 });
  click(plain.window, plain.trigger);
  assert.match(plain.doc.querySelector('.ui-dropdown').style.getPropertyValue('--ui-dropdown-reach'), /^\d+(\.\d+)?px$/);
  const fixed = phone(dropdown({ value: 'Account', variant: 'menu', items: TWELVE, portal: true }), { bottom: 600 });
  click(fixed.window, fixed.trigger);
  assert.equal(fixed.doc.querySelector('.ui-dropdown').style.getPropertyValue('--ui-dropdown-reach'), '');
});

test('a panel the body already shows does not move it', () => {
  const { window, trigger, panel, body } = scrollingBody({ bottom: 150 });
  Object.defineProperty(panel, 'offsetHeight', { value: 100, configurable: true });
  click(window, trigger);
  assert.equal(body.scrollTop, 0);
});

test('the scroll never takes the trigger out of the body', () => {
  const { window, trigger, body } = scrollingBody({ bottom: 600 });
  trigger.getBoundingClientRect = () => ({
    top: 569, bottom: 600, left: 16, right: 176, width: 160, height: 31, x: 16, y: 569,
  });
  Object.defineProperty(body, 'clientHeight', { value: 400, configurable: true });
  body.getBoundingClientRect = () => ({ top: 500, bottom: 900, left: 0, right: 390, width: 390, height: 400 });
  click(window, trigger);
  assert.ok(body.scrollTop <= 569 - 500, 'the trigger stays at or below the body\'s start');
});

test('a portalled panel and a trigger with no scrolling body leave every body alone', () => {
  const portalled = scrollingBody({ bottom: 600, portal: true });
  click(portalled.window, portalled.trigger);
  assert.equal(portalled.body.scrollTop, 0);
  const plain = phone(dropdown({ value: 'Account', variant: 'menu', items: TWELVE }), { bottom: 600 });
  assert.equal(dropdownReveal(plain.doc.querySelector('.ui-dropdown'), plain.panel), 0);
  assert.equal(dropdownReveal(null, null), 0);
});

/* -- The browser half --------------------------------------------------------- */
/* The measurement. JSDOM lays nothing out, so where a panel's edge actually lands,
 * and whether a wheel event scrolls the panel or the page underneath it, are both
 * invisible to every gate above. Off unless DROPDOWN_REACH=1: Playwright is
 * deliberately not a dependency of this package, CI does not run it, and the
 * result is reported by hand in the pull request.
 *
 *   UI_PLAYWRIGHT=… UI_CHROME=… DROPDOWN_REACH=1 node --test stories/dropdown-reach.test.js
 *
 * Its limits: one engine, Chrome for Testing through whichever Playwright the
 * host supplies; the React half needs react/storybook-static built first; and
 * the wheel is dispatched over the panel's own centre, not over a row — a reader
 * who wheels while hovering a row is the same scroll container either way.
 */
const RUN = process.env.DROPDOWN_REACH === '1';
const VIEWPORT = { width: 390, height: 844 };

test('the last row is reachable near the bottom edge, by the panel scroll at 300px and the page scroll at 36px', {
  skip: !RUN && 'set DROPDOWN_REACH=1',
}, async () => {
  const pw = await playwright();
  assert.ok(pw, 'DROPDOWN_REACH=1 was set and no Playwright could be resolved. Point UI_PLAYWRIGHT at one.');
  const reactBuild = path.join(root, 'react/storybook-static');
  assert.ok(
    existsSync(path.join(reactBuild, 'index.json')),
    `no Storybook build at ${reactBuild} — run: npm run build-storybook -w react.`,
  );

  const browser = await pw.chromium.launch({ executablePath: process.env.UI_CHROME });
  const vanilla = await serve(root, path.join(root, 'stories/lib/dropdown-reach.html'));
  const react = await serve(reactBuild, path.join(root, 'stories/lib/dropdown-reach.html'));

  // At 300px the panel caps and scrolls inside itself; the wheel stays on the
  // panel and the page never moves. At 36px — below the floor, #641's danger 1
  // — the panel keeps its 300px cap and the wheel carries on to the page once
  // the panel is at its own end, and that growth is what makes every row
  // reachable.
  const measure = async (page, { capped }) => {
    const panel = page.locator('[data-dropdown-panel]');
    const lastRow = page.locator('[data-dropdown-panel] [data-dd-item]').last();
    if (capped) await panel.evaluate((el) => { el.scrollTop = el.scrollHeight; });
    let panelBox = await panel.boundingBox();
    // Below the floor, the panel is in document flow and re-measured on every
    // page scroll, the way #489's own capped panel already is: scrolling moves
    // the trigger, which can hand the wiring more room and re-cap it smaller
    // mid-scroll. A reader keeps wheeling until a row answers, so this repeats
    // the gesture rather than reading one wheel tick as final. why:
    // the 'scroll' listener ddPlace() answers, src/components/dropdown.js
    for (let i = 0; i < 8 && panelBox; i += 1) {
      const x = Math.min(Math.max(panelBox.x + panelBox.width / 2, 1), VIEWPORT.width - 1);
      const y = Math.min(Math.max(panelBox.y + panelBox.height / 2, 1), VIEWPORT.height - 1);
      await page.mouse.move(x, y);
      await page.mouse.wheel(0, 2000);
      // `html { scroll-behavior: smooth }` animates a wheel-triggered scroll
      // rather than jumping, so a short wait can read a scroll still mid-flight.
      // why: src/styles/base.css
      await page.waitForTimeout(400);
      const rowBox = await lastRow.boundingBox();
      if (rowBox && rowBox.y < VIEWPORT.height && rowBox.y + rowBox.height > 0) break;
      panelBox = await panel.boundingBox();
    }
    panelBox = await panel.boundingBox();
    const rowBox = await lastRow.boundingBox();
    const pageScroll = await page.evaluate(() => window.scrollY);
    const docHeight = await page.evaluate(() => document.documentElement.scrollHeight);
    return { panelBox, rowBox, pageScroll, docHeight };
  };

  try {
    const cases = [];

    // Vanilla, both placements, both the acceptance case and the near-edge one.
    // `portal: true` makes the panel itself `position: fixed` on <body> — out of
    // document flow by design, the same way the shell's rail uses it for a panel
    // an `overflow: hidden` ancestor would clip. Below the floor that means the
    // page-grows fallback cannot reach it; this predates #641 and is not this
    // review's surface, so it is measured and reported, not asserted reachable.
    for (const portal of [false, true]) {
      for (const bottomGap of [300, 36]) {
        const capped = bottomGap === 300;
        const ctx = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1 });
        const page = await ctx.newPage();
        await page.goto(
          `http://127.0.0.1:${vanilla.port}/__shot?portal=${portal ? 1 : 0}&bottomGap=${bottomGap}`,
          { waitUntil: 'load' },
        );
        await page.waitForFunction(() => window.__ready === true);
        await page.locator('[data-dropdown-trigger]').click();
        const got = await measure(page, { capped });
        cases.push({
          label: `vanilla ${portal ? 'portalled' : 'ordinary'} bottomGap=${bottomGap}`,
          capped, fixed: portal && !capped, ...got,
        });
        await ctx.close();
      }
    }

    // React, the two stories built for this case. Both triggers sit in normal
    // document flow (EdgeStage in Dropdown.stories.tsx), so neither is `fixed`.
    const all = JSON.parse(readFileSync(path.join(reactBuild, 'index.json'), 'utf8')).entries;
    for (const id of ['react-dropdown--bottom-edge', 'react-dropdown--near-bottom-edge']) {
      const capped = id === 'react-dropdown--bottom-edge';
      const story = Object.values(all).find((e) => e.id === id);
      assert.ok(story, `no built React story with the id ${id} — react/src/Dropdown.stories.tsx may have moved it.`);
      const ctx = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1 });
      const page = await ctx.newPage();
      const opened = await openStory(page, story, { port: react.port, theme: 'dark' });
      assert.equal(opened.phase, 'finished', `React story ${id} did not finish rendering: ${opened.phase}`);
      const got = await measure(page, { capped });
      cases.push({ label: `react ${id}`, capped, fixed: false, ...got });
      await ctx.close();
    }

    console.log(cases.map((c) => `${c.label}: panel height ${c.panelBox?.height}, panel bottom `
      + `${c.panelBox && c.panelBox.y + c.panelBox.height}, last row ${c.rowBox?.y}…`
      + `${c.rowBox && c.rowBox.y + c.rowBox.height}, page scroll ${c.pageScroll}, doc height ${c.docHeight}`)
      .join('\n'));

    const capped = cases.filter((c) => c.capped);
    const grows = cases.filter((c) => !c.capped && !c.fixed);
    const fixed = cases.filter((c) => !c.capped && c.fixed);

    const outside = capped.filter((c) => !c.panelBox || c.panelBox.y + c.panelBox.height > VIEWPORT.height + 0.5);
    assert.deepEqual(outside.map((c) => c.label), [], 'a capped panel ran past the viewport edge');

    const cappedLeaked = capped.filter((c) => c.pageScroll !== 0);
    assert.deepEqual(
      cappedLeaked.map((c) => c.label), [],
      'the wheel over a capped panel scrolled the page instead of the panel',
    );

    // Below the floor, in document flow, the document is expected to grow past
    // the viewport — that growth is the fix.
    const stillCapped = grows.filter((c) => c.docHeight <= VIEWPORT.height + 0.5);
    assert.deepEqual(stillCapped.map((c) => c.label), [], 'below the floor, the document never grew past the viewport');

    const pageDidNotScroll = grows.filter((c) => c.pageScroll === 0);
    assert.deepEqual(
      pageDidNotScroll.map((c) => c.label), [],
      'below the floor, the wheel over the panel never moved the page',
    );

    const reachable = [...capped, ...grows];
    const unreachable = reachable.filter(
      (c) => !c.rowBox || c.rowBox.y >= VIEWPORT.height || c.rowBox.y + c.rowBox.height <= 0,
    );
    assert.deepEqual(unreachable.map((c) => c.label), [], 'the last row never entered the viewport');

    // Not asserted reachable — see the comment above the vanilla loop — but a
    // fixed/portalled panel below the floor must still be its content height,
    // not the old room-sized sliver, so it is at least no worse than before.
    const fixedSliver = fixed.filter((c) => !c.panelBox || c.panelBox.height < 120);
    assert.deepEqual(fixedSliver.map((c) => c.label), [], 'a portalled panel below the floor kept a sub-120px sliver');
  } finally {
    await browser.close();
    vanilla.proc.kill();
    react.proc.kill();
  }
});

test('in a scrolling body the panel ends 48px above the body\'s end with the trigger in view, and is instant under reduced motion', {
  skip: !RUN && 'set DROPDOWN_REACH=1',
}, async () => {
  const pw = await playwright();
  assert.ok(pw, 'DROPDOWN_REACH=1 was set and no Playwright could be resolved. Point UI_PLAYWRIGHT at one.');
  const browser = await pw.chromium.launch({ executablePath: process.env.UI_CHROME });
  const vanilla = await serve(root, path.join(root, 'stories/lib/dropdown-reach.html'));
  try {
    const measure = () => {
      const body = document.getElementById('body').getBoundingClientRect();
      const trigger = document.querySelector('[data-dropdown-trigger]').getBoundingClientRect();
      const panel = document.querySelector('[data-dropdown-panel]');
      const box = panel.getBoundingClientRect();
      return {
        bodyTop: body.top, bodyBottom: body.bottom, triggerTop: trigger.top, triggerBottom: trigger.bottom,
        panelBottom: box.bottom, panelHeight: box.height, scrollTop: document.getElementById('body').scrollTop,
      };
    };
    // Opens and reads in one task, before the settle re-check that follows a reveal can run.
    const openAndRead = (page) => page.evaluate((src) => {
      document.querySelector('[data-dropdown-trigger]').click();
      return new Function(`return (${src})`)()();
    }, measure.toString());
    for (const reduced of [false, true]) {
      const ctx = await browser.newContext({
        viewport: VIEWPORT, deviceScaleFactor: 1, reducedMotion: reduced ? 'reduce' : 'no-preference',
      });
      const page = await ctx.newPage();
      await page.goto(`http://127.0.0.1:${vanilla.port}/__shot?body=1`, { waitUntil: 'load' });
      await page.waitForFunction(() => window.__ready === true);
      let first = null;
      if (reduced) first = await openAndRead(page);
      else await page.locator('[data-dropdown-trigger]').click();
      await page.waitForTimeout(900);
      const got = await page.evaluate(measure);
      // Reduced motion jumps: the body is at its final place on the first look, before any re-check.
      if (first) assert.equal(first.scrollTop, got.scrollTop, 'reduced motion: the body was still short of its final place on the first look');
      const label = reduced ? 'reduced motion' : 'motion';
      assert.ok(got.panelHeight <= 300 && got.panelHeight > 250, `${label}: the panel is ${got.panelHeight}px, not between 250 and 300px`);
      const inset = got.bodyBottom - got.panelBottom;
      assert.ok(inset >= 48 - 0.5 && inset <= 48 + 1, `${label}: the panel ends ${inset}px above the body's end, not 48px`);
      assert.ok(
        got.triggerTop >= got.bodyTop && got.triggerBottom <= got.bodyBottom,
        `${label}: the trigger left the body`,
      );
      await ctx.close();
    }
  } finally {
    await browser.close();
    vanilla.proc.kill();
  }
});

test('a shut panel adds no scroll room at the end of a body or a page, and closing does not move the field', {
  skip: !RUN && 'set DROPDOWN_REACH=1',
}, async () => {
  const pw = await playwright();
  assert.ok(pw, 'DROPDOWN_REACH=1 was set and no Playwright could be resolved. Point UI_PLAYWRIGHT at one.');
  const browser = await pw.chromium.launch({ executablePath: process.env.UI_CHROME });
  const vanilla = await serve(root, path.join(root, 'stories/lib/dropdown-reach.html'));
  try {
    for (const where of ['body=1', 'bottomGap=36']) {
      const ctx = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1, reducedMotion: 'reduce' });
      const page = await ctx.newPage();
      await page.goto(`http://127.0.0.1:${vanilla.port}/__shot?${where}`, { waitUntil: 'load' });
      await page.waitForFunction(() => window.__ready === true);
      // The scroller is the body in a dialog and the page otherwise; `scrollHeight` of the root is the page's.
      const height = () => page.evaluate(() => {
        const el = document.getElementById('body') || document.documentElement;
        return el.scrollHeight;
      });
      // The same page with the panel taken out is the content without it.
      const without = await page.evaluate(() => {
        const el = document.getElementById('body') || document.documentElement;
        const panel = document.querySelector('[data-dropdown-panel]');
        const parent = panel.parentNode;
        const next = panel.nextSibling;
        panel.remove();
        const h = el.scrollHeight;
        parent.insertBefore(panel, next);
        return h;
      });
      assert.equal(await height(), without, `${where}: a panel nobody opened adds scroll room`);

      const trigger = page.locator('[data-dropdown-trigger]');
      await trigger.click();
      await page.waitForTimeout(600);
      assert.ok(await height() > without, `${where}: an open panel is in the scroll, or the case measures nothing`);
      const at = await trigger.boundingBox();
      await trigger.press('Escape');
      await page.waitForTimeout(40);
      const during = await trigger.boundingBox();
      assert.equal(during.y, at.y, `${where}: the field moved when the panel closed`);
      await page.waitForTimeout(600);
      const after = await trigger.boundingBox();
      assert.equal(after.y, at.y, `${where}: the field moved when the fade ended`);
      // At the room's far end the field stays and the room stays; once the reader leaves it, the room goes.
      await page.evaluate(() => {
        const el = document.getElementById('body') || document.documentElement;
        el.scrollTo({ top: 0, behavior: 'instant' });
      });
      await page.waitForTimeout(200);
      assert.equal(await height(), without, `${where}: the room stayed after the reader left it`);
      await ctx.close();
    }
  } finally {
    await browser.close();
    vanilla.proc.kill();
  }
});

test('a panel is never taller than 300px, near the end of a page too', {
  skip: !RUN && 'set DROPDOWN_REACH=1',
}, async () => {
  const pw = await playwright();
  assert.ok(pw, 'DROPDOWN_REACH=1 was set and no Playwright could be resolved. Point UI_PLAYWRIGHT at one.');
  const browser = await pw.chromium.launch({ executablePath: process.env.UI_CHROME });
  const vanilla = await serve(root, path.join(root, 'stories/lib/dropdown-reach.html'));
  try {
    const seen = [];
    for (const bottomGap of [300, 120, 100, 36]) {
      const ctx = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1 });
      const page = await ctx.newPage();
      await page.goto(`http://127.0.0.1:${vanilla.port}/__shot?bottomGap=${bottomGap}`, { waitUntil: 'load' });
      await page.waitForFunction(() => window.__ready === true);
      await page.locator('[data-dropdown-trigger]').click();
      await page.waitForTimeout(500);
      const box = await page.locator('[data-dropdown-panel]').boundingBox();
      seen.push(`${bottomGap}: ${box.height}`);
      assert.ok(box.height <= 300 + 0.5, `${bottomGap}px above the end of the page the panel is ${box.height}px tall`);
      await ctx.close();
    }
    assert.equal(seen.length, 4);
  } finally {
    await browser.close();
    vanilla.proc.kill();
  }
});

test('at the end of a page an open panel keeps one height while the reader wheels or presses End, in both kits', {
  skip: !RUN && 'set DROPDOWN_REACH=1',
}, async () => {
  const pw = await playwright();
  assert.ok(pw, 'DROPDOWN_REACH=1 was set and no Playwright could be resolved. Point UI_PLAYWRIGHT at one.');
  const reactBuild = path.join(root, 'react/storybook-static');
  assert.ok(existsSync(path.join(reactBuild, 'index.json')), `no Storybook build at ${reactBuild} — run: npm run build-storybook -w react.`);
  const browser = await pw.chromium.launch({ executablePath: process.env.UI_CHROME });
  const vanilla = await serve(root, path.join(root, 'stories/lib/dropdown-reach.html'));
  const react = await serve(reactBuild, path.join(root, 'stories/lib/dropdown-reach.html'));
  try {
    const all = JSON.parse(readFileSync(path.join(reactBuild, 'index.json'), 'utf8')).entries;
    const story = Object.values(all).find((e) => e.id === 'react-dropdown--near-bottom-edge');
    assert.ok(story, 'no built React story with the id react-dropdown--near-bottom-edge');
    const cases = [];
    for (const bottomGap of [36, 100]) {
      cases.push({ label: `vanilla ${bottomGap}px above the end`, open: async (page) => {
        await page.goto(`http://127.0.0.1:${vanilla.port}/__shot?bottomGap=${bottomGap}`, { waitUntil: 'load' });
        await page.waitForFunction(() => window.__ready === true);
        await page.locator('[data-dropdown-trigger]').click();
      } });
    }
    // The story renders the dropdown already open, so there is no click to make.
    cases.push({ label: 'react near the bottom edge', open: async (page) => {
      const opened = await openStory(page, story, { port: react.port, theme: 'dark' });
      assert.equal(opened.phase, 'finished');
    } });
    for (const c of cases) {
      const ctx = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1, reducedMotion: 'reduce' });
      const page = await ctx.newPage();
      await c.open(page);
      await page.waitForTimeout(500);
      const panel = page.locator('[data-dropdown-panel]');
      const height = async () => (await panel.boundingBox()).height;
      const first = await height();
      assert.ok(first > 120 + 0.5, `${c.label}: the panel opened at ${first}px, which is the floor and not a case that can shrink`);
      // The wheel over the page beside the panel, which is what a reader scrolling the page does.
      const seen = [first];
      for (let i = 0; i < 4; i += 1) {
        await page.mouse.move(VIEWPORT.width - 2, 10);
        await page.mouse.wheel(0, 40);
        await page.waitForTimeout(250);
        seen.push(await height());
      }
      assert.ok(await page.evaluate(() => window.scrollY) > 0, `${c.label}: the wheel did not scroll the page, so the case measures nothing`);
      await page.press('html', 'End');
      await page.waitForTimeout(400);
      seen.push(await height());
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(300);
      await page.evaluate(() => { document.activeElement?.blur(); });
      await page.press('html', 'End');
      await page.waitForTimeout(400);
      seen.push(await height());
      for (const h of seen) {
        assert.ok(Math.abs(h - first) <= 0.5, `${c.label}: the open panel changed height while the page scrolled: ${seen.join(', ')}`);
      }
      await ctx.close();
    }
  } finally {
    await browser.close();
    vanilla.proc.kill();
    react.proc.kill();
  }
});

test('in a scrolling body the panel\'s shadow has faded to nothing visible where the body clips it, in light and dark', {
  skip: !RUN && 'set DROPDOWN_REACH=1',
}, async () => {
  const pw = await playwright();
  assert.ok(pw, 'DROPDOWN_REACH=1 was set and no Playwright could be resolved. Point UI_PLAYWRIGHT at one.');
  const browser = await pw.chromium.launch({ executablePath: process.env.UI_CHROME });
  const vanilla = await serve(root, path.join(root, 'stories/lib/dropdown-reach.html'));
  try {
    for (const theme of ['light', 'dark']) {
      const ctx = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1, reducedMotion: 'reduce' });
      const page = await ctx.newPage();
      await page.goto(`http://127.0.0.1:${vanilla.port}/__shot?body=1&theme=${theme}`, { waitUntil: 'load' });
      await page.waitForFunction(() => window.__ready === true);
      await page.locator('[data-dropdown-trigger]').click();
      await page.waitForTimeout(600);
      const at = await page.evaluate(() => {
        const body = document.getElementById('body').getBoundingClientRect();
        const box = document.querySelector('[data-dropdown-panel]').getBoundingClientRect();
        return { x: Math.round(box.left + box.width / 2), panelBottom: Math.round(box.bottom), bodyBottom: Math.round(body.bottom) };
      });
      const png = (await page.screenshot()).toString('base64');
      // The levels, out of 255, between the page ground and the pixel just inside the body's end,
      // and between the ground and the pixel at the panel's own end as a proof the shadow is there.
      const levels = await page.evaluate(async ({ b64, x, panelBottom, bodyBottom, height }) => {
        const img = new Image();
        img.src = `data:image/png;base64,${b64}`;
        await img.decode();
        const c = document.createElement('canvas');
        c.width = img.width; c.height = img.height;
        const g = c.getContext('2d');
        g.drawImage(img, 0, 0);
        const ground = g.getImageData(x, height - 4, 1, 1).data;
        const diff = (y) => {
          const p = g.getImageData(x, y, 1, 1).data;
          return Math.max(...[0, 1, 2].map((i) => Math.abs(p[i] - ground[i])));
        };
        return { edge: diff(panelBottom + 1), end: diff(bodyBottom - 1) };
      }, { b64: png, ...at, height: VIEWPORT.height });
      assert.ok(levels.edge >= 4, `${theme}: only ${levels.edge} levels of shadow under the panel, so the case measures no shadow`);
      assert.ok(levels.end <= 1, `${theme}: the shadow is still ${levels.end} levels strong where the body clips it`);
      await ctx.close();
    }
  } finally {
    await browser.close();
    vanilla.proc.kill();
  }
});

test('a capped panel ends in the middle of a row for every row height, in a page and in a Modal body', {
  skip: !RUN && 'set DROPDOWN_REACH=1',
}, async () => {
  const pw = await playwright();
  assert.ok(pw, 'DROPDOWN_REACH=1 was set and no Playwright could be resolved. Point UI_PLAYWRIGHT at one.');
  const reactBuild = path.join(root, 'react/storybook-static');
  assert.ok(existsSync(path.join(reactBuild, 'index.json')), `no Storybook build at ${reactBuild} — run: npm run build-storybook -w react.`);
  const browser = await pw.chromium.launch({ executablePath: process.env.UI_CHROME });
  const vanilla = await serve(root, path.join(root, 'stories/lib/dropdown-reach.html'));
  const react = await serve(reactBuild, path.join(root, 'stories/lib/dropdown-reach.html'));
  // The rows whole inside the list's clip, and how much of the next one shows.
  const look = () => {
    const panel = document.querySelector('[data-dropdown-panel]');
    const clip = panel.querySelector('.ui-dropdown__list') || panel;
    const c = clip.getBoundingClientRect();
    const rows = [...panel.querySelectorAll('[data-dd-item]')].map((r) => r.getBoundingClientRect());
    const whole = rows.filter((r) => r.top >= c.top - 0.5 && r.bottom <= c.bottom + 0.5).length;
    return { height: panel.getBoundingClientRect().height, whole, part: (c.bottom - rows[whole].top) / rows[whole].height };
  };
  const want = { plain: 7, desc: 4, search: 5 };
  try {
    const seen = [];
    for (const rows of ['plain', 'desc', 'search']) {
      for (const where of ['page', 'body']) {
        const ctx = await browser.newContext({ viewport: { width: 390, height: 1400 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
        const page = await ctx.newPage();
        const query = `${where === 'body' ? 'body=1&' : 'bottomGap=900&'}${rows === 'plain' ? 'rows=plain' : `rows=${rows}`}`;
        await page.goto(`http://127.0.0.1:${vanilla.port}/__shot?${query}`, { waitUntil: 'load' });
        await page.waitForFunction(() => window.__ready === true);
        await page.locator('[data-dropdown-trigger]').click();
        await page.waitForTimeout(700);
        const got = await page.evaluate(`(${look.toString()})()`);
        seen.push(`${rows} in a ${where}: ${got.whole} rows and ${got.part.toFixed(2)} of the next, ${got.height}px`);
        assert.ok(got.height <= 300 + 0.5, `${rows} in a ${where}: the panel is ${got.height}px, past 300px`);
        assert.equal(got.whole, want[rows], `${rows} in a ${where}: shows ${got.whole} whole rows, not ${want[rows]}`);
        assert.ok(got.part > 0.4 && got.part < 0.6, `${rows} in a ${where}: the next row shows ${got.part.toFixed(2)} of itself, not about half`);
        await ctx.close();
      }
    }
    // React's own panel, from the story that holds thirty rows with the room to spare.
    const all = JSON.parse(readFileSync(path.join(reactBuild, 'index.json'), 'utf8')).entries;
    const story = Object.values(all).find((e) => e.id === 'react-dropdown--long-list');
    assert.ok(story, 'no built React story with the id react-dropdown--long-list — react/src/Dropdown.stories.tsx may have moved it.');
    const ctx = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1, reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    assert.equal((await openStory(page, story, { port: react.port, theme: 'dark' })).phase, 'finished');
    await page.waitForTimeout(500);
    const got = await page.evaluate(`(${look.toString()})()`);
    seen.push(`react: ${got.whole} rows and ${got.part.toFixed(2)} of the next, ${got.height}px`);
    assert.equal(got.whole, want.plain, `react: shows ${got.whole} whole rows, not ${want.plain}`);
    assert.ok(got.part > 0.4 && got.part < 0.6, `react: the next row shows ${got.part.toFixed(2)} of itself, not about half`);
    await ctx.close();
    console.log(seen.join('\n'));
  } finally {
    await browser.close();
    vanilla.proc.kill();
    react.proc.kill();
  }
});

test('closing a panel with Escape at the end of a page does not move the field, in both kits', {
  skip: !RUN && 'set DROPDOWN_REACH=1',
}, async () => {
  const pw = await playwright();
  assert.ok(pw, 'DROPDOWN_REACH=1 was set and no Playwright could be resolved. Point UI_PLAYWRIGHT at one.');
  const reactBuild = path.join(root, 'react/storybook-static');
  assert.ok(existsSync(path.join(reactBuild, 'index.json')), `no Storybook build at ${reactBuild} — run: npm run build-storybook -w react.`);
  const browser = await pw.chromium.launch({ executablePath: process.env.UI_CHROME });
  const vanilla = await serve(root, path.join(root, 'stories/lib/dropdown-reach.html'));
  const react = await serve(reactBuild, path.join(root, 'stories/lib/dropdown-reach.html'));
  try {
    const all = JSON.parse(readFileSync(path.join(reactBuild, 'index.json'), 'utf8')).entries;
    const story = Object.values(all).find((e) => e.id === 'react-dropdown--near-bottom-edge');
    assert.ok(story, 'no built React story with the id react-dropdown--near-bottom-edge');
    for (const reduced of [false, true]) {
      for (const kit of ['vanilla', 'react']) {
        const ctx = await browser.newContext({
          viewport: VIEWPORT, deviceScaleFactor: 1, reducedMotion: reduced ? 'reduce' : 'no-preference',
        });
        const page = await ctx.newPage();
        if (kit === 'vanilla') {
          await page.goto(`http://127.0.0.1:${vanilla.port}/__shot?bottomGap=36`, { waitUntil: 'load' });
          await page.waitForFunction(() => window.__ready === true);
          await page.locator('[data-dropdown-trigger]').click();
        } else {
          assert.equal((await openStory(page, story, { port: react.port, theme: 'dark' })).phase, 'finished');
        }
        await page.waitForTimeout(600);
        await page.press('html', 'End');
        await page.waitForTimeout(600);
        const top = () => page.evaluate(() => document.querySelector('[data-dropdown-trigger]').getBoundingClientRect().top);
        const before = await top();
        assert.ok(await page.evaluate(() => window.scrollY) > 0, `${kit}: End did not scroll the page, so the case measures nothing`);
        await page.press('html', 'Escape');
        const seen = [];
        for (let t = 0; t < 1200; t += 100) {
          seen.push(await top());
          await page.waitForTimeout(100);
        }
        assert.ok(await page.evaluate(() => !document.querySelector('.ui-dropdown').classList.contains('open')), `${kit}: Escape did not close the panel`);
        for (const y of seen) {
          assert.ok(Math.abs(y - before) <= 0.5, `${kit}${reduced ? ' (reduced motion)' : ''}: the field moved from ${before}px to ${y}px while the panel closed`);
        }
        await ctx.close();
      }
    }
  } finally {
    await browser.close();
    vanilla.proc.kill();
    react.proc.kill();
  }
});
