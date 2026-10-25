// The dropdown panel's stylesheet, read as text where the defect is a declaration:
// which way the panel opens, the gap and padding it reads, the caret, and the
// portalled panel's own rules. JSDOM has no layout, so nothing here is measured.
//
// why: docs/components.md#the-dropdown-panel

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { splitSelectorList } from '../../scripts/lib/selector-list.js';
import { substitute, tokensFor } from '../../stories/lib/contrast.js';
import { sizingRules } from '../../stories/lib/field-zoom.js';
import { markup } from '../../stories/lib/react-markup.js';

const CSS = readFileSync(new URL('./dropdown.css', import.meta.url), 'utf8');
const PLACEMENT = readFileSync(new URL('../logic/dropdown-placement.js', import.meta.url), 'utf8');

/** The sheet as CSSOM rules, so a media query and its rules can be read apart. */
function sheet() {
  const doc = new JSDOM('<style></style>').window.document;
  doc.querySelector('style').textContent = CSS;
  return [...doc.styleSheets[0].cssRules];
}

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
  const panel = RULES.find((r) => splitSelectorList(r.selector).includes('.ui-dropdown__panel'));
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
  const panel = RULES.find((r) => splitSelectorList(r.selector).includes('.ui-dropdown__panel'));
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
// why: docs/components.md#the-dropdown-panel
test('the caret is centred in both states, and shifted in page space', () => {
  const closed = RULES.find((r) => splitSelectorList(r.selector).includes('.ui-dropdown__chevron'));
  const open = RULES.find((r) => splitSelectorList(r.selector).includes('.ui-dropdown.open .ui-dropdown__chevron'));
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
  const rulesFor = (cls) => RULES.filter((r) => splitSelectorList(r.selector).includes(sel(cls)));
  // Whatever the cascade ends on, gathered across every rule that names the
  // block — so splitting one rule in two, or adding a third, is still read.
  const of = (cls, prop) => rulesFor(cls).map((r) => decl(r, prop)).filter((v) => v != null).at(-1) ?? null;

  const shared = RULES.find((r) => {
    const list = splitSelectorList(r.selector);
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

// Found in Chromium, where jsdom cannot look: with `visibility` transitioned on
// open, the panel is still `hidden` when the field is focused, and the focus is
// lost. So the open search panel transitions everything but visibility.
// The rule this reads is every panel's now, not the search variant's alone (#286):
// a menu opened with the arrows puts focus on a row, and a row inside a box that
// still resolves `hidden` cannot take it either. So the selectors matched here are
// the general ones, and what the search variant needs is that they cover it.
test('the open search panel does not transition visibility, so the field can take focus', () => {
  const css = CSS.replace(/\/\*[\s\S]*?\*\//g, '');
  const open = [...css.matchAll(/([^{}]+)\{([^}]*)\}/g)]
    .filter(([, sel]) => /\.ui-dropdown\.open \.ui-dropdown__panel\b/.test(sel)
      && /\.ui-dropdown__panel--portal\.is-open/.test(sel));
  const swapped = open.filter(([, , body]) => /transition-property/.test(body));
  assert.equal(swapped.length, 1, 'one rule opens the panel, in place and portalled — and it is the '
    + 'one that takes `visibility` off the clock so a key can put focus inside');
  const property = /transition-property\s*:([^;]*)/.exec(swapped[0][2])?.[1] ?? '';
  assert.ok(property.includes('opacity') && !/visibility/.test(property), `transition-property: ${property.trim()}`);
});

// iOS Safari zooms the page into a focused field whose text is under 16px, and
// opening the panel focuses this one. What it is sized to on a touch screen is
// the kit's one net, src/styles/field-zoom.css, held by stories/field-zoom.test.js
// over every field the kit renders. This sheet states the mouse size and carries
// no (pointer: coarse) rule of its own, which is the second answer that could
// disagree with the net. #294
test('the field is 12.5px with a mouse, and this sheet does not size it on touch', async () => {
  const rules = sheet();
  const base = rules.find((r) => r.selectorText === '.ui-dropdown__search-input');
  const resolved = sizingRules(substitute(base.cssText, tokensFor('light')), 'dropdown.css');
  assert.equal(resolved[0].px, 12.5, 'a mouse keeps the size the rows use');
  const coarse = rules
    .filter((r) => r.media && /\(\s*pointer\s*:\s*coarse\s*\)/.test(r.media.mediaText))
    .flatMap((r) => [...r.cssRules].map((inner) => inner.cssText));
  assert.deepEqual(coarse, [], 'a local touch rule beside the net is a second answer to one question');
  // The net is written over element selectors, so what puts this field inside it
  // is that the field is an <input>.
  const html = await markup(({ h, kit }) => h(kit.Dropdown, { variant: 'select', search: true, items: [{ label: 'Euro (EUR)', value: 'EUR' }] }));
  const field = new JSDOM(html).window.document.querySelector('.ui-dropdown__search-input');
  assert.equal(field?.tagName, 'INPUT', 'the net reaches the field through its element');
});

test('the placement falls back to the number the sheet declares', () => {
  const panel = RULES.find((r) => splitSelectorList(r.selector).includes('.ui-dropdown__panel'));
  const css = parseFloat(decl(panel, '--ui-dropdown-gap'));
  const js = parseFloat(/const DD_GAP = ([\d.]+)/.exec(PLACEMENT)?.[1]);
  assert.equal(js, css, 'DD_GAP in src/logic/dropdown-placement.js is the fallback for a document without the sheet');
});
