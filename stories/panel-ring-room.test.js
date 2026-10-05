// Rule: a menu panel does not cut off its rows' focus ring.
//
// The kit ring is drawn OUTSIDE the border box of the thing that has focus — one pixel
// of gap and two of ring, from --ring-gap-width and --ring-width. A row that fills its
// panel edge to edge therefore draws it on the panel's border and past it. There are two
// ways for that ring to survive: the panel keeps the three pixels inside its own box as
// padding, so the ring lands in the padding; or the panel clips nothing, and the ring
// crosses its edge. A panel that does neither cuts the ring away.
//
// #519 is what that cost. `.amenu`, the topbar's account menu, was the one menu in the
// kit with no padding AND `overflow: hidden`, so its rows had a single pixel for a
// three-pixel ring. #487 had just given those rows `box-shadow: var(--ring)`, and the
// reader got two accent bars above and below the row instead of a ring around it. The
// other two menus take the first way out and nothing said why, which is the hole this
// closes: `.ui-dropdown__panel` pads by --ui-dropdown-pad and `.vsw__menu` by the same
// six pixels. `.amenu` takes the second; the choice between them is recorded on #519.
//
// Subjects are discovered twice and the two readings have to agree. One is the kit's own
// sources: every place under src/ and react/src/ that writes `data-dropdown-panel` into
// markup, named by the first class the marked element carries. The other is this file's
// fixtures, read back out of the DOM. A factory that marks a fourth panel is in the first
// and not the second, so the gate stops until somebody renders it here and measures it.
//
// Coverage limits:
// - This reads the stylesheet, not a browser: it measures no pixels and cannot see what a
//   consumer's own CSS does to the panel. Chrome measured the ring for #519.
// - Only the panel's own base rule is read, for padding and for overflow. What a media
//   query or a state class changes is not seen, nor padding on a wrapper between the
//   panel and its rows.
// - A panel that clips nothing itself may still sit inside an ancestor that clips. None
//   of these three does; this gate asks the panel, not its ancestors.
// - Only the first class on a marked element is read: the one the panel's own sheet
//   styles it under. A second — `dropdown({ panelClass })` — is the caller's to answer for.
// - The marked element is found by walking the source for tags and attribute lists, not
//   by running a parser. Attribute order does not matter, a `>` inside an attribute's own
//   expression does not end the element and a `<` inside a string does not start one; but
//   a marker this walk cannot tie to exactly one class attribute stops the gate rather
//   than being named by whatever class is nearest.
// - The source reading covers src/ and react/src/, the trees the package ships. A panel
//   hand-written into an example page is not read; those pages compose the factories.
// - It does not ask whether the rows take the ring at all. `.vopt:focus-visible` never
//   names `.vsw__menu`, so pairing a panel to its rows from the selectors alone would
//   be guesswork. stories/focus-ring.test.js is the gate that asks every stop for a
//   ring; this one asks the panel to let it be drawn.
//
// why: docs/components.md#a-menu-panel-does-not-cut-off-its-rows-ring
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
 * The attribute groups a source holds: every `<tag …>` and every `[…]` list, as spans.
 *
 * One pass that knows quotes from code, so a `>` inside an attribute's own expression —
 * `onClick={(e) => …}` — does not end a tag, and a `<` inside a string does not open one.
 * Both shapes exist because the kit writes a panel's attributes both ways: in the tag
 * itself, and — in `dropdown()` — as a list of attribute strings spread into one tag.
 */
