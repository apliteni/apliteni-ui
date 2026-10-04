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
// Subjects are discovered twice and the two readings have to agree. One is the kit's own
// sources: every place under src/ and react/src/ that writes `data-dropdown-panel` into
// markup, named by the first class the marked element carries. The other is this file's
// fixtures, read back out of the DOM. A factory that marks a fourth panel is in the first
// and not the second, so the gate stops until somebody renders it here and measures it.
//
// Coverage limits:
// - This reads the stylesheet, not a browser. It checks that the panel declares the
//   room; it cannot see what a consumer's own CSS does to the panel afterwards, and it
//   measures no pixels. The ring was measured in Chrome for #519, before and after.
// - Only the panel's own base rule is read. Padding a media query adds or takes away is
//   not seen, and neither is padding on a wrapper between the panel and its rows.
// - Only the first class on a marked element is read: the one the panel's own sheet
//   styles it under. A second — `dropdown({ panelClass })` — is the caller's to answer for.
// - The source reading covers src/ and react/src/, the trees the package ships. A panel
//   hand-written into an example page is not read; those pages compose the factories.
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

/* -- the subjects, read out of the kit's sources --------------------------------- */

const sourceFiles = ['src', 'react/src'].flatMap((base) => readdirSync(base, { recursive: true })
  .map(String).filter((file) => /\.(js|mjs|ts|tsx)$/.test(file) && !/\.test\./.test(file))
  .map((file) => `${base}/${file}`));

/** Comments out, newlines kept, so prose about the attribute is never read as markup. */
const code = (text) => text
  .replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ' '))
  .replace(/(^|[^:])\/\/[^\n]*/g, (whole, lead) => lead + ' '.repeat(whole.length - lead.length));

/**
 * Every panel a source marks, by the class its own sheet styles it under.
 *
 * The attribute written into markup is the subject; `[data-dropdown-panel]` inside a
 * selector string is the wiring reading it back, and is skipped. The name is the first
 * class on the marked element, which both faces write as the first literal of its class
 * expression: `class="amenu"`, `class="${esc(cx('ui-dropdown__panel', …))}"` and
 * `className={cx('ui-dropdown__panel', …)}` all start with the panel's own class.
 */
