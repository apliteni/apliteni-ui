// Source CSS contracts; browser evidence covers actual wrapping and scrolling.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('./segmented.css', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, selector, body]) => ({ selector: selector.trim(), body }));
const valueOf = (selector, prop) => {
  const matches = rules.filter(rule => rule.selector === selector);
  assert.equal(matches.length, 1, `expected one rule for ${selector}`);
  return new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*([^;]+)`).exec(matches[0].body)?.[1].trim();
};

test('pill strips wrap within their container', () => {
  assert.equal(valueOf('.ui-seg', 'flex-wrap'), 'wrap', 'long pill strips must wrap rather than widen the page');
});

test('underline strips wrap and clip nothing', () => {
  // Scrolling on one row left `Valuation` cut at 390px with nothing saying it
  // was there, and the scroll box cut the focus ring's glow. Both declarations
  // are read, so dropping either one fails here rather than in a screenshot. #527
  assert.equal(valueOf('.ui-seg--underline', 'flex-wrap'), 'wrap', 'underline tabs must wrap rather than hide the ones past the fold');
  assert.equal(valueOf('.ui-seg--underline', 'overflow'), 'visible', 'a scroll box would clip the focus ring against the strip padding');
});