const groupsIn = (text) => {
  const spans = [];
  const stack = [];
  const open = (kind, close, start) => stack.push({ kind, close, start });
  const shut = (at) => {
    const done = stack.pop();
    if (done.kind) spans.push({ start: done.start, end: at });
  };
  // A tag head: `<` then a name then whitespace, `/` or `>`. `i < len` is not one, and
  // a type argument that looks like one closes on its own `>` without holding a marker.
  const head = /^<[A-Za-z][\w.:-]*(?=[\s/>])/;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const cur = stack[stack.length - 1];
    const inside = cur ? cur.close : '';
    if (inside === '\'' || inside === '"') {
      if (ch === '\\') i += 1;
      else if (ch === inside) shut(i);
      continue;
    }
    if (inside === '`') {
      if (ch === '\\') { i += 1; continue; }
      if (ch === '`') { shut(i); continue; }
      // `${` is code again; a tag may open in the markup around it, nothing else does.
      if (ch === '$' && text[i + 1] === '{') { open(null, '}', i); i += 1; continue; }
      if (ch === '<' && head.test(text.slice(i))) open('tag', '>', i);
      continue;
    }
    if (ch === inside) { shut(i); continue; }
    if (ch === '\'' || ch === '"' || ch === '`') open(null, ch, i);
    else if (ch === '(') open(null, ')', i);
    else if (ch === '{') open(null, '}', i);
    else if (ch === '[') open('list', ']', i);
    else if (ch === '<' && head.test(text.slice(i))) open('tag', '>', i);
  }
  return spans;
};

/**
 * Every panel a source marks, by the class its own sheet styles it under.
 *
 * The attribute written into markup is the subject; `[data-dropdown-panel]` inside a
 * selector string is the wiring reading it back, and is skipped. The name comes from the
 * class attribute of the group the marker is in — the marked element's own tag, or the
 * attribute list spread into it — so the two may stand in either order, and a class on
 * an element around the marked one is not mistaken for the panel's. The group has to
 * carry exactly one class attribute, and its first class literal is the panel's own:
 * `class="amenu"`, `class="${esc(cx('ui-dropdown__panel', …))}"` and
 * `className={cx('ui-dropdown__panel', …)}` all start with it. A marker this gate cannot
 * tie to one class attribute stops the gate rather than being named by a neighbour.
 */
