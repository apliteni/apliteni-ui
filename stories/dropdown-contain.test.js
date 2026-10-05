/* Rule: a dropdown panel stays inside the view it is laid out in — left edge at or
 * after that view's start, right edge at or before its end, shut and open, with
 * `align` still choosing the edge of the trigger the panel hangs from and the
 * containment overriding it only where that edge does not fit. #572 is what that
 * looked like with nothing measuring the view.
 *
 * The source half below runs in CI. The browser half at the foot of the file is
 * opt-in and states its own limits there.
 * why: docs/components.md#the-dropdown-panel
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { JSDOM, VirtualConsole } from 'jsdom';
import { dropdown, wireDropdown, dropdownViewportFit } from '../src/components/dropdown.js';
import { WIDTHS, SLACK } from './lib/dropdown-contain.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => readFileSync(path.join(root, rel), 'utf8');
const decomment = (src) => src.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));

const SHEET = 'src/styles/dropdown.css';
const WIRING = 'src/components/dropdown.js';
const css = decomment(read(SHEET));
const js = decomment(read(WIRING));

/* -- The stylesheet --------------------------------------------------------- */

test('the gap a panel keeps from the view\'s edge is one named number', () => {
  const declared = [...css.matchAll(/--ui-dropdown-edge:\s*([^;]+);/g)].map((m) => m[1].trim());
  assert.deepEqual(
    declared, ['8px'],
    `${SHEET} declares --ui-dropdown-edge ${declared.length} times (${declared.join(', ') || 'never'}). `
    + 'The wiring reads this property off the panel and the width bound reads it too, so a second '
    + 'declaration is two different gaps for one panel — and none at all leaves the wiring on its '
    + 'own fallback constant, which is the drift DD_GAP already had to be pinned against.',
  );
});

