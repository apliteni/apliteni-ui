// Rule: the page shell's folded rail closes its rows to the strip, so the rail's clip
// leaves the focus ring on all four sides (#589). The phone shell uses a drawer (#592).
//
// Coverage limits:
// - Source only. It reads layout.css for the rule, not paint; the ring itself is measured
//   in a browser and reported on the PR.
// - It reads the rule's selectors and its width, not the cascade around them.
//
// why: docs/components.md#the-page-shell
// Weaken the rule and confirm that its test fails.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const layout = readFileSync('src/styles/layout.css', 'utf8');

/** Whether a rule with all of `selectors` sets `width: var(--ui-nav-strip)`. */
const closes = (css, selectors, folded) => [...css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^{}]*)\}/g)].some(([, head, body]) =>
  head.includes('.is-collapsed') === folded && selectors.every((s) => head.includes(s))
  && /(?:^|[\s;])width:\s*var\(--ui-nav-strip\)/.test(body));

const FOLDED = [':where(.ui-app.is-collapsed) .ui-app__rail .ui-nav__item',
  ':where(.ui-app.is-collapsed) .ui-app__rail .ui-app__user-trigger'];

test('a folded shell rail closes its rows and the account trigger to the strip', () => {
  assert.ok(closes(layout, FOLDED, true), 'the folded rail lets its rows keep the open column, so the clip cuts their ring');
});

test('the gate fails when the rule is removed', () => {
  const weakened = layout.replaceAll(/(\{[^{}]*?)\bwidth: var\(--ui-nav-strip\);/g, '$1');
  assert.notEqual(weakened, layout, 'the mutation found nothing to change');
  assert.equal(closes(weakened, FOLDED, true), false);
});
