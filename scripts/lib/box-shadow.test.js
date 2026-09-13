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
 * why: CONTRIBUTING.md#one-gate-per-workspace-over-one-shared-implementation
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { boxShadowsIn, geometryOf, inkOf, isCast, layersOf } from './box-shadow.js';

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
