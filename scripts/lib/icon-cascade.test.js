/* Rule: folding a logical declaration onto its physical counterpart leaves the
 * cascade saying what a browser would say.
 *
 * The three icon-size gates measure `inline-size` by rewriting it onto `width`
 * before anything is mounted, because jsdom keeps the two in separate cascades
 * and would let the logical declaration win contests a browser makes it lose —
 * see foldLogicalDims() in icon-cascade.js. That rewrite is the one piece of
 * this machinery with a right answer of its own: inside a block the later
 * declaration wins, `!important` wins over both, and getting either wrong
 * produces a number rather than an error, so all three gates would keep passing
 * and measure the wrong rule.
 *
 * These cases are the ones a browser answers unambiguously. Each is written so
 * that the two candidate values are far enough apart that no arithmetic can make
 * a wrong fold look right.
 *
 * The refusals below are here for a different reason. foldLogicalDims() stops on
 * a writing-mode declaration, rulesOf() stops on an unfolded sheet and on a
 * sizing rule inside a conditional group, and clampsOn() reports the min-/max-
 * forms no gate measures. Every one of those fires only when a stylesheet
 * carries the shape it refuses, so the only way to find out whether one still
 * worked was to write that shape into the kit and watch a gate go red. Each case
 * here puts the shape in a sheet of its own instead.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { JSDOM } from 'jsdom';
import {
  CLAMP_PROPS,
  SIZING_PROPS,
  UNRESOLVED,
  blindSpots,
  clampsOn,
  declRe,
  droppedDecls,
  importsIn,
  foldLogicalDims,
  isSvgSubject,
  kitSheetNames,
  mount,
  resetSelectorOf,
  rulesOf,
  selectorParts,
  styleBlocksOf,
  styleImportsIn,
  svgClassSet,
  writtenAs,
} from './icon-cascade.js';

/* One sheet, folded, with an svg mounted inside `.a` and measured. The font-size
 * is forced for the same reason the gates force it: the reset is 1.1em, and at
 * 100px it reads 110px, which no declaration here asks for. */
function measure(css) {
  const dom = new JSDOM(`<!doctype html><html><head><style>${css}</style></head><body></body></html>`);
  const { document, getComputedStyle } = dom.window;
  const sheet = document.styleSheets[0];
  foldLogicalDims(sheet, 'probe.css');
  const box = document.createElement('div');
  box.className = 'a';
  box.style.fontSize = '100px';
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  box.appendChild(svg);
  document.body.appendChild(box);
  const style = getComputedStyle(svg);
  const rule = (sel) => [...sheet.cssRules].find((r) => r.selectorText === sel);
  return { width: style.getPropertyValue('width'), height: style.getPropertyValue('height'), rule };
}

/* One parsed sheet, unfolded and unmounted — everything the refusals need. The
 * <style> element is kept alive by the document the JSDOM holds, which matters
 * because foldLogicalDims() reads the raw text back off it. */
function sheetOf(css) {
  const dom = new JSDOM(`<!doctype html><html><head><style>${css}</style></head><body></body></html>`);
  return dom.window.document.styleSheets[0];
}

/** Every rule rulesOf() yields, since draining the generator is what makes it throw. */
const drain = (sheet) => [...rulesOf(sheet, 'probe.css', new Set())];

const RESET = 'svg:where(:not([width]):not([height])) { width: 1.1em; height: 1.1em }';

test('a logical declaration beats the reset the way its physical twin would', () => {
  // The whole reason the fold exists. Unfolded, jsdom leaves the reset holding
  // `width` and this reads 110px while a browser renders 33.
  const { width, height } = measure(`${RESET} .a svg { inline-size: 33px; block-size: 34px }`);
  assert.equal(width, '33px');
  assert.equal(height, '34px');
});

test('the folded declaration is still reported as the property the file spells', () => {
  const { rule } = measure('.a svg { inline-size: 33px }');
  assert.equal(writtenAs(rule('.a svg'), 'width'), 'inline-size',
    'a subject named after `width` sends the reader looking for a declaration the file does not have');
});

test('within a block the later declaration wins, logical or physical', () => {
  assert.equal(measure('.a svg { width: 10px; inline-size: 33px }').width, '33px');
  assert.equal(measure('.a svg { inline-size: 33px; width: 10px }').width, '10px');
});

test('within a block an important declaration wins wherever it sits', () => {
  assert.equal(measure('.a svg { width: 10px !important; inline-size: 33px }').width, '10px');
  assert.equal(measure('.a svg { inline-size: 33px !important; width: 10px }').width, '33px');
});

test('a block that straddles one axis with both spellings is refused', () => {
  /* The fold decides this contest by position, and position is the one thing the
   * CSSOM cannot report here: cssstyle keeps a repeated property once, in its
   * FIRST position carrying its LAST value. So the first case below reads as
   * `width: 12px; inline-size: 33px` and folds to 33px where a browser renders
   * 12, and the second folds to 12px where a browser renders 44 — a wrong number
   * rather than an error, which is what all three gates would then report as a
   * pass. Nothing here can recover the order, so nothing here guesses at it. */
  assert.throws(
    () => foldLogicalDims(sheetOf('.a svg { width: 10px; inline-size: 33px; width: 12px }'), 'probe.css'),
    /declares width both before and after inline-size/);
  assert.throws(
    () => foldLogicalDims(sheetOf('.a svg { inline-size: 33px; width: 12px; inline-size: 44px }'), 'probe.css'),
    /declares inline-size both before and after width/);
});

test('a repeat that leaves its !important behind is refused, twin or no twin', () => {
  /* The other half of the same bookkeeping, and the half that is not about the
   * fold at all. Deduplication keeps the LAST importance, and the last
   * importance is not the one that wins: a browser takes the important
   * declaration wherever it sits, so it renders 40px while the CSSOM — and
   * therefore every gate that measures it — holds 16px and says so.
   *
   * The first case has no logical twin in it, which is the point. Nothing folds
   * there and nothing needs to: the measurement is already wrong before the fold
   * is asked anything. Scoping this to the fold reported a size a browser does
   * not render, in silence, on a green build. */
  for (const decls of [
    'width: 40px !important; width: 16px',
    'height: 40px !important; height: 16px',
    'inline-size: 40px !important; inline-size: 16px',
    'block-size: 40px !important; block-size: 16px',
    // Three repeats, with the important one first and then in the middle. What
    // decides both is the same thing: the last declaration is not the winner.
    'width: 10px !important; width: 12px; width: 14px',
    'width: 10px; width: 12px !important; width: 14px',
    // And the shape that was already refused, for the reason it is refused now.
    'width: 10px !important; width: 12px; inline-size: 33px',
  ]) {
    assert.throws(() => foldLogicalDims(sheetOf(`.a svg { ${decls} }`), 'probe.css'), /!important/,
      `"${decls}" hands every gate a size a browser does not render`);
  }
});

test('a repeat spelled in capitals is refused like any other', () => {
  /* CSS property names are case-insensitive and cssstyle normalizes them, so
   * `WIDTH` and `width` are one property in the CSSOM and are deduplicated
   * together — first position, last value, last importance, exactly as two
   * lower-case spellings would be. The scan that refuses that shape reads the
   * raw text, where the two spellings are two different strings, so the capital
   * one walked past it and handed every gate 16px on a rule a browser renders at
   * 40. That is the defect the refusal above exists for, arriving through the
   * spelling of the property name. */
  for (const decls of [
    'WIDTH: 40px !important; width: 16px',
    'width: 40px !important; WIDTH: 16px',
    'Height: 40px !important; height: 16px',
    'INLINE-SIZE: 40px !important; inline-size: 16px',
    'Block-Size: 40px !important; block-size: 16px',
  ]) {
    assert.throws(() => foldLogicalDims(sheetOf(`.a svg { ${decls} }`), 'probe.css'), /!important/,
      `"${decls}" hands every gate a size a browser does not render`);
  }
  // And the straddle, whose two spellings of one axis are now three.
  assert.throws(
    () => foldLogicalDims(sheetOf('.a svg { WIDTH: 10px; inline-size: 33px; width: 12px }'), 'probe.css'),
    /declares width both before and after inline-size/);
});

test('a repeat whose last declaration is the one a browser takes is folded, not refused', () => {
  /* The other side of that line, and it has to stay green: an !important that
   * ARRIVES between the repeats leaves the CSSOM holding exactly the declaration
   * a browser takes, value and importance alike, so there is nothing to recover
   * and nothing to refuse. Same for repeats that never touch importance at all,
   * which is the ordinary fallback in src/styles.
   *
   * Refusing these reds on CSS somebody is right to write, and a gate that reds
   * on correct code gets switched off. */
  assert.equal(measure('.a svg { width: 10px; width: 33px !important }').width, '33px');
  assert.equal(measure('.a svg { width: 10px !important; width: 33px !important }').width, '33px');
  assert.equal(
    measure('.a svg { width: 10px; width: 12px !important; width: 33px !important }').width, '33px');
  assert.equal(
    measure('.a svg { width: 10px !important; width: 12px !important; inline-size: 33px }').width,
    '12px');
  // Beside a logical twin too, in both spellings. The CSSOM keeps the winner, so
  // the fold reads the importance the file declares and hands the axis over on it.
  assert.equal(
    measure('.a svg { width: 10px; width: 33px !important; inline-size: 44px }').width, '33px');
  assert.equal(
    measure('.a svg { inline-size: 10px; inline-size: 33px !important; width: 44px }').width, '33px');
});

