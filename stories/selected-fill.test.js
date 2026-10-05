// Rule: a selected item is marked by a background highlight, and the highlight is one
// a reader can see on the ground that item stands on.
//
// Artur settled it on #578 round r34, on the open rail's current row: "Outline only for
// focus. Selected - use background highlight." Taking the edges off is half the change;
// the other half is that the fill left behind has to carry the mark. It did not. The
// kit paints a selected row `--surface`, and in the LIGHT theme `--surface` and
// `--bg-elevated` are both #ffffff — 1.000:1 — so on a card, a menu panel or a rail the
// fill drew nothing at all and the edge had been the whole mark. Removing the edge
// without moving the fill would have left those rows unmarked.
//
// So this measures the pair: every selected item's fill against the ground its own
// component paints under it, in both themes, against a floor.
//
// THE FLOOR is 1.1:1, which is not a WCAG number and is not pretending to be. WCAG has
// no contrast requirement for a background that carries no information by itself —
// these rows carry their own text at the kit's own ink ratios, which stories/contrast
// .test.js measures. 1.1:1 is the step the kit's own surfaces take between rungs, and
// it is the number below which a fill stops reading as a fill: --surface on
// --bg-elevated is 1.000 and was invisible, --surface-3 on --bg-elevated is 1.041 and
// is the next thing to it.
//
// EVERY FILL, NOT THE FIRST ONE. The #590 review appended
// `.ui-nav__item.is-active { background: var(--surface) }` to this gate's own copy of
// the sheets and all three tests still passed: the reading took the FIRST rule matching
// a selector and a later rule is what a reader sees. So a subject is now measured
// against EVERY background its selector is given, wherever it is given — a second rule
// later in the file, a rule inside a width query, a consumer sheet's override. The last
// test below proves it by making exactly that mutation and watching it fail. Measuring
// all of them rather than the cascade winner also keeps a width query honest: the narrow
// branch's plate is a fill a reader sees at that width, not one a desk-width cascade
// hides. src/styles/code-chip.test.js takes the winner instead, because the step a chip
// takes is a question about one rendered pair rather than about every rule.
//
// DISCOVERY, so a new selected fill cannot ship unmeasured. Every rule in src/**.css and
// react/src/**.css whose own last compound carries a selected marker — `.is-active`,
// `.is-current`, `.is-selected`, `aria-pressed`, `aria-selected` — and which declares a
// background, has to land in one of five buckets or this gate fails naming it:
//
//  - a SUBJECT, measured below;
//  - NO FILL, a rule that takes a fill away (`none`, `transparent`) because the mark is
//    somewhere else — the underline strip's bar, the folded rail's plate;
//  - an ACCENT mark, whose contrast is the accent ledger's subject and
//    stories/contrast.test.js's, not a step between two surfaces;
//  - a named EXCLUSION, each with the issue that owns it.
//
// A box painted WITHIN a selected row rather than being the row's own mark — a count
// badge, an icon tile — is not discovered at all: its marker sits on an ancestor
// compound and the rule is about the box, not about the selection. What step such a box
// takes is stories/code-chip.test.js's and stories/contrast.test.js's subject.
//
// COVERAGE LIMITS. The grounds are named, not discovered: a row's ground is the
// component's own container, and no reader of the stylesheets can tell which container
// a given row ends up inside. Each one is cited to the rule that paints it, and every
// subject and exclusion below is asserted to still resolve to a real rule, so a renamed
// selector fails rather than silently measuring nothing. An item whose ground is not
// fixed by its own component cannot be a subject: the pager stands on the page in one
// showcase and on a card in another, which is why it is an exclusion and not a row here.
// Interaction states (`:hover`, `:focus-visible`) are not discovered — they paint over
// the mark rather than being it, and stories/focus-ring.test.js owns what focus draws.
// `@media (forced-colors: active)` is dropped whole: the mode repaints author colours,
// and a ratio between two system colours is not a number this gate can hold anyone to.
// This reads the sheets as text and measures no pixels.
//
// why: docs/specification.md#the-focus-ring
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { parseColour, ratio, substitute, tokensFor } from './lib/contrast.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** The floor a fill has to clear to read as a fill. See the header. */
export const FILL_FLOOR = 1.1;

