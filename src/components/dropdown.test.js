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
// why: CONTRIBUTING.md#a-gate-discovers-its-subjects-and-never-enumerates-them

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