test('a repeat the CSSOM keeps in source order is folded, not refused', () => {
  /* Only the STRADDLING order is unresolvable. cssstyle keeps a repeated
   * property in its first position carrying its last value, which is the source
   * order still whenever every repeat sits on one side of its twin — so the fold
   * picks the winner a browser picks and there is nothing to refuse. Refusing
   * these reds on ordinary CSS, a px-to-rem fallback beside a logical
   * declaration among it. */
  assert.equal(measure('.a svg { width: 10px; width: 12px; inline-size: 33px }').width, '33px');
  assert.equal(measure('.a svg { inline-size: 33px; width: 10px; width: 12px }').width, '12px');
  assert.doesNotThrow(() => foldLogicalDims(
    sheetOf('.a svg { width: 20px; width: 1.25rem; inline-size: 1.25rem }'), 'probe.css'));
});

test('a repeat inside a conditional group is not refused, because the fold never reaches it', () => {
  // foldLogicalDims() rewrites top-level rules only, so nothing inside @media
  // can produce the wrong number this refusal exists to stop. rulesOf() is what
  // has something to say about a sizing rule in there.
  assert.doesNotThrow(() => foldLogicalDims(
    sheetOf('@media (min-width: 40em) { .a p { width: 1px; inline-size: 2px; width: 3px } }'),
    'probe.css'));
});

test('a brace inside a string does not hide the straddle behind it', () => {
  /* The blocks were split on `/\{([^{}]*)\}/`, which the `}` in a string closes
   * early — so the rest of that block went unscanned and the one shape this
   * refusal exists for sailed through as a wrong number reported as a pass. */
  assert.throws(() => foldLogicalDims(
    sheetOf('.a svg { background: url("}"); width: 10px; inline-size: 33px; width: 12px }'),
    'probe.css'), /declares width both before and after/);
});

test('the refusal names the rule it is about', () => {
  /* A selector read back off the raw text, so it has to survive the two things
   * that used to garble it: a brace inside a string earlier in the block, and a
   * statement — `@import` — ending in `;` rather than in a block. Naming the
   * wrong rule sends the reader to a declaration that is not there. */
  const straddle = 'width: 10px; inline-size: 33px; width: 12px';
  assert.throws(() => foldLogicalDims(sheetOf(`.a svg { content: "{"; ${straddle} }`), 'probe.css'),
    /"\.a svg" declares width both before and after/);
  assert.throws(() => foldLogicalDims(sheetOf(`@charset "utf-8";\n.a svg { ${straddle} }`), 'probe.css'),
    /"\.a svg" declares width both before and after/);
});

test('a repeated declaration with no logical twin beside it folds as it always did', () => {
  // `width: 100%; width: fit-content` is an ordinary fallback and decides
  // nothing the fold reads, so the refusal above must not reach it.
  assert.equal(measure('.a svg { width: 100%; width: 33px }').width, '33px');
  assert.equal(measure('.a svg { height: 10px; inline-size: 33px }').width, '33px');
});

test('a folded declaration keeps the importance it was written with', () => {
  // Dropping the priority in the rewrite would hand this to the later rule.
  const { width } = measure('.a svg { inline-size: 33px !important } .a svg { width: 50px }');
  assert.equal(width, '33px');
});

test('a rule with no logical declaration is left exactly as it was', () => {
  const { width, rule } = measure(`${RESET} .a svg { width: 33px }`);
  assert.equal(width, '33px');
  assert.equal(writtenAs(rule('.a svg'), 'width'), 'width');
});

test('a writing-mode declaration stops the fold', () => {
  // The fold is the horizontal mapping. Under a vertical mode `inline-size` is
  // the other axis, so folding it onto `width` measures the wrong contest and
  // says nothing about it.
  assert.throws(() => foldLogicalDims(sheetOf('.a svg { writing-mode: vertical-rl }'), 'probe.css'),
    /writing-mode: vertical-rl/);
});

test('a vendor-prefixed writing-mode stops the fold too', () => {
  /* jsdom parses `-webkit-writing-mode` away — the rule reads as empty, so the
   * declaration loop above it finds nothing to refuse. The browsers that honour
   * the prefixed spelling turn the axes exactly as the unprefixed one does. */
  assert.throws(
    () => foldLogicalDims(sheetOf('.a svg { -webkit-writing-mode: vertical-rl }'), 'probe.css'),
    /writing-mode/);
});

test('a vendor-prefixed writing-mode spelled in capitals stops the fold too', () => {
  /* CSS property names are case-insensitive and the vendor prefix is part of the
   * name, so `-WEBKIT-WRITING-MODE` turns the axes in exactly the browsers the
   * lower-case spelling turns them in. jsdom parses it away like the other
   * spelling, so the declaration loop sees nothing and this raw-text scan is the
   * only thing left — which read lower case only, and handed every gate a sheet
   * whose icons are laid out along the axis the fold assumes they are not.
   *
   * The value is folded too, since a browser reads that case-insensitively as
   * well and `VERTICAL-RL` names the same mode. */
  for (const decl of ['-WEBKIT-WRITING-MODE: vertical-rl', '-Webkit-Writing-Mode: VERTICAL-RL']) {
    assert.throws(() => foldLogicalDims(sheetOf(`.a svg { ${decl} }`), 'probe.css'),
      /writing-mode/i, `"${decl}" turns the axes the fold assumes and walked past this gate`);
  }
  // And the name comes back spelled the way the file spells it, so the refusal
  // sends the reader to a declaration their sheet actually contains.
  assert.throws(
    () => foldLogicalDims(sheetOf('.a svg { -WEBKIT-WRITING-MODE: vertical-rl }'), 'probe.css'),
    /-WEBKIT-WRITING-MODE/);
});

test('a prefixed writing mode is refused wherever in the sheet it sits', () => {
  /* The scan used to read the FIRST prefixed declaration in the file and judge
   * the sheet by it, so a `horizontal-tb` — which is the mode the fold assumes
   * and is right not to refuse — stood in front of every later declaration and
   * answered for all of them. A sheet that sets the mode on <html> and turns it
   * on one component is the ordinary way that happens. */
  for (const second of ['-webkit-writing-mode: vertical-rl', '-WEBKIT-WRITING-MODE: vertical-rl']) {
    assert.throws(() => foldLogicalDims(
      sheetOf(`html { -webkit-writing-mode: horizontal-tb } .a svg { ${second} }`), 'probe.css'),
    /writing-mode/i, `"${second}" sits behind a horizontal-tb and was never read`);
  }
});

test('a sheet whose text this gate cannot read is refused, not waved through', () => {
  /* Two of the checks in foldLogicalDims() are raw-text scans, because jsdom
   * drops `-webkit-writing-mode` and deduplicates a repeated declaration before
   * the CSSOM sees either. A sheet with no <style> element behind it has no text
   * to scan, and reading that as an empty string turns both checks off: the
   * constructed sheet below carries the exact declaration the gate exists to
   * refuse and folds without a word. A <link> sheet reads the same way — its
   * ownerNode is an element whose textContent is ''. */
  const { window } = new JSDOM('<!doctype html>');
  const constructed = new window.CSSStyleSheet();
  constructed.replaceSync('.a svg { -webkit-writing-mode: vertical-rl; inline-size: 33px }');
  assert.throws(() => foldLogicalDims(constructed, 'constructed.css'), /<style>/);
  const linked = { cssRules: [], ownerNode: window.document.createElement('link') };
  assert.throws(() => foldLogicalDims(linked, 'linked.css'), /<style>/);
});

test('the horizontal writing mode is the one the fold assumes, so it is not refused', () => {
  /* `writing-mode: horizontal-tb` is exactly what the fold needs to be true.
   * Refusing it tells a reader to delete a declaration that makes the gate
   * correct, and a gate that reds on correct code gets switched off. */
  assert.doesNotThrow(() => foldLogicalDims(sheetOf('html { writing-mode: horizontal-tb }'), 'probe.css'));
  assert.doesNotThrow(() => foldLogicalDims(sheetOf('html { -webkit-writing-mode: horizontal-tb }'), 'probe.css'));
  // Including in capitals, which is the same declaration. Reading the name
  // case-insensitively and the value case-sensitively would refuse this one.
  assert.doesNotThrow(() => foldLogicalDims(sheetOf('html { -WEBKIT-WRITING-MODE: HORIZONTAL-TB }'), 'probe.css'));
});

test('a writing mode named inside a comment is not a declaration', () => {
  // The prefixed spelling is looked for in the raw text, which is where a
  // comment still lives. Scanning it would refuse a sheet that warns people off
  // the very thing this gate refuses.
  assert.doesNotThrow(() => foldLogicalDims(
    sheetOf('/* do not use -webkit-writing-mode: vertical-rl here */ .a svg { width: 12px }'),
    'probe.css'));
});

test('a sizing rule inside a conditional group is refused', () => {
  const sheet = sheetOf('@media screen { .a svg { width: 33px } }');
  foldLogicalDims(sheet, 'probe.css');
  assert.throws(() => drain(sheet), /@media screen/);
});

test('a sizing rule two conditional groups deep is refused, naming both', () => {
  /* jsdom parses this nesting fine and applies none of it. A refusal that looked
   * one level down would leave the rule below it contributing no subject, losing
   * no contest and drawing no complaint. */
  const sheet = sheetOf('@layer probe { @media screen { .a svg { inline-size: 33px } } }');
  foldLogicalDims(sheet, 'probe.css');
  assert.throws(() => drain(sheet), (err) => {
    assert.match(err.message, /@media screen/,
      'the reader is told a rule is buried without being told which at-rule buries it');
    assert.match(err.message, /@layer probe/);
    return true;
  });
});

test('rulesOf refuses a sheet nobody folded', () => {
  assert.throws(() => drain(sheetOf('.a svg { width: 33px }')), /foldLogicalDims/);
});

/* The reset and the rules measured against it can live in the same file, so the
 * file a rule comes from cannot tell them apart on its own. resetSelectorOf()
 * asks the question that can: which rule sizes an icon with no class on it and
 * nothing around it. Only the reset does — every component rule names a class,
 * or an ancestor that carries one. The cases below are the shapes that
 * identification has to survive. */
