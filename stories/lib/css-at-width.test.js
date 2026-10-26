import test from 'node:test';
import assert from 'node:assert/strict';
import { blockRules, decomment, lengthPx, mediaApplies, sheetAt } from './css-at-width.js';

test('mediaApplies accepts only the width queries the gates use', () => {
  assert.equal(mediaApplies('(max-width: 720px)', 390), true);
  assert.equal(mediaApplies('(max-width: 720px)', 721), false);
  assert.equal(mediaApplies('(min-width: 561px) and (max-width: 720px)', 600), true);
  assert.equal(mediaApplies('(forced-colors: active)', 390), false);
  assert.throws(() => mediaApplies('(orientation: portrait)', 390), /cannot evaluate/);
});

test('sheetAt keeps source order while splicing only matching media blocks', () => {
  const css = `
    .a { color: var(--text); }
    @media (max-width: 720px) { .a { width: 50vw; } }
    @media (min-width: 721px) { .a { width: 320px; } }
    .a { color: var(--strong); }
  `;
  const phone = sheetAt(css, 390);
  assert.match(phone, /\.a \{ color: #1a1e27; \}[\s\S]*\.a \{ width: 50vw; \}[\s\S]*\.a \{ color: #0c0e13; \}/);
  assert.doesNotMatch(phone, /320px/);
  assert.match(sheetAt(css, 800), /320px/);
});

test('blockRules returns the declarations in one media block', () => {
  const rules = blockRules('.x { color: red; } @media (max-width: 720px) { .a, .b { width: 1%; max-width: 50vw; } }', '@media (max-width: 720px)');
  assert.deepStrictEqual(rules, [{
    selector: '.a, .b',
    declarations: [
      { property: 'width', value: '1%' },
      { property: 'max-width', value: '50vw' },
    ],
  }]);
});

test('lengthPx evaluates the length forms used by the table gates', () => {
  assert.equal(lengthPx('156px', 390), 156);
  assert.equal(lengthPx('50vw', 390), 195);
  assert.equal(lengthPx('min(320px, 50vw)', 390), 195);
  assert.equal(lengthPx('100%', 390), null);
  assert.throws(() => lengthPx('12rem', 390), /cannot evaluate/);
});

test('decomment hides declarations inside comments', () => {
  assert.equal(decomment('.a { color: red; /* width: 100%; */ }').includes('width'), false);
});