test('the panel keeps the floor that makes a menu readable', () => {
  const panel = decomment(read(SHEET))
    .split(/\.ui-dropdown__panel\s*\{/)[1]
    ?.split('}')[0] ?? '';
  assert.match(
    panel, /min-width:\s*240px/,
    `${SHEET} no longer floors .ui-dropdown__panel at 240px. Containment is a position, not a `
    + 'width: the panel is moved rather than narrowed, and #549 is what giving the floor up looks '
    + 'like.',
  );
});

/* -- The wiring, read as source --------------------------------------------- */

test('the in-place fit moves the panel with a transform, not with an offset', () => {
  const fn = js.split('function ddFitViewport(')[1]?.split('\n}')[0] ?? '';
  assert.ok(fn, `${WIRING} has no ddFitViewport() to read.`);
  assert.match(
    fn, /style\.translate\s*=/,
    `${WIRING}'s ddFitViewport() does not write \`translate\`. An absolutely positioned box is `
    + 'shrink-to-fit, so its width is measured against the room left between its own offsets: a '
    + 'shift written as `left`, `right` or a margin changes the width the shift was calculated '
    + 'from, and the answer is then one layout out of date.',
  );
  for (const prop of ['left', 'right', 'marginInlineStart', 'marginLeft']) {
    assert.doesNotMatch(
      fn, new RegExp(`style\\.${prop}\\s*=`),
      `${WIRING}'s ddFitViewport() writes style.${prop}. See above: an offset is the one way to `
      + 'move this box that also resizes it.',
    );
  }
});

test('every placement the wiring writes asks the fit', () => {
  const portal = js.split('function positionPortalPanel(')[1]?.split('\n}')[0] ?? '';
  assert.ok(portal, `${WIRING} has no positionPortalPanel() to read.`);
  assert.match(
    portal, /dropdownViewportFit\(/,
    `${WIRING}'s positionPortalPanel() places a panel in viewport coordinates without asking the `
    + 'fit. Mirroring the trigger\'s edges is exactly what #572 reported: both of them put a 240px '
    + 'panel off the screen from a trigger near the edge it is anchored to.',
  );
  /* Every way a panel comes to be placed in its own box: wired while already on the
     page, opened, and shut again. A shut panel is laid out and counts towards the
     page's scrollable width, so it can neither wait for a click nor keep the shift
     the click before it wrote — which is #501's symptom of the same geometry, and
     what #572's review measured after a row moved under an open panel. */
  for (const [fn, why] of [
    ['export function wireDropdown(', 'nothing is measured until the first click'],
    ['function openDropdown(', 'a panel opens where the last measurement left it'],
    ['function closeDropdown(', 'a panel keeps the shift it was open with after its anchor moved'],
  ]) {
    const body = js.split(fn)[1]?.split('\nexport function ')[0] ?? '';
    assert.ok(body, `${WIRING} has no ${fn.replace(/[^a-zA-Z]/g, '')}() to read.`);
    assert.match(
      body, /ddFitViewport\(dd, panel\)/,
      `${WIRING}'s ${fn.replace(/[^a-zA-Z]/g, '')}() does not fit an in-place panel, so ${why}.`,
    );
  }
});

/* The mechanisms that keep the fit current, read as source: a move that resizes
 * nothing is reported by none of the observers a size gives you, and the browser
 * half that proves this end to end is opt-in. So CI reads that they are asked for
 * at all. why: docs/components.md#the-dropdown-panel */
test('the wiring watches the moves no size reports', () => {
  const listen = js.split('function ddListen(')[1]?.split('\nexport function ')[0] ?? '';
  assert.ok(listen, `${WIRING} has no ddListen() to read.`);
  for (const [what, pattern, why] of [
    ['a mutation observer', /new view\.MutationObserver\(/,
      'a flex row told to end-align its children moves a trigger the width of the row with every '
      + 'box the same size, and no observer of a size reports it'],
    ['a scroll listener', /addEventListener\('scroll'/,
      'an ancestor scrolled sideways carries the trigger with it and changes no style at all'],
    ['a resize listener', /addEventListener\('resize'/,
      "the view's own width is the third number in the fit and no box reports it"],
    ['a text-change observation', /characterData:\s*true/,
      'growing a sibling text node moves a trigger along a flex row with every box it reads the '
      + 'same size, and no child list and no attribute changes with it'],
    ['the motion end events', /addEventListener\('transitionend'/,
      'the style write that starts a transition is measured in the frame it lands, when the '
      + 'trigger has not moved yet, so only the end of the motion says where it stopped'],
    ['a fallback for the end event that never comes', /setTimeout\(/,
      'a cancelled transition fires no end event, and a script that waits on one owes the reader '
      + 'a way out'],
  ]) {
    assert.match(
      listen, pattern,
      `${WIRING}'s ddListen() no longer takes ${what}, so ${why}.`,
    );
  }
});

/* A scroll answers both states and not the open panel alone: a shut panel is laid
 * out, so an ancestor scrolled back to where it started leaves the page as wide as
 * that panel's stale box. React's half has always fitted both. */
test('a scroll is answered for the shut panels too', () => {
  const listen = js.split('function ddListen(')[1]?.split('\nexport function ')[0] ?? '';
  const follow = listen.split('const follow =')[1]?.split('\n')[0] ?? '';
  assert.match(
    follow, /reposition\(\);\s*refitInPlace\(\)/,
    `${WIRING}'s follow() is no longer both sweeps, so one of the two panel states goes unanswered.`,
  );
  assert.match(
    listen, /addEventListener\('scroll', follow, true\)/,
    `${WIRING} answers a scroll with something other than follow(). The open sweep alone left a `
    + 'shut panel at 258…498 of a 390px view after an ancestor scrolled back to where it started, '
    + 'which is the page width #501 names with nothing open.',
  );
});

/* -- The arithmetic, swept -------------------------------------------------- */
/* Subjects are a sweep rather than a list: every trigger position along a row, at
 * each width the issue names, for both of the edges `align` offers and for both
 * panel widths the kit ships. The fit is handed boxes, as JSDOM hands the wiring
 * boxes everywhere else in this tree. */

/** A view that answers the two questions the fit asks of one. */
const viewOf = (width, edge = 8) => ({
  getComputedStyle: () => ({ getPropertyValue: () => `${edge}px` }),
  document: { documentElement: { clientWidth: width } },
  innerWidth: width,
});

/**
 * A panel as the browser would report it: `left` is where the sheet puts it and
 * `shift` is a translate already written, which the rect includes and the fit has
 * to take off again.
 */
const panelAt = (left, width, view, { shift = 0, edge = 8, bar = false } = {}) => ({
  ownerDocument: { defaultView: viewOf(view, edge) },
  style: { translate: shift ? `${shift}px` : '' },
  closest: (sel) => (bar && sel === '.ui-filter-bar' ? {} : null),
  classList: { contains: () => false },
  getBoundingClientRect: () => ({ left: left + shift, right: left + shift + width, width }),
});

/** The kit's two panel widths: the menu floor, and the search variant's. */
const PANELS = [240, 280];
/** A trigger's own box, and where along the row it sits. */
const TRIGGER = 96;
const STEPS = 9;
/** Both edges `align` offers, each as the left the sheet would put the panel at:
 *  the trigger's own start, or its end less the panel's width. */
const ANCHORS = {
  start: (x) => x,
  end: (x, width) => x + TRIGGER - width,
};

/** Every case in the sweep: one panel, at one width, from one trigger position. */
const sweep = () => {
  const cases = [];
  for (const view of WIDTHS) {
    for (const width of PANELS) {
      for (let step = 0; step < STEPS; step += 1) {
        // The trigger walks the row from its start to its end, ends included.
        const x = Math.round(((view - TRIGGER) * step) / (STEPS - 1));
        cases.push({ view, width, x, align: 'start', left: ANCHORS.start(x, width) });
        cases.push({ view, width, x, align: 'end', left: ANCHORS.end(x, width) });
      }
    }
  }
  return cases;
};

/* Recorded, not derived from the loop that fills it: a count computed from the
 * sweep can only restate the sweep, so a sweep that quietly stopped reaching half
 * its cases would still report "all of them". Raising this is a deliberate act. */
const FLOOR_CASES = 144;   // 4 widths × 2 panel widths × 9 positions × 2 anchors

test('every trigger position in a row keeps its panel inside the view', () => {
  const cases = sweep();
  assert.ok(
    cases.length >= FLOOR_CASES,
    `${cases.length} cases swept, and the floor is ${FLOOR_CASES}. The sweep IS the coverage here.`,
  );
  const outside = [];
  for (const c of cases) {
    const fit = dropdownViewportFit(panelAt(c.left, c.width, c.view));
    assert.ok(fit, `no fit for a ${c.width}px panel at ${c.left} in a ${c.view}px view`);
    const left = c.left + fit.shift;
    if (left < -SLACK || left + c.width > c.view + SLACK) {
      outside.push(`${c.view}px view, align:${c.align}, trigger at ${c.x} → ${left}…${left + c.width}`);
    }
  }
  assert.deepEqual(
    outside, [],
    `${outside.length} of ${cases.length} fitted panels are not inside their view:\n  `
    + `${outside.slice(0, 8).join('\n  ')}`,
  );
});

test('a panel that fits at the edge it asked for is not moved', () => {
  // The other half of the ask: containment overrides `align`, and only then.
  const kept = sweep().filter((c) => {
    const edge = Math.max(0, Math.min(8, (c.view - c.width) / 2));
    return c.left >= edge && c.left + c.width <= c.view - edge;
  });
  assert.ok(
    kept.length >= 40,
    `${kept.length} of the swept cases already fit. A sweep where almost nothing fits would pass `
    + 'the rule below while proving nothing about it.',
  );
  for (const c of kept) {
    assert.equal(
      dropdownViewportFit(panelAt(c.left, c.width, c.view)).shift, 0,
      `a ${c.width}px panel at ${c.left} in a ${c.view}px view fits and was moved anyway`,
    );
  }
});

test('the fit is the same answer however many times it is asked', () => {
  // The wiring measures again on every resize and on every open, over a panel that
  // is already carrying the last answer. A fit measured from where it left the
  // panel rather than from where the sheet puts it would walk it off the screen.
  for (const c of sweep()) {
    const first = dropdownViewportFit(panelAt(c.left, c.width, c.view)).shift;
    const again = dropdownViewportFit(panelAt(c.left, c.width, c.view, { shift: first })).shift;
    assert.equal(again, first, `a ${c.width}px panel at ${c.left} in ${c.view} drifted on re-measure`);
  }
});

test('the gap is what the view can afford, and the start is what it keeps', () => {
  // 320 − 8 − 8 leaves 304 for a panel, so a 310px one has no room for both gaps
  // and a 400px one cannot honour both edges at all. It keeps its start, so the
  // reader meets the beginning of the rows; the sheet's max-width is what stops
  // the second case arising at all.
  const tight = dropdownViewportFit(panelAt(60, 310, 320));
  assert.equal(tight.edge, 5, 'the gap halves the slack when the slack is all there is');
  assert.equal(tight.left, 5);
  const over = dropdownViewportFit(panelAt(60, 400, 320));
  assert.equal(over.edge, 0, 'a panel wider than the view has no gap to keep');
  assert.equal(over.left, 0, 'and keeps its start');
});

test('the gap comes off the panel, so a page may set its own', () => {
  assert.equal(dropdownViewportFit(panelAt(0, 240, 320, { edge: 0 })).shift, 0);
  assert.equal(dropdownViewportFit(panelAt(0, 240, 320, { edge: 24 })).shift, 24);
});

test('a panel in a filter row is not this fit\'s subject', () => {
  // The row bounds its panels to itself, which is already inside the view, and
  // #549's slide is measured from a chip's offset along that row. Two fits writing
  // one panel's position would be two answers.
  assert.equal(dropdownViewportFit(panelAt(-200, 240, 320, { bar: true })), null);
  assert.notEqual(dropdownViewportFit(panelAt(-200, 240, 320)), null);
});

test('nothing to measure answers nothing', () => {
  assert.equal(dropdownViewportFit(null), null);
  assert.equal(dropdownViewportFit(undefined), null);
  // A view that lays nothing out — JSDOM is one — reports no width and no box. A
  // fit invented from zeroes would move every panel to the origin.
  assert.equal(dropdownViewportFit(panelAt(40, 0, 320)), null);
  assert.equal(dropdownViewportFit(panelAt(40, 240, 0)), null);
});

/* The mutation: the placement as #572 found it. `align` picks an edge of the
 * trigger and the panel hangs from it, unmeasured — which is the same sweep with
 * every shift set to zero. It has to put panels outside the view, or this gate's
 * sweep is measuring a geometry that was never wrong. */
test('this gate rejects a panel hung from its trigger and never measured', () => {
  const cases = sweep();
  const outside = cases.filter((c) => c.left < -SLACK || c.left + c.width > c.view + SLACK);
  assert.ok(
    outside.length >= cases.length / 3,
    `the unmeasured placement leaves ${outside.length} of ${cases.length} panels outside the view. `
    + 'A sweep that cannot catch the defect in most of its own cases is sweeping the wrong row: '
    + 'the positions have to reach both ends of it.',
  );
  // And both ends of the row are reached, not one: `align` moves the clipping from
  // one side to the other, so a sweep that only caught one side would pass with
  // half the fix.
  assert.ok(outside.some((c) => c.left < 0), 'no case clips at the view’s start');
  assert.ok(outside.some((c) => c.left + c.width > c.view), 'no case clips at the view’s end');
});

/* -- The wiring, in JSDOM --------------------------------------------------- */
/* The write path: that the fit is asked at the right moments and its answer lands
 * on the panel. The boxes are supplied, as they are everywhere else in
 * src/components/dropdown.test.js; where a real panel lands is the browser half. */

const quiet = new VirtualConsole();
quiet.on('jsdomError', () => {});

/** A wired dropdown whose panel reports `width` at `left` in a `view`-wide view. */
function wired(html, { left, width = 240, view = 375 }) {
  const dom = new JSDOM(`<!doctype html><html><body><main>${html}</main></body></html>`, {
    pretendToBeVisual: true, virtualConsole: quiet,
  });
  const { window } = dom;
  for (const key of ['window', 'document', 'HTMLElement', 'Element', 'Node', 'getComputedStyle']) {
    Object.defineProperty(globalThis, key, { value: window[key] ?? window, configurable: true, writable: true });
  }
  Object.defineProperty(window, 'innerWidth', { value: view, configurable: true });
  Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true });
  Object.defineProperty(window.document.documentElement, 'clientWidth', { value: view, configurable: true });
  const doc = window.document;
  const trigger = doc.querySelector('[data-dropdown-trigger]');
  const panel = doc.querySelector('[data-dropdown-panel]');
  // Mutable, because a trigger that moves without resizing is the other half of
  // this rule and JSDOM reports no geometry of its own.
  let at = left;
  trigger.getBoundingClientRect = () => ({
    top: 20, bottom: 51, left: at, right: at + 96, width: 96, height: 31, x: at, y: 20,
  });
  // The panel's own box, as the sheet would place it: `left: 0` on the trigger's
  // containing block, or its right edge on the trigger's when it is `.is-end`.
  const end = panel.classList.contains('is-end');
  panel.getBoundingClientRect = () => {
    const shift = parseFloat(panel.style.translate) || 0;
    const x = (end ? at + 96 - width : at) + shift;
    return { left: x, right: x + width, width, top: 60, bottom: 190, height: 130, x, y: 60 };
  };
  Object.defineProperty(panel, 'offsetHeight', { value: 130, configurable: true });
  wireDropdown(doc);
  return { window, doc, trigger, panel, move: (to) => { at = to; } };
}

const MENU = [{ label: 'Settings' }, { label: 'Billing' }, { label: 'Sign out' }];
const click = (window, el) =>
  el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));

test('a shut panel is fitted when it is wired, before anything is clicked', () => {
  const { panel } = wired(
    dropdown({ value: 'Period', variant: 'menu', align: 'end', items: MENU }),
    { left: 8, view: 375 },
  );
  // align: 'end' at the start of the row: the panel's right edge is the trigger's,
  // so it reaches back to 8 + 96 − 240 = −136.
  assert.equal(panel.style.translate, '144px', 'the shut panel is brought back inside the view');
  assert.equal(panel.getBoundingClientRect().left, 8);
});

test('a panel with room keeps the edge align asked for, and carries no shift', () => {
  const { panel } = wired(
    dropdown({ value: 'Actions', variant: 'menu', items: MENU }),
    { left: 40, view: 1280 },
  );
  assert.equal(panel.style.translate, '', 'nothing is written onto a panel that fits');
});

test('opening fits the panel again, against the view as it is now', () => {
  const { window, trigger, panel } = wired(
    dropdown({ value: 'Actions', variant: 'menu', items: MENU }),
    { left: 300, view: 375 },
  );
  assert.equal(panel.style.translate, '-173px', '300 + 240 passes 375, less the 8px gap');
  Object.defineProperty(window.document.documentElement, 'clientWidth', { value: 1280, configurable: true });
  click(window, trigger);
  assert.equal(panel.style.translate, '', 'the panel fits in the wider view and is let go');
});

test('a portalled panel is clamped in the coordinates it is placed in', () => {
  const { window, trigger, panel } = wired(
    dropdown({ value: 'Account', variant: 'menu', portal: true, align: 'end', items: MENU }),
    { left: 8, view: 375 },
  );
  click(window, trigger);
  // The unclamped mirror writes right: 375 − 104 = 271px, which puts the panel's
  // left edge at −136. Clamped, its right offset leaves the left edge at the gap.
  assert.equal(panel.style.left, 'auto');
  assert.equal(panel.style.right, '127px', '375 − 8 − 240 = 127 from the right edge');
  assert.equal(panel.style.translate, '', 'a portalled panel is placed, not translated');
});

/* The three states a size cannot report. JSDOM has a MutationObserver, so the
 * mechanism that answers a move is testable here and not only in a browser; what
 * JSDOM cannot say is where the panel then lands, which is the browser half's. */

// A mutation observer's callback is a microtask, so a sweep is one tick away.
const tick = () => new Promise((done) => setTimeout(done, 0));

test('a trigger moved by its row, with nothing resized, is followed', async () => {
  const { window, trigger, panel, move } = wired(
    dropdown({ value: 'Period', variant: 'menu', align: 'end', items: MENU }),
    { left: 8, view: 390 },
  );
  click(window, trigger);
  assert.equal(panel.style.translate, '144px', 'align: end at the start of the row reaches to −136');
  // The row now holds its children at the other end: every box the same size.
  move(254);
  window.document.querySelector('main').setAttribute('style', 'justify-content:flex-end');
  await tick();
  assert.equal(panel.style.translate, '', 'the panel fits where the trigger now is and is let go');
  assert.equal(panel.getBoundingClientRect().left, 110, '254 + 96 − 240');
});

test('a panel shut after its anchor moved is fitted on the way out', async () => {
  const { window, trigger, panel, move } = wired(
    dropdown({ value: 'Period', variant: 'menu', align: 'end', items: MENU }),
    { left: 8, view: 390 },
  );
  click(window, trigger);
  /* The move and the close in one batch, so the sweep cannot be what fixes it: a
     shut panel is laid out, and #572's review measured a page left 478px wide with
     nothing open. */
  move(254);
  click(window, trigger);
  assert.equal(panel.style.translate, '', 'the shut panel does not keep the shift it was opened with');
  assert.equal(panel.getBoundingClientRect().right, 350, 'and its box is back inside the view');
});

test('an ancestor scrolled sideways moves the open panel with the trigger', () => {
  const { window, trigger, panel, move } = wired(
    dropdown({ value: 'Period', variant: 'menu', items: MENU }),
    { left: 260, view: 390 },
  );
  click(window, trigger);
  assert.equal(panel.style.translate, '-118px', '260 + 240 passes 390, less the 8px gap');
  // The scroll changes no style and resizes nothing; only the coordinates move.
  move(10);
  window.dispatchEvent(new window.Event('scroll'));
  assert.equal(panel.style.translate, '', 'the panel fits at x=10 and is let go');
  assert.equal(panel.getBoundingClientRect().left, 10, 'rather than being left at −108');
});

test('a shut panel is fitted again when an ancestor scrolls back', () => {
  const { window, trigger, panel, move } = wired(
    dropdown({ value: 'Period', variant: 'menu', items: MENU }),
    { left: 260, view: 390 },
  );
  click(window, trigger);
  // Scrolled sideways with the panel open, then shut where the trigger now is.
  move(10);
  window.dispatchEvent(new window.Event('scroll'));
  click(window, trigger);
  assert.equal(panel.style.translate, '', 'the panel fits at x=10 and carries nothing');
  /* And the scroll goes back to where it started with nothing open. A shut panel
     is laid out, so its stale box is the page's width: the open sweep alone left
     one at 258…498 of 390 here. */
  move(260);
  window.dispatchEvent(new window.Event('scroll'));
  assert.equal(panel.style.translate, '-118px', 'the shut panel is brought back inside the view');
  assert.equal(panel.getBoundingClientRect().right, 382);
});

test('a sibling text node that grows is followed', async () => {
  const { window, trigger, panel, move } = wired(
    dropdown({ value: 'Period', variant: 'menu', items: MENU }),
    { left: 8, view: 390 },
  );
  const doc = window.document;
  const main = doc.querySelector('main');
  const text = doc.createTextNode('a');
  main.insertBefore(text, main.firstChild);
  click(window, trigger);
  // Flushed, because an open's own mutation is answered one microtask later: a move
  // made before that answer arrives would be measured by it and prove nothing.
  await tick();
  assert.equal(panel.style.translate, '', 'the panel fits at the start of the row');
  /* The text run grows and the row re-lays itself out around it: no child list and
     no attribute changes, and neither box the fit reads changes size. The text
     node's own record is the only one there is. */
  move(234);
  text.data = 'a'.repeat(39);
  await tick();
  assert.equal(panel.style.translate, '-92px', '234 + 240 passes 390, less the 8px gap');
  assert.equal(panel.getBoundingClientRect().right, 382);
});

test('a trigger slid by a transition is fitted where the motion stops', async () => {
  const { window, trigger, panel, move } = wired(
    dropdown({ value: 'Period', variant: 'menu', items: MENU }),
    { left: 8, view: 390 },
  );
  const dd = window.document.querySelector('.ui-dropdown');
  click(window, trigger);
  await tick();
  /* The style write that starts the motion is a mutation, and it is measured in
     the frame it lands — when the trigger has not moved yet. That reading is right
     and it is not the one that goes stale. */
  dd.setAttribute('style', 'transition: transform 200ms linear; transform: translateX(220px)');
  await tick();
  assert.equal(panel.style.translate, '', 'nothing has moved yet');
  // Where the motion leaves it, reported by the end event and by nothing else.
  move(228);
  dd.dispatchEvent(new window.Event('transitionend', { bubbles: true }));
  assert.equal(panel.style.translate, '-86px', '228 + 240 passes 390, less the 8px gap');
});

test('a motion whose end event never comes is answered by a timer', async () => {
  const { window, trigger, panel, move } = wired(
    dropdown({ value: 'Period', variant: 'menu', items: MENU }),
    { left: 8, view: 390 },
  );
  const dd = window.document.querySelector('.ui-dropdown');
  click(window, trigger);
  await tick();
  assert.equal(panel.style.translate, '', 'the panel fits where it opened');
  // A cancelled transition fires no end event, and a trigger carried by one on a
  // box this document never hears from fires nothing either.
  dd.dispatchEvent(new window.Event('transitionstart', { bubbles: true }));
  move(228);
  // DD_SETTLE_MS is 450: past --dur-slow, the longest motion the kit ships.
  await new Promise((done) => setTimeout(done, 560));
  assert.equal(panel.style.translate, '-86px', 'the fallback read the position the motion left');
});

test('the panel is told how wide it may be, in the coordinates its box is in', () => {
  const { panel } = wired(
    dropdown({ value: 'Export', variant: 'menu', items: MENU }),
    { left: 8, view: 390 },
  );
  assert.equal(
    panel.style.getPropertyValue('--ui-dropdown-ceiling'), '374px',
    '390 less the 8px gap at each edge. The sheet reads this property, and reads it '
    + 'from the layout viewport rather than from 100vw, which counts a scrollbar the panel does not.',
  );
  assert.equal(dropdownViewportFit(panel).max, 374, 'and the published fit reports the same number');
});

test('a filter row\'s panel is given neither a shift nor a ceiling', () => {
  const { panel } = wired(
    `<div class="ui-filter-bar"><div class="ui-filter-bar__chip">`
    + dropdown({ value: 'All', variant: 'menu', items: MENU })
    + `</div></div>`,
    { left: -200, view: 320 },
  );
  // Its row bounds it, and #549's gate measures that. Both writes have to stay off
  // it, or this fit and that one are fighting over one panel.
  assert.equal(panel.style.translate, '', 'no shift');
  assert.equal(panel.style.getPropertyValue('--ui-dropdown-ceiling'), '', 'no ceiling');
});

/* -- The browser half ------------------------------------------------------- */
/* The measurement. JSDOM lays nothing out, so a panel's place on the screen is
 * invisible to every other gate here. Off unless DROPDOWN_EDGES=1: Playwright is
 * deliberately not a dependency of this package, CI does not run it, and the
 * result is reported by hand in the pull request.
 *
 *   UI_PLAYWRIGHT=… DROPDOWN_EDGES=1 node --test stories/dropdown-contain.test.js
 */
const RUN = process.env.DROPDOWN_EDGES === '1';

/* Its limits: one engine, Chrome for Testing through whichever Playwright the host
 * supplies; no right-to-left row, the kit claiming no RTL support; not the block
 * axis, which is #255's and is held by src/components/dropdown.test.js; and not a
 * filter row's panels, which stories/filter-bar-fit.test.js measures. */
test('measured in a browser, both layers, four widths and both themes', {
  skip: !RUN && 'set DROPDOWN_EDGES=1',
}, async (t) => {
  const lib = await import('./lib/dropdown-contain.js');
  const {
    THEMES, serve, VANILLA_PAGE, vanillaPass, reactPass, indexed, panels, outside, where,
    TRANSLATE_OFF, PORTAL_MIRROR, playwright,
    vanillaEdgeCases, reactEdgeCases, broken, whereCase,
    CEILING_OFF, WRAP_OFF, NO_MUTATION_OBSERVER, NO_SCROLL_LISTENER, LONG_LABEL,
    NO_CHARACTER_DATA, NO_MOTION_END,
  } = lib;

  const pw = await playwright();
  assert.ok(
    pw,
    'DROPDOWN_EDGES=1 was set and no Playwright could be resolved. Point UI_PLAYWRIGHT at one — '
    + 'scripts/evidence/README.md has the recipe — or leave the variable unset. A browser gate '
    + 'that quietly skipped would report the same green as one that measured.',
  );
  const reactBuild = path.join(root, 'react/storybook-static');
  assert.ok(
    existsSync(path.join(reactBuild, 'index.json')),
    `no Storybook build at ${reactBuild} — run: npm run build-storybook -w react. React's fit is `
    + 'an effect, so it exists only where React is running: without this build the gate would '
    + 'measure one layer and report on two.',
  );

  /* Stable text metrics, so a width measured here is the width measured next time.
     `--deterministic-mode` is NOT among them: under it this host's Chromium
     produces no frames at all, and a React story never commits. */
  const browser = await pw.chromium.launch({
    executablePath: process.env.UI_CHROME,
    args: ['--font-render-hinting=none', '--disable-lcd-text', '--disable-gpu'],
  });
  const vanilla = await serve(root, VANILLA_PAGE);
  // The React half asks for its own iframe.html and never for /__shot; the page
  // argument is the server's, not this half's.
  const react = await serve(reactBuild, VANILLA_PAGE);

  try {
    // The vanilla subjects: every story in the tree, rendered once — the same jsdom
    // sweep the tap-zone gate walks.
    const { subjects, problems } = await lib.storySubjects({ theme: 'dark' });
    assert.deepEqual(
      problems, [],
      'A story that will not render is not skipped here: an unmeasured subject is a failure.',
    );
    /* And the React subjects, discovered the only way a built index can be asked:
       every story in it is opened once, and the ones that put a standalone panel on
       the page join the sweep. A story that will not render is not skipped either:
       discovery decides what the eight passes below measure, so one missed here
       leaves this gate smaller with nothing saying by how much. An earlier answer
       waited on a body class that Storybook sets before the story commits, and
       discovered 18 React subjects one run and 20 the next — the 18 showed up as
       483 cases against a floor of 500, eight passes later. */
    const all = indexed(reactBuild);
    const found = await reactPass(browser, react.port, {
      width: 390, theme: 'dark', ids: all, discovering: true,
    });
    assert.deepEqual(
      found.problems, [],
      'A React story that would not render is not skipped here: an unreached story is an '
      + 'unmeasured subject, and discovery is where this gate decides what it covers.',
    );
    const ids = all.filter((s) => found.rows.some((r) => r.subject === s.label));

    const rows = [];
    /* And the same subjects, measured again at every width and theme: a subject
       discovered and then not measured is named by the pass that lost it, rather
       than counted as a case this gate never had. */
    const lost = [];
    for (const width of WIDTHS) {
      for (const theme of THEMES) {
        const half = [
          await vanillaPass(browser, vanilla.port, { width, theme, subjects }),
          await reactPass(browser, react.port, { width, theme, ids }),
        ];
        for (const pass of half) { rows.push(...pass.rows); lost.push(...pass.problems); }
      }
    }
    assert.deepEqual(
      lost, [],
      `${lost.length} subjects were discovered and then went unmeasured. Each is a story this `
      + 'walk reached once and lost, which is a smaller gate reported as a passing one.',
    );
    const measured = panels(rows);
    const cases = rows.length;
    const seen = new Set(rows.map((r) => `${r.half}:${r.subject}`));

    /* Floors, recorded from what this kit reaches rather than derived from the
       sweep that filled them — a count computed from its own loop can only restate
       itself, and a walk that stopped reaching half the kit would still report
       "all of them". Each is just under what this branch measures, so a story that
       stops rendering a panel fails here instead of passing quietly. */
    const FLOOR_SUBJECTS = 60;   // 44 vanilla stories + 20 React, less a little
    const FLOOR_PAGES = 500;     // 8 passes over both halves
    const FLOOR_PANELS = 1200;
    const FLOOR_OPENED = 560;    // triggers clicked, over every case

    console.log(`subjects: ${seen.size} (${[...seen].filter((x) => x.startsWith('react')).length} react)`);
    console.log(`cases: ${cases} at ${WIDTHS.join(', ')} in ${THEMES.join(' and ')}`);
    console.log(`panels measured: ${measured.length}, of which open: ${measured.filter((p) => p.state === 'open').length}`);

    assert.ok(seen.size >= FLOOR_SUBJECTS, `${seen.size} subjects, floor ${FLOOR_SUBJECTS}`);
    assert.ok(cases >= FLOOR_PAGES, `${cases} cases, floor ${FLOOR_PAGES}`);
    assert.ok(measured.length >= FLOOR_PANELS, `${measured.length} panels, floor ${FLOOR_PANELS}`);
    assert.ok(
      [...seen].some((x) => x.startsWith('react')),
      'no React subject was measured, so the React layer went unmeasured and this gate covers one half',
    );

    await t.test('every panel is inside the view it is laid out in', () => {
      const out = outside(measured);
      assert.deepEqual(
        out.map(where), [],
        `${out.length} of ${measured.length} panels are outside their view.`,
      );
    });

    await t.test('every trigger that was clicked opened a panel', () => {
      const opened = rows.flatMap((r) => r.opens);
      assert.ok(
        opened.length >= FLOOR_OPENED,
        `${opened.length} triggers clicked, floor ${FLOOR_OPENED}. The open half of the rule is `
        + 'measured by opening them, so a walk that stopped clicking would pass on the shut half.',
      );
      const silent = opened.filter((o) => o.opened < 1);
      assert.deepEqual(
        silent.slice(0, 10).map((o) => `“${o.trigger}”`), [],
        `${silent.length} of ${opened.length} triggers opened nothing. An unmeasured open is a `
        + 'failure here: a panel nobody opened is inside the view the way a page with no dropdown '
        + 'on it is.',
      );
    });

    await t.test('the panels add nothing to the page’s scrollable width', () => {
      // Measured with the panels and then without them, because a story may put a
      // wide table or a desktop shell on a phone screen and that overflow is not
      // a panel's. #501 is this number on a shut panel.
      const over = rows.filter((r) => r.flow.added > 1);
      assert.deepEqual(
        over.map((r) => `${r.half} ${r.width}/${r.theme} “${r.subject}” → +${r.flow.added}px`), [],
        `${over.length} of ${cases} pages are made wider by their panels.`,
      );
    });

    await t.test('a panel moved by nothing is rejected', async () => {
      // `translate` is where the in-place fit writes its answer. Refusing it is
      // the placement #572 reported, and it has to be caught in BOTH layers.
      const caught = {};
      for (const half of ['vanilla', 'react']) {
        const pass = half === 'vanilla'
          ? await vanillaPass(browser, vanilla.port, { width: 375, theme: 'dark', subjects, mutation: TRANSLATE_OFF })
          : await reactPass(browser, react.port, { width: 375, theme: 'dark', ids, mutation: TRANSLATE_OFF });
        caught[half] = outside(panels(pass.rows)).length;
        console.log(`translate refused, ${half}: ${caught[half]} panels outside`);
        assert.ok(
          caught[half] > 0,
          `the ${half} half measured ${caught[half]} panels outside the view with the fit's own `
          + 'answer refused. Then this gate would pass with the fix taken out of that half.',
        );
      }
    });

    await t.test('the portal’s unclamped mirror is rejected', async () => {
      // The portalled panel is placed by arithmetic rather than by a rule, so its
      // mutation is the arithmetic: the trigger's own edges, written back after
      // every open, which is what the branch replaced.
      const pass = await vanillaPass(browser, vanilla.port, {
        width: 375, theme: 'dark', subjects, script: PORTAL_MIRROR,
      });
      const out = outside(panels(pass.rows)).filter((p) => p.portal);
      console.log(`portal mirror put back: ${out.length} portalled panels outside`);
      assert.ok(
        out.length > 0,
        'with the unclamped mirror put back, no portalled panel left the view. The portal path is '
        + 'then unmeasured, and a page in the app rail is where this defect was reported.',
      );
    });

    /* -- The moves no size reports ------------------------------------------ */
    /* The sweep above reads a settled page, so five states are invisible to it: a
       row that reorders under an open panel, an ancestor scrolled sideways, a row
       whose own label is longer than the screen, a sibling text node that grows,
       and a trigger slid by a transition. #572's review reproduced each of them
       against an answer that had stopped short of it. Fixtures rather than
       discovered subjects — the sweep owns discovery — but the React half moves a
       SHIPPED story, so renaming it fails this gate rather than shrinking it. */
    /* Found by its id and not by its label: the id is what AGENTS.md asks to keep
       stable, and Storybook derives a label's capitals from the export name. */
    const EDGE_STORY = 'react-dropdown--near-the-screen-edges';
    const edgeStory = all.find((s) => s.id === EDGE_STORY);
    assert.ok(
      edgeStory,
      `no React story with the id ${EDGE_STORY} in the built index. The moved and scrolled cases `
      + 'below are measured against that story, so a rename has to be a failure here rather than '
      + 'three cases quietly going missing.',
    );

    const CASES = 5;        // reorder, ancestor scroll, long label, grown text, motion
    const VANILLA_READINGS = 14;  // 3 reorder + 3 scrolled + 4 long (in place, portalled) + 2 + 2
    const REACT_READINGS = 12;    // the same, less the portal, which React does not have

    await t.test('a panel stays inside the view when its anchor moves or is slid, and when a row is longer than the screen', async () => {
      const got = [
        ...await vanillaEdgeCases(browser, vanilla.port, { width: 390, theme: 'light' }),
        ...await reactEdgeCases(browser, react.port, { story: edgeStory.id, width: 390, theme: 'light' }),
      ];
      console.log(`moves and long content: ${got.length} readings\n${got.map(whereCase).join('\n')}`);
      // Counted, so a probe that stopped reaching the page fails instead of
      // reporting an empty pass. why: AGENTS.md
      const want = VANILLA_READINGS + REACT_READINGS;
      assert.equal(got.length, want, `${got.length} readings, expected ${want}`);
      assert.equal(new Set(got.map((r) => r.case)).size, CASES, `${CASES} cases per half`);
      assert.deepEqual(
        broken(got).map(whereCase), [],
        'a panel left its view, passed the width bound its sheet declares, or widened the page.',
      );
      /* The long-content case has to BE long content, or it proves nothing. The two
         placements answer differently and both answers are right: an in-place panel
         is shrink-to-fit against the room beside its own offsets, so breaking the
         token anywhere takes it to the 240px floor; a portalled one has the whole
         view for that room, so the bound is what stops it. */
      const long = got.filter((r) => r.case === 'a label longer than the screen');
      assert.ok(long.length >= 6, `${long.length} long-label readings, expected at least 6`);
      for (const r of long) {
        assert.ok(
          r.portal ? r.width > 240 : r.width === 240,
          `${whereCase(r)} — a ${r.portal ? 'portalled' : 'in-place'} panel carrying `
          + `${LONG_LABEL} is meant to settle at ${r.portal ? 'the bound' : 'its 240px floor'}. `
          + 'A different number means the fixture is not measuring that row at all.',
        );
      }
    });

    await t.test('each case is refused when the declaration that catches it is taken away', async () => {
      /* One refusal per mechanism, not per case: the mutation observer reports the
         reorder, the scroll listener the scroll, the text-change observation the
         grown text run and the end events the slide, while the long row needs two,
         because its two placements are bounded by different halves of the rule and
         removing either leaves the other standing. A single mutation would leave
         three of the four unproven, which is how the width bound came to be dropped
         from this branch's first answer on the grounds that it caught nothing. */
      const refusals = [
        ['the mutation observer', 'a row that reorders', { script: NO_MUTATION_OBSERVER }],
        ['the scroll listener', 'an ancestor scrolled sideways', { script: NO_SCROLL_LISTENER }],
        ['the text-change observation', 'a sibling text node that grows', { script: NO_CHARACTER_DATA }],
        /* Both halves of the settle at once, which is what it takes: the end events
           refused, and the motion given longer than the fallback timer waits. Each
           on its own is still answered by the other, which is the point of having
           two. Its limit: the reading that goes outside is the vanilla one. In a
           Storybook iframe something else mutates inside the 1.2s this arm leaves
           the React panel stale, and that mutation refits it, so this arm proves
           the mechanism end to end in one layer. React's own half is held by
           react/src/Dropdown.test.tsx, where the end event, the timer and the
           cleanup each fail without it. */
        ['the motion end events', 'a trigger slid by a transition', { script: NO_MOTION_END, motionMs: 1200 }],
        ['the long-token wrap', 'a label longer than the screen', { mutation: WRAP_OFF }],
        ['the width bound', 'a label longer than the screen', { mutation: CEILING_OFF }],
      ];
      for (const [what, which, how] of refusals) {
        const got = [
          ...await vanillaEdgeCases(browser, vanilla.port, { width: 390, theme: 'light', ...how }),
          ...await reactEdgeCases(browser, react.port, { story: edgeStory.id, width: 390, theme: 'light', ...how }),
        ];
        const out = broken(got).filter((r) => r.case === which);
        console.log(`${what} taken away: ${out.length} readings outside — ${out.map(whereCase).join('; ') || 'none'}`);
        assert.ok(
          out.length > 0,
          `with ${what} taken away, “${which}” stayed inside the view in both layers. Then this `
          + 'gate would pass with that half of the fix removed, which is the state the review '
          + 'measured.',
        );
      }
    });
  } finally {
    await browser.close();
    vanilla.proc.kill();
    react.proc.kill();
  }
});