const panelsIn = (text, file = 'a source') => {
  const src = code(text);
  const groups = groupsIn(src);
  const found = [];
  for (const mark of src.matchAll(/(?<![[\w-])data-dropdown-panel(?![\w-\]])/g)) {
    const at = mark.index;
    const holding = groups.filter((g) => g.start < at && at < g.end);
    const where = `${file}:${src.slice(0, at).split('\n').length} marks a panel`;
    assert.ok(holding.length, `${where}: the marker is in no element or attribute list this gate can read`);
    const group = holding.reduce((a, b) => (b.end - b.start < a.end - a.start ? b : a));
    const attrs = src.slice(group.start, group.end);
    const classes = [...attrs.matchAll(/(?<![\w-])class(?:Name)?\s*=/g)];
    assert.equal(classes.length, 1,
      `${where}: the marked element carries ${classes.length} class attributes, and this gate names a panel by one`);
    const name = /['"`]\s*([a-z][\w-]*)/.exec(attrs.slice(classes[0].index));
    assert.ok(name, `${where}: this gate cannot read the marked element's class`);
    found.push(name[1]);
  }
  return [...new Set(found)].sort();
};

/** name -> the files that mark it, so a failure says where the panel came from. */
const declared = (() => {
  const found = new Map();
  for (const file of sourceFiles) {
    for (const name of panelsIn(readFileSync(file, 'utf8'), file)) {
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
  const resolved = value.replace(/var\(\s*(--[\w-]+)\s*\)/g, (whole, name) => declaration(body, name) ?? whole).trim();
  const match = /^(-?\d+(?:\.\d+)?)px$/.exec(resolved);
  if (match) return Number(match[1]);
  // A bare zero needs no unit, and is the shape a panel that pads by nothing writes.
  return /^0+(?:\.0+)?$/.test(resolved) ? 0 : null;
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

/** Whether a rule clips at its own edge: any overflow side it writes that is not visible. */
const clipsIn = (rule) => ['overflow', 'overflow-x', 'overflow-y'].some((prop) => {
  const value = declaration(rule.body, prop);
  return value !== null && value.split(/\s+/).some((side) => side !== 'visible');
});

/**
 * The panels that cut a row's ring off, named with the rule that does it. `find` is injectable.
 *
 * Either way out is enough: room inside the box, or no clip at its edge. Only a panel that
 * clips AND keeps less than the ring's spread inside it is reported.
 */
const cutsOff = (names, find = baseRule) => names.map((name) => {
  const rule = find(name);
  assert.ok(rule, `no base rule for .${name}; this gate reads the panel's own rule and found none`);
  const room = roomIn(rule);
  assert.notEqual(room, null, `.${name} writes a padding this gate cannot resolve to px: ${declaration(rule.body, 'padding')}`);
  if (!clipsIn(rule)) return null;
  return room < spread
    ? `.${name} in ${rule.file}: clips at its edge with ${room}px of padding for a ${spread}px ring`
    : null;
}).filter(Boolean);

/* -- the gate -------------------------------------------------------------------- */

test('every panel the kit marks is a panel this gate renders', () => {
  reconcile(declared, rendered);
  assert.ok(rendered.length >= 3, `only ${rendered.length} panel(s) found; the kit has had three since #519,`
    + ' so a reading that finds fewer has broken rather than the kit having shrunk');
  assert.equal(spread, 3, 'the ring\'s spread changed; every panel\'s padding has to be re-read against it');
});

test('no panel cuts its rows\' focus ring off', () => {
  assert.deepEqual(cutsOff(rendered), [],
    `a menu panel clips its rows' focus ring away:\n  ${cutsOff(rendered).join('\n  ')}\n`
    + '  give the panel the ring\'s spread as padding, or stop it clipping.');
});

test('the gate fails when the account menu clips again, and not when a padded panel does', () => {
  // The #519 state, exactly: `.amenu` clipping with no padding. Nothing on disk is touched.
  const rule = baseRule('amenu');
  assert.equal(clipsIn(rule), false, 'the mutation has nothing to add — .amenu already clips');
  assert.equal(roomIn(rule), 0, 'the mutation assumes .amenu pads by nothing, and it no longer does');
  const clipped = { ...rule, body: `${rule.body} overflow: hidden;` };
  assert.deepEqual(cutsOff(['amenu'], () => clipped),
    [`.amenu in ${rule.file}: clips at its edge with 0px of padding for a 3px ring`],
    'putting the clip back on an unpadded panel has to be reported');

  // And the other way out is real: the same clip over a panel that keeps the room passes.
  const padded = { ...rule, body: `${rule.body} padding: ${spread}px; overflow: hidden;` };
  assert.deepEqual(cutsOff(['amenu'], () => padded), [],
    'a panel that keeps the ring\'s spread inside its own box may clip at its edge');
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

  // And had somebody rendered it, its own clipping rule reads as cutting the ring off.
  const sheet = { file: 'src/styles/review.css', selector: '.review__menu', body: 'overflow: hidden; border-radius: var(--radius-md);' };
  assert.deepEqual(cutsOff(['review__menu'], () => sheet),
    ['.review__menu in src/styles/review.css: clips at its edge with 0px of padding for a 3px ring'],
    'an unpadded, clipping panel has to read as cutting the ring off');
});

test('the gate reads the marked element, not the nearest class before it', () => {
  // The marker before its own class, inside a wrapper that carries a class already in the
  // fixtures. Reading the last class attribute before the marker calls this panel `.amenu`
  // and measures nothing; the element's own attributes name it whichever order they are in.
  const source = 'export const reviewMenu = () => `<div class="amenu">'
    + '<div data-dropdown-panel class="review-extra-menu" role="menu"><button>Review</button></div></div>`;';
  assert.deepEqual(panelsIn(source), ['review-extra-menu'],
    'a panel marked before its class has to be named by its own class, not by the element around it');

  const added = new Map([...declared, ['review-extra-menu', ['src/components/review.js']]]);
  assert.throws(() => reconcile(added, rendered), /never renders/,
    'a panel marked before its class can pass as one the fixtures already measure');

  // And the unpadded, clipping rule that goes with it reads as cutting the ring off.
  const sheet = { file: 'src/styles/review.css', selector: '.review-extra-menu', body: 'overflow: hidden; padding: 0;' };
  assert.deepEqual(cutsOff(['review-extra-menu'], () => sheet),
    ['.review-extra-menu in src/styles/review.css: clips at its edge with 0px of padding for a 3px ring'],
    'a clipping panel that pads by a bare zero has to read as cutting the ring off');
});
