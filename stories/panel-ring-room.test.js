// Rule: a menu panel keeps the room its rows' focus ring needs inside its own box.
//
// The kit ring is drawn OUTSIDE the border box of the thing that has focus — one pixel
// of gap and two of ring, from --ring-gap-width and --ring-width. A row that fills its
// panel edge to edge therefore has nowhere to draw it: the ring lands on the panel's
// border, and if the panel clips at that edge it is cut away altogether.
//
// #519 is what that cost. `.amenu`, the topbar's account menu, was the one menu in the
// kit with no padding and `overflow: hidden`, so its rows had a single pixel for a
// three-pixel ring. #487 had just given those rows `box-shadow: var(--ring)`, and the
// reader got two accent bars above and below the row instead of a ring around it. The
// other two menus were already right and nothing said why, which is the hole this
// closes: `.ui-dropdown__panel` pads by --ui-dropdown-pad and `.vsw__menu` by the same
// six pixels, each because somebody chose well rather than because anything asked.
//
// Subjects are discovered, not listed: every panel the kit's own factories mark with
// `data-dropdown-panel`, which is the hook wireDropdown() opens and the hook the
// reduced-motion rule in dropdown.css is keyed on. A fourth menu built on that wiring
// is measured here the day it is written.
//
// Coverage limits:
// - This reads the stylesheet, not a browser. It checks that the panel declares the
//   room; it cannot see what a consumer's own CSS does to the panel afterwards, and it
//   measures no pixels. The ring was measured in Chrome for #519, before and after.
// - Only the panel's own base rule is read. Padding a media query adds or takes away is
//   not seen, and neither is padding on a wrapper between the panel and its rows.
// - It does not ask whether the rows take the ring at all. `.vopt:focus-visible` never
//   names `.vsw__menu`, so pairing a panel to its rows from the selectors alone would
//   be guesswork. stories/focus-ring.test.js is the gate that asks every stop for a
//   ring; this one asks the panel for the room to draw it.
// - A panel that clips is not failed separately. Room is the guarantee either way: with
//   it the ring is whole whether or not the panel clips, and the kit draws no ring that
//   crosses a panel's edge.
//
// why: docs/specification.md#a-menu-panel-keeps-the-room-its-rows-need
// Weaken the rule and confirm that its test fails.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { JSDOM } from 'jsdom';

// The kit's factories want a document in scope before they are imported.
const dom = new JSDOM('<!doctype html><html lang="en"><body></body></html>', { pretendToBeVisual: true });
for (const key of ['window', 'document', 'navigator', 'Node', 'Element', 'HTMLElement']) {
  Object.defineProperty(globalThis, key, { value: dom.window[key] ?? dom.window, configurable: true, writable: true });
}

const { dropdown } = await import('../src/components/dropdown.js');
const { versionSwitcher, accountMenu } = await import('../src/components/topbar.js');

/* -- the subjects --------------------------------------------------------------- */

const items = [{ label: 'Germany', value: 'de', selected: true }, { label: 'France', value: 'fr' }];
const markup = [
  dropdown({ label: 'country:', variant: 'select', items }),
  dropdown({ label: 'country:', variant: 'select', search: { placeholder: 'Search' }, items }),
  versionSwitcher([{ label: 'v1', meta: 'old' }, { label: 'v2', meta: 'now' }], 1),
  accountMenu({ name: 'Ada Lovelace', email: 'ada@apliteni.com' }),
].join('');

/** Every panel the wiring opens, named by the class its own sheet styles it under. */
const panels = (() => {
  const host = dom.window.document.createElement('div');
  host.innerHTML = markup;
  const found = new Map();
  for (const el of host.querySelectorAll('[data-dropdown-panel]')) {
    // The first class is the element's own; `is-scroll` and the portal flag are states.
    const name = el.classList[0];
    if (!found.has(name)) found.set(name, el.className);
  }
  return [...found.keys()].sort();
})();

/* -- the stylesheets ------------------------------------------------------------ */

const files = ['src', 'react/src'].flatMap((base) => readdirSync(base, { recursive: true })
  .filter((file) => String(file).endsWith('.css')).map((file) => `${base}/${file}`));
const rules = files.flatMap((file) => {
  // Comments out, newlines kept, so a declaration inside one is never read as code.
  const css = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ' '));
  return [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter(([, selector]) => !selector.trim().startsWith('@'))
    .map((m) => ({ file, selector: m[1].trim(), body: m[2] }));
});

const declaration = (body, prop) => {
  const found = [...body.matchAll(/(?:^|;)\s*([\w-]+)\s*:\s*([^;]+)/g)].filter(([, name]) => name === prop);
  return found.length ? found[found.length - 1][2].trim() : null;
};

/** px, or a var() the same rule declares — which is how both padded panels write it. */
const px = (value, body) => {
  const resolved = value.replace(/var\(\s*(--[\w-]+)\s*\)/g, (whole, name) => declaration(body, name) ?? whole);
  const match = /^(-?\d+(?:\.\d+)?)px$/.exec(resolved.trim());
  return match ? Number(match[1]) : null;
};

/** The smallest of the four sides a `padding` shorthand sets, in px. */
const roomIn = (rule) => {
  const value = declaration(rule.body, 'padding');
  if (value === null) return 0;
  const sides = value.split(/\s+/).map((part) => px(part, rule.body));
  return sides.some((side) => side === null) ? null : Math.min(...sides);
};

const baseRule = (name) => rules.find((r) => r.selector === `.${name}`);

/** 1px of gap and 2px of ring: what --ring draws outside the border box. */
const spread = (() => {
  const tokens = readFileSync('src/tokens/tokens.css', 'utf8');
  const read = (name) => Number(/^\s*(-?\d+(?:\.\d+)?)px$/.exec(
    new RegExp(`${name}\\s*:\\s*([^;]+)`).exec(tokens)[1],
  )[1]);
  return read('--ring-gap-width') + read('--ring-width');
})();

/* -- the gate -------------------------------------------------------------------- */

test('the wiring opens exactly the panels this gate knows about', () => {
  assert.deepEqual(panels, ['amenu', 'ui-dropdown__panel', 'vsw__menu'],
    'a panel was added to or taken from the dropdown wiring; measure it below before changing this list');
  assert.equal(spread, 3, 'the ring\'s spread changed; every panel\'s padding has to be re-read against it');
});

test('every panel gives its rows the room the ring needs', () => {
  const short = [];
  for (const name of panels) {
    const rule = baseRule(name);
    assert.ok(rule, `no base rule for .${name}; this gate reads the panel's own rule and found none`);
    const room = roomIn(rule);
    assert.notEqual(room, null, `.${name} writes a padding this gate cannot resolve to px: ${declaration(rule.body, 'padding')}`);
    if (room < spread) short.push(`.${name} in ${rule.file}: ${room}px of padding for a ${spread}px ring`);
  }
  assert.deepEqual(short, [], `a menu panel clips its rows' focus ring:\n  ${short.join('\n  ')}`);
});

test('the gate fails when a panel takes that room back', () => {
  // The #519 state, exactly: .amenu padded by nothing. Nothing on disk is touched.
  const rule = baseRule('amenu');
  const weakened = { ...rule, body: rule.body.replace(/padding:\s*var\(--amenu-pad\);/, '') };
  assert.equal(roomIn(weakened), 0, 'the mutation did not land — .amenu no longer writes its padding this way');
  assert.ok(roomIn(weakened) < spread, 'a panel with no padding has to read as short of the ring\'s spread');
});
