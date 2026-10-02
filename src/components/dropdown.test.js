// The dropdown panel's placement: which way it opens, and where it is mounted.
//
// Two reports, one cause — the panel was positioned as though it always opened
// downward inside its trigger's containing block. #255 is the direction half,
// #252 the containing-block half. Both halves are geometry, and JSDOM has no
// layout, so the tests split accordingly: the stylesheet is read as text where
// the defect is a declaration, and the wiring's arithmetic is fed measurements
// by hand where the defect is a number.
//
// why: docs/specification.md#the-dropdown-panel

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM, VirtualConsole } from 'jsdom';
import { dropdown, wireDropdown } from './dropdown.js';

const quiet = new VirtualConsole();
quiet.on('jsdomError', () => {});

const CSS = readFileSync(new URL('../styles/dropdown.css', import.meta.url), 'utf8');
const JS = readFileSync(new URL('./dropdown.js', import.meta.url), 'utf8');

/** Every leaf rule in a sheet as { selector, body }, comments stripped. */
function rules(css) {
  const out = [];
  const open = [];
  let buf = '';
  for (const ch of css.replace(/\/\*[\s\S]*?\*\//g, '')) {
    if (ch === '{') { open.push(buf.trim()); buf = ''; } else if (ch === '}') {
      const selector = open.pop() ?? '';
      if (buf.trim()) out.push({ selector, body: buf.trim() });
      buf = '';
    } else buf += ch;
  }
  return out;
}

const RULES = rules(CSS);
const decl = (rule, prop) => {
  const m = [...rule.body.matchAll(new RegExp(`(?:^|;)\\s*${prop}\\s*:([^;]*)`, 'g'))];
  return m.length ? m[m.length - 1][1].trim() : null;
};

// ---- The stylesheet ------------------------------------------------------
// The subjects are discovered from the sheet, so a second upward variant joins
// the sweep by being written.
// Discover subjects from source and check the coverage count.

test('a panel rule that pins `bottom` releases `top` in the same rule', () => {
  const subjects = RULES.filter((r) => /\.ui-dropdown__panel/.test(r.selector) && decl(r, 'bottom'));
  assert.ok(subjects.length, 'the sheet has no upward panel rule to check');
  for (const rule of subjects) {
    assert.equal(
      decl(rule, 'top'), 'auto',
      `${rule.selector} sets bottom without releasing top — an absolutely positioned box with `
      + 'both edges pinned is stretched between them, which is the fourteen-pixel panel in #255',
    );
  }
});

test('both directions read one gap, so neither can drift from the other', () => {
  const panel = RULES.find((r) => r.selector.split(',').some((s) => s.trim() === '.ui-dropdown__panel'));
  const gap = decl(panel, '--ui-dropdown-gap');
  assert.match(gap, /^\d+(\.\d+)?px$/, '--ui-dropdown-gap is declared on the panel as a length');

  const offsets = RULES
    .filter((r) => /\.ui-dropdown__panel/.test(r.selector))
    .flatMap((r) => [decl(r, 'top'), decl(r, 'bottom')])
    .filter((v) => v && v !== 'auto');
  assert.ok(offsets.length >= 2, 'a downward offset and an upward one');
  for (const value of offsets) {
    assert.match(
      value, /var\(--ui-dropdown-gap\)/,
      `${value} writes its own offset instead of reading --ui-dropdown-gap`,
    );
  }
});

/** A shorthand's top-level terms, so `calc(var(--x) * -1)` counts as one. */
function terms(value) {
  const out = [];
  let depth = 0;
  let buf = '';
  for (const ch of value) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (/\s/.test(ch) && depth === 0) { if (buf) out.push(buf); buf = ''; } else buf += ch;
  }
  if (buf) out.push(buf);
  return out;
}

/** Every margin the sheet writes, whichever axis it names. */
const MARGINS = RULES.flatMap((r) =>
  [...r.body.matchAll(/(?:^|;)\s*(margin(?:-[\w-]+)?)\s*:([^;]*)/g)]
    .map((m) => ({ selector: r.selector, prop: m[1], value: m[2].trim().replace(/\s+/g, ' ') })));

// A negative LENGTH, which is what a bleed is written with. The `-1` inside
// `calc(… * -1)` carries no unit and is a multiplier, not a length.
const NEG_LEN = /-\s*\d+(?:\.\d+)?(?:px|rem|em|%|ch)/;
const BLEED = 'calc(var(--ui-dropdown-pad) * -1)';

test('the panel names its padding and pads itself with it', () => {
  const panel = RULES.find((r) => r.selector.split(',').some((s) => s.trim() === '.ui-dropdown__panel'));
  const pad = decl(panel, '--ui-dropdown-pad');
  assert.match(pad, /^\d+(\.\d+)?px$/, '--ui-dropdown-pad is declared on the panel as a length');
  assert.equal(
    decl(panel, 'padding'), 'var(--ui-dropdown-pad)',
    'the panel pads itself with the property it declares, so the two cannot disagree',
  );
});

