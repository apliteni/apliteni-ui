// Rule: a dropdown row shows a hover step in both themes (#595), and a scrolled panel
// keeps room for the focus ring of the row at its edge (#649).
//
// Coverage limits:
// - Source only. It reads the sheet and the token values, and paints nothing. The hover
//   step and the ring's four sides are measured in a browser and reported on the PR.
// - The step is judged as colour distance between two token values, not as a contrast
//   ratio, because the fill is a non-text mark.
//
// why: docs/foundations.md#elevation
// Weaken the rule and confirm that its test fails.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { tokensFor } from './lib/contrast.js';

const css = readFileSync('src/styles/dropdown.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const rules = (text) => [...text.matchAll(/([^{}]+)\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g)];

/** The background the row takes on hover in `theme`, as a token name. */
const hoverFill = (text, theme) => {
  let fill = null;
  for (const [, head, body] of rules(text)) {
    const heads = head.split(',').map((h) => h.trim());
    for (const h of heads) {
      if (!/\.ui-dropdown__item:hover$/.test(h)) continue;
      if (h.includes('data-theme') && !h.includes(`"${theme}"`)) continue;
      const m = /(?:^|;|\s)background:\s*var\((--[\w-]+)\)/.exec(body);
      if (m) fill = m[1];
    }
  }
  return fill;
};

const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const distance = (a, b) => Math.max(...rgb(a).map((v, i) => Math.abs(v - rgb(b)[i])));

for (const theme of ['light', 'dark']) {
  test(`a hovered dropdown row differs from the panel in ${theme}`, () => {
    const tokens = tokensFor(theme);
    const fill = hoverFill(css, theme);
    assert.ok(fill, `${theme}: no hover fill found`);
    const panel = tokens.get('--bg-elevated');
    assert.notEqual(tokens.get(fill).toLowerCase(), panel.toLowerCase(),
      `${theme}: the hover fill ${fill} equals the panel ground, so hover changes nothing`);
    assert.ok(distance(tokens.get(fill), panel) >= 8,
      `${theme}: the hover fill ${fill} is within 8 levels of the panel ground`);
  });
}

test('the hover gate fails when the light fill goes back to --surface', () => {
  const weakened = css.replace(/(data-theme="light"\]\) \.ui-dropdown__item:hover \{ background: )var\(--surface-3\)/, '$1var(--surface)');
  assert.notEqual(weakened, css, 'the mutation found nothing to change');
  const tokens = tokensFor('light');
  assert.equal(tokens.get(hoverFill(weakened, 'light')).toLowerCase(), tokens.get('--bg-elevated').toLowerCase());
});

const room = /scroll-padding-block:\s*calc\(var\(--ring-gap-width\)\s*\+\s*var\(--ring-width\)\)/;
const keepsRoom = (text, selector) => rules(text).some(([, head, body]) =>
  head.split(',').some((h) => h.trim() === selector) && room.test(body));

test('the panel and its list keep the ring\'s room when a row scrolls into view', () => {
  for (const selector of ['.ui-dropdown__panel', '.ui-dropdown__list']) {
    assert.ok(keepsRoom(css, selector), `${selector} no longer keeps scroll-padding for the ring`);
  }
});

test('the scroll-padding gate fails when the declaration is removed', () => {
  const weakened = css.replaceAll(/scroll-padding-block:[^;]+;/g, '');
  for (const selector of ['.ui-dropdown__panel', '.ui-dropdown__list']) {
    assert.equal(keepsRoom(weakened, selector), false);
  }
});
