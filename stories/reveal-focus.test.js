// Rule: a surface the kit reveals and focuses into in the same frame carries no
// transition inside it under reduced motion.
//
// The reduced-motion net gives every element a 0.01ms transition, and an element that
// declares none of its own transitions `all` — which includes `visibility`, a property
// that is inherited and moves in a discrete step. So a wrapper inside a revealed
// surface holds its own subtree at `hidden` for one tick after the surface turns
// visible, and `focus()` on a hidden element does nothing: the panel is open, the
// reader's focus is still on the trigger, and every key they press after that reaches
// the trigger instead of the field.
//
// #519 was that, in the dropdown: the search field sits inside `.ui-dropdown__search`,
// which names no property, so the field was still hidden in the frame openDropdown()
// focused it. The topbar's account menu lost its first row to the same tick from the
// other shape — `.amenu a` names no property, so the row held itself. The drawer and
// the confirm were given this rule in #271 and the palette in #274, one at a time, so
// it was known and the dropdown was simply not asked the question. This gate asks every
// curtain in the kit, discovered rather than listed, so the next one cannot be
// forgotten either.
//
// Coverage limits:
// - jsdom evaluates no media query and runs no transition, so what is measured here is
//   that the rules reach the markup, not that Chrome obeys them. The behaviour itself
//   was measured by hand in Chrome with reduced motion forced; #519 carries the before
//   and after.
// - A curtain is found by `visibility: hidden` in the kit's own sheets. One written by a
//   consumer, or in a script's inline style, is not seen.
// - Coverage is asked of every element inside an open surface, not only of the ones
//   whose transition list would really hold the subtree. That is the guarantee the
//   drawer, the confirm and the palette already state in their sheets, and a narrower
//   one would have to re-derive each element's cascade to be worth anything.
//
// why: docs/foundations.md#reduced-motion-travels-with-the-stylesheet
// Weaken the rule and confirm that its test fails.

import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { sheets, leafRules, inNet } from './lib/motion-css.js';

// A DOM has to exist before the kit's wiring runs — wireDropdown() compares its scope
// against the global `document`.
const dom = new JSDOM('<!doctype html><html lang="en"><body></body></html>', { pretendToBeVisual: true });
for (const key of ['window', 'document', 'navigator', 'Node', 'Element', 'HTMLElement', 'Event', 'KeyboardEvent', 'MouseEvent']) {
  Object.defineProperty(globalThis, key, { value: dom.window[key] ?? dom.window, configurable: true, writable: true });
}

const { dropdown, wireDropdown } = await import('../src/components/dropdown.js');
const { versionSwitcher, accountMenu } = await import('../src/components/topbar.js');
const { drawer } = await import('../src/components/drawer.js');
const { confirm } = await import('../src/components/confirm.js');
const { commandPalette } = await import('../src/components/command-palette.js');

/* -- what counts as cover ------------------------------------------------------ */

/** Every rule inside a reduced-motion block that switches transitions off. */
const switchesOff = (d) => (d.prop === 'transition' || d.prop === 'transition-property')
  && d.important && /^(none|0|0s|0ms)$/.test(d.value);

const netRules = () => {
  const out = [];
  for (const { where, text } of sheets()) {
    for (const rule of leafRules(text)) {
      if (inNet(rule) && rule.decls.some(switchesOff)) out.push({ where, line: rule.line, selector: rule.selector });
    }
  }
  return out;
};

const NET = netRules();

/** Is `el` reached by one of these rules? A selector list is matched as written. */
const covered = (el, rules) => rules.some((r) => el.matches(r.selector));

// `className` on an SVG element is an SVGAnimatedString and stringifies to nothing
// readable, so the class list is read off the attribute.
const name = (el) => `${el.tagName.toLowerCase()}.${(el.getAttribute('class') || '').split(' ')[0] || '—'}`;

/* -- the subjects -------------------------------------------------------------- */

const ITEMS = [
  { label: 'Germany', value: 'de', selected: true },
  { label: 'France', value: 'fr' },
  { label: 'Spain', value: 'es' },
];

/** Mount markup, hand back the host. */
function mount(html) {
  const host = dom.window.document.createElement('div');
  host.innerHTML = html;
  dom.window.document.body.replaceChildren(host);
  return host;
}

/**
 * Opened by the kit's own wiring, with the key that opens it — so what is checked is
 * the state openDropdown() leaves behind and not a class this file wrote. The three
 * panels below are one implementation: `[data-dropdown] > [data-dropdown-trigger] +
 * [data-dropdown-panel]`, `.open` on the container.
 */
