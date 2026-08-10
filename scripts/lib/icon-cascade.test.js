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
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { foldLogicalDims, writtenAs } from './icon-cascade.js';

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