test('the reset is the rule that sizes an icon nothing else claims', () => {
  const sheet = sheetOf(`${RESET} .ui-nav__ic svg { width: 40px }`);
  foldLogicalDims(sheet, 'probe.css');
  assert.equal(resetSelectorOf(sheet, 'probe.css', new Set()),
    'svg:where(:not([width]):not([height]))',
    'a component rule written into the reset\'s own file would leave coverage as if it were the reset');
});

test('a component rule riding along in the reset\'s selector list is not the reset', () => {
  // Answered per selector, not per rule, so the icon rule sharing a block with
  // the reset is still a rule this gate measures.
  const sheet = sheetOf('svg:where(:not([width])), .ui-nav__ic svg { width: 40px }');
  foldLogicalDims(sheet, 'probe.css');
  assert.equal(resetSelectorOf(sheet, 'probe.css', new Set()), 'svg:where(:not([width]))');
});

test('a nested rule cannot pass for the reset', () => {
  /* jsdom serialises `.ui-nav__ic { svg { … } }` as `& svg`, which names no
   * class — the shape the "has no class in it" shortcut would have dropped as if
   * it were the reset. Here it is refused by name instead. */
  const sheet = sheetOf(`${RESET} .ui-nav__ic { svg { width: 40px } }`);
  foldLogicalDims(sheet, 'probe.css');
  assert.throws(() => resetSelectorOf(sheet, 'probe.css', new Set()), /nested rule/);
});

test('two rules sizing a bare icon is refused rather than guessed at', () => {
  /* `svg:not([width])` is (0,1,1) and out-ranks every `.ui-btn svg` in the kit.
   * Waving it through as a second reset is #148 arriving again in the one file
   * this gate reads a reset out of. */
  const sheet = sheetOf(`${RESET} svg:not([width]) { width: 40px }`);
  foldLogicalDims(sheet, 'probe.css');
  assert.throws(() => resetSelectorOf(sheet, 'probe.css', new Set()),
    /both size a bare icon/);
});

test('the same reset written twice is one reset', () => {
  const sheet = sheetOf('svg:where(:not([width])) { width: 1.1em } '
    + 'svg:where(:not([width])) { height: 1.1em }');
  foldLogicalDims(sheet, 'probe.css');
  assert.equal(resetSelectorOf(sheet, 'probe.css', new Set()), 'svg:where(:not([width]))');
});

test('a sheet with no reset in it is refused', () => {
  const sheet = sheetOf('.ui-nav__ic svg { width: 40px }');
  foldLogicalDims(sheet, 'probe.css');
  assert.throws(() => resetSelectorOf(sheet, 'probe.css', new Set()), /nothing here sizes a bare icon/);
});

test('a rule that sizes no icon is not mistaken for the reset', () => {
  // `*` matches a bare svg and sizes nothing; `.ui-glow` is a span. Neither is a
  // candidate, so base.css's own furniture cannot stand in for the reset.
  const sheet = sheetOf(`* { margin: 0 } .ui-glow { width: 420px } ${RESET}`);
  foldLogicalDims(sheet, 'probe.css');
  assert.equal(resetSelectorOf(sheet, 'probe.css', new Set()),
    'svg:where(:not([width]):not([height]))');
});

test('clampsOn reports every clamp an icon rule carries, and only those', () => {
  const sheet = sheetOf('.a svg { min-width: 1px; max-inline-size: 2px } .b { min-height: 3px }');
  assert.deepEqual(clampsOn(sheet, 'probe.css', new Set()), [
    'probe.css: .a svg { min-width: 1px }',
    'probe.css: .a svg { max-inline-size: 2px }',
  ]);
});

test('a clamp inside a conditional group is reported like any other', () => {
  // Unmeasured is unmeasured wherever it sits, so this one is reported rather
  // than refused by rulesOf() — which reads sizing properties, not clamps.
  const sheet = sheetOf('@media screen { .a svg { max-width: 4px } }');
  assert.deepEqual(clampsOn(sheet, 'probe.css', new Set()),
    ['probe.css: .a svg { max-width: 4px }']);
});

test('a combinator written without spaces does not hide the icon behind it', () => {
  /* `.rx-tbl>svg` is (0,1,1) in a browser and beats the reset at (0,0,1), so it
   * decides the icon — and read as one whitespace-separated token it is neither
   * an `svg` leaf nor a class anything knows, so it used to be quietly answered
   * "not an icon" and measured by nothing. The spaced form was already a
   * subject, which is what made the difference invisible. */
  const classes = new Set(['ic']);
  for (const sel of ['.a>svg', '.a+svg', '.a~svg', '.a > svg', '.a + svg', '.a~.ic']) {
    assert.ok(isSvgSubject(sel, classes), `"${sel}" reads as something other than an icon rule`);
  }
});

test('an icon named inside :is() or :where() is the subject those select', () => {
  // Both name alternatives the subject may itself BE, so a rule matching an svg
  // through one decides that icon's size exactly as `.a svg` would.
  const classes = new Set(['ic']);
  for (const sel of ['.a :where(svg)', '.a :is(svg)', '.a :is(div, svg)', '.a :where(.ic)']) {
    assert.ok(isSvgSubject(sel, classes), `"${sel}" reads as something other than an icon rule`);
  }
});

test('an icon named inside a pseudo spelled in capitals is the same subject', () => {
  /* CSS folds a pseudo-class name, so `:WHERE(svg)` decides an icon's size exactly as
   * `:where(svg)` does, and jsdom is worse than blind about it. Both halves are in
   * CONTRIBUTING.md, "A spelling the sweep cannot see costs coverage in silence". */
  const classes = new Set(['ic']);
  for (const sel of ['.a :WHERE(svg)', '.a :IS(svg)', '.a :Matches(svg)', '.a :Where(.ic)',
    '.a :IS(div, svg)']) {
    assert.ok(isSvgSubject(sel, classes), `"${sel}" reads as something other than an icon rule`);
  }
});

test('the class named inside one is still matched the way CSS matches a class', () => {
  /* The flag folds the pseudo's NAME and must reach no further. Class names are
   * case-SENSITIVE — `.Ic` and `.ic` are two different classes — so a rule
   * naming one the kit does not put on an svg is not an icon rule, however the
   * pseudo around it is spelled. Folding the argument too would make this gate
   * mount an element for a rule that selects nothing. */
  const classes = new Set(['ic']);
  for (const sel of ['.a :where(.Ic)', '.a :WHERE(.IC)', '.a :IS(.Ic)']) {
    assert.equal(isSvgSubject(sel, classes), false,
      `"${sel}" names a class the kit puts on nothing, and was read as an icon rule`);
  }
  // The element name inside stays case-sensitive too: an SVG-namespace type
  // selector folds no case, so `:where(SVG)` selects no <svg> in an HTML document.
  assert.equal(isSvgSubject('.a :WHERE(SVG)', classes), false);
});

test('a functional pseudo that names no icon is not read as one', () => {
  /* The other half of the same recursion, and the half that keeps it off rules
   * the kit already ships. `:has()` and `:not()` say something about a different
   * element or about what the subject is not, so neither makes the subject an
   * icon however the argument reads. */
  assert.equal(isSvgSubject('.ui-nav :where(ul, ol)', new Set(['ic'])), false);
  assert.equal(isSvgSubject('.ui-card:has(> svg)', new Set(['ic'])), false);
  assert.equal(isSvgSubject('.ui-card:has(.ic)', new Set(['ic'])), false);
  assert.equal(isSvgSubject('.a:not(svg)', new Set(['ic'])), false);
});

test('an icon named inside :not() or :has() stays inside it', () => {
  /* The recursion collects the alternatives a compound offers, and `:is()` is
   * one of those wherever it is written — including inside the two pseudos that
   * are deliberately excluded. `.a:not(:is(svg))` selects what is NOT an svg;
   * reading the `:is()` out of it made the gate call that an icon, mount it, and
   * hard-error on the `:`. Only the top level of the compound offers
   * alternatives. */
  const classes = new Set(['ic']);
  for (const sel of ['.a:not(:is(svg))', '.a:has(:is(svg))', '.a:not(:where(.ic))',
    '.a:has(> :is(svg))', '.a:has(:where(.ic))']) {
    assert.equal(isSvgSubject(sel, classes), false,
      `"${sel}" says something about another element, or about what the subject is not`);
  }
  // And the top-level ones still read as they did.
  assert.ok(isSvgSubject('.a:where(:is(svg))', classes));
  assert.ok(isSvgSubject('.a:is(.ic)', classes));
});

test('a bracket inside a quoted attribute value separates nothing', () => {
  /* `]` and `[` are ordinary characters inside a string, and counting them as
   * brackets takes the scan below zero — after which nothing is ever top level
   * again, the trailing `svg` stops being the leaf, and a rule sizing an icon
   * leaves coverage with no count moving to say so. */
  const classes = new Set(['ic']);
  for (const sel of ['.a[data-x="]"] svg', '.a[data-x="["] svg', ".a[data-x=']'] .ic",
    '.a[data-x="([{"] svg']) {
    assert.ok(isSvgSubject(sel, classes), `"${sel}" reads as something other than an icon rule`);
  }
  // The characters this scan does read are still read, inside the value and out.
  assert.deepEqual(selectorParts('.a[title="a, b"] svg, .b span'), ['.a[title="a, b"] svg', '.b span']);
  assert.ok(isSvgSubject('.a[title="a > b"] svg', classes));
});

test('a rule an icon selector reaches through a combinator is mountable', () => {
  // A subject nothing can mount is a red that names the gate rather than the
  // rule, so the two have to move together.
  const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>');
  for (const sel of ['.a>svg', '.a > svg', '.a+svg', '.a ~ svg']) {
    const { el, top } = mount(dom.window.document, sel, new Set());
    assert.ok(el.matches(sel), `mounted an element that does not match "${sel}"`);
    top.remove();
    assert.equal(dom.window.document.body.children.length, 0, `${sel} left markup behind`);
  }
});

