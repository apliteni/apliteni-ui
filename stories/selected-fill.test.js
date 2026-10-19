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
// background, has to land in one of four buckets or this gate fails naming it:
//
//  - a SUBJECT, measured below;
//  - NO FILL, a rule that takes a fill away (`none`, `transparent`) because the mark is
//    somewhere else — the underline strip's bar, the folded rail's plate;
//  - an ACCENT mark, whose contrast is the accent ledger's subject and
//    stories/contrast.test.js's, not a step between two surfaces;
//  - a named EXCLUSION, each with the issue that owns it; none stands today.
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
// showcase and on a card in another, so its accent fill is checked against both grounds
// in a test of its own.
// Interaction states (`:hover`, `:focus-visible`) are not discovered — they paint over
// the mark rather than being it, and stories/focus-ring.test.js owns what focus draws.
// `@media (forced-colors: active)` is dropped whole: the mode repaints author colours,
// and a ratio between two system colours is not a number this gate can hold anyone to.
// This reads the sheets as text and measures no pixels.
//
// why: docs/foundations.md#the-focus-ring
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { JSDOM } from 'jsdom';
import { AA_TEXT, parseColour, ratio, substitute, tokensFor } from './lib/contrast.js';
import { pagination } from '../src/components/pagination.js';
import { sidebarNav } from '../src/components/nav.js';
import { commandPaletteList } from '../src/components/command-palette.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** The floor a fill has to clear to read as a fill. See the header. */
export const FILL_FLOOR = 1.1;

/** Comments blanked, newlines kept, so a reason beside a rule is never read as CSS. */
const decomment = (css) => css.replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ' '));