const panelsIn = (text) => {
  const found = [];
  for (const mark of code(text).matchAll(/(?<![[\w-])data-dropdown-panel(?![\w-\]])/g)) {
    const before = code(text).slice(0, mark.index);
    const attrs = [...before.matchAll(/class(?:Name)?\s*=/g)];
    assert.ok(attrs.length, 'a source marks a panel with no class attribute before it');
    const name = /['"`]\s*([a-z][\w-]*)/.exec(before.slice(attrs[attrs.length - 1].index));
    assert.ok(name, 'a source marks a panel whose class this gate cannot read');
    found.push(name[1]);
  }
  return [...new Set(found)].sort();
};

/** name -> the files that mark it, so a failure says where the panel came from. */
const declared = (() => {
  const found = new Map();
  for (const file of sourceFiles) {
    for (const name of panelsIn(readFileSync(file, 'utf8'))) {
      found.set(name, [...(found.get(name) ?? []), file]);
    }
  }
  return found;
})();

/* -- the subjects, rendered here -------------------------------------------------- */

const items = [{ label: 'Germany', value: 'de', selected: true }, { label: 'France', value: 'fr' }];
const markup = [
  dropdown({ label: 'country:', variant: 'select', items }),
  dropdown({ label: 'country:', variant: 'select', search: { placeholder: 'Search' }, items }),
  versionSwitcher([{ label: 'v1', meta: 'old' }, { label: 'v2', meta: 'now' }], 1),
  accountMenu({ name: 'Ada Lovelace', email: 'ada@apliteni.com' }),
].join('');

/** Every panel the wiring opens here, named by the class its own sheet styles it under. */
const rendered = (() => {
  const host = dom.window.document.createElement('div');
  host.innerHTML = markup;
  const found = new Set();
  for (const el of host.querySelectorAll('[data-dropdown-panel]')) {
    // The first class is the element's own; `is-scroll` and the portal flag are states.
    found.add(el.classList[0]);
  }
  return [...found].sort();
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

/* -- what the gate asserts, as functions the mutations below can call -------------- */

/** The two readings have to name the same panels. Throws with the side that is short. */
const reconcile = (fromSource, here) => {
  const unmeasured = [...fromSource.keys()].filter((name) => !here.includes(name)).sort();
  assert.deepEqual(unmeasured, [], unmeasured.length
    ? `a factory marks a panel this gate never renders, so nothing measures it:\n  ${
      unmeasured.map((name) => `.${name} in ${fromSource.get(name).join(', ')}`).join('\n  ')
    }\n  render it in the fixtures above and read the measurement below.`
    : '');
  const unsourced = here.filter((name) => !fromSource.has(name)).sort();
  assert.deepEqual(unsourced, [],
    `a fixture renders a panel no source marks: ${unsourced.map((n) => `.${n}`).join(', ')
    }; the source reading has broken, or the factory has gone.`);
};

/** The panels short of the room, named with the rule that is short. `find` is injectable. */
const shortOf = (names, find = baseRule) => names.map((name) => {
  const rule = find(name);
  assert.ok(rule, `no base rule for .${name}; this gate reads the panel's own rule and found none`);
  const room = roomIn(rule);
  assert.notEqual(room, null, `.${name} writes a padding this gate cannot resolve to px: ${declaration(rule.body, 'padding')}`);
  return room < spread ? `.${name} in ${rule.file}: ${room}px of padding for a ${spread}px ring` : null;
}).filter(Boolean);

/* -- the gate -------------------------------------------------------------------- */

test('every panel the kit marks is a panel this gate renders', () => {
  reconcile(declared, rendered);
  assert.ok(rendered.length >= 3, `only ${rendered.length} panel(s) found; the kit has had three since #519,`
    + ' so a reading that finds fewer has broken rather than the kit having shrunk');
  assert.equal(spread, 3, 'the ring\'s spread changed; every panel\'s padding has to be re-read against it');
});

test('every panel gives its rows the room the ring needs', () => {
  assert.deepEqual(shortOf(rendered), [],
    `a menu panel clips its rows' focus ring:\n  ${shortOf(rendered).join('\n  ')}`);
});

test('the gate fails when a panel takes that room back', () => {
  // The #519 state, exactly: .amenu padded by nothing. Nothing on disk is touched.
  const rule = baseRule('amenu');
  const weakened = { ...rule, body: rule.body.replace(/padding:\s*var\(--amenu-pad\);/, '') };
  assert.equal(roomIn(weakened), 0, 'the mutation did not land — .amenu no longer writes its padding this way');
  assert.ok(roomIn(weakened) < spread, 'a panel with no padding has to read as short of the ring\'s spread');
});

test('the gate fails when a factory marks a panel nobody measured', () => {
  // A fourth factory as one would be written, and the clipping edge-to-edge rule that
  // goes with forgetting this guarantee. Both live in these strings; nothing is written.
  const source = 'export const reviewMenu = ({ name }) => `<div class="review" data-dropdown>'
    + '<button class="review__btn" data-dropdown-trigger>${name}</button>'
    + '<div class="review__menu" data-dropdown-panel role="menu">${rows()}</div></div>`;';
  assert.deepEqual(panelsIn(source), ['review__menu'],
    'the source reading no longer picks a panel\'s own class out of a factory');

  // It is in the source reading and not in the fixtures, so the first test stops.
  const added = new Map([...declared, ['review__menu', ['src/components/review.js']]]);
  assert.throws(() => reconcile(added, rendered), /never renders/,
    'a factory can mark a panel this gate does not render and still pass');

  // And had somebody rendered it, its own rule reads as short of the ring.
  const sheet = { file: 'src/styles/review.css', selector: '.review__menu', body: 'overflow: hidden; border-radius: var(--radius-md);' };
  assert.deepEqual(shortOf(['review__menu'], () => sheet),
    ['.review__menu in src/styles/review.css: 0px of padding for a 3px ring'],
    'an unpadded, clipping panel has to read as short of the ring\'s spread');
});
