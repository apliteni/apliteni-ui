/* Rule: the reader that decides what is a cast shadow says so about the layer in
 * front of it, and says nothing it cannot read.
 *
 * geometryOf() is the piece with a right answer of its own — isCast() is a
 * comparison over its four numbers — and getting it wrong produces a number
 * rather than an error, so both elevation gates would keep passing on the wrong
 * rule. The #314 review found one such number: a layer whose offset is written
 * as a var() was read as `{x: 0, y: 10, blur: 0}` and cleared as flat, while the
 * reader is documented as working "on a substituted value and on a raw one".
 *
 * why: docs/specification.md#elevation
 * Share the calculation but check each workspace separately.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { boxShadowsIn, customPropertiesIn, geometryOf, inkOf, isCast, isFocusRing, layersOf } from './box-shadow.js';

test('a layer reads its four lengths in order, and a missing one is zero', () => {
  assert.deepEqual(geometryOf('0 14px 30px -12px black'), { x: 0, y: 14, blur: 30, spread: -12 });
  assert.deepEqual(geometryOf('inset 0 0 0 1px #e4e7ee'), { x: 0, y: 0, blur: 0, spread: 1 });
  assert.deepEqual(geometryOf('inset 1px 0 0 var(--border)'), { x: 1, y: 0, blur: 0, spread: 0 });
});

test('a colour function is not a length, wherever its own commas fall', () => {
  const layer = '0 3px 9px -4px color-mix(in srgb, var(--shadow-ink) 50%, transparent)';
  assert.equal(layersOf(`${layer}, ${layer}`).length, 2);
  assert.deepEqual(geometryOf(layer), { x: 0, y: 3, blur: 9, spread: -4 });
  assert.equal(inkOf(layer), 'color-mix(in srgb, var(--shadow-ink) 50%, transparent)');
});

/* #314 nit 8. The reader cannot resolve `var(--y)`, and the answer to a length
 * it cannot read is NaN rather than 0: NaN fails every comparison, so isCast
 * takes the layer FOR a cast instead of clearing it, and a caller holding the
 * vars substitutes and reads it again. */
test('an offset written as a var() is not read as zero', () => {
  const { x, y, blur } = geometryOf('0 var(--y) 10px black');
  assert.equal(x, 0);
  assert.ok(Number.isNaN(y), 'an unresolved offset came back as a number');
  assert.equal(blur, 10);
  assert.equal(isCast('0 var(--y) 10px black'), true);
});

test('a var() in the last slot is the colour, which the drawer writes', () => {
  assert.deepEqual(geometryOf('inset 0 -1px 0 var(--border)'), { x: 0, y: -1, blur: 0, spread: 0 });
  assert.equal(isCast('inset 0 -1px 0 var(--border)'), false);
  assert.equal(isCast('var(--ring)'), false, 'an unsubstituted token is not a cast on its own');
});

test('a zero-offset layer is a ring or a glow, and an offset one is a cast', () => {
  assert.equal(isCast('0 0 0 3px #b479ff'), false);
  assert.equal(isCast('inset 0 14px 30px -12px black'), false, 'inset is never a cast');
  assert.equal(isCast('0 0 12px rgba(0,0,0,.35)'), true, 'blur alone is enough');
});

test('a commented-out declaration is not a declaration', () => {
  const css = '.a { /* box-shadow: 0 2px 4px black; */ box-shadow: var(--elev-drop); }';
  assert.deepEqual(boxShadowsIn(css).map((d) => d.value), ['var(--elev-drop)']);
});

/* #314 round 2, finding 3. The line was counted from the character after the
 * previous semicolon, so every offence the two gates printed named the line the
 * declaration BEFORE it ended on — and a comment block between the two pushed it
 * as far out as the comment is tall — four lines, for the callout's panel. A
 * file:line a reader is handed has to land on the thing it names;
 * scripts/code-refs.test.js holds this repo's prose to that, and a gate handing
 * one out is no different. */
test('the line named is the line the declaration is written on', () => {
  const css = [
    '.a {',                    // 1
    '  overflow: hidden;',     // 2
    '  /* a comment block',    // 3
    '     three lines tall',   // 4
    '     that a blank keeps */', // 5
    '  box-shadow: var(--elev-drop);', // 6
    '}',                       // 7
    '.b { --x: 1px; box-shadow: none; }', // 8
  ].join('\n');

  assert.deepEqual(boxShadowsIn(css).map((d) => `${d.selector}:${d.line}`), ['.a:6', '.b:8']);
  assert.deepEqual(customPropertiesIn(css).map((d) => `${d.name}:${d.line}`), ['--x:8']);
});

test('a declaration split across lines is named at its property', () => {
  const css = '.a {\n  border: 0;\n  box-shadow:\n    0 1px 2px black,\n    0 2px 4px black;\n}';
  assert.deepEqual(boxShadowsIn(css).map((d) => d.line), [3]);
});

// A glow is allowed only as the approved ring, never as a disguised cast shadow.
test('G2 admits its halo and rejects a shifted, widened or recoloured drop', () => {
  const ring = '0 0 0 1px #fff, 0 0 0 calc(1px + 2px) #005ab4, 0 0 12px 2px color-mix(in srgb, #005ab4 45%, transparent)';
  assert.equal(isFocusRing(ring), true);
  for (const changed of [ring.replace('0 0 12px', '0 1px 12px'), ring.replace('12px', '16px'), ring.replace('45%', '90%'), ring.replace('1px + 2px', '1px + 0px')]) {
    assert.equal(isFocusRing(changed), false, changed);
  }
  assert.deepEqual(geometryOf('0 0 0 calc(1px + 2px) #005ab4'), { x: 0, y: 0, blur: 0, spread: 3 });
});