test('an attribute selector is an element this builder can make', () => {
  /* An attribute is something you set on the element, so a selector naming one
   * describes a element this can build. Refusing them left
   * `svg[type="story"]`-shaped rules a subject that hard-errored instead of being
   * measured — a red naming the gate rather than the rule. */
  const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>');
  for (const sel of ['.a [data-x] svg', '.a [data-x=y] svg', '.a [data-x="y"] svg',
    ".a [data-x='y'] svg", '.a svg[type="story"]', '#tree svg[type="story"]',
    '.a [data-x~="y"] svg', '.a[data-open] > svg']) {
    const { el, top } = mount(dom.window.document, sel, new Set());
    assert.ok(el.matches(sel), `mounted an element that does not match "${sel}"`);
    top.remove();
    assert.equal(dom.window.document.body.children.length, 0, `${sel} left markup behind`);
  }
});

test(':root is the document element, and the document is put back afterwards', () => {
  /* `:root[data-theme="light"] .ui-nav__ic svg` is this repo's own idiom — live
   * in badge.css and card.css — and `:root` matches one element in the document
   * and no element this could create. So the attribute goes on <html>, and the
   * chain hangs where it always does, which is inside <html> already.
   *
   * Putting it back is the half that has to be automatic. Every gate here shares
   * one document across every subject in the file, so a theme left on <html>
   * would be the theme every subject after it is measured in. */
  const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>');
  const { document } = dom.window;
  document.documentElement.setAttribute('data-theme', 'dark');
  const sel = ':root[data-theme="light"] .ui-nav__ic svg';
  const { el, top } = mount(document, sel, new Set());
  assert.ok(el.matches(sel), `mounted an element that does not match "${sel}"`);
  top.remove();
  assert.equal(document.documentElement.getAttribute('data-theme'), 'dark',
    'the mount left its own theme on <html>, so every subject measured after it is measured in a '
    + 'theme the file never asked for');
  assert.equal(document.body.children.length, 0, `${sel} left markup behind`);
});

test(':root is the document element however the rule spells it', () => {
  /* `:ROOT` is `:root` — pseudo-class names fold case — and this repo's themed
   * idiom written that way is ordinary CSS a browser applies. Read lower case
   * only, the compound was not the document element, nothing else in it parsed
   * either, and the rule was refused as a shape this builder was never taught.
   * That is a red on correct CSS from a builder that has handled the shape since
   * badge.css, and a gate that reds on correct code gets switched off. */
  const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>');
  const { document } = dom.window;
  for (const sel of [':ROOT[data-theme="light"] .ui-nav__ic svg', ':Root > .sbc svg']) {
    const { el, top } = mount(document, sel, new Set());
    assert.ok(el.matches(sel.toLowerCase()),
      `mounted an element that does not match "${sel}"`);
    top.remove();
    assert.equal(document.body.children.length, 0, `${sel} left markup behind`);
    assert.equal(document.documentElement.getAttribute('data-theme'), null,
      `${sel} left its own theme on <html>`);
  }
});

test(':root reached by a child combinator is the same element, one nesting in', () => {
  /* `:root > .sbc svg` and `html > .sbc svg` are the same rule spelled two ways,
   * and only the second used to mount — the first was refused as an unsupported
   * selector part, naming `:root`, which this builder has handled since the
   * themed rules in badge.css. The refusal was about the combinator behind it.
   * A rule written this way is ordinary CSS, and a subject nothing can mount is a
   * red that names the gate rather than the rule. */
  const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>');
  const { document } = dom.window;
  for (const sel of [':root > .sbc svg', ':root>.sbc svg', ':root[data-theme="light"] > .sbc svg',
    ':root > svg']) {
    const { el, top } = mount(document, sel, new Set());
    assert.ok(el.matches(sel), `mounted an element that does not match "${sel}"`);
    top.remove();
    assert.equal(document.body.children.length, 0, `${sel} left markup behind`);
    assert.deepEqual([...document.documentElement.children].map((n) => n.nodeName.toLowerCase()),
      ['head', 'body'], `${sel} left markup under <html>`);
  }
});

test('a rule reaching an icon through :root > is measured, not merely mounted', () => {
  /* The half worth having. The chain hangs off <html> rather than off the
   * container inside <body>, which is a place nothing was ever mounted before —
   * so this asks the question a gate asks: does the rule win the contest the
   * browser gives it, against the reset and at a font-size no arithmetic can make
   * agree. `html > .sbc svg` is the same rule, and the two must not disagree. */
  const css = `${RESET} :root > .sbc svg { width: 17px } html > .sbc svg { height: 19px }`;
  const dom = new JSDOM(`<!doctype html><html><head><style>${css}</style></head><body></body></html>`);
  const { document, getComputedStyle } = dom.window;
  foldLogicalDims(document.styleSheets[0], 'probe.css');
  const { el, top } = mount(document, ':root > .sbc svg', new Set());
  el.style.fontSize = '100px';
  const got = { width: getComputedStyle(el).getPropertyValue('width'), height: getComputedStyle(el).getPropertyValue('height') };
  top.remove();
  assert.deepEqual(got, { width: '17px', height: '19px' },
    'the rule did not win the contest the browser gives it, so the mount is somewhere the cascade '
    + 'does not reach');
});

test('a :root chain this builder cannot place says what is wrong with it', () => {
  /* The two shapes that stay refused, and the reason they have to say why. The
   * generic refusal reads "this builds a chain of compounds out of tag names,
   * classes, ids and attributes, and nothing else" — which sends the reader off
   * to teach the builder `:root`, a thing it already does. Neither of these
   * selects anything in any document: the document element has no siblings, and
   * nothing stands in front of it. */
  const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>');
  for (const sel of ['.a :root svg', ':root + .a svg', ':root ~ .a svg']) {
    assert.throws(() => mount(dom.window.document, sel, new Set()), (err) => {
      assert.match(err.message, /document element/,
        `"${sel}" is refused without saying what :root actually selects`);
      assert.doesNotMatch(err.message, /out of tag names, classes/,
        `"${sel}" is refused as a shape this builder was never taught, which is not why`);
      return true;
    });
  }
});

test('a rule inside a themed scope is measured, not merely mounted', () => {
  // The half of this that is worth having: the contest such a rule is in gets
  // held, and the rule that decides the icon is the one that wins it.
  const css = `${RESET} :root[data-theme="light"] .ui-nav__ic svg { width: 17px }`;
  const dom = new JSDOM(`<!doctype html><html><head><style>${css}</style></head><body></body></html>`);
  const { document, getComputedStyle } = dom.window;
  foldLogicalDims(document.styleSheets[0], 'probe.css');
  const { el, top } = mount(document, ':root[data-theme="light"] .ui-nav__ic svg', new Set());
  el.style.fontSize = '100px';
  const got = getComputedStyle(el).getPropertyValue('width');
  top.remove();
  assert.equal(got, '17px', 'the themed rule did not win the contest the browser gives it');
});

test('a state pseudo-class is refused as unmountable rather than untaught', () => {
  /* `.rx-btn:hover svg` cannot be mounted here at all: jsdom has no pointer and
   * no box for a pseudo-element. Telling the reader to teach the builder sends
   * them after something that does not exist. */
  const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>');
  for (const sel of ['.rx-btn:hover svg', '.a svg:focus-visible', '.a svg::before']) {
    assert.throws(() => mount(dom.window.document, sel, new Set()), (err) => {
      assert.match(err.message, /jsdom has no pointer/,
        `"${sel}" is refused without saying why teaching this builder would not help`);
      return true;
    });
  }
});

test('a structural pseudo-class is refused as buildable and not built', () => {
  // The refusal a reader can act on, so its message must not read like the one
  // for a shape no teaching reaches.
  const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>');
  for (const sel of ['.a svg:first-child', '.a svg:nth-child(2)']) {
    assert.throws(() => mount(dom.window.document, sel, new Set()), (err) => {
      assert.match(err.message, /siblings/,
        `"${sel}" is refused without saying what stands between this builder and building it`);
      assert.doesNotMatch(err.message, /jsdom has no pointer/);
      return true;
    });
  }
});

test('a refusal reads the pseudo-class name the way CSS does', () => {
  /* Every one of these is refused whichever case it is written in, so nothing is
   * unmeasured here — what changes is which of the four explanations the reader
   * gets. Written in capitals they all fell through to the last one, "write the
   * rule in a shape it can mount, or teach it this shape", which is wrong advice
   * on all four counts: the shape IS taught, and the reader is sent to build
   * something that already exists rather than to the ancestor, the state or the
   * position that actually stopped it.
   *
   * The leaf `:WHERE()` is the one this round put here. compoundIsSvg() now reads
   * it as the icon rule it is, so it reaches this refusal for the first time —
   * and a refusal that arrives with the wrong explanation is the disposition the
   * fix was meant to move away from. */
  const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>');
  const cases = [
    ['.a :WHERE(svg)', /compoundIsSvg\(\)/],
    [':IS(.ui-btn, .ui-chip) svg', /ancestor/],
    ['.rx-btn:HOVER svg', /jsdom has no pointer/],
    ['.a svg:FIRST-CHILD', /siblings/],
  ];
  for (const [sel, says] of cases) {
    assert.throws(() => mount(dom.window.document, sel, new Set()), (err) => {
      assert.match(err.message, says,
        `"${sel}" is refused in the words kept for a shape nobody taught this builder, and the `
        + 'reader is sent to teach it something it already knows');
      return true;
    });
  }
});

test('a comment in front of a declaration does not hide it from the raw-text scans', () => {
  /* The patterns start at `{` or `;`, so a comment sitting between the brace and
   * the first declaration swallows that declaration whole — and the raw text is
   * the only place a value computed at render time still exists, since jsdom
   * drops the declaration carrying it. `.zz svg { /* size *\/ width: … }` was
   * read as a rule that sets a height and nothing else. */
  const css = `.zz svg { /* size */ width: ${UNRESOLVED}px; height: 13px }`;
  const { blind } = blindSpots('probe.css', css, sheetOf(css));
  assert.deepEqual(blind, [`probe.css: width: ${UNRESOLVED}px`]);
});