function openedByKey(html, panel) {
  const host = mount(html);
  wireDropdown(host);
  const trigger = host.querySelector('[data-dropdown-trigger]');
  trigger.focus();
  trigger.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
  const surface = (panel === '[data-dropdown-panel]' ? dom.window.document : host).querySelector(panel);
  assert.ok(surface, `${panel} is not in the tree after ArrowDown`);
  return surface;
}

/** `.open` written by the wiring, asserted rather than assumed. */
const assertOpen = (surface, open) => assert.ok(
  surface.closest(open) || surface.matches(open),
  `nothing matching ${open} holds the panel after ArrowDown — the open state has moved`,
);

/**
 * Every `visibility: hidden` curtain in the kit, and what happens when it is drawn
 * back. `open()` returns the surface in its open state; `noFocus` is the reason a
 * curtain is not one of these — it holds nothing that takes focus, so the tick its
 * subtree spends hidden costs nothing.
 */
const LEDGER = {
  '.ui-dropdown__panel': {
    open: () => {
      const surface = openedByKey(dropdown({ label: 'country:', variant: 'select', search: true, items: ITEMS }), '.ui-dropdown__panel');
      assertOpen(surface, '.ui-dropdown.open');
      return surface;
    },
    focuses: 'the search field, through the wrapper that held it hidden — #519',
  },
  // The same panel after wireDropdown() moves it onto <body>: the descendant selector
  // its open state normally comes from stops matching there, so the panel carries
  // `is-open` instead and the net has to name that too.
  '.ui-dropdown__panel--portal': {
    open: () => {
      const surface = openedByKey(dropdown({ label: 'country:', variant: 'select', search: true, portal: true, items: ITEMS }), '[data-dropdown-panel]');
      assertOpen(surface, '.ui-dropdown__panel--portal.is-open');
      return surface;
    },
    focuses: 'the search field in a portalled panel',
    extra: true,
  },
  '.vsw__menu': {
    open: () => {
      const surface = openedByKey(versionSwitcher([
        { label: 'v1', meta: 'retired', badge: 'archive' },
        { label: 'v2', meta: 'current', badge: 'live' },
      ], 1), '.vsw__menu');
      assertOpen(surface, '.vsw.open');
      return surface;
    },
    focuses: 'a version row — the topbar opens on the dropdown wiring',
  },
  '.amenu': {
    open: () => {
      const surface = openedByKey(accountMenu({ name: 'Ada Lovelace', email: 'ada@apliteni.com' }), '.amenu');
      assertOpen(surface, '.acct.open');
      return surface;
    },
    focuses: 'the first menu row, through its wrapper — found with #519',
  },
  // The three overlays take their open state from the factory rather than from
  // openDrawer()/openConfirm()/openCommandPalette(), so this gate stays clear of the
  // overlay stack those push onto. That the class is the open one is held next door,
  // by stories/overlay-css.test.js.
  '.ui-drawer': {
    open: () => mount(drawer({ title: 'Filters', body: '<input aria-label="Name">', open: true })).querySelector('.ui-drawer'),
    focuses: 'the first control in the panel',
  },
  '.ui-confirm': {
    open: () => mount(confirm({ title: 'Delete campaign?', body: 'This cannot be undone.', open: true })).querySelector('.ui-confirm'),
    focuses: 'the safe answer',
  },
  '.ui-cmdk': {
    open: () => mount(commandPalette({ items: [{ label: 'New campaign' }, { label: 'Open settings' }], open: true })).querySelector('.ui-cmdk'),
    focuses: 'the text box',
  },
  '.ui-tip': {
    noFocus: 'a tooltip is named by aria-describedby and never focused; it holds text and no control',
  },
  ':where(.ui-app:not(.ui-app--topbar).is-collapsed) .ui-app__brand': {
    noFocus: 'the rail hides its wordmark as it collapses. Nothing is focused when it comes back — the '
      + 'reader expanded the rail, they did not open it',
  },
  '.ui-btn[aria-busy="true"] > span[aria-hidden="true"]:not(.ui-btn__dots)': {
    noFocus: 'a busy button hides its own label and keeps the focus it already had; there is nothing '
      + 'inside the label to focus',
  },
};

/** Every curtain the sheets declare, as `selector → [where:line]`. */
function curtains() {
  const found = new Map();
  for (const { where, text } of sheets()) {
    for (const rule of leafRules(text)) {
      if (inNet(rule)) continue;
      const d = rule.decls.find((x) => x.prop === 'visibility' && x.value === 'hidden');
      if (!d) continue;
      // A selector list declaring one curtain is one subject; the ledger keys on the
      // part that names the surface, which is the last one written.
      const key = rule.selector.split(',').map((s) => s.trim()).at(-1);
      found.set(key, `${where}:${d.line}`);
    }
  }
  return found;
}

