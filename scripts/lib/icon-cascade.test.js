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
  importsIn,
  foldLogicalDims,
  isSvgSubject,
  mount,
  rulesOf,
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

test('a block that declares one axis in both spellings and repeats one is refused', () => {
  /* The fold decides this contest by position, and position is the one thing the
   * CSSOM cannot report here: cssstyle keeps a repeated property once, in its
   * FIRST position carrying its LAST value. So the first case below reads as
   * `width: 12px; inline-size: 33px` and folds to 33px where a browser renders
   * 12, and the second folds to 12px where a browser renders 44 — a wrong number
   * rather than an error, which is what all three gates would then report as a
   * pass. Nothing here can recover the order, so nothing here guesses at it. */
  assert.throws(
    () => foldLogicalDims(sheetOf('.a svg { width: 10px; inline-size: 33px; width: 12px }'), 'probe.css'),
    /declares width twice/);
  assert.throws(
    () => foldLogicalDims(sheetOf('.a svg { inline-size: 33px; width: 12px; inline-size: 44px }'), 'probe.css'),
    /declares inline-size twice/);
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
  // The other direction, and the reason stripping is right rather than merely
  // convenient: a commented-out rule is not a rule.
  const css = `.zz svg { /* width: ${UNRESOLVED}px */ height: 13px }`;
  assert.deepEqual(blindSpots('probe.css', css, sheetOf(css)), { blind: [], clampedBlind: [] });
});

test('an @import is reported wherever a stylesheet carries one', () => {
  // A sheet no gate opens. Read out of the raw text, since jsdom keeps an
  // unfollowed @import out of the way rather than in it.
  assert.deepEqual(importsIn('@import "./zz.css";\n.a svg { width: 42px }'), ['"./zz.css"']);
  assert.deepEqual(importsIn('/* @import "./zz.css"; */ .a svg { width: 42px }'), []);
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