/** `@media (forced-colors: active) { ... }` removed whole, braces matched. */
const dropForcedColours = (css) => {
  let out = css;
  for (;;) {
    const at = out.search(/@media\s*\(\s*forced-colors\s*:\s*active\s*\)[^{]*\{/);
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
  .flatMap((rule) => {
    const fill = backgroundIn(rule.body);
    // The phone shell removes the row fill and paints its measured plate instead.
    if (selector === '.ui-app__rail .ui-nav__item.is-active'
      && fill === 'none' && /^\s*isolation:\s*isolate;\s*background:\s*none;\s*$/.test(rule.body)) {
      const plate = fillsOf('.ui-app__rail .ui-nav__item.is-active::before', css);
      assert.ok(plate.length, 'the folded shell row has no replacement plate');
      return plate;
    }
    return fill ? [fill] : [];
  });

/**
 * The selected items, each with the selector that paints it, the selector that paints
 * the ground under it, and what that ground is. `ground` is named rather than read,
 * because which container an item ends up in is not in the stylesheets.
 */
const SUBJECTS = [
  ...['.is-active', '[aria-pressed="true"]', '[aria-selected="true"]'].map((state) => ({
    name: `the disabled selected segmented pill (${state})`,
    rule: `.ui-seg button${state}:where(:disabled)`, ground: '--surface',
    paintedBy: '.ui-seg, which paints --surface',
  })),
  {
    name: 'the disabled current page of a busy pager',
    rule: '.ui-pager__page.is-current[disabled]', ground: '--surface',
    paintedBy: 'a card; on the bare page the weight and ink carry the mark',
  },
  {
    name: "the standalone rail's current row",
    rule: '.ui-nav__item.is-active', ground: '--bg',
    paintedBy: 'the page ground; layout.css overrides this fill inside a shell',
  },
  {
    name: "the open shell rail's current row",
    rule: '.ui-app__rail .ui-nav__item.is-active', ground: '--surface',
    paintedBy: '.ui-app__rail, which layout.css paints --surface',
  },
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
    name: "the folded standalone rail's current plate",
    rule: '.ui-nav--side.is-collapsed .ui-nav__item.is-active::before', ground: '--bg',
    paintedBy: 'the page ground; layout.css overrides this plate inside a shell',
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
const EXCLUSIONS = [];

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
const noFill = ({ fill }) => /^(?:none|transparent)$/.test(fill);
const accent = ({ fill }) => /var\(\s*--(?:accent|glow-|signal-)/.test(fill);
test('every selected fill in the kit is measured here or answered here', () => {
  const unanswered = [];
  const buckets = { subject: [], 'no fill': [], accent: [] };
  for (const found of discovered) {
    if (measured.has(found.selector)) buckets.subject.push(found);
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

// Removing a fill is not the same as moving the mark to the folded shell's plate.
test('a later rule that removes a selected fill fails this gate', () => {
  for (const subject of SUBJECTS) {
    const removed = [...rules, { selector: subject.rule, body: 'background: none;' }];
    assert.ok(fillsOf(subject.rule, removed).includes('none'),
      `${subject.name}: the reading ignored a removed selection fill`);
    assert.throws(() => against('none', subject.ground, 'light'), /not a colour/);
  }
});

// This source check covers every selected spelling and accent. The contrast ledger
// measures label ink and interaction states; browser evidence covers painted pixels.
test('segmented pills use an accent mark with at least 3:1 against their track', () => {
  const accents = ['default', ...new Set([...readFileSync(path.join(root, 'src/tokens/accents.css'), 'utf8')
    .matchAll(/data-accent="([^"]+)"/g)].map((match) => match[1]))];
  assert.ok(accents.length >= 4, 'accent discovery lost a shipped accent');
  const states = ['[aria-pressed="true"]', '[aria-selected="true"]', '.is-active'];
  let count = 0;
  for (const state of states) {
    const selector = `.ui-seg button${state}`;
    const marks = discovered.filter((found) => found.selector === selector);
    assert.ok(marks.length > 0, `${selector}: no selected fill found`);
    assert.ok(!measured.has(selector), `${selector}: an accent mark is still a grey-fill subject`);
    for (const mark of marks) {
      assert.ok(accent(mark), `${selector}: the selected mark must enter the accent ledger`);
      for (const theme of ['light', 'dark']) for (const name of accents) {
        const vars = tokensFor(theme, name);
        const fill = parseColour(substitute(mark.fill, vars));
        const track = parseColour(substitute('var(--surface)', vars));
        assert.ok(fill && track, `${theme}/${name}: unresolved paint`);
        assert.ok(ratio(fill, track) >= 3, `${theme}/${name}: selected fill is below 3:1`);
        count += 1;
      }
    }
  }
  assert.equal(count, states.length * accents.length * 2);
});

// Source paint only. Browser evidence must also check the winning disabled ink.
test('disabled selected pills retain the quiet fill and readable ink in both themes', () => {
  for (const state of ['.is-active', '[aria-pressed="true"]', '[aria-selected="true"]']) {
    const fills = fillsOf(`.ui-seg button${state}:where(:disabled)`);
    assert.deepEqual(fills, ['var(--surface-3)']);
    for (const theme of ['light', 'dark']) {
      assert.ok(against('var(--disabled-ink)', '--surface-3', theme) >= 5);
    }
  }
});

test('the pager current page uses an accent mark with at least 3:1 against a page and a card', () => {
  const accents = ['default', ...new Set([...readFileSync(path.join(root, 'src/tokens/accents.css'), 'utf8')
    .matchAll(/data-accent="([^"]+)"/g)].map((match) => match[1]))];
  const selector = '.ui-pager__page.is-current:not([disabled])';
  const marks = discovered.filter((found) => found.selector === selector);
  assert.ok(marks.length > 0, `${selector}: no selected fill found`);
  assert.ok(marks.every(accent), `${selector}: the selected mark must enter the accent ledger`);
  let count = 0;
  for (const mark of marks) for (const theme of ['light', 'dark']) for (const name of accents) {
    const vars = tokensFor(theme, name);
    const fill = parseColour(substitute(mark.fill, vars));
    for (const ground of ['--bg', '--surface']) {
      const under = parseColour(substitute(`var(${ground})`, vars));
      assert.ok(fill && under, `${theme}/${name}: unresolved paint`);
      assert.ok(ratio(fill, under) >= 3, `${theme}/${name}: current page on ${ground} is below 3:1`);
      count += 1;
    }
  }
  assert.equal(count, marks.length * accents.length * 2 * 2);
});

// A busy pager must not look live, and its current page must still be marked: it takes the
// mark a disabled selected Segmented pill takes. Fails when the rule is missing (the page
// then has no fill, weight 500 and the bare ghost ink). Source paint only; the React half
// is in react/src/Pagination.test.tsx.
test('a busy numbered pager keeps the quiet fill, semibold weight and readable ink on its current page', () => {
  const html = pagination({ page: 4, pageSize: 10, total: 400, variant: 'numbered', loading: true });
  assert.match(html, /ui-pager__page is-current"[^>]* disabled aria-disabled="true"[^>]*>4</,
    'the busy pager no longer emits a disabled current page');
  const selector = '.ui-pager__page.is-current[disabled]';
  assert.deepEqual(fillsOf(selector), ['var(--surface-3)']);
  const body = rules.filter((rule) => selectorsOf(rule.selector).includes(selector)).map((rule) => rule.body).join(';');
  assert.match(body, /font-weight:\s*var\(--weight-semibold\)/);
  assert.match(body, /color:\s*var\(--disabled-ink\)/);
  assert.ok(!/hover/.test(selector));
  for (const theme of ['light', 'dark']) {
    // Limit: on the bare page ground in light the same fill is 1.03:1, as it is for the Segmented pill;
    // the weight and the ink carry the mark there. Only the card ground is held to the fill floor.
    assert.ok(against('var(--surface-3)', '--surface', theme) >= FILL_FLOOR, `${theme}: fill on a card does not step`);
    assert.ok(against('var(--disabled-ink)', '--surface-3', theme) >= AA_TEXT,
      `${theme}: the busy current page label is under the text floor on its fill`);
  }
});

// Forced-colour coverage is limited to these sheets and the fixtures below.
// Discovery includes state rules without fills and pseudo-elements. Child paint
// belongs to its selected parent. The source half checks the declared system-colour fill.
// The browser half checks the cascade and measures computed outlines,
// the fill against Canvas and the label against the fill, not Windows themes or screenshot pixels.
// Run it with SELECTED_FORCED=1 and UI_PLAYWRIGHT pointing at Playwright.
const forcedFiles = ['nav', 'layout', 'command-palette', 'segmented', 'pagination'];
const forcedSource = forcedFiles.map((name) => readFileSync(path.join(root, `src/styles/${name}.css`), 'utf8')).join('\n');
const readRules = (css) => [...decomment(css).matchAll(/([^{}]+)\{([^{}]*)\}/g)]
  .filter(([, selector]) => !selector.trim().startsWith('@'))
  .flatMap(([, selector, body]) => selectorsOf(selector).map((selector) => ({ selector, body })));
const forcedSubjects = [...new Set(readRules(dropForcedColours(forcedSource))
  .map(({ selector }) => selector)
  .filter((selector) => SELECTED.test(withoutNot(selector)) && !INTERACTION.test(withoutNot(selector)))
  .map((selector) => selector.replace(/^:where\(:root\[[^\]]*\]\)\s*/, ''))
  .map((selector) => {
    const parts = selector.split(/\s+/);
    const selected = parts.findLastIndex((part) => SELECTED.test(withoutNot(part)));
    return parts.slice(0, selected + 1).join(' ');
  })
  // Accent swatches keep a border tick, covered by accent-mark.test.js.
  .filter((selector) => !selector.startsWith('.ui-accent-picker'))
  .map((selector) => selector.replace(/::(?:before|after)$/, '')))];
const row = '<a href="#" class="ui-nav__item is-active">Selected</a>';
const forcedFixtures = [
  ...['is-active', 'aria-pressed="true"', 'aria-selected="true"'].flatMap((state) => ['', 'ui-seg--underline'].map((kind) => [
    `segmented ${kind} ${state}`, `<div class="ui-seg ${kind}"><button ${state === 'is-active' ? 'class="is-active"' : state}>Selected</button></div>`,
  ])),
  ...['is-active', 'aria-pressed="true"', 'aria-selected="true"'].map((state) => [
    `disabled segmented ${state}`, `<div class="ui-seg"><button disabled ${state === 'is-active' ? 'class="is-active"' : state}>Selected</button></div>`,
  ]),
  ['current group', '<nav class="ui-nav"><button class="ui-nav__item ui-nav__toggle is-current">Selected group</button></nav>'],
  ['standalone row', `<nav class="ui-nav">${row}</nav>`],
  ['folded standalone row', `<nav class="ui-nav ui-nav--side is-collapsed">${row}</nav>`],
  ['shell row', `<div class="ui-app"><nav class="ui-app__rail ui-nav">${row}</nav></div>`],
  ['folded shell row', `<div class="ui-app is-collapsed"><nav class="ui-app__rail ui-nav">${row}</nav></div>`],
  ...['', 'is-pill', 'is-underline'].map((kind) => [`tab ${kind}`, `<nav class="ui-nav ui-nav--tabs ${kind}"><a href="#" class="ui-nav__tab is-active">Selected</a></nav>`]),
  ['current crumb', '<nav class="ui-nav__crumbs"><span class="ui-nav__crumb is-current">Selected</span></nav>'],
  ['pager current page', '<nav class="ui-pager"><button class="ui-btn ui-pager__page is-current" aria-current="page">4</button></nav>'],
  ['busy pager current page', '<nav class="ui-pager"><button class="ui-btn ui-pager__page is-current" aria-current="page" disabled aria-disabled="true">4</button></nav>'],
  ...['', 'ui-cmdk--roomy'].flatMap((density) => ['', 'is-danger'].map((danger) => [
    `palette ${density} ${danger}`,
    `<div class="ui-cmdk is-open ${density}"><div class="ui-cmdk__panel"><div class="ui-cmdk__list"><div class="ui-cmdk__item is-active ${danger}" role="option"><span class="ui-cmdk__label">Selected</span></div></div></div></div>`,
  ])),
];
const fixtureDocument = new JSDOM(forcedFixtures.map(([, html]) => html).join('')).window.document;

function checkForcedRules(css) {
  // Removing normal rules leaves only the forced-colour blocks for this check.
  const normalRules = new Set(readRules(dropForcedColours(css)).map((rule) => JSON.stringify(rule)));
  const marks = readRules(css).filter((rule) => !normalRules.has(JSON.stringify(rule)))
    // A disabled selection takes GrayText with Canvas ink, so it never looks live.
    .filter(({ body }) => /forced-color-adjust:\s*none\s*;/.test(body)
      && /(?:^|[\s;])background:\s*(?:Highlight|GrayText)\s*(?:!important\s*)?;/.test(body)
      && /(?:^|[\s;])color:\s*(?:HighlightText|Canvas)\s*(?:!important\s*)?;/.test(body));
  assert.ok(forcedSubjects.length >= 10, 'forced-colour discovery lost selected states');
  for (const selector of forcedSubjects) {
    const elements = [...fixtureDocument.querySelectorAll(selector)];
    assert.ok(elements.length, `no forced-colour fixture covers ${selector}`);
    for (const element of elements) {
      assert.ok(marks.some((mark) => element.matches(mark.selector)), `${selector} has no forced-colour fill`);
    }
  }
}

test('every selected state has a forced-colour mark and a fixture', () => checkForcedRules(forcedSource));
test('the forced-colour gate rejects background-only selected states', () => {
  assert.throws(() => checkForcedRules(dropForcedColours(forcedSource)), /no forced-colour fill/);
});

// The designer review's four findings on the fill look, each held by a case that fails
// without its fix (the mutations below delete exactly that fix). Source half; the
// Chromium half below measures the cascade that wins.
const fixtureElements = new Map();
const fixtureElement = (name) => {
  if (!fixtureElements.has(name)) {
    const html = forcedFixtures.find(([label]) => label === name)?.[1];
    assert.ok(html, `no forced-colour fixture named ${name}`);
    fixtureElements.set(name, new JSDOM(html).window.document.querySelector('.is-active, .is-current, [aria-pressed="true"], [aria-selected="true"]'));
  }
  return fixtureElements.get(name);
};
const stripPseudo = (selector) => selector.replace(/::(?:before|after)$/, '');
const pseudoOf = (selector) => /::(before|after)$/.exec(selector)?.[1];
/** Forced-colour rules only, with the pseudo-element their selector names. */
const forcedRulesOf = (css) => {
  const normal = new Set(readRules(dropForcedColours(css)).map((rule) => JSON.stringify(rule)));
  return readRules(css).filter((rule) => !normal.has(JSON.stringify(rule)))
    .map((rule) => ({ ...rule, pseudo: pseudoOf(rule.selector), subject: stripPseudo(rule.selector) }));
};
const declares = (body, property, value) => new RegExp(`(?:^|[\\s;])${property}:\\s*${value}\\s*(?:!important\\s*)?(?:;|$|/)`).test(body);

function checkForcedFixes(css) {
  const forced = forcedRulesOf(css);
  const matching = (name, pseudo) => forced.filter((rule) => rule.pseudo === pseudo && fixtureElement(name).matches(rule.subject));
  // B1: a folded row is an icon strip; the plate carries the fill, so the row paints none.
  for (const name of ['folded shell row', 'folded standalone row']) {
    // The desktop fold needs its own rule: the phone rule would match the same row by class alone.
    assert.ok(matching(name).some((rule) => declares(rule.body, 'background', 'none') && /is-collapsed/.test(rule.subject))
      || name === 'folded standalone row', `${name}: the folded row is filled; only its plate may be`);
  }
  assert.ok(/@media \(forced-colors: active\) and \(max-width: 720px\)\s*\{[^{}]*\{[^{}]*background:\s*none/.test(css),
    'the phone fold has no forced-colour rule that keeps the row unfilled');
  // B2 and B4: the underline bar is not drawn, for tabs and for Segmented, so the fill is the one mark.
  assert.ok(matching('tab is-underline', 'after').some((rule) => declares(rule.body, 'display', 'none')),
    'the underline tab draws its accent bar inside the fill');
  for (const state of ['is-active', 'aria-pressed="true"', 'aria-selected="true"']) {
    assert.ok(matching(`segmented ui-seg--underline ${state}`, 'before').some((rule) => declares(rule.body, 'display', 'none')),
      `the underline Segmented choice (${state}) draws a bar inside the fill`);
  }
  assert.ok(!forced.some((rule) => /ui-seg--underline/.test(rule.selector) && declares(rule.body, 'background', 'Highlight')),
    'a Highlight bar sits on the Highlight fill of an underline Segmented choice');
  // B3: a disabled selected control does not take the live pair.
  for (const name of ['disabled segmented is-active', 'disabled segmented aria-pressed="true"',
    'disabled segmented aria-selected="true"', 'busy pager current page']) {
    assert.ok(matching(name).some((rule) => declares(rule.body, 'background', 'GrayText')),
      `${name} takes no disabled system colour`);
    // The pager's live rule is guarded; Segmented's is not, so the disabled rule must out-rank it
    // with :disabled. Source reading cannot run the cascade; the Chromium half below does.
    const guard = name.startsWith('busy pager') ? /:not\(\[disabled\]\)/ : /:disabled/;
    const gray = matching(name).filter((rule) => declares(rule.body, 'background', 'GrayText'));
    const live = matching(name).filter((rule) => declares(rule.body, 'background', 'Highlight'));
    assert.ok(name.startsWith('busy pager') ? live.every((rule) => guard.test(rule.selector)) : gray.every((rule) => guard.test(rule.selector)),
      `${name} gets the live Highlight pair with no disabled guard`);
  }
}

test('the forced-colour fixes for the fill hold', () => checkForcedFixes(forcedSource));
test('the forced-colour fix gate rejects each missing fix', () => {
  const without = (pattern) => forcedSource.replace(pattern, (m) => m.replace(/[^\n]/g, ' '));
  const mutations = [
    ['B1 folded row', /\.ui-app\.is-collapsed \.ui-app__rail \.ui-nav__item:is\(\.is-active, \.is-current\) \{[^{}]*\}/, /folded row is filled/],
    ['B1 phone fold', /@media \(forced-colors: active\) and \(max-width: 720px\)\s*\{(?:[^{}]*\{[^{}]*\})+\s*\}/, /phone fold/],
    ['B2 tab bar', /\.ui-nav--tabs\.is-underline \.ui-nav__tab\.is-active::after \{ display: none[^{}]*\}/, /accent bar inside the fill/],
    ['B3 disabled segmented', /\.ui-seg button\.is-active:disabled,[^{}]*\{[^{}]*\}/, /no disabled system colour/],
    ['B3 busy pager', /\.ui-pager__page\.is-current\[disabled\] \{\s*forced-color-adjust[^{}]*\}/, /no disabled system colour/],
  ];
  for (const [label, pattern, message] of mutations) {
    assert.ok(pattern.test(forcedSource), `${label}: the mutation no longer finds its target`);
    assert.throws(() => checkForcedFixes(without(pattern)), message, label);
  }
  // B4 is a rule that must stay absent: put the old bar back.
  assert.throws(() => checkForcedFixes(`${forcedSource}\n@media (forced-colors: active) {\n.ui-seg--underline button.is-active::before { background: Highlight; }\n}`),
    /Highlight bar sits on the Highlight fill/);
});

test('selected marks survive forced colours in Chromium', { skip: process.env.SELECTED_FORCED !== '1' }, async () => {
  const { chromium } = await import(process.env.UI_PLAYWRIGHT || 'playwright');
  const browser = await chromium.launch({ headless: true, ...(process.env.UI_CHROME ? { executablePath: process.env.UI_CHROME } : {}) });
  try {
    const css = [...readFileSync(path.join(root, 'src/index.css'), 'utf8').matchAll(/@import "(.+?)";/g)]
      .map(([, file]) => readFileSync(path.join(root, 'src', file), 'utf8')).join('\n');
    let measured = 0;
    for (const scheme of ['light', 'dark']) {
      const page = await browser.newPage({ forcedColors: 'active', colorScheme: scheme, reducedMotion: 'reduce' });
      await page.setContent(`<style>${css}</style>`);
      for (const width of [390, 600, 1280]) {
        await page.setViewportSize({ width, height: 900 });
        for (const [name, html] of forcedFixtures) {
          await page.evaluate((markup) => { document.body.innerHTML = markup; }, html);
          const result = await page.evaluate(() => {
            const element = document.querySelector('.is-active, .is-current, [aria-pressed="true"], [aria-selected="true"]');
            const style = getComputedStyle(element);
            const rect = element.getBoundingClientRect();
            const canvas = document.createElement('span');
            canvas.style.background = 'Canvas';
            document.body.append(canvas);
            const plate = getComputedStyle(element, '::before');
            const fill = style.backgroundColor === 'rgba(0, 0, 0, 0)' ? plate.backgroundColor : style.backgroundColor;
            const gray = document.createElement('span');
            gray.style.background = 'GrayText';
            document.body.append(gray);
            return {
              rowFill: style.backgroundColor, plateFill: plate.backgroundColor,
              plateReady: plate.content !== 'none' && plate.content !== 'normal'
                && plate.display !== 'none' && plate.visibility === 'visible'
                && Number(plate.opacity) > 0 && parseFloat(plate.width) > 0 && parseFloat(plate.height) > 0,
              barBefore: getComputedStyle(element, '::before').display,
              barAfter: getComputedStyle(element, '::after').display,
              grayText: getComputedStyle(gray).backgroundColor,
              active: matchMedia('(forced-colors: active)').matches,
              adjust: style.forcedColorAdjust, fill, ink: style.color,
              ground: getComputedStyle(canvas).backgroundColor,
              rect: { width: rect.width, height: rect.height },
            };
          });
          const label = `${name}, ${width}px, ${scheme}`;
          assert.ok(result.active, label);
          assert.equal(result.adjust, 'none', `${label}: the pair needs forced-color-adjust: none`);
          assert.ok(result.rect.width > 4 && result.rect.height > 4, `${label}: empty mark`);
          assert.ok(ratio(parseColour(result.fill), parseColour(result.ground)) >= 3, `${label}: fill blends into Canvas`);
          assert.ok(ratio(parseColour(result.ink), parseColour(result.fill)) >= AA_TEXT, `${label}: label is unreadable on the fill`);
          const disabled = /^(?:disabled segmented|busy pager)/.test(name);
          assert.equal(result.fill === result.grayText, disabled,
            `${label}: ${disabled ? 'a disabled selection must take GrayText' : 'a live selection must not take GrayText'}`);
          const folded = name.startsWith('folded') || (name === 'shell row' && width <= 720);
          if (folded) {
            assert.equal(result.rowFill, 'rgba(0, 0, 0, 0)', `${label}: the folded row is filled, not just its plate`);
            assert.ok(result.plateReady, `${label}: the folded plate is not generated and visible`);
            assert.notEqual(result.plateFill, 'rgba(0, 0, 0, 0)', `${label}: the folded plate has no fill`);
          }
          if (name === 'tab is-underline') assert.equal(result.barAfter, 'none', `${label}: the underline bar shows inside the fill`);
          if (name.startsWith('segmented ui-seg--underline')) assert.equal(result.barBefore, 'none', `${label}: the underline bar shows inside the fill`);
          measured += 1;
        }
      }
      await page.close();
    }
    assert.equal(measured, forcedFixtures.length * 6);
  } finally {
    await browser.close();
  }
});

// The children of a selected item. `forced-color-adjust: none` is inherited, so every
// child that paints its own colour keeps the kit's colour unless it is repainted. The
// test above reads the selected element only; this one reads each child, and each state
// the item can be in, and expects an exact system colour. Each case names the keyword
// it expects, so a kit colour that happens to equal a system colour cannot pass for one.
// The mutation test below appends the defect each fix removed and expects a failure.
const toneBadge = (tone) => ({ text: 3, tone });
const shellOf = (collapsed, inner) => `<div class="ui-app${collapsed ? ' is-collapsed' : ''}"><div class="ui-app__rail">${inner}</div></div>`;
const rowOf = (item, extra = {}) => sidebarNav({ items: [{ id: 'a', label: 'Inbox', icon: 'home', href: '#', ...item }], active: 'a', ...extra });
const PAIR = { bg: 'Highlight', ink: 'HighlightText' };
const OFF = { bg: 'GrayText', ink: 'Canvas' };
const phone = (width) => width <= 720;
const palette = (item) => `<div class="ui-cmdk is-open"><div class="ui-cmdk__panel"><div class="ui-cmdk__list">${commandPaletteList([{ items: [{ id: 'p', label: 'Open', description: 'Go there', icon: 'home', badge: 'New', shortcut: ['⌘', 'K'], ...item }] }])}</div></div></div>`;
const group = (collapsed) => sidebarNav({
  items: [{ id: 'g', label: 'Settings', icon: 'home', open: true, items: [{ id: 'c', label: 'Profile', href: '#' }] }],
  active: 'c', collapsed,
});
/** A folded row paints no fill of its own; its plate does. */
const plateOf = (selector, expected) => [[selector, null, { bg: 'transparent' }], [selector, '::before', { bg: expected, plate: true }]];
const childFixtures = [
  ...['neutral', 'accent', 'live', 'danger'].map((tone) => ({
    name: `badge on a selected row (${tone})`, html: rowOf({ badge: toneBadge(tone) }),
    checks: () => [['.is-active', null, PAIR], ['.is-active .ui-nav__ic svg', null, { stroke: 'HighlightText' }], ['.ui-nav__badge', null, { bg: 'HighlightText', ink: 'Highlight' }]],
  })),
  {
    name: 'badge on a selected shell row', html: shellOf(false, rowOf({ badge: toneBadge('neutral') })),
    checks: (width) => (phone(width) ? plateOf('.is-active', 'Highlight')
      : [['.is-active', null, PAIR], ['.ui-nav__badge', null, { bg: 'HighlightText', ink: 'Highlight' }]]),
  },
  {
    name: 'badge on a selected tab', html: `<nav class="ui-nav ui-nav--tabs"><a href="#" class="ui-nav__tab is-active">Open<span class="ui-nav__badge is-neutral">3</span></a></nav>`,
    checks: () => [['.is-active', null, PAIR], ['.ui-nav__badge', null, { bg: 'HighlightText', ink: 'Highlight' }]],
  },
  ...['', 'is-danger'].map((danger) => ({
    name: `palette row with a shortcut ${danger}`.trim(), html: palette(danger ? { danger: true, confirm: 'Sure?' } : {}),
    checks: () => [['.ui-cmdk__item.is-active', null, PAIR], ['.ui-cmdk__label', null, { ink: 'HighlightText' }],
      ['.ui-cmdk__desc', null, { ink: 'HighlightText' }], ['.ui-cmdk__ic', null, { ink: 'HighlightText' }],
      ['.ui-cmdk__badge', null, { bg: 'HighlightText', ink: 'Highlight' }],
      ['.ui-cmdk__key', null, { bg: 'Highlight', ink: 'HighlightText', edge: 'HighlightText' }]],
  })),
  ...['hover', 'tab'].flatMap((act) => [
    {
      name: `folded shell row with its label (${act})`, html: shellOf(true, rowOf({})), act: act === 'hover' ? 'hover:.ui-nav__item' : 'tab',
      checks: () => [...plateOf('.is-active', 'Highlight'), ['.ui-nav__label', null, { bg: 'Canvas', ink: 'CanvasText', edge: 'CanvasText', shadow: 'none' }]],
    },
    {
      name: `folded shell current group with its label (${act})`, html: shellOf(true, group(true)), act: act === 'hover' ? 'hover:.ui-nav__toggle' : 'tab',
      checks: () => [...plateOf('.ui-nav__toggle.is-current', 'Highlight'), ['.ui-nav__toggle > .ui-nav__label', null, { bg: 'Canvas', ink: 'CanvasText', edge: 'CanvasText', shadow: 'none' }]],
    },
  ]),
  ...[[undefined, 'resting'], ['hover:.ui-nav__item', 'hover'], ['tab', 'keyboard focus']].flatMap(([act, state]) => [
    {
      name: `selected danger row (${state})`, html: rowOf({ danger: true, label: 'Sign out' }), act,
      checks: () => [['.is-active', null, { ...PAIR, ...(state === 'keyboard focus' ? { outline: 'CanvasText' } : {}) }]],
    },
    {
      name: `selected danger shell row (${state})`, html: shellOf(false, rowOf({ danger: true, label: 'Sign out' })), act,
      checks: (width) => (phone(width) ? plateOf('.is-active', 'Highlight')
        : [['.is-active', null, { ...PAIR, ...(state === 'keyboard focus' ? { outline: 'CanvasText' } : {}) }]]),
    },
  ]),
  {
    name: 'disabled selected nav item', html: rowOf({ disabled: true, badge: toneBadge('accent') }),
    checks: () => [['.is-active', null, OFF], ['.is-active .ui-nav__ic svg', null, { stroke: 'Canvas' }], ['.ui-nav__badge', null, { bg: 'Canvas', ink: 'GrayText' }]],
  },
  {
    name: 'disabled selected shell row', html: shellOf(false, rowOf({ disabled: true })),
    checks: (width) => (phone(width) ? plateOf('.is-active', 'GrayText') : [['.is-active', null, OFF]]),
  },
  { name: 'disabled selected folded standalone row', html: rowOf({ disabled: true }, { collapsed: true }), checks: () => plateOf('.is-active', 'GrayText') },
  { name: 'disabled selected folded shell row', html: shellOf(true, rowOf({ disabled: true })), checks: () => plateOf('.is-active', 'GrayText') },
  {
    name: 'nested current group, open', html: shellOf(false, group(false)),
    checks: (width) => (phone(width) ? [...plateOf('.ui-nav__toggle.is-current', 'Highlight'), ...plateOf('.ui-nav__item--sub.is-active', 'Highlight')]
      : [['.ui-nav__toggle.is-current', null, PAIR], ['.ui-nav__toggle.is-current .ui-nav__caret', null, { caret: 'HighlightText' }],
        ['.ui-nav__item--sub.is-active', null, PAIR]]),
  },
  {
    name: 'nested current group, desktop fold (standalone)', html: group(true),
    checks: () => [...plateOf('.ui-nav__toggle.is-current', 'Highlight'), ...plateOf('.ui-nav__item--sub.is-active', 'Highlight')],
  },
  {
    name: 'nested current group, desktop fold (shell)', html: shellOf(true, group(true)),
    checks: () => [...plateOf('.ui-nav__toggle.is-current', 'Highlight'), ...plateOf('.ui-nav__item--sub.is-active', 'Highlight')],
  },
  {
    name: 'nested current group, phone fold', html: shellOf(false, group(false)),
    only: phone, checks: () => [...plateOf('.ui-nav__toggle.is-current', 'Highlight'), ...plateOf('.ui-nav__item--sub.is-active', 'Highlight')],
  },
];

/** Measure every child fixture in Chromium. Returns the failures, so the mutation test can read them. */
async function measureChildren(browser, extraCss = '', changeCss = (css) => css) {
  const css = changeCss([...readFileSync(path.join(root, 'src/index.css'), 'utf8').matchAll(/@import "(.+?)";/g)]
    .map(([, file]) => readFileSync(path.join(root, 'src', file), 'utf8')).join('\n'));
  const failures = [];
  let measured = 0;
  for (const scheme of ['light', 'dark']) {
    const page = await browser.newPage({ forcedColors: 'active', colorScheme: scheme, reducedMotion: 'reduce' });
    await page.setContent(`<style>${css}${extraCss}</style>`);
    for (const width of [390, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      for (const fixture of childFixtures) {
        if (fixture.only && !fixture.only(width)) continue;
        await page.mouse.move(0, 0);
        await page.evaluate((markup) => { document.body.innerHTML = markup; document.activeElement?.blur?.(); }, fixture.html);
        if (fixture.act === 'tab') await page.keyboard.press('Tab');
        if (fixture.act?.startsWith('hover:')) await page.hover(fixture.act.slice(6));
        // A hover or focus starts a colour transition; reading before it ends reports the old colour.
        await page.evaluate(() => Promise.all(document.getAnimations().map((animation) => animation.finished.catch(() => {}))));
        const checks = fixture.checks(width);
        const results = await page.evaluate((list) => {
          const resolve = (keyword) => {
            if (keyword === 'transparent') return 'rgba(0, 0, 0, 0)';
            if (keyword === 'none') return 'none';
            const probe = document.createElement('span');
            probe.style.color = keyword;
            document.body.append(probe);
            const value = getComputedStyle(probe).color;
            probe.remove();
            return value;
          };
          return list.map(([selector, pseudo, expected]) => {
            const element = document.querySelector(selector);
            if (!element) return [selector, 'missing element'];
            const style = getComputedStyle(element, pseudo || undefined);
            const read = { bg: style.backgroundColor, ink: style.color, stroke: element.matches('svg') ? style.stroke : undefined,
              caret: style.borderRightColor, edge: style.borderTopColor, shadow: style.boxShadow,
              outline: style.outlineStyle === 'none' ? 'no outline' : style.outlineColor,
              plate: style.content !== 'none' && style.content !== 'normal'
                && style.display !== 'none' && style.visibility === 'visible'
                && Number(style.opacity) > 0 && parseFloat(style.width) > 0 && parseFloat(style.height) > 0 };
            return [selector + (pseudo || ''), Object.entries(expected).map(([key, keyword]) => {
              if (key === 'plate') return read.plate ? null : 'plate is not generated and visible';
              const want = resolve(keyword);
              return read[key] === want ? null : `${key} is ${read[key]}, expected ${keyword} (${want})`;
            }).filter(Boolean)];
          });
        }, checks);
        for (const [selector, problems] of results) {
          measured += 1;
          for (const problem of [].concat(problems)) failures.push(`${fixture.name}, ${width}px, ${scheme}: ${selector} ${problem}`);
        }
      }
    }
    await page.close();
  }
  return { failures, measured };
}

test('children of a selected item keep the system pair in every state', { skip: process.env.SELECTED_FORCED !== '1' }, async () => {
  const { chromium } = await import(process.env.UI_PLAYWRIGHT || 'playwright');
  const browser = await chromium.launch({ headless: true, ...(process.env.UI_CHROME ? { executablePath: process.env.UI_CHROME } : {}) });
  try {
    const { failures, measured } = await measureChildren(browser);
    assert.deepEqual(failures, []);
    assert.ok(measured >= childFixtures.length * 2 * 2, `only ${measured} child measurements were taken`);
  } finally {
    await browser.close();
  }
});

test('the child gate rejects each defect it was written for', { skip: process.env.SELECTED_FORCED !== '1' }, async () => {
  const { chromium } = await import(process.env.UI_PLAYWRIGHT || 'playwright');
  const browser = await chromium.launch({ headless: true, ...(process.env.UI_CHROME ? { executablePath: process.env.UI_CHROME } : {}) });
  const defects = [
    ['a badge that keeps its kit colours', '@media (forced-colors: active) { .ui-nav .ui-nav__item.is-active .ui-nav__badge.is-neutral { background: #211e2d !important; color: #fff !important; } }', /badge on a selected row \(neutral\)/],
    ['a shortcut cap that keeps its kit colours', '@media (forced-colors: active) { .ui-cmdk .ui-cmdk__item.is-active .ui-cmdk__key { background: #fff !important; color: #000 !important; } }', /palette row with a shortcut/],
    ['a floating label that keeps its kit colours', '@media (forced-colors: active) { .ui-app .ui-app__rail .ui-nav__item.is-active:hover > .ui-nav__label { background: #fff !important; color: #000 !important; box-shadow: 0 0 4px #000 !important; } }', /folded shell row with its label \(hover\)/],
    ['a danger row that keeps the author wash', '@media (forced-colors: active) { .ui-nav .ui-nav__item.is-active.is-danger:hover { background: #ffd7e0 !important; color: #a30032 !important; } }', /selected danger row \(hover\)/],
    ['a danger row that keeps the author ink in the shell', '@media (forced-colors: active) { .ui-app .ui-app__rail .ui-nav__item.is-active.is-danger { color: #a30032 !important; } }', /selected danger shell row \(resting\)/],
    ['a disabled selected row that takes the live pair', '@media (forced-colors: active) { .ui-nav .ui-nav__item.is-active.is-disabled { background: Highlight !important; color: HighlightText !important; } }', /disabled selected nav item/],
    ['a current group that fills its whole folded row', '@media (forced-colors: active) { .ui-nav--side.is-collapsed .ui-nav .ui-nav__item.is-current, .ui-nav--side.is-collapsed .ui-nav__item.is-current { background: Highlight !important; } }', /nested current group, desktop fold \(standalone\)/],
    ['a current group that fills its whole phone row', '@media (forced-colors: active) { .ui-app .ui-app__rail .ui-nav__item.is-current { background: Highlight !important; } }', /nested current group, phone fold/],
  ];
  try {
    for (const [label, extra, expected] of defects) {
      const { failures } = await measureChildren(browser, extra);
      assert.ok(failures.some((failure) => expected.test(failure)), `${label}: the gate did not fail on it`);
    }
  } finally {
    await browser.close();
  }
});

test('the browser gate rejects a folded plate without generated content', { skip: process.env.SELECTED_FORCED !== '1' }, async () => {
  const { chromium } = await import(process.env.UI_PLAYWRIGHT || 'playwright');
  const browser = await chromium.launch({ headless: true, ...(process.env.UI_CHROME ? { executablePath: process.env.UI_CHROME } : {}) });
  const withoutContent = (pattern, count) => (css) => {
    assert.equal([...css.matchAll(pattern)].length, count, 'the plate mutation lost its targets');
    return css.replace(pattern, '$1');
  };
  const mutations = [
    [/(\.ui-nav__item\.is-current:not\(\.is-active\)::before\s*\{\s*)content: "";/g, 3, /nested current group, (?:desktop fold|phone fold)/],
    [/(\.ui-nav--side\.is-collapsed \.ui-nav__item\.is-active::before\s*\{\s*)content: "";/g, 1, /disabled selected folded standalone row/],
  ];
  try {
    for (const [pattern, count, fixture] of mutations) {
      const { failures } = await measureChildren(browser, '', withoutContent(pattern, count));
      assert.ok(failures.some((failure) => fixture.test(failure) && /plate is not generated and visible/.test(failure)),
        'the browser gate accepted a missing folded plate');
    }
  } finally {
    await browser.close();
  }
});