/** Comments blanked, newlines kept, so a reason beside a rule is never read as CSS. */
const decomment = (css) => css.replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ' '));

/** `@media (forced-colors: active) { ... }` removed whole, braces matched. */
const dropForcedColours = (css) => {
  let out = css;
  for (;;) {
    const at = out.search(/@media\s*\(\s*forced-colors\s*:\s*active\s*\)\s*\{/);
    if (at < 0) return out;
    let depth = 0;
    let end = out.indexOf('{', at);
    for (let i = end; i < out.length; i += 1) {
      if (out[i] === '{') depth += 1;
      if (out[i] === '}') { depth -= 1; if (depth === 0) { end = i; break; } }
    }
    out = out.slice(0, at) + out.slice(end + 1);
  }
};

const files = ['src', 'react/src'].flatMap((base) => readdirSync(path.join(root, base), { recursive: true })
  .filter((file) => String(file).endsWith('.css')).map((file) => `${base}/${file}`));
const source = files.map((file) => readFileSync(path.join(root, file), 'utf8')).join('\n');
const sheets = dropForcedColours(decomment(source));

/** Split a selector list at top-level commas, so `:not(a, b)` stays one selector. */
const selectorsOf = (list) => {
  const out = [];
  let depth = 0;
  let current = '';
  for (const char of list) {
    if (char === '(') depth += 1;
    if (char === ')') depth -= 1;
    if (char === ',' && depth === 0) { out.push(current.trim()); current = ''; continue; }
    current += char;
  }
  out.push(current.trim());
  return out.filter(Boolean);
};

/** Every rule in the sheets, in document order, at-rule preludes skipped. */
const rules = [...sheets.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
  .filter(([, selector]) => !selector.trim().startsWith('@'))
  .map(([, selector, body]) => ({ selector: selector.trim().replace(/\s+/g, ' '), body }));

/** The `background` values a rule declares, as written. A rule may declare one. */
const backgroundIn = (body) => {
  const value = /(?:^|;)\s*background(?:-color)?\s*:\s*([^;]+)/.exec(body);
  return value ? value[1].trim() : undefined;
};

/**
 * Every background a selector is given, in document order, across every rule whose
 * selector list contains it. See EVERY FILL, NOT THE FIRST ONE in the header.
 */
const fillsOf = (selector, css = rules) => css
  .filter((rule) => selectorsOf(rule.selector).includes(selector))
  .map((rule) => backgroundIn(rule.body))
  .filter(Boolean);

/**
 * The selected items, each with the selector that paints it, the selector that paints
 * the ground under it, and what that ground is. `ground` is named rather than read,
 * because which container an item ends up in is not in the stylesheets.
 */
const SUBJECTS = [
  // All three spellings segmented() can emit, because each is a rule a consumer sheet
  // can override on its own and the pill is only marked if every one of them steps.
  ...['[aria-pressed="true"]', '[aria-selected="true"]', '.is-active'].map((state) => ({
    name: `the chosen pill in a segmented group (${state})`,
    rule: `.ui-seg button${state}`, ground: '--surface',
    paintedBy: '.ui-seg, the strip\'s own track, which segmented.css paints --surface',
  })),
  {
    name: 'the row a menu would pick',
    rule: '.ui-dropdown__item.is-active', ground: '--bg-elevated',
    paintedBy: '.ui-dropdown__panel, which dropdown.css paints --bg-elevated',
  },
  {
    name: 'the row the command palette would run',
    rule: '.ui-cmdk__item.is-active', ground: '--bg-elevated',
    paintedBy: '.ui-cmdk__panel, through --cmdk-surface',
  },
  {
    name: "the folded rail's current plate",
    rule: '.ui-nav--side.is-collapsed .ui-nav__item.is-active::before', ground: '--surface',
    paintedBy: '.ui-app__rail, which layout.css paints --surface',
  },
  {
    name: "the folded shell rail's current plate",
    rule: ':where(.ui-app.is-collapsed) .ui-app__rail .ui-nav__item.is-active::before', ground: '--surface',
    paintedBy: '.ui-app__rail, which layout.css paints --surface',
  },
  {
    name: "the shell rail's current plate below the phone step",
    rule: '.ui-app__rail .ui-nav__item.is-active::before', ground: '--surface',
    paintedBy: '.ui-app__rail, which layout.css paints --surface',
  },
];

/**
 * A selected fill this gate does NOT measure, and the reason. Each one is asserted to
 * still resolve to a rule below, so an exclusion cannot outlive its selector.
 */
const EXCLUSIONS = [
  {
    rule: '.ui-nav__item.is-active',
    why: 'the open rail\'s current row. Its mark is the 3px accent marker in its own '
      + 'padding and a --border hairline, which is #475\'s subject and is reworked to a '
      + 'plate on #593. #578 changes only what the BAND on this row is made of, so the '
      + 'row keeps the look it shipped with and the two changes do not collide.',
  },
  {
    rule: '.ui-pager__page.is-current:not([disabled])',
    why: 'the one selected mark #578 round r34 left as an edge, recorded beside its rule '
      + 'in src/styles/pagination.css and open for Artur. A pager stands on the page in '
      + 'one showcase and on a card in another: --surface steps off the page at 1.110:1 '
      + 'and off a card at 1.000:1, so no fill marks the current page on both grounds, '
      + 'and this gate has no single ground to measure it against.',
  },
];

/** What a declared value paints in one theme. */
const paint = (value, theme) => {
  const vars = tokensFor(theme, 'default');
  const colour = parseColour(substitute(value, vars));
  assert.ok(colour, `${value} is not a colour this gate can read in ${theme}`);
  return colour;
};

const against = (fill, ground, theme) => ratio(paint(fill, theme), paint(`var(${ground})`, theme));

// ---- discovery ------------------------------------------------------------------

/** `:not(...)` groups removed, so a rule ABOUT a row that is not selected is not one. */
const withoutNot = (selector) => {
  let out = selector;
  for (;;) {
    const next = out.replace(/:not\([^()]*\)/g, '');
    if (next === out) return out;
    out = next;
  }
};
const SELECTED = /\.is-active|\.is-current|\.is-selected|\[aria-pressed="true"\]|\[aria-selected="true"\]/;
const INTERACTION = /:hover|:focus|:active\b/;
/** The compound the rule is ABOUT: the one after the last combinator. */
const subjectCompound = (selector) => withoutNot(selector).split(/\s+|>|\+|~/).filter(Boolean).at(-1) ?? '';

const discovered = rules.flatMap((rule) => {
  const fill = backgroundIn(rule.body);
  if (!fill) return [];
  return selectorsOf(rule.selector)
    .filter((selector) => SELECTED.test(subjectCompound(selector)))
    .filter((selector) => !INTERACTION.test(withoutNot(selector)))
    .map((selector) => ({ selector, fill }));
});

const measured = new Set(SUBJECTS.map((s) => s.rule));
const excluded = new Set(EXCLUSIONS.map((e) => e.rule));
const noFill = ({ fill }) => /^(?:none|transparent)$/.test(fill);
const accent = ({ fill }) => /var\(\s*--(?:accent|glow-|signal-)/.test(fill);
test('every selected fill in the kit is measured here or answered here', () => {
  const unanswered = [];
  const buckets = { subject: [], 'no fill': [], accent: [], excluded: [] };
  for (const found of discovered) {
    if (measured.has(found.selector)) buckets.subject.push(found);
    else if (excluded.has(found.selector)) buckets.excluded.push(found);
    else if (noFill(found)) buckets['no fill'].push(found);
    else if (accent(found)) buckets.accent.push(found);
    else unanswered.push(found);
  }
  assert.deepEqual(unanswered, [],
    'a selected item paints a fill this gate neither measures nor answers: '
    + unanswered.map((f) => `${f.selector} -> ${f.fill}`).join('; ')
    + '. Add it to SUBJECTS with the ground its own component paints, or to EXCLUSIONS '
    + 'with the reason and the issue that owns it. A selected mark that nothing measures '
    + 'is how the chosen segmented pill shipped at 1.000:1 on its own track (#590 review)');
  // Anti-vacuity: discovery ran, and each bucket's predicate was exercised by real rules.
  for (const [name, found] of Object.entries(buckets)) {
    assert.ok(found.length > 0, `the "${name}" bucket matched nothing — discovery is not reading the sheets`);
  }
});

test('every subject and every exclusion still names a rule that exists', () => {
  for (const subject of SUBJECTS) {
    const fills = fillsOf(subject.rule);
    assert.ok(fills.length > 0,
      `${subject.rule} is given no background by any rule; move or retire this subject`);
    assert.ok(discovered.some((found) => found.selector === subject.rule),
      `${subject.rule} is not discovered as a selected fill; this subject measures nothing`);
  }
  for (const exclusion of EXCLUSIONS) {
    assert.ok(discovered.some((found) => found.selector === exclusion.rule),
      `${exclusion.rule} is excluded but no longer paints a selected fill; drop the exclusion`);
  }
});

for (const theme of ['light', 'dark']) {
  test(`a selected item's highlight is visible on its own ground: ${theme}`, () => {
    for (const subject of SUBJECTS) {
      const fills = fillsOf(subject.rule);
      assert.ok(fills.length > 0, `${subject.rule} is given no background at all`);
      for (const fill of fills) {
        const contrast = against(fill, subject.ground, theme);
        assert.ok(contrast >= FILL_FLOOR,
          `${subject.name}: ${fill} on ${subject.ground} measures `
          + `${contrast.toFixed(3)}:1 in ${theme}, under the ${FILL_FLOOR}:1 floor. Its ground is `
          + `${subject.paintedBy}. A selected item is marked by a background highlight since `
          + '#578 round r34, so a fill that does not step is an item with no mark on it');
        assert.ok(Number.isFinite(contrast) && contrast >= 1, `${subject.name} did not resolve to a pair`);
      }
    }
  });
}

test('the fill gate rejects a highlight that does not step off its ground', () => {
  // The exact regression this exists for: --surface on a --bg-elevated panel, which is
  // what the menu row and the palette row painted until #578 round r34 and which is
  // 1.000:1 in light. Read through the gate's own arithmetic, not a paraphrase.
  const flat = against('var(--surface)', '--bg-elevated', 'light');
  assert.equal(flat.toFixed(3), '1.000',
    'light --surface and --bg-elevated have come apart; this gate\'s subject has changed');
  assert.ok(flat < FILL_FLOOR, 'the floor no longer rejects the fill that was invisible');
  // And the fill each item actually takes clears it in both themes, by more than rounding.
  for (const theme of ['light', 'dark']) {
    for (const subject of SUBJECTS) {
      for (const fill of fillsOf(subject.rule)) {
        assert.ok(against(fill, subject.ground, theme) > flat,
          `${subject.name} is no better than the flat pair in ${theme}`);
      }
    }
  }
});

test('a later rule that flattens a subject\'s fill fails this gate', () => {
  // The #590 review's mutation, run here against every subject rather than reported as
  // a gap: append a rule that repaints the item in its own ground, which is what a
  // consumer sheet or a careless override does, and watch the reading reject it. The
  // reading is fillsOf + against, the same path the measurements above use.
  for (const subject of SUBJECTS) {
    const flattened = [...rules, { selector: subject.rule, body: `background: var(${subject.ground});` }];
    const fills = fillsOf(subject.rule, flattened);
    assert.ok(fills.length > fillsOf(subject.rule).length, 'the mutation did not reach the reading');
    const worst = Math.min(...fills.map((fill) => against(fill, subject.ground, 'light')));
    assert.ok(worst < FILL_FLOOR,
      `${subject.name} still passes with a later rule repainting it var(${subject.ground}) — `
      + 'the reading is taking one declaration and ignoring the rest, which is the defect '
      + 'the #590 review found. Measure every background the selector is given');
  }
});
