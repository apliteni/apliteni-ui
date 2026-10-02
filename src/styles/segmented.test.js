// Source CSS contracts. Nothing here lays anything out: the rendered outcome —
// two rows at a phone width, one at 1280, no tab past the strip's edge — is
// measured in a browser by stories/segmented-wrap.test.js.
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
  // Both declarations are read, so dropping either one fails here rather than in
  // a screenshot. `overflow: visible` is the initial value, so this catches the
  // declaration going missing and NOT clipping reintroduced by a parent or a
  // later rule; stories/segmented-wrap.test.js measures the rendered outcome.
  assert.equal(valueOf('.ui-seg--underline', 'flex-wrap'), 'wrap', 'underline tabs must wrap rather than hide the ones past the fold');
  assert.equal(valueOf('.ui-seg--underline', 'overflow'), 'visible', 'a scroll box would clip the focus ring against the strip padding');
});