test('a declaration named only inside a comment is not read as one', () => {
  /* The other edge of the same anchor — the test above is the one that fails when
   * a comment hides a real declaration, and this is the one that fails when a
   * commented-out declaration is read as a real one. A commented-out rule is not
   * a rule, and refusing a file for one is a red nobody can act on.
   *
   * The comment carries a `;` of its own, and that semicolon is the whole of what
   * makes this a test. declRe() anchors a property on `{` or `;`, so a `width`
   * written in a comment that holds neither is already invisible to the pattern,
   * and a fixture built from one reads the same whether the comments came out or
   * stayed exactly where they were. */
  const css = `.zz svg { /* height: 12px; width: ${UNRESOLVED}px */ height: 13px }`;
  assert.deepEqual(blindSpots('probe.css', css, sheetOf(css)), { blind: [], clampedBlind: [] });
  // The clamp scan reads the same text through the same anchor, and has its own
  // refusal to raise on what it finds there.
  const clamp = `.zz svg { /* height: 12px; max-width: ${UNRESOLVED}px */ height: 13px }`;
  assert.deepEqual(blindSpots('probe.css', clamp, sheetOf(clamp)), { blind: [], clampedBlind: [] });
});

test('a rule beside an unresolved shell does not hide the shell', () => {
  /* The shared-shell refactor this guard exists for: a block that pulls its CSS
   * in as `${SHELL_CSS}` and writes a rule of its own beside it. The guard used
   * to ask whether the sheet parsed to NO rules, so the one parseable rule
   * switched it off — and the three text scans each need something the marker on
   * its own does not have, a `{` after it or a `:` beside it. The shell could
   * hold every icon rule on the surface and the gate would report a clean run. */
  for (const css of [`.a { color: red } ${UNRESOLVED}`, `${UNRESOLVED} .a { color: red }`]) {
    assert.notDeepEqual(blindSpots('probe.css', css, sheetOf(css)).blind, [],
      `"${css}" reads as a surface this gate saw the whole of`);
  }
});

test('an unresolved interpolation standing in for declarations is reported', () => {
  // `.a { ${DECLS} }` parses to a rule with nothing in it, so the rule scan finds
  // no width to complain about and the block is not empty either. It can hold a
  // width all the same.
  const css = `.a svg { ${UNRESOLVED} }`;
  assert.deepEqual(blindSpots('probe.css', css, sheetOf(css)).blind,
    ['probe.css: an unresolved interpolation where a rule or a declaration would be']);
});

test('an interpolated value that sizes nothing is not reported', () => {
  /* The other direction, and the one that decides whether this guard survives
   * contact with the repo. A surface interpolates a colour, a font stack and an
   * image URL far more often than a size, and every one of those refused is a red
   * on correct code. The properties that matter are the sizing and clamp ones,
   * and the two scans above own them. */
  for (const decl of ['background: ${}', 'color: ${}', 'font-family: ${}',
    'background-image: url(${})', 'transition: ${} 0.2s']) {
    const css = `.a svg { ${decl.replace('${}', UNRESOLVED)} }`;
    assert.deepEqual(blindSpots('probe.css', css, sheetOf(css)), { blind: [], clampedBlind: [] },
      `"${decl}" reds a gate that measures icon sizes`);
  }
});

test('a <style> assembled by concatenation is not a block with no CSS in it', () => {
  /* `'<style>' + CSS + '</style>'` in a source hands the extractor a fragment of
   * JavaScript between the tags. It parses to no rules and carries no marker, so
   * every guard here was quiet and the surface read as one that simply styles
   * nothing — while the CSS it concatenates ships and applies. */
  const css = "' + CSS + '";
  assert.deepEqual(blindSpots('probe.css', css, sheetOf(css)).blind,
    ['probe.css: a <style> block this gate parsed to no rules at all']);
});

test('a block that is nothing but an at-rule cssom models nothing of is not a blind spot', () => {
  /* `@property` and `@charset` are valid CSS a browser honours, and cssom builds
   * no rule for either — so a block that is nothing else parses to zero rules for
   * the same reason an empty one does, and reporting it reds on correct code.
   * cssom recovers the moment an ordinary rule sits beside them, which is what
   * makes this shape as narrow as it is and also what would have hidden it. */
  for (const css of ["@property --ic-size { syntax: '<length>'; inherits: false; initial-value: 16px }",
    '@charset "utf-8";',
    "@charset \"utf-8\";\n@property --ic { syntax: '<color>'; inherits: false; initial-value: red }"]) {
    assert.deepEqual(blindSpots('probe.css', css, sheetOf(css)), { blind: [], clampedBlind: [] },
      `"${css}" is CSS a browser honours and this reds on it`);
  }
});

test('an at-rule in front of a concatenated block does not buy the block silence', () => {
  /* The other edge. What the refusal is for is a `<style>` assembled by string
   * concatenation, and an at-rule written above the seam must not turn it off —
   * nor must an at-rule nobody closed, which is not a shape a browser honours
   * either. */
  for (const css of ['@charset "utf-8";\n\' + CSS + \'', '@property --ic {']) {
    assert.deepEqual(blindSpots('probe.css', css, sheetOf(css)).blind,
      ['probe.css: a <style> block this gate parsed to no rules at all'],
      `"${css}" reads as a block this gate saw the whole of`);
  }
});

test('a <style> block with nothing in it is not a blind spot', () => {
  // A block that is empty, or holds nothing but a comment, parses to no rules
  // because there are none — and refusing correct code is how a gate gets
  // switched off.
  for (const css of ['', '   \n  ', '/* nothing to see */']) {
    assert.deepEqual(blindSpots('probe.css', css, sheetOf(css)), { blind: [], clampedBlind: [] },
      `an empty block written "${css}" reads as CSS this gate could not parse`);
  }
});

test('an @import is reported wherever a stylesheet carries one', () => {
  // A sheet no gate opens. Read out of the raw text, since jsdom keeps an
  // unfollowed @import out of the way rather than in it.
  assert.deepEqual(importsIn('@import "./zz.css";\n.a svg { width: 42px }'), ['"./zz.css"']);
  assert.deepEqual(importsIn('/* @import "./zz.css"; */ .a svg { width: 42px }'), []);
});

test('an @import spelled in capitals is reported like any other', () => {
  /* An at-rule keyword is case-insensitive, and jsdom agrees: `@IMPORT` parses
   * into a real CSSImportRule, so the sheet it names ships and no gate opens it.
   * A scan that read lower case only was blind to exactly the shape the refusal
   * exists for, and the refusal is the only thing watching — an unfollowed
   * @import contributes no subject, so no count moves when one arrives.
   *
   * The specifier comes back as the file writes it, since it is a file name and
   * a file name is case-sensitive on Linux. */
  assert.deepEqual(importsIn('@IMPORT "./Zz.css";\n.a svg { width: 42px }'), ['"./Zz.css"']);
  assert.deepEqual(importsIn('@Import url(./zz.css);'), ['url(./zz.css)']);
  // And the two shapes that are not imports stay not-imports in capitals.
  assert.deepEqual(importsIn('/* @IMPORT "./zz.css"; */ .a svg { width: 42px }'), []);
  assert.deepEqual(importsIn('.a::after { content: "@IMPORT zz" }'), []);
});