test('a block bleeding through the panel reads the padding, never a number of its own', () => {
  // Discovered from the sheet: any margin that pulls a block back out through
  // the padding is a subject, whether it is the head, the foot or the next one.
  // Discover subjects from source and check the coverage count.
  const bleeds = MARGINS.filter((d) => NEG_LEN.test(d.value) || d.value.includes('--ui-dropdown-pad'));
  assert.ok(
    bleeds.length >= 2,
    'the head and the foot both bleed, so the sweep finds at least two — it found '
    + `${bleeds.length}, which means a block stopped bleeding or stopped being seen`,
  );
  for (const d of bleeds) {
    assert.doesNotMatch(
      d.value, NEG_LEN,
      `${d.selector} { ${d.prop}: ${d.value} } writes the panel's padding out as a number. That is `
      + `the magic number #306 is about: a consumer copying it out of this file has nothing to read `
      + `when it changes. Pull back with ${BLEED}.`,
    );
    assert.ok(
      d.value.includes(BLEED),
      `${d.selector} { ${d.prop}: ${d.value} } pulls through the padding without reading `
      + '--ui-dropdown-pad',
    );
  }
});

// The caret is an L of two borders on a rotated square, so the ink is not the
// box and centring the box leaves the mark off centre — measured in Chrome at
// dSF 8: 1.75px low closed, 3.88px high open, against the trigger's middle.
// Both halves of the fix are read here, because either one alone leaves it wrong.
// why: docs/specification.md#the-dropdown-panel
test('the caret is centred in both states, and shifted in page space', () => {
  const closed = RULES.find((r) => r.selector.split(',').some((s) => s.trim() === '.ui-dropdown__chevron'));
  const open = RULES.find((r) => r.selector.split(',').some((s) => s.trim() === '.ui-dropdown.open .ui-dropdown__chevron'));
  assert.ok(closed && open, 'the sheet draws a caret and flips it');

  const off = decl(closed, '--caret-off');
  assert.ok(
    off && off.includes('var(--caret)') && off.includes('var(--caret-ink)'),
    `--caret-off is derived from the square and its stroke, not typed: ${off}`,
  );

  const shift = (rule) => terms(decl(rule, 'transform'));
  for (const [state, rule] of [['closed', closed], ['open', open]]) {
    const [first, second] = shift(rule);
    assert.match(
      first, /^translateY\(/,
      `the ${state} caret rotates before it shifts (${first}), so the shift travels along the `
      + 'turned axis and moves the mark sideways as well — which is what the hand-tuned numbers '
      + 'this replaces were doing',
    );
    assert.match(second, /^rotate\(/, `the ${state} caret turns`);
    assert.ok(
      first.includes('var(--caret-off)'),
      `the ${state} caret shifts by something other than --caret-off: ${first}`,
    );
  }
  // Opposite ways: the mark points down in one state and up in the other, so the
  // ink sits on opposite sides of the box and the correction flips with it.
  const negated = (t) => /\*\s*-1|-\s*var\(--caret-off\)|calc\(\s*-/.test(t);
  assert.notEqual(
    negated(shift(closed)[0]), negated(shift(open)[0]),
    'both states shift the caret the same way, so one of them is now further off centre than it '
    + 'was before the correction',
  );
});

test('the head and the foot are one pair, bleeding to opposite edges', () => {
  const sel = (cls) => `.ui-dropdown__panel > .${cls}`;
  const rulesFor = (cls) => RULES.filter((r) => r.selector.split(',').some((s) => s.trim() === sel(cls)));
  // Whatever the cascade ends on, gathered across every rule that names the
  // block — so splitting one rule in two, or adding a third, is still read.
  const of = (cls, prop) => rulesFor(cls).map((r) => decl(r, prop)).filter((v) => v != null).at(-1) ?? null;

  const shared = RULES.find((r) => {
    const list = r.selector.split(',').map((s) => s.trim());
    return list.includes(sel('ui-dropdown__head')) && list.includes(sel('ui-dropdown__foot'));
  });
  assert.ok(shared && decl(shared, 'padding'), 'the pair takes its inner padding from one rule, not two that can drift');
  assert.ok(rulesFor('ui-dropdown__head').length && rulesFor('ui-dropdown__foot').length,
    'the panel styles both a head and a foot');

  const hm = terms(of('ui-dropdown__head', 'margin'));
  const fm = terms(of('ui-dropdown__foot', 'margin'));
  assert.deepEqual(hm.slice(0, 2), [BLEED, BLEED], 'the head bleeds to the top edge and both sides');
  assert.deepEqual(fm.slice(1), [BLEED, BLEED], 'the foot bleeds to both sides and the bottom edge');
  assert.equal(hm[2], fm[0], 'the head and the foot leave the same gap to the rows between them');

  assert.equal(of('ui-dropdown__head', 'border-bottom'), of('ui-dropdown__foot', 'border-top'),
    'one line, drawn on the edge each faces');
  assert.equal(of('ui-dropdown__head', 'border-top'), null, 'the head draws no line on the panel\'s own edge');
  assert.equal(of('ui-dropdown__foot', 'border-bottom'), null, 'the foot draws no line on the panel\'s own edge');

  const hr = terms(of('ui-dropdown__head', 'border-radius'));
  const fr = terms(of('ui-dropdown__foot', 'border-radius'));
  assert.deepEqual(hr.slice(2), ['0', '0'], 'the head rounds the two corners it sits in and no others');
  assert.deepEqual(fr.slice(0, 2), ['0', '0'], 'the foot rounds the two corners it sits in and no others');
  assert.deepEqual([hr[0], hr[1]], [fr[2], fr[3]], 'both take the panel\'s own radius');
});

test('the wiring falls back to the number the sheet declares', () => {
  const panel = RULES.find((r) => r.selector.split(',').some((s) => s.trim() === '.ui-dropdown__panel'));
  const css = parseFloat(decl(panel, '--ui-dropdown-gap'));
  const js = parseFloat(/const DD_GAP = ([\d.]+)/.exec(JS)?.[1]);
  assert.equal(js, css, 'DD_GAP in dropdown.js is the fallback for a document without the sheet');
});

test('the portalled panel takes its open state from itself, not from an ancestor', () => {
  const opens = RULES.filter((r) => decl(r, 'visibility') === 'visible' && /ui-dropdown__panel/.test(r.selector));
  const portal = opens.filter((r) => /--portal/.test(r.selector));
  assert.ok(portal.length, 'no rule opens a portalled panel');
  for (const rule of portal) {
    assert.doesNotMatch(
      rule.selector, /\.ui-dropdown[\s.]*\.open\s/,
      `${rule.selector} needs a .ui-dropdown ancestor, which stops matching the moment the panel `
      + 'is moved onto <body>',
    );
  }
});

test('the portalled panel is fixed, and starts from no edge of its own', () => {
  const rule = RULES.find((r) => r.selector.trim() === '.ui-dropdown__panel--portal');
  assert.equal(decl(rule, 'position'), 'fixed');
  for (const edge of ['top', 'right', 'bottom', 'left']) {
    assert.equal(decl(rule, edge), 'auto', `${edge} is left for the wiring to write inline`);
  }
});

// ---- The markup ----------------------------------------------------------

test('the default renders exactly what it rendered before the variants existed', () => {
  const html = dropdown({ value: 'Actions', variant: 'menu', items: [{ label: 'Edit' }] });
  assert.doesNotMatch(html, /is-up/);
  assert.doesNotMatch(html, /--portal/);
  assert.doesNotMatch(html, /data-dropdown-direction/);
  assert.doesNotMatch(html, /data-dropdown-portal/);
  assert.match(html, /class="ui-dropdown__panel"/);
});

test('no foot is drawn unless one was asked for, and none is invented', () => {
  const html = dropdown({ value: 'Actions', variant: 'menu', items: [{ label: 'Edit' }] });
  assert.doesNotMatch(html, /ui-dropdown__foot/);
  // The head is markup a page writes, so the factory never emits its class either.
  assert.doesNotMatch(html, /ui-dropdown__head/);
});

test('a foot is drawn at the panel\'s bottom edge, below the rows', () => {
  const html = dropdown({
    value: 'Filters', variant: 'menu', items: [{ label: 'Unpaid' }],
    foot: '<button class="ui-btn ui-btn--sm">Save</button>',
  });
  assert.match(html, /<div class="ui-dropdown__foot"><button class="ui-btn ui-btn--sm">Save<\/button><\/div>/);
  assert.ok(
    html.indexOf('ui-dropdown__foot') > html.indexOf('ui-dropdown__item'),
    'the foot comes after the rows',
  );
});

// The head is the page's own markup through the unwrapped `header` slot — the
// shape `railUser()` in src/components/shell.js has always written — and the
// foot is the one block the factory draws. Both still bleed, so the order in
// the panel has to hold across the two ways in.
// why: docs/specification.md#the-dropdown-panel
test('a head written by hand and a foot drawn by the factory keep their order', () => {
  const html = dropdown({
    value: 'Filters', variant: 'menu', items: [{ label: 'Unpaid' }],
    header: '<div class="ui-dropdown__head"><b>Filter payouts</b></div>',
    foot: '<button class="ui-btn ui-btn--sm">Save</button>',
  });
  const order = ['ui-dropdown__head', 'ui-dropdown__item', 'ui-dropdown__foot'].map((c) => html.indexOf(c));
  assert.ok(order.every((i) => i >= 0), 'all three are drawn');
  assert.deepEqual([...order].sort((a, b) => a - b), order, 'head, then rows, then foot');
});

test('the foot sits outside the unwrapped footer, against the edge it bleeds to', () => {
  const html = dropdown({
    value: 'Filters', variant: 'menu', items: [{ label: 'Unpaid' }],
    foot: '<b>Foot</b>', footer: '<div class="zz-footer"></div>',
  });
  const order = ['ui-dropdown__item', 'zz-footer', 'ui-dropdown__foot'].map((c) => html.indexOf(c));
  assert.ok(order.every((i) => i >= 0), 'all three are drawn');
  assert.deepEqual([...order].sort((a, b) => a - b), order,
    'the bleeding block is the one touching the panel edge; an unwrapped slot sits inside it');
});

test('direction: up is the panel\'s own class — no wiring needed', () => {
  const html = dropdown({ value: 'Account', variant: 'menu', direction: 'up', items: [{ label: 'Sign out' }] });
  assert.match(html, /class="ui-dropdown__panel is-up"/);
  assert.doesNotMatch(html, /data-dropdown-direction/);
});

test('direction: auto is the container\'s attribute — the wiring decides on open', () => {
  const html = dropdown({ value: 'Account', variant: 'menu', direction: 'auto', items: [{ label: 'Sign out' }] });
  assert.match(html, /data-dropdown-direction="auto"/);
  assert.doesNotMatch(html, /is-up/);
});

test('portal marks both halves, and an already-open one carries its own state', () => {
  const closed = dropdown({ value: 'Workspace', variant: 'menu', portal: true, items: [{ label: 'Phoenix' }] });
  assert.match(closed, /data-dropdown-portal/);
  assert.match(closed, /ui-dropdown__panel--portal/);
  assert.doesNotMatch(closed, /is-open/);

  const open = dropdown({ value: 'Workspace', variant: 'menu', portal: true, open: true, items: [{ label: 'Phoenix' }] });
  assert.match(open, /ui-dropdown__panel--portal is-open/);
});

// ---- The wiring ----------------------------------------------------------
// JSDOM lays nothing out, so every rect below is supplied. The arithmetic under
// test is the wiring's, not the browser's.

const VIEW = { w: 1280, h: 800 };

function mount(html) {
  const dom = new JSDOM(`<!doctype html><html><body><main id="page">${html}</main></body></html>`, {
    pretendToBeVisual: true, virtualConsole: quiet,
  });
  const { window } = dom;
  for (const key of ['window', 'document', 'HTMLElement', 'Element', 'Node', 'getComputedStyle']) {
    Object.defineProperty(globalThis, key, { value: window[key] ?? window, configurable: true, writable: true });
  }
  Object.defineProperty(window, 'innerHeight', { value: VIEW.h, configurable: true });
  Object.defineProperty(window, 'innerWidth', { value: VIEW.w, configurable: true });
  return window;
}

/** Give the trigger a box and the panel a height, the way a browser would. */
function measure(window, { triggerTop, triggerLeft = 40, panelHeight = 130 }) {
  const doc = window.document;
  const trigger = doc.querySelector('[data-dropdown-trigger]');
  const panel = doc.querySelector('[data-dropdown-panel]');
  trigger.getBoundingClientRect = () => ({
    top: triggerTop, bottom: triggerTop + 31, left: triggerLeft, right: triggerLeft + 160,
    width: 160, height: 31, x: triggerLeft, y: triggerTop,
  });
  Object.defineProperty(panel, 'offsetHeight', { value: panelHeight, configurable: true });
  return { trigger, panel };
}

const click = (window, el) =>
  el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
const press = (window, el, key) =>
  el.dispatchEvent(new window.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));

const MENU = [{ label: 'Settings' }, { label: 'Billing' }, { label: 'Sign out' }];

test('a portalled panel is moved onto <body>, out of every ancestor', () => {
  const window = mount(dropdown({ value: 'Workspace', variant: 'menu', portal: true, items: MENU }));
  const doc = window.document;
  measure(window, { triggerTop: 20 });
  wireDropdown(doc);

  const panel = doc.querySelector('[data-dropdown-panel]');
  assert.equal(panel.parentElement, doc.body, 'the panel is a child of <body>');
  assert.equal(doc.getElementById('page').querySelector('[data-dropdown-panel]'), null);
});

test('opening a portalled panel writes its open state onto the panel itself', () => {
  const window = mount(dropdown({ value: 'Workspace', variant: 'menu', portal: true, items: MENU }));
  const doc = window.document;
  measure(window, { triggerTop: 20 });
  wireDropdown(doc);
  const { trigger, panel } = { trigger: doc.querySelector('[data-dropdown-trigger]'), panel: doc.querySelector('[data-dropdown-panel]') };

  click(window, trigger);
  assert.ok(panel.classList.contains('is-open'), 'the panel carries its own open class');
  assert.equal(trigger.getAttribute('aria-expanded'), 'true');

  click(window, trigger);
  assert.equal(panel.classList.contains('is-open'), false);
  assert.equal(trigger.getAttribute('aria-expanded'), 'false');
});

test('a portalled panel is placed against the trigger, one gap away, in both directions', () => {
  const down = mount(dropdown({ value: 'Workspace', variant: 'menu', portal: true, items: MENU }));
  measure(down, { triggerTop: 20, triggerLeft: 40 });
  wireDropdown(down.document);
  click(down, down.document.querySelector('[data-dropdown-trigger]'));
  const dp = down.document.querySelector('[data-dropdown-panel]').style;
  assert.equal(dp.top, '60px', 'trigger bottom 51 + the 9px gap');
  assert.equal(dp.bottom, 'auto');
  assert.equal(dp.left, '40px');

  const up = mount(dropdown({ value: 'Workspace', variant: 'menu', portal: true, direction: 'up', items: MENU }));
  measure(up, { triggerTop: 700, triggerLeft: 40 });
  wireDropdown(up.document);
  click(up, up.document.querySelector('[data-dropdown-trigger]'));
  const upStyle = up.document.querySelector('[data-dropdown-panel]').style;
  assert.equal(upStyle.top, 'auto', 'the top is released, which is the whole of #255');
  assert.equal(upStyle.bottom, '109px', 'viewport 800 - trigger top 700 + the 9px gap');

  // The distance from the trigger is the same number whichever way it opened.
  const gapDown = parseFloat(dp.top) - 51;
  const gapUp = (VIEW.h - parseFloat(upStyle.bottom)) * -1 + 700;
  assert.equal(gapDown, gapUp);
});

test('an end-aligned portalled panel hangs off the trigger\'s right edge', () => {
  const window = mount(dropdown({ value: 'Workspace', variant: 'menu', portal: true, align: 'end', items: MENU }));
  measure(window, { triggerTop: 20, triggerLeft: 900 });
  wireDropdown(window.document);
  click(window, window.document.querySelector('[data-dropdown-trigger]'));
  const s = window.document.querySelector('[data-dropdown-panel]').style;
  assert.equal(s.right, '220px', 'viewport 1280 - trigger right 1060');
  assert.equal(s.left, 'auto');
});

test('direction: auto flips up only when below is tight and above is roomier', () => {
  const low = mount(dropdown({ value: 'Account', variant: 'menu', direction: 'auto', items: MENU }));
  const { panel: lowPanel, trigger: lowTrigger } = measure(low, { triggerTop: 700, panelHeight: 130 });
  wireDropdown(low.document);
  click(low, lowTrigger);
  assert.ok(lowPanel.classList.contains('is-up'), '69px below, 130 + 9 needed, 700 above');

  const high = mount(dropdown({ value: 'Account', variant: 'menu', direction: 'auto', items: MENU }));
  const { panel: highPanel, trigger: highTrigger } = measure(high, { triggerTop: 40, panelHeight: 130 });
  wireDropdown(high.document);
  click(high, highTrigger);
  assert.equal(highPanel.classList.contains('is-up'), false, '729px below is room enough');
});

test('a panel that fits nowhere still opens the way its author said', () => {
  const window = mount(dropdown({ value: 'Account', variant: 'menu', direction: 'auto', items: MENU }));
  const { panel, trigger } = measure(window, { triggerTop: 30, panelHeight: 900 });
  wireDropdown(window.document);
  click(window, trigger);
  assert.equal(panel.classList.contains('is-up'), false, '30px above is worse than 739 below');
});

test('the keyboard still reaches a portalled panel\'s items', () => {
  const window = mount(dropdown({ value: 'Workspace', variant: 'menu', portal: true, items: MENU }));
  const doc = window.document;
  measure(window, { triggerTop: 20 });
  wireDropdown(doc);
  const trigger = doc.querySelector('[data-dropdown-trigger]');

  press(window, trigger, 'ArrowDown');
  const items = doc.querySelectorAll('[data-dd-item]');
  assert.equal(doc.activeElement, items[0], 'ArrowDown on the trigger opens and lands on the first row');

  press(window, items[0], 'ArrowDown');
  assert.equal(doc.activeElement, items[1], 'a keystroke on a row still moves the focus');

  press(window, items[1], 'End');
  assert.equal(doc.activeElement, items[2]);

  press(window, items[2], 'Escape');
  assert.equal(doc.querySelector('[data-dropdown]').classList.contains('open'), false);
  assert.equal(doc.activeElement, trigger, 'focus comes back to the trigger');
});

test('picking a row in a portalled panel still writes back into the trigger', () => {
  const window = mount(dropdown({
    label: 'workspace:', variant: 'select', portal: true,
    items: [{ label: 'Phoenix', value: 'p', selected: true }, { label: 'Aurora', value: 'a' }],
  }));
  const doc = window.document;
  measure(window, { triggerTop: 20 });
  wireDropdown(doc);
  const trigger = doc.querySelector('[data-dropdown-trigger]');

  click(window, trigger);
  const rows = doc.querySelectorAll('[data-dd-item]');
  click(window, rows[1]);

  assert.equal(trigger.querySelector('.ui-dropdown__value').textContent, 'Aurora');
  assert.equal(rows[1].getAttribute('aria-selected'), 'true');
  assert.equal(rows[0].getAttribute('aria-selected'), 'false');
  assert.equal(rows[0].classList.contains('is-selected'), false);
});

test('a portalled panel whose container is gone is swept, not left on <body>', () => {
  const window = mount(dropdown({ value: 'Workspace', variant: 'menu', portal: true, items: MENU }));
  const doc = window.document;
  measure(window, { triggerTop: 20 });
  wireDropdown(doc);
  assert.equal(doc.querySelectorAll('body > [data-dropdown-panel]').length, 1);

  // What a re-render does: replace the container, wire the new one.
  doc.getElementById('page').innerHTML = dropdown({ value: 'Workspace', variant: 'menu', portal: true, items: MENU });
  measure(window, { triggerTop: 20 });
  wireDropdown(doc);
  assert.equal(
    doc.querySelectorAll('body > [data-dropdown-panel]').length, 1,
    'the panel the replaced container owned is gone rather than stacked up',
  );
});

test('a portalled panel rendered open is adopted already open', () => {
  const window = mount(dropdown({ value: 'Workspace', variant: 'menu', portal: true, open: true, items: MENU }));
  const doc = window.document;
  measure(window, { triggerTop: 20 });
  wireDropdown(doc);
  const panel = doc.querySelector('[data-dropdown-panel]');
  assert.equal(panel.parentElement, doc.body);
  assert.ok(panel.classList.contains('is-open'));
  assert.equal(panel.style.top, '60px', 'and it was placed, not left at the top of the page');
});

test('neutral badges distinguish named states from metadata without changing supplied signal tones', () => {
  const cases = [
    ['Off', 'state'], ['UNSET', 'state'], ['Disabled', 'state'], ['Archive', 'state'], ['Archived', 'state'],
    ['12 records', 'neutral'], ['Archive guide', 'neutral'], ['Live', 'live'],
    [{ text: 'Off', tone: 'accent' }, 'accent'],
    [{ text: 'Off', tone: 'neutral' }, 'neutral'], [{ text: 'Archivado', tone: 'state' }, 'state'],
  ];
  const doc = JSDOM.fragment(dropdown({ items: cases.map(([badge], i) => ({ label: `Option ${i}`, badge })) }));
  assert.deepEqual([...doc.querySelectorAll('.ui-dropdown__badge')].map(el => el.className),
    cases.map(([, tone]) => `ui-dropdown__badge is-${tone}`));
});

// ---- A filter chip's menu ------------------------------------------------
// The arithmetic is filter-panel-fit.test.js's subject; these cover the wiring
// around it — which numbers reach the panel, when they are written again, and
// what is cleared on the way out.
//
// LIMITS: JSDOM lays nothing out, so the row and the dropdown are given rects
// and the panel is given the width a browser would have bounded it to. That a
// rendered menu obeys the properties is measured by
// scripts/evidence/filter-bar-fit.mjs, not here. Left-to-right rows only.

const SECTORS = [{ label: 'All', value: 'All' }, { label: 'Consumer Discretionary', value: 'cons' }];
const PANEL_PROPS = ['room', 'shift', 'floor'];

/** One chip in a filter row, wired, with the two rects filterPanelFit() reads
 *  and the width the stylesheet would have left the panel at. `resize()` moves
 *  the row the way a rotation does: new numbers, then the event. */
function chipRow({ rowWidth = 1200, left = 146, search = false, panelWidth = 240,
  observer = false } = {}) {
  const window = mount(
    '<fieldset class="ui-filter-bar" data-filter-bar>'
    + '<legend class="ui-filter-bar__legend">Filters</legend>'
    + '<fieldset class="ui-filter-bar__chip" data-filter-id="sector">'
    + dropdown({ label: 'Sector', value: 'All', variant: 'select', search, items: SECTORS })
    + '</fieldset></fieldset>',
  );
  const doc = window.document;
  const bar = doc.querySelector('.ui-filter-bar');
  const dd = doc.querySelector('.ui-dropdown');
  const panel = doc.querySelector('[data-dropdown-panel]');
  const at = { rowWidth, left, panelWidth };
  bar.getBoundingClientRect = () => ({ left: 0, right: at.rowWidth, width: at.rowWidth });
  dd.getBoundingClientRect = () => ({ left: at.left, right: at.left + 60, width: 60 });
  Object.defineProperty(panel, 'offsetWidth', { get: () => at.panelWidth, configurable: true });
  /* JSDOM has no ResizeObserver, which is the fallback path the `resize` cases
   * below take. `observer: true` installs one that reports on demand, so the path
   * a browser actually takes can be driven: observe() hands back the current box
   * at once, as the real one does, and settleRow() is the row changing after the
   * event — the rail finishing its 250ms. */
  const observers = [];
  if (observer) {
    window.ResizeObserver = class {
      constructor(cb) { this.cb = cb; this.targets = []; observers.push(this); }
      observe(target) { this.targets.push(target); this.cb([{ target }], this); }
      disconnect() { this.targets.length = 0; }
    };
  }
  wireDropdown(doc);
  return {
    window, dd, panel, bar, observers,
    trigger: doc.querySelector('[data-dropdown-trigger]'),
    fit: () => PANEL_PROPS.map((p) => panel.style.getPropertyValue(`--ui-filter-panel-${p}`)),
    resize: (next) => {
      Object.assign(at, next);
      window.dispatchEvent(new window.Event('resize'));
    },
    /** The row's own box changing, which is what a ResizeObserver reports. */
    settleRow: (next) => {
      Object.assign(at, next);
      for (const ro of observers) for (const target of ro.targets) ro.cb([{ target }], ro);
    },
    /** The panel's fade reaching its end. */
    endFade: () => {
      const e = new window.Event('transitionend');
      e.propertyName = 'opacity';
      panel.dispatchEvent(e);
    },
  };
}

test('an open chip menu carries every number the stylesheet reads', () => {
  // All three, not two: min-width reads the floor and max-width the room, so a
  // half-written fit leaves the published `floor` argument unable to change a
  // rendered width. why: src/styles/filter-bar.css
  const row = chipRow();
  click(row.window, row.trigger);
  assert.deepEqual(row.fit(), ['1054px', '0px', '240px']);
});

test('a viewport change re-measures a menu that is still open', () => {
  // Opened in a 1200px row and left open in a 358px one: the room it was fitted
  // to is gone, and a menu holding that number stands off the page.
  const row = chipRow();
  click(row.window, row.trigger);
  assert.deepEqual(row.fit(), ['1054px', '0px', '240px']);
  row.resize({ rowWidth: 358 });
  assert.deepEqual(row.fit(), ['240px', '28px', '240px']);
});

test('a shut menu is left alone when the viewport changes', () => {
  // Shut, the panel keeps the trigger's width from the stylesheet alone — #467
  // holds with no measuring at all, and a resize must not start measuring.
  const row = chipRow();
  row.resize({ rowWidth: 358 });
  assert.deepEqual(row.fit(), ['', '', '']);
});

test('a searchable chip gives its pinned width back when its fade ends', () => {
  /* ddResetSearch() pins the open width inline so the list does not narrow as a
   * query hides rows, and inline beats the sheet that holds a shut panel to its
   * trigger. Left behind, that is #467 at the menu floor's width.
   *
   * Given back at the END of the fade, not in the frame the menu closes: the pin
   * is part of the open geometry, and the panel is still being painted. */
  const row = chipRow({ search: true });
  click(row.window, row.trigger);
  assert.equal(row.panel.style.minWidth, '240px');
  click(row.window, row.trigger);
  assert.equal(row.dd.classList.contains('open'), false);
  assert.equal(row.panel.style.minWidth, '240px', 'the pin is held while the panel still paints');
  row.endFade();
  assert.equal(row.panel.style.minWidth, '', 'and goes when the fade is over');
});

test('a searchable chip reads its pin again at the new width', () => {
  // The pin was read in the old row, so re-fitting the properties alone leaves a
  // menu inline-pinned wider than the row it is now in.
  const row = chipRow({ search: true });
  click(row.window, row.trigger);
  assert.equal(row.panel.style.minWidth, '240px');
  row.resize({ rowWidth: 200, panelWidth: 200 });
  assert.deepEqual(row.fit(), ['200px', '146px', '200px']);
  assert.equal(row.panel.style.minWidth, '200px');
});

test('the row an open menu is fitted to is the box that is watched', () => {
  /* Not the viewport. `resize` fires before a row whose width is animating has
   * settled — the shell's rail transitions over --dur-med — so the handler read a
   * row 70px narrower than it ends up and the menu kept that number. The row's own
   * box is what the fit is measured from, so that is what is observed. */
  const row = chipRow({ observer: true });
  click(row.window, row.trigger);
  assert.equal(row.observers.length, 1, 'one observer per open menu');
  assert.deepEqual(row.observers[0].targets, [row.bar], 'the row, not the chip and not the view');
});

test('a row that settles after the event is measured again', () => {
  // The screener: opened at 1280, narrowed, and the rail still widening the column
  // under the menu. The first report is the transient row, the next is the one it
  // settles at, and the menu has to end up at the second.
  const row = chipRow({ observer: true });
  click(row.window, row.trigger);
  assert.deepEqual(row.fit(), ['1054px', '0px', '240px']);
  row.settleRow({ rowWidth: 143.625, left: 5 });
  assert.deepEqual(row.fit(), ['143.625px', '5px', '143.625px'], 'the transient row mid-animation');
  row.settleRow({ rowWidth: 214, left: 5 });
  assert.deepEqual(row.fit(), ['214px', '5px', '214px'], 'and the row it settles at');
});

test('the row is let go when the menu closes', () => {
  const row = chipRow({ observer: true });
  click(row.window, row.trigger);
  click(row.window, row.trigger);
  assert.deepEqual(row.observers[0].targets, [], 'nothing is left watching a shut menu');
});

test('where a row is watched, a resize does not measure as well', () => {
  /* Two answers to one change, and the worse of them arrives second: the `resize`
   * handler reads the row mid-animation. It is the fallback for a view with no
   * ResizeObserver, not a second opinion. */
  const row = chipRow({ observer: true });
  click(row.window, row.trigger);
  row.settleRow({ rowWidth: 214, left: 5 });
  assert.deepEqual(row.fit(), ['214px', '5px', '214px']);
  row.resize({ rowWidth: 143.625, left: 5 });
  assert.deepEqual(row.fit(), ['214px', '5px', '214px'], 'the event is not taken as well');
});

test('a closing chip menu keeps its open geometry until the fade ends', () => {
  /* `.ui-dropdown.open` stops matching in the frame the menu closes; the panel goes
   * on being painted for --dur-med. Dropping the fit there collapsed an opaque 240px
   * menu to its 48px trigger and jumped it sideways — #549, on the way out. */
  const row = chipRow();
  click(row.window, row.trigger);
  assert.deepEqual(row.fit(), ['1054px', '0px', '240px']);
  click(row.window, row.trigger);
  assert.equal(row.dd.classList.contains('open'), false);
  assert.equal(row.panel.classList.contains('is-closing'), true, 'the hold is on');
  assert.deepEqual(row.fit(), ['1054px', '0px', '240px'], 'and the geometry with it');
  row.endFade();
  assert.equal(row.panel.classList.contains('is-closing'), false);
  assert.deepEqual(row.fit(), ['', '', ''], 'given back once nothing is painted');
});

test('only the panel\'s own fade ends the hold', () => {
  // A row's background transition bubbles to the panel too, and it finishes first.
  const row = chipRow();
  click(row.window, row.trigger);
  click(row.window, row.trigger);
  const other = new row.window.Event('transitionend', { bubbles: true });
  other.propertyName = 'background';
  row.dd.querySelector('.ui-dropdown__item').dispatchEvent(other);
  assert.equal(row.panel.classList.contains('is-closing'), true, 'a descendant\'s transition is not it');
  row.endFade();
  assert.equal(row.panel.classList.contains('is-closing'), false);
});

test('the hold is released on a timer when transitionend never comes', async () => {
  // A fade that did not run fires nothing — and jsdom fires nothing at all, which
  // is the case this timer is written for. The length comes from the sheet.
  const row = chipRow();
  click(row.window, row.trigger);
  click(row.window, row.trigger);
  assert.equal(row.panel.classList.contains('is-closing'), true);
  await new Promise((done) => setTimeout(done, 120));
  assert.equal(row.panel.classList.contains('is-closing'), false, 'the way out without the event');
  assert.deepEqual(row.fit(), ['', '', '']);
});

test('re-opening mid-fade keeps the new fit and drops the hold', async () => {
  /* The abandoned wait must not fire late: it would clear the geometry the new open
   * has just written, leaving an OPEN menu at its trigger's width. */
  const row = chipRow();
  click(row.window, row.trigger);
  click(row.window, row.trigger);
  assert.equal(row.panel.classList.contains('is-closing'), true);
  click(row.window, row.trigger);
  assert.equal(row.dd.classList.contains('open'), true);
  assert.equal(row.panel.classList.contains('is-closing'), false, 'the hold belongs to the close');
  assert.deepEqual(row.fit(), ['1054px', '0px', '240px']);
  await new Promise((done) => setTimeout(done, 120));
  assert.deepEqual(row.fit(), ['1054px', '0px', '240px'], 'and the old timer does not fire into it');
});

/** The add control's menu in the same row (#496). Not a chip's, so what makes it
 *  a subject is the width it asks for; JSDOM loads no stylesheet, so the ask is
 *  written on the panel the way src/styles/filter-bar.css writes it. */
function addRow({ rowWidth = 1200, left = 146, ask = '320px', panelWidth = 320,
  observer = false } = {}) {
  const window = mount(
    '<fieldset class="ui-filter-bar" data-filter-bar>'
    + '<legend class="ui-filter-bar__legend">Filters</legend>'
    + '<div data-filter-add>'
    + dropdown({ label: 'Add filter', variant: 'menu', items: SECTORS })
    + '</div></fieldset>',
  );
  const doc = window.document;
  const bar = doc.querySelector('.ui-filter-bar');
  const dd = doc.querySelector('.ui-dropdown');
  const panel = doc.querySelector('[data-dropdown-panel]');
  panel.style.setProperty('--ui-filter-panel-ask', ask);
  const at = { rowWidth, left, panelWidth };
  bar.getBoundingClientRect = () => ({ left: 0, right: at.rowWidth, width: at.rowWidth });
  dd.getBoundingClientRect = () => ({ left: at.left, right: at.left + 99, width: 99 });
  Object.defineProperty(panel, 'offsetWidth', { get: () => at.panelWidth, configurable: true });
  // The same stand-in chipRow() uses, for the same reason: JSDOM has no
  // ResizeObserver, so without one only the fallback path can be driven.
  const observers = [];
  if (observer) {
    window.ResizeObserver = class {
      constructor(cb) { this.cb = cb; this.targets = []; observers.push(this); }
      observe(target) { this.targets.push(target); this.cb([{ target }], this); }
      disconnect() { this.targets.length = 0; }
    };
  }
  wireDropdown(doc);
  return {
    window, dd, panel, bar, observers,
    trigger: doc.querySelector('[data-dropdown-trigger]'),
    fit: () => PANEL_PROPS.map((p) => panel.style.getPropertyValue(`--ui-filter-panel-${p}`)),
    resize: (next) => {
      Object.assign(at, next);
      window.dispatchEvent(new window.Event('resize'));
    },
    settleRow: (next) => {
      Object.assign(at, next);
      for (const ro of observers) for (const target of ro.targets) ro.cb([{ target }], ro);
    },
    endFade: () => {
      const e = new window.Event('transitionend');
      e.propertyName = 'opacity';
      panel.dispatchEvent(e);
    },
  };
}

test('an open add menu carries the width it asks for, not a chip\'s floor', () => {
  // 320, not 240: a catalogue with a field over it reads "Searc" at a chip's floor.
  const row = addRow();
  click(row.window, row.trigger);
  assert.deepEqual(row.fit(), ['1054px', '0px', '320px']);
});

test('a viewport change re-measures an add menu that is still open', () => {
  /* The add menu asks for 320px where a chip asks for 240px, so it is the first
   * menu in the row whose stale fit shows on a phone: 240 fits a 288px row and
   * 320 does not. Opened in a 1200px row, then the row a 390px view gives it, then
   * a 320px one — the panel slides back where there is room behind it and takes
   * the row's own width where there is not. */
  const row = addRow();
  click(row.window, row.trigger);
  assert.deepEqual(row.fit(), ['1054px', '0px', '320px']);
  row.resize({ rowWidth: 358, left: 250 });
  assert.deepEqual(row.fit(), ['320px', '212px', '320px'], 'a 358px row still holds the 320px ask');
  row.resize({ rowWidth: 288, left: 16, panelWidth: 288 });
  assert.deepEqual(row.fit(), ['288px', '16px', '288px'], 'a 288px row decides instead');
});

test('the add menu\'s own row is the box that is watched', () => {
  /* The catalogue is not inside a `.ui-filter-bar__chip`, so a watcher keyed on the
   * chip would leave this one menu on the `resize` fallback while every chip beside
   * it took the observer. filterPanelRow() answers for both. */
  const row = addRow({ observer: true });
  click(row.window, row.trigger);
  assert.equal(row.observers.length, 1, 'one observer for the add menu too');
  assert.deepEqual(row.observers[0].targets, [row.bar], 'the row, not the wrapper and not the view');
  row.settleRow({ rowWidth: 358, left: 250 });
  assert.deepEqual(row.fit(), ['320px', '212px', '320px'], 'and the ask survives the re-fit');
});

test('a closing add menu keeps its open geometry until the fade ends', () => {
  // The hold reaches the catalogue as well: 320px of panel collapsing to a 99px
  // trigger is the same repaint on the way out, with 221px more of it.
  const row = addRow();
  click(row.window, row.trigger);
  assert.deepEqual(row.fit(), ['1054px', '0px', '320px']);
  click(row.window, row.trigger);
  assert.equal(row.dd.classList.contains('open'), false);
  assert.equal(row.panel.classList.contains('is-closing'), true, 'the hold is on');
  assert.deepEqual(row.fit(), ['1054px', '0px', '320px'], 'and the geometry with it');
  row.endFade();
  assert.equal(row.panel.classList.contains('is-closing'), false);
  assert.deepEqual(row.fit(), ['', '', ''], 'given back once nothing is painted');
});

test('a dropdown outside a filter row is given no numbers at all', () => {
  const window = mount(dropdown({ value: 'Workspace', variant: 'menu', items: MENU }));
  const doc = window.document;
  wireDropdown(doc);
  const panel = doc.querySelector('[data-dropdown-panel]');
  click(window, doc.querySelector('[data-dropdown-trigger]'));
  assert.deepEqual(PANEL_PROPS.map((p) => panel.style.getPropertyValue(`--ui-filter-panel-${p}`)), ['', '', '']);
  window.dispatchEvent(new window.Event('resize'));
  assert.deepEqual(PANEL_PROPS.map((p) => panel.style.getPropertyValue(`--ui-filter-panel-${p}`)), ['', '', '']);
});