const FOUND = curtains();
const EXTRA = Object.entries(LEDGER).filter(([, v]) => v.extra).map(([k]) => k);
const FOCUSING = Object.entries(LEDGER).filter(([, v]) => v.open);

/* -- the gate ------------------------------------------------------------------ */

test(`every curtain in the kit is classified (${FOUND.size} found, ${Object.keys(LEDGER).length - EXTRA.length} in the ledger)`, () => {
  assert.ok(FOUND.size >= 8, `only ${FOUND.size} \`visibility: hidden\` rules were found across the kit's `
    + 'sheets. The drawer, the confirm, the palette, the dropdown panel and the topbar\'s two menus are '
    + 'six of them, so the sweep has stopped reading the trees');

  const unledgered = [...FOUND].filter(([sel]) => !LEDGER[sel]).map(([sel, at]) => `${at}  ${sel}`);
  assert.deepStrictEqual(
    unledgered, [],
    'a surface hides itself with `visibility: hidden` and this gate does not know what happens when it '
    + 'comes back. Under reduced motion the net gives every element a 0.01ms transition and `visibility` '
    + 'is inherited, so anything inside stays hidden for one tick — long enough for a focus() call in the '
    + 'frame it opens to land nowhere. Add it to LEDGER with an `open()` that returns it open, or with '
    + '`noFocus` saying why nothing is focused into it:\n  ' + unledgered.join('\n  '),
  );

  const stale = Object.keys(LEDGER).filter((sel) => !FOUND.has(sel) && !LEDGER[sel].extra);
  assert.deepStrictEqual(stale, [], 'the ledger names a curtain the sheets no longer declare — drop the entry');
});

test(`an open surface carries no transition inside it under reduced motion (${FOCUSING.length} subjects)`, (t) => {
  assert.ok(NET.length > 0, 'no reduced-motion rule in the kit switches a transition off — the net has gone');
  assert.ok(FOCUSING.length >= 6, `only ${FOCUSING.length} surfaces are opened and measured here`);

  const offences = [];
  for (const [sel, entry] of FOCUSING) {
    const surface = entry.open();
    const inside = [...surface.querySelectorAll('*')];
    // A surface that renders nothing inside it would pass every assertion below
    // without measuring anything.
    assert.ok(inside.length >= 3, `${sel} opened with ${inside.length} elements inside it — too few to be the `
      + 'subject this entry describes, so the specimen has stopped rendering');
    const bare = inside.filter((el) => !covered(el, NET));
    if (bare.length) {
      offences.push(`${sel} (opens, then focuses ${entry.focuses})\n      `
        + `${bare.length} of ${inside.length} elements inside it keep a transition: `
        + bare.slice(0, 4).map(name).join(', '));
    } else t.diagnostic(`${sel}: ${inside.length} elements inside, all reached by the net`);
  }
  assert.deepStrictEqual(
    offences, [],
    'an element inside an open surface still carries a transition under reduced motion. The net gives it '
    + '0.01ms on `all`, `visibility` is inherited and discrete, so it holds its own subtree at `hidden` for '
    + 'the frame the surface opens in — the frame the kit focuses into it — and focus stays where it was. '
    + 'Add `@media (prefers-reduced-motion: reduce) { <the open surface> * { transition: none !important; } }` '
    + 'to that component\'s sheet:\n  ' + offences.join('\n  '),
  );
});

// The mutation that proves the case. With the dropdown's own rule out of the net, the
// three panels the dropdown wiring opens go bare again — so a gate that stayed green
// without it would be measuring nothing but its own ledger.
test('without the dropdown\'s rule, the panels it opens go bare again', () => {
  const without = NET.filter((r) => !/\[data-dropdown-panel\]/.test(r.selector));
  assert.ok(without.length < NET.length, 'no net rule names [data-dropdown-panel] — the fix for #519 has gone');

  const bare = FOCUSING
    .filter(([, entry]) => [...entry.open().querySelectorAll('*')].some((el) => !covered(el, without)))
    .map(([sel]) => sel);
  assert.deepStrictEqual(
    bare.sort(),
    ['.amenu', '.ui-dropdown__panel', '.ui-dropdown__panel--portal', '.vsw__menu'],
    'the rule keyed on [data-dropdown-panel] is what covers the dropdown panel, its portalled twin and the '
    + 'topbar\'s two menus. If removing it changes nothing, something else is covering them and the claim '
    + 'this gate makes about that rule is no longer true',
  );
});