test('the kit sheet list reads the at-rule in any case and the file name in one', () => {
  /* Two halves of one pattern with opposite answers. `@import` is an at-rule
   * keyword, so a sheet listed as `@IMPORT` is a sheet index.css really pulls in
   * — missed here it never joins the document, and the surfaces and React gates
   * then measure every rule they sweep against a cascade the kit does not have,
   * with no count of theirs moving to say so.
   *
   * The specifier is the other half: it is a path, it is handed straight to
   * readFileSync, and file names are case-sensitive on Linux however the keyword
   * in front of them reads. So it comes back exactly as written. */
  const dir = sourceDir({
    'index.css': '@import "./tokens/Brand.generated.css";\n@IMPORT "./styles/base.css";\n',
  });
  try {
    assert.deepEqual(kitSheetNames(dir), ['tokens/Brand.generated.css', 'styles/base.css']);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a <style> block is read whatever case the markup spells the tag in', () => {
  /* The surfaces gate hands this the story files, where `<STYLE>` is the HTML element
   * every browser and jsdom folds — and missing it costs a block, a subject and no
   * movement in the count. CONTRIBUTING.md, "A spelling the sweep cannot see costs
   * coverage in silence", holds the fold and the measurement behind it. The self-closing
   * case is asserted too: unblanked, the paired scan reads the source between it and the
   * next closing tag as CSS. */
  assert.deepEqual(styleBlocksOf('<STYLE>.a svg { width: 33px }</STYLE>'),
    ['.a svg { width: 33px }']);
  assert.deepEqual(styleBlocksOf('<Style media="screen">.a svg { width: 12px }</Style>'),
    ['.a svg { width: 12px }']);
  assert.deepEqual(
    styleBlocksOf('<STYLE dangerouslySetInnerHTML={{ __html: ".b svg{width:9px}" }} />\n'
      + '<style>.c svg { width: 5px }</style>'),
    ['.b svg{width:9px}', '.c svg { width: 5px }'],
    'the self-closing block was not blanked, so the paired scan read the source between it and the '
    + 'next closing tag as CSS');
});

test('both shapes a .tsx writes a <style> block in are still recognised', () => {
  /* This is the tripwire under the other half of the React sweep. Nothing under
   * react/src writes a <style> block today, so scripts/icon-size-react.test.js cannot
   * put a `length > 0` behind that half the way it does behind the .css half — it would
   * red on a workspace that is fine. Without one, a recogniser that stopped reading the
   * idiom would leave that half at a healthy-looking zero for ever. So the guard sits
   * here and proves the recogniser rather than the workspace: break either shape the
   * gate's header claims — the CSS between the tags of a template literal, or the string
   * a `dangerouslySetInnerHTML` hands them — and this reds while the sweep's zero stays
   * honest. */
  const source = 'export const Table = () => (<>\n'
    + '  <style>{`.rx-tbl svg { width: 14px }`}</style>\n'
    + '  <style dangerouslySetInnerHTML={{ __html: ".rx-btn svg{width:16px}" }} />\n'
    + '</>);';
  assert.deepEqual(styleBlocksOf(source),
    ['.rx-tbl svg { width: 14px }', '.rx-btn svg{width:16px}'],
    'the React gate reads its .tsx <style> blocks with this, and its count is 0 either way — so '
    + 'a shape lost here leaves that half of the sweep reading nothing and saying nothing');
});

test('a <style> written with dangerouslySetInnerHTML is CSS like any other', () => {
  /* THE React idiom for injecting a CSS string, and it was invisible: no block,
   * no marker, no refusal, into a gate whose count is 0 so nothing else could
   * notice. A quoted string and a template literal both read as what they say. */
  assert.deepEqual(
    styleBlocksOf('export const S = () => <style dangerouslySetInnerHTML={{__html: ".rx-btn svg{width:16px}"}} />;'),
    ['.rx-btn svg{width:16px}']);
  assert.deepEqual(
    styleBlocksOf('const S = () => <style dangerouslySetInnerHTML={{ __html: `.a > svg { width: 9px }` }} />;'),
    ['.a > svg { width: 9px }']);
});

test('a dangerouslySetInnerHTML nothing can resolve leaves the marker, not silence', () => {
  // Same contract as every other block this cannot read through: a token the
  // gates refuse, rather than an empty block that reads as a file with no CSS.
  assert.deepEqual(
    styleBlocksOf('const S = () => <style dangerouslySetInnerHTML={{__html: cssFor(theme)}} />;'),
    [UNRESOLVED]);
  assert.deepEqual(
    styleBlocksOf(`const CSS = \`.a svg { width: 7px }\`;
const S = () => <style dangerouslySetInnerHTML={{__html: CSS}} />;`),
    ['.a svg { width: 7px }']);
});

test('a self-closing <style> does not swallow the source up to the next one', () => {
  /* `<style[^>]*>…</style>` spans from a self-closing tag to the NEXT closing
   * one, taking the source between them in as CSS. It reds — rulesOf() refuses
   * the nested rule it parses out of that — but it names the wrong thing. */
  assert.deepEqual(styleBlocksOf(
    `const A = () => <style dangerouslySetInnerHTML={{__html: css}} />;
const B = () => <style>{\`.rx-btn svg { width: 16px }\`}</style>;`),
  [UNRESOLVED, '.rx-btn svg { width: 16px }']);
});

test('a module imported for its side effects is not read as a stylesheet', () => {
  /* The React gate asks this what the workspace loads, and answers a specifier
   * it does not sweep with "name it .css, or widen the sweep". Said about
   * `import './polyfills'` that is a hard red on ordinary React code, and advice
   * that would have the reader rename a TypeScript module to .css. */
  assert.deepEqual(styleImportsIn("import './polyfills';\nimport './DataTable.css';"),
    ['./DataTable.css']);
  assert.deepEqual(styleImportsIn("import './setup';\nimport React from 'react';"), []);
});

test('a stylesheet is read as one whatever the extension and whatever binds it', () => {
  /* Both halves are what this guard is for. A sheet renamed .pcss leaves the
   * *.css sweep in silence, and the count that would notice is 0 either way — so
   * missing it is the whole failure. And a CSS module is bound to a name rather
   * than imported bare, which the pattern used to require. */
  assert.deepEqual(styleImportsIn("import './DataTable.pcss';"), ['./DataTable.pcss']);
  assert.deepEqual(styleImportsIn("import styles from './x.module.css';"), ['./x.module.css']);
  assert.deepEqual(styleImportsIn('import "./a.scss";\nimport "./b.less";\nimport "./c.styl";'),
    ['./a.scss', './b.less', './c.styl']);
});

test('a stylesheet reached by anything but a relative path is not reported', () => {
  /* RELATIVE ONLY, and that is the whole shape of this scan. A bare specifier
   * resolves through node_modules and an aliased one through tsconfig or the
   * bundler's config, and this reads neither — so a path built out of one names a
   * file that does not exist.
   *
   * The React gate turns this list into "a sheet the workspace loads that the
   * sweep does not read", and tells the reader to rename it .css or widen the
   * glob. Said about `bootstrap/dist/bootstrap.css` that is a hard red on ordinary
   * code with advice nobody can follow. The gate's header names the gap instead;
   * this is what keeps the two agreeing. */
  for (const spec of ['bootstrap/dist/bootstrap.css', '@/styles/tokens.css',
    '~/styles/tokens.css', 'normalize.css/normalize.css']) {
    assert.deepEqual(styleImportsIn(`import '${spec}';`), [],
      `"${spec}" resolves somewhere this scan cannot follow, and reporting it names a path that `
      + 'does not exist');
  }
  // And a relative one written the other way is still read.
  assert.deepEqual(styleImportsIn("import '../shared/tokens.css';"), ['../shared/tokens.css']);
});

test('this one is read case-sensitively, because JavaScript and esbuild are', () => {
  /* The CSS scans beside it fold case and this one must not: `import` is a JavaScript
   * keyword and the extension is an esbuild loader match, so `IMPORT` and `.CSS` are a
   * syntax error and a build failure rather than sheets the workspace loads.
   * CONTRIBUTING.md, "A spelling the sweep cannot see costs coverage in silence". */
  assert.deepEqual(styleImportsIn("IMPORT './DataTable.css';"), []);
  assert.deepEqual(styleImportsIn("import './DataTable.CSS';"), []);
});

/* A directory of source files, thrown away afterwards. The class scanner reads
 * files rather than strings, so a case about which files it reads and which
 * spellings it recognises has to hand it real ones. */
function sourceDir(files) {
  const dir = mkdtempSync(path.join(tmpdir(), 'icon-cascade-'));
  for (const [name, text] of Object.entries(files)) writeFileSync(path.join(dir, name), text);
  return dir;
}

test('a class written onto an svg as className is found the way class is', () => {
  /* React spells the attribute `className`, and a class the scanner does not
   * find is a class every rule targeting it stops being measured against — the
   * shape that hid .ui-fbck in the kit. */
  const dir = sourceDir({ 'Widget.tsx': '<svg className="rx-glyph" aria-hidden="true" />' });
  try {
    assert.ok(svgClassSet([dir], ['.tsx']).has('rx-glyph'));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a class only a test writes onto an svg is skipped whatever the extension', () => {
  // A class no component renders is not a class the kit renders, and the test
  // files that carry one are .tsx as often as .js now.
  const dir = sourceDir({ 'Widget.test.tsx': '<svg className="rx-test-only" />' });
  try {
    assert.deepEqual([...svgClassSet([dir], ['.tsx'])], []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('an svg tag and a class attribute are found however the markup spells them', () => {
  /* HTML tag names and attribute names fold case, and the browser is the one
   * that decides: `<SVG CLASS="ic">` parses to an element whose localName is
   * `svg`, in the SVG namespace, matched by `.ic` and sized by every rule that
   * targets it. Read lower case only, that class never entered the set — and a
   * class this scan does not find is a class every rule targeting it stops being
   * measured against, with no count moving to say so. That is how .ui-fbck was
   * missed in the kit, arriving again through the spelling.
   *
   * The tripwire in scripts/icon-size-surfaces.test.js is no help against it: it
   * guards `ic`, one class that already exists, and a class introduced in
   * capitals never joins the set for it to miss. */
  const dir = sourceDir({
    'page.html': '<SVG class="cap-tag"></SVG>\n<svg CLASS="cap-attr"></svg>\n'
      + '<Svg Class="cap-mixed"></Svg>\n',
  });
  try {
    assert.deepEqual([...svgClassSet([dir], ['.html'])].sort(),
      ['cap-attr', 'cap-mixed', 'cap-tag']);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('the JSX prop is read case-sensitively, because JSX is JavaScript', () => {
  /* `className` is the other half of the same scan and wants the opposite
   * answer. It is a JSX prop rather than an HTML attribute, and JSX folds no
   * case: `CLASSNAME` is a different prop, which React hands to the DOM as an
   * attribute named `classname` and not as a class at all. `<SVG …>` in JSX is a
   * component reference rather than the intrinsic element, so the tag goes with
   * it. Reading either would put a class in the set that no svg carries, and a
   * rule naming it would then be mounted as an icon and measured. */
  const dir = sourceDir({
    'Widget.tsx': '<svg className="rx-real" />\n<svg CLASSNAME="rx-phantom" />\n'
      + '<SVG className="rx-component" />\n',
  });
  try {
    assert.deepEqual([...svgClassSet([dir], ['.tsx'])], ['rx-real']);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('the class the markup carries comes back spelled the way it is written', () => {
  /* The flag folds the tag and the attribute and must reach no further. A CSS
   * class name is case-SENSITIVE — `.probeIC` and `.probeic` are two classes —
   * and every consumer of this set compares it exactly: compoundIsSvg() asks
   * `classes.has()` of the name in the selector, and mount() asks it again to
   * decide whether to build an <svg> or a <div>. Folding the captured value
   * would make a rule targeting `.probeic` an icon rule against markup carrying
   * `probeIC`, and this gate would then mount an svg for a rule that selects
   * nothing in a browser.
   *
   * The class here is deliberately MIXED case. With an all-lowercase value this
   * test passed whether or not the capture was folded, so the claim it is named
   * for had nothing holding it. */
  const dir = sourceDir({ 'page.html': '<SVG class="probeIC"></SVG>' });
  try {
    const classes = svgClassSet([dir], ['.html']);
    assert.deepEqual([...classes], ['probeIC'],
      'the captured class was not spelled the way the markup spells it — a flag that folds the '
      + 'tag and the attribute has reached the value');
    assert.ok(isSvgSubject('.term__copy .probeIC', classes));
    assert.equal(isSvgSubject('.term__copy .probeic', classes), false,
      '`.probeIC` and `.probeic` are two different classes, and a rule naming the one the markup '
      + 'does not carry was read as a rule that sizes this icon');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('the icon() call is read case-sensitively, because JavaScript is', () => {
  /* The other half of svgClassSet(), and it wants the opposite answer. `icon` is
   * a JavaScript identifier rather than an HTML name, and JavaScript folds no
   * case: `ICON('check', 'ui-fbck')` calls a function this kit does not export,
   * so nothing renders and no svg carries that class. Reading it here would put
   * a class in the set that no markup writes, and a rule naming it would then be
   * mounted as an icon rule and measured against the reset. */
  const dir = sourceDir({
    'widget.js': "el.innerHTML = icon('check', 'kit-real');\n"
      + "other.innerHTML = ICON('check', 'kit-phantom');\n",
  });
  try {
    assert.deepEqual([...svgClassSet([dir], ['.js'])], ['kit-real']);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a test file is skipped by the spelling the test runner discovers it under', () => {
  /* The skip stays case-sensitive, and this says why. `node --test` is handed a
   * glob ending `.test.js` and matches it as written, so `Widget.Test.js` is not
   * a file it runs — it is ordinary source, and a class it puts on an svg is a
   * class the kit renders. Folding the skip would drop it from the sweep, which
   * is the silent direction: every rule targeting that class would leave
   * coverage with the suite still green. */
  const dir = sourceDir({
    'Widget.test.js': '<svg class="only-a-test-writes-this" />',
    // A different stem, because macOS folds file names and one stem would be one
    // file here and two on the machine CI runs on.
    'Gadget.Test.js': '<svg class="ordinary-source" />',
  });
  try {
    assert.deepEqual([...svgClassSet([dir], ['.js'])], ['ordinary-source']);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a logical declaration is asked about the property the fold lands it on', () => {
  /* cssstyle waves `inline-size` through whatever the value, so asked under the
   * name the file spells it this declaration survives — and then foldLogicalDims()
   * rewrites it onto `width`, which refuses the value, and the rule is empty. The
   * question is whether the declaration survives into the cascade the gate
   * measures, and that cascade is the physical one. Reported under the spelling
   * the file uses, since that is what the reader has to go and find. */
  assert.deepEqual(droppedDecls('probe.css', '.zz svg { inline-size: fit-content(20%) }', new Set()),
    ['probe.css: .zz svg { inline-size: fit-content(20%) }']);
});

test('a clamp jsdom cannot parse is reported too', () => {
  // Same silence, one property list over. A clamp that never reaches the CSSOM
  // is a clamp `no rule sizes an icon with a clamp` cannot find.
  assert.deepEqual(droppedDecls('probe.css', '.zz svg { min-width: 20sp }', new Set()),
    ['probe.css: .zz svg { min-width: 20sp }']);
});

test('a property spelled in capitals is asked the same question, and asked in lower case', () => {
  /* The scan reads property names case-insensitively, so these arrive here
   * spelled as the file spells them. cssstyle's getPropertyValue() is
   * case-sensitive even though setProperty() is not, so a name handed on as
   * written reads back empty and every uppercase declaration would look like one
   * jsdom threw away — a red on CSS a browser is perfectly happy with. And the
   * logical mapping is keyed lower case too, so `INLINE-SIZE` asked as written
   * would be asked as itself, which cssstyle waves through whatever the value. */
  const classes = new Set(['ic']);
  for (const decl of ['WIDTH: 1.25rem', 'MAX-WIDTH: 40px', 'INLINE-SIZE: 33px', 'Height: 17px']) {
    assert.deepEqual(droppedDecls('probe.css', `.a svg { ${decl} }`, classes), [],
      `"${decl}" reads as a value jsdom threw away`);
  }
  assert.deepEqual(droppedDecls('probe.css', '.zz svg { WIDTH: fit-content(20%) }', new Set()),
    ['probe.css: .zz svg { WIDTH: fit-content(20%) }']);
  assert.deepEqual(droppedDecls('probe.css', '.zz svg { INLINE-SIZE: fit-content(20%) }', new Set()),
    ['probe.css: .zz svg { INLINE-SIZE: fit-content(20%) }']);
});

/* Values a browser resolves and this guard must not refuse. It asks jsdom
 * whether a declaration survived being parsed, which is the right question and
 * one whose answer moves with the parser rather than with CSS — so the list is
 * long on purpose. `var()`, `calc()` and the viewport units are what the kit
 * writes today; the container and font-relative units, the newer math
 * functions and the wide keywords are what somebody writes next. Every one of
 * them refused is a red on correct code, and a gate that does that gets
 * switched off. */
const RESOLVABLE = [
  'width: var(--ic-size)', 'width: var(--a, var(--b, 3px))', 'height: calc(1em + 2px)',
  'width: calc(100% - env(safe-area-inset-left))', 'width: clamp(1px, 2vw, 3px)',
  'height: min(10px, 2em)', 'width: max(4px, 1vw)', 'width: round(1.2px, 1px)',
  'width: mod(5px, 2px)', 'width: abs(-5px)', 'height: 10dvh', 'height: 10svh',
  'height: 10lvh', 'width: 10cqi', 'width: 10cqw', 'height: 10lh',
  'width: -webkit-fill-available', 'width: fit-content', 'width: max-content',
  'width: 1.25rem !important', 'width: inherit', 'width: initial', 'width: unset',
  'width: revert', 'width: revert-layer', 'aspect-ratio: 1 / 1', 'width: 100%',
  'height: 1.1em', 'height: 17px', 'inline-size: 33px', 'block-size: 34px',
  'min-width: 4px', 'max-inline-size: 5px',
];

test('the values a browser resolves are not read as dropped, on an icon or off one', () => {
  /* The other direction, and the one that decides whether this guard survives
   * contact with the repo. Asked on an icon selector, where the guard does its
   * work, and on a selector with no icon in it, where it must now stay quiet
   * whatever the value — `width: env(safe-area-inset-left)` on a drawer and
   * `CALC(…)` on a toast are values jsdom really does drop, and neither is any
   * business of an icon gate. */
  const classes = new Set(['ic']);
  for (const decl of RESOLVABLE) {
    assert.deepEqual(droppedDecls('probe.css', `.a svg { ${decl} }`, classes), [],
      `"${decl}" reads as a value jsdom threw away`);
  }
  for (const decl of [...RESOLVABLE, 'width: env(safe-area-inset-left)',
    'width: anchor-size(width)', 'height: CALC(1px + 2px)', 'width: MIN(1px, 2px)',
    'width: Var(--x)', 'width: fill-available']) {
    assert.deepEqual(droppedDecls('probe.css', `.ui-drawer { ${decl} }`, classes), [],
      `"${decl}" on a rule with no icon in it reds a gate that measures icons`);
  }
});

test('a value nothing could resolve is left to the blind-spot machinery', () => {
  /* An unresolved interpolation makes a value jsdom cannot parse, so both guards
   * have something to say about the same declaration — and two refusals under two
   * different messages for one rule sends the reader looking for two problems.
   * blindSpots() owns that one, because it can say what is actually wrong with
   * it. A genuinely dropped declaration beside it is still reported. */
  const css = `.zz svg { width: ${UNRESOLVED}px; height: fit-content(20%) }`;
  assert.deepEqual(droppedDecls('probe.css', css, new Set()),
    ['probe.css: .zz svg { height: fit-content(20%) }']);
  assert.deepEqual(blindSpots('probe.css', css, sheetOf(css)).blind,
    [`probe.css: width: ${UNRESOLVED}px`]);
});

test('a value named only inside a comment is not read as a dropped declaration', () => {
  /* The raw text is where a comment still lives, and a commented-out rule is not
   * a rule — the same argument stripComments() carries everywhere else.
   *
   * The commented-out declarations keep their own trailing `;`, because that
   * semicolon is the whole of what makes this a test. declRe() anchors a property
   * on `{` or `;`, so a property named in a comment that holds neither is already
   * invisible to the pattern, and a fixture built from one reads the same whether
   * the comments were stripped or left exactly where they were. */
  assert.deepEqual(droppedDecls('probe.css',
    '.zz svg { height: 12px; /* width: 12px; height: fit-content(20%) */ }', new Set()), []);
  /* The other edge of that same anchor, and the reason stripping beats widening
   * the pattern: a comment sitting between `{` and the first declaration hides
   * that declaration too. Cutting the comment out is what keeps a genuinely
   * dropped value from going quiet behind a note about it. */
  assert.deepEqual(droppedDecls('probe.css', '.zz svg { /* the chevron */ width: fit-content(20%) }',
    new Set()), ['probe.css: .zz svg { width: fit-content(20%) }']);
});

test('an icon named inside :is() or :where() is refused by mount, and says why', () => {
  /* The two halves of this machinery disagree about this shape on purpose.
   * compoundIsSvg() reads `.a :where(svg)` as the icon rule it is, and mount()
   * cannot build an element for it — so it refuses, loudly, rather than leaving
   * the rule unmeasured in silence. The refusal has to name that pairing, or the
   * reader is told the gate does not support a selector the gate's own subject
   * test just accepted. */
  assert.ok(isSvgSubject('.a :where(svg)', new Set()));
  const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>');
  assert.throws(() => mount(dom.window.document, '.a :where(svg)', new Set()), (err) => {
    assert.match(err.message, /:where\(svg\)/);
    assert.match(err.message, /:is\(\)/,
      'the refusal does not say that the subject test recognises this shape and this builder cannot '
      + 'make it, so the reader cannot tell a gap from a bug');
    return true;
  });
});

test('an :is() naming the icon\'s ancestor is refused in its own words', () => {
  /* The commonest shape that reaches this refusal, and the one the refusal was
   * wrong about. `:is(.ui-btn, .ui-chip) svg` names the icon plainly — it is the
   * `svg` at the end — and the `:is()` is the ancestor in front of it, which is
   * what this builder cannot make. Sent to compoundIsSvg() to read about "an
   * icon named inside :is()", the reader goes looking for a disagreement that is
   * not in their selector and finds nothing to fix.
   *
   * So the two shapes are told apart by where the compound sits. The leaf keeps
   * the message above; an ancestor gets one about the ancestor. */
  const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>');
  assert.throws(() => mount(dom.window.document, ':is(.ui-btn, .ui-chip) svg', new Set()), (err) => {
    assert.match(err.message, /:is\(\.ui-btn, \.ui-chip\)/);
    assert.match(err.message, /ancestor/,
      'the refusal does not say the :is() is the ancestor rather than the icon, so the reader '
      + 'cannot tell which half of the selector this is about');
    assert.doesNotMatch(err.message, /compoundIsSvg/,
      'the refusal still sends the reader to compoundIsSvg() for an icon named inside :is(), and '
      + 'the icon in this selector is not named there');
    return true;
  });
});

/* A data URI carrying an inline `style` attribute — the shape src/styles/input.css
 * writes for the select chevron, with the two attributes moved into a style. Valid
 * CSS, no icon anywhere in the string, and to a pattern that does not know where a
 * string starts it holds two declarations.
 *
 * ON AN ICON SELECTOR, because the scan is scoped to the rules that decide an icon
 * and a rule this scan skips proves nothing about how it reads a string. The `svg`
 * leaf is what carries it past that guard and into the text. */
const DATA_URI = ".ui-select svg { background-image: url(\"data:image/svg+xml,%3Csvg "
  + "style='height:12px;width:12px'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\") }";

test('a sizing declaration written inside a string is not a declaration', () => {
  /* The raw-text scans read the text a browser hands to a CSS parser, and a
   * string in that text is content rather than CSS. Read as CSS it is a rule the
   * gate then refuses — a red on correct code, which is how a gate gets switched
   * off. Both the shapes this repo already has: a data URI holding an inline
   * style, and a `content` string holding a brace.
   *
   * Both fixtures are icon rules, by the two routes into the scan — an `svg` leaf
   * and a class the kit puts on an svg — so each one reaches the string rather
   * than being turned back at the door. */
  assert.deepEqual(droppedDecls('probe.css', DATA_URI, new Set()), []);
  assert.deepEqual(droppedDecls('probe.css', '.a::after { content: "{ width: 5px" }',
    new Set(['a'])), []);
});

test('a straddle written inside a string is not a straddle', () => {
  /* Same blindness, one scan over. `content` here holds a second `width` that
   * sits after `inline-size`, so the axis reads as declared on both sides of its
   * twin and the fold refuses a block a browser resolves without ambiguity. */
  assert.doesNotThrow(() => foldLogicalDims(
    sheetOf('.a svg { width: 10px; inline-size: 33px; content: ";width: 12px" }'), 'probe.css'));
});

test('a writing mode named inside a string is not a declaration either', () => {
  /* The prefixed spelling is looked for in the raw text because jsdom parses it
   * away, and the raw text is where a string lives too. An inline style inside a
   * data URI is the shape that carries one, and refusing it stops the fold over
   * a sheet whose every icon is laid out horizontally. */
  assert.doesNotThrow(() => foldLogicalDims(
    sheetOf(".a::after { content: '; -webkit-writing-mode: vertical-rl' }"), 'probe.css'));
});

test('an @import named inside a string is not an import', () => {
  // Same scan, same string, and this one is a hard refusal on a sheet that
  // imports nothing at all.
  assert.deepEqual(importsIn('.a::after { content: "@import zz" }'), []);
});

test('an interpolation inside a string is not a value the gate is blind to', () => {
  // A surface can interpolate into a data URI as readily as into a size, and
  // what comes out is an image, not a width nobody could resolve.
  const css = `.zz { background-image: url("%3Csvg style='height:12px;width:${UNRESOLVED}px'%3E") }`;
  assert.deepEqual(blindSpots('probe.css', css, sheetOf(css)), { blind: [], clampedBlind: [] });
});

test('a dropped declaration on a rule that touches no icon is not refused', () => {
  /* The question — did jsdom keep this declaration — is worth asking of a rule
   * that decides an icon and of nothing else. Asked of every rule in the sheet it
   * reds on `width: env(safe-area-inset-left)` on a drawer, which is ordinary CSS
   * with no icon in it, and on uppercase function names besides. */
  assert.deepEqual(droppedDecls('probe.css', '.ui-drawer { width: env(safe-area-inset-left) }',
    new Set(['ic'])), []);
  assert.deepEqual(droppedDecls('probe.css', '.ui-tip { max-width: anchor-size(width) }',
    new Set(['ic'])), []);
  assert.deepEqual(droppedDecls('probe.css', '.ui-toast { height: CALC(1px + 2px) }',
    new Set(['ic'])), []);
});

test('a dropped declaration on an icon rule is refused, and named with its selector', () => {
  /* The other half, and the whole point of the guard: a rule that decides an icon
   * and reaches the CSSOM sizing nothing. It is named with the selector now,
   * because the scan has one — the message used to say "sizes something" for want
   * of it, which sends the reader through the file looking for the rule. Both
   * shapes an icon rule takes: an `svg` leaf, and a class the kit puts on an svg. */
  assert.deepEqual(droppedDecls('probe.css', '.zz svg { width: fit-content(20%); height: 12px }',
    new Set(['ic'])), ['probe.css: .zz svg { width: fit-content(20%) }']);
  assert.deepEqual(droppedDecls('probe.css', '.zz .ic { min-width: 20sp }', new Set(['ic'])),
    ['probe.css: .zz .ic { min-width: 20sp }']);
});

test('a rule inside a conditional group is scoped by its own selector', () => {
  /* A conditional group is a wrapper, not a rule. The declarations in it belong
   * to the rules further in, and every one of those has a selector of its own to
   * be asked — so the scan goes in rather than reading the body flat, and the
   * same question gets the same answer at either depth.
   *
   * Read flat, `@media` was the selector for everything under it, no selector
   * that starts with `@` is an icon, and the scan therefore asked about every
   * declaration in the block. That refused `width: env(safe-area-inset-left)` on
   * a drawer inside a media query while allowing it verbatim one brace out —
   * a red on CSS somebody is right to write, which is the argument this scoping
   * exists for and the argument it was not honouring. */
  assert.deepEqual(
    droppedDecls('probe.css', '@media screen { .drawer { width: env(safe-area-inset-left) } }',
      new Set(['ic'])), []);
  // And an icon in there is still refused, which is what the descent must not
  // cost. Nothing else catches it: the declaration is gone from the CSSOM, so
  // rulesOf() reads that rule as sizing nothing and lets it by.
  assert.deepEqual(
    droppedDecls('probe.css', '@media screen { .zz svg { width: fit-content(20%) } }', new Set()),
    ['probe.css: .zz svg { width: fit-content(20%) }']);
  // At any depth, since a group nests inside a group.
  assert.deepEqual(
    droppedDecls('probe.css', '@layer k { @media screen { .zz .ic { width: fit-content(20%) } } }',
      new Set(['ic'])), ['probe.css: .zz .ic { width: fit-content(20%) }']);
});

test('a dropped declaration this gate cannot scope to a rule stays loud', () => {
  /* Scoping asks a selector whether it targets an icon, so the shapes with no
   * selector to ask are the shapes scoping would silence. Three of them.
   *
   * An at-rule holding declarations rather than rules — there is nothing further
   * in to descend to, and the prelude is not a selector. A rule with a rule
   * nested inside it, where the inner selector is relative to the outer one and
   * means nothing on its own. And a selector computed at render time, where "not
   * an icon" is a guess rather than an answer. Each is reported with the ground
   * it sits on named, since that is what the reader has to go and open. */
  assert.deepEqual(
    droppedDecls('probe.css', '@media screen { width: fit-content(20%) }', new Set()),
    ['probe.css: @media screen { width: fit-content(20%) }']);
  assert.deepEqual(
    droppedDecls('probe.css', '@media screen { .drawer { svg { width: fit-content(20%) } } }',
      new Set()), ['probe.css: .drawer { width: fit-content(20%) }']);
  assert.deepEqual(
    droppedDecls('probe.css', `.a${UNRESOLVED} { width: fit-content(20%) }`, new Set()),
    [`probe.css: .a${UNRESOLVED} { width: fit-content(20%) }`]);
});

test('a declaration pattern reads min-width as a clamp and never as a width', () => {
  /* The anchor is what keeps those apart, and the gates ask the same text
   * about both lists. Read `width` out of `min-width` and a clamp would be
   * reported as the sizing rule it is not. */
  const found = (props, css) => [...css.matchAll(declRe(props))].map((m) => m[1]);
  assert.deepEqual(found(SIZING_PROPS, '.a svg { min-width: 5px }'), []);
  assert.deepEqual(found(CLAMP_PROPS, '.a svg { min-width: 5px }'), ['min-width']);
  assert.deepEqual(found(SIZING_PROPS, '.a svg { inline-size: 5px; height: 6px }'),
    ['inline-size', 'height']);
  for (const prop of CLAMP_PROPS) {
    assert.deepEqual(found(CLAMP_PROPS, `.a svg { ${prop}: 5px }`), [prop],
      `${prop} is read as something other than itself — check the alternation order`);
  }
});
