// Rule: a dropdown row and a version row show a hover step in both themes with no outline
// (#595), and a dropdown row draws its focus ring inward so a scrolled row's ring is never clipped (#649).
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

import { splitSelectorList } from '../scripts/lib/selector-list.js';
const sheet = (file) => readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const css = sheet('src/styles/dropdown.css');
// The top bar's version rows take the dropdown's hover fill, so both sheets are read.
const ROWS = [['.ui-dropdown__item', css], ['.vopt', sheet('src/styles/topbar.css')]];
const rules = (text) => [...text.matchAll(/([^{}]+)\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g)];

/** The background `row` takes on hover in `theme`, as a token name. */
const hoverFill = (text, theme, row = '.ui-dropdown__item') => {
  const hover = new RegExp(`${row.replace('.', '\\.')}:hover$`);
  let fill = null;
  for (const [, head, body] of rules(text)) {
    const heads = splitSelectorList(head).map((h) => h.trim());
    for (const h of heads) {
      if (!hover.test(h)) continue;
      if (h.includes('data-theme') && !h.includes(`"${theme}"`)) continue;
      const m = /(?:^|;|\s)background:\s*var\((--[\w-]+)\)/.exec(body);
      if (m) fill = m[1];
    }
  }
  return fill;
};

const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const distance = (a, b) => Math.max(...rgb(a).map((v, i) => Math.abs(v - rgb(b)[i])));

for (const [row, text] of ROWS) for (const theme of ['light', 'dark']) {
  test(`a hovered ${row} row differs from the panel in ${theme}`, () => {
    const tokens = tokensFor(theme);
    const fill = hoverFill(text, theme, row);
    assert.ok(fill, `${theme}: no hover fill found`);
    const panel = tokens.get('--bg-elevated');
    assert.notEqual(tokens.get(fill).toLowerCase(), panel.toLowerCase(),
      `${theme}: the hover fill ${fill} equals the panel ground, so hover changes nothing`);
    assert.ok(distance(tokens.get(fill), panel) >= 8,
      `${theme}: the hover fill ${fill} is within 8 levels of the panel ground`);
  });
}

test('the hover gate fails when the light fill goes back to --surface', () => {
  for (const [row, text] of ROWS) {
    const weakened = text.replace(new RegExp(`(data-theme="light"\\]\\) \\${row}:hover \\{ background: )var\\(--surface-3\\)`), '$1var(--surface)');
    assert.notEqual(weakened, text, `${row}: the mutation found nothing to change`);
    const tokens = tokensFor('light');
    assert.equal(tokens.get(hoverFill(weakened, 'light', row)).toLowerCase(), tokens.get('--bg-elevated').toLowerCase());
  }
});

const inward = (text) => rules(text).filter(([, head]) =>
  splitSelectorList(head).some((h) => h.trim() === '.ui-dropdown__item:focus-visible'))
  .map(([, , body]) => body)
  .some((body) => /outline:\s*var\(--ring-scroll\)/.test(body)
    && /outline-offset:\s*var\(--ring-scroll-offset\)/.test(body));

test('a focused dropdown row draws its ring inward, so a scrolled row cannot clip it', () => {
  assert.ok(inward(css), 'the row draws an outset ring, which the list or panel clips at its edge');
});

test('the inward-ring gate fails when the row goes back to the outset ring', () => {
  const weakened = css.replace(/outline:\s*var\(--ring-scroll\);\s*outline-offset:\s*var\(--ring-scroll-offset\)/,
    'outline: var(--ring); outline-offset: var(--ring-offset)');
  assert.notEqual(weakened, css, 'the mutation found nothing to change');
  assert.equal(inward(weakened), false);
});

test('a hovered dropdown row draws no outline, because an outline means focus', () => {
  const edged = rules(css).filter(([, head]) =>
    splitSelectorList(head).some((h) => /\.ui-dropdown__item:hover$/.test(h.trim())))
    .some(([, , body]) => /outline/.test(body));
  assert.equal(edged, false, 'a hover rule paints an outline');
});

test('the hover-outline gate fails when a hover rule paints an outline', () => {
  const weakened = css.replace(/(\.ui-dropdown__item:hover \{ )background/, '$1outline: 1px solid var(--control-edge); background');
  assert.notEqual(weakened, css, 'the mutation found nothing to change');
  const edged = rules(weakened).filter(([, head]) =>
    splitSelectorList(head).some((h) => /\.ui-dropdown__item:hover$/.test(h.trim())))
    .some(([, , body]) => /outline/.test(body));
  assert.equal(edged, true);
});
