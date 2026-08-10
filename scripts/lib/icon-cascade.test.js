/* Rule: folding a logical declaration onto its physical counterpart leaves the
 * cascade saying what a browser would say.
 *
 * The two icon-size gates measure `inline-size` by rewriting it onto `width`
 * before anything is mounted, because jsdom keeps the two in separate cascades
 * and would let the logical declaration win contests a browser makes it lose —
 * see foldLogicalDims() in icon-cascade.js. That rewrite is the one piece of
 * this machinery with a right answer of its own: inside a block the later
 * declaration wins, `!important` wins over both, and getting either wrong
 * produces a number rather than an error, so both gates would keep passing and
 * measure the wrong rule.
 *
 * These cases are the ones a browser answers unambiguously. Each is written so
 * that the two candidate values are far enough apart that no arithmetic can make
 * a wrong fold look right.
 *
 * The refusals below are here for a different reason. foldLogicalDims() stops on
 * a writing-mode declaration, rulesOf() stops on an unfolded sheet and on a
 * sizing rule inside a conditional group, and clampsOn() reports the min-/max-
 * forms neither gate measures. Every one of those fires only when a stylesheet
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
  clampsOn,
  declRe,
  foldLogicalDims,
  rulesOf,
  svgClassSet,
  writtenAs,
} from './icon-cascade.js';

/* One sheet, folded, with an svg mounted inside `.a` and measured. The font-size
 * is forced for the same reason both gates force it: the reset is 1.1em, and at
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
  /* The anchor is what keeps those apart, and the two gates ask the same text
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
