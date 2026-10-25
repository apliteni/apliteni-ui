// What success.css and callout.css guarantee about a confirmation's mark: the tier the
// markup no longer has keeps no rule, and the circled mark is one size everywhere.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { markup } from '../../stories/lib/react-markup.js';

test('the stylesheet keeps no rule for the tier the markup no longer has', () => {
  const css = readFileSync(new URL('./success.css', import.meta.url), 'utf8');
  assert.ok(!css.includes('ui-sx__eyebrow'),
    'src/styles/success.css still paints .ui-sx__eyebrow. A rule nothing emits is an invitation to '
    + 'hand-write the element back, and it keeps a rank note src/styles/type-ranks.test.js counts.');
});

/* `circled` is one size everywhere — including the inline panel.
 *
 * The size lives in two sheets: success.css sizes it for the confirmation's three
 * layouts, callout.css narrows the inline panel's box to match. Nothing else
 * ties them together, so the two can drift apart silently — which is exactly
 * what they had done before #429 measured the panel and found 28px behind a
 * published 20px guarantee.
 *
 * Limits: this reads the declarations, it does not paint. It proves the two
 * sheets agree on a number, not that a browser draws it; the measurement that
 * found the original drift was a browser, and so is the capture in the PR.
 *
 * why: docs/components.md#success-confirmations
 */
const sizeOf = (css, selector) => {
  const rule = new RegExp(`${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{([^}]*)\\}`).exec(css);
  assert.ok(rule, `no rule for \`${selector}\` — it was renamed or removed, so nothing sizes that mark`);
  const w = /width:\s*([\d.]+)px/.exec(rule[1]);
  const h = /height:\s*([\d.]+)px/.exec(rule[1]);
  assert.ok(w && h, `\`${selector}\` stopped setting both a width and a height in px`);
  return { w: Number(w[1]), h: Number(h[1]) };
};

test('the inline panel draws the circled mark at the same size the confirmation does', async () => {
  const successCss = readFileSync(new URL('./success.css', import.meta.url), 'utf8');
  const calloutCss = readFileSync(new URL('./callout.css', import.meta.url), 'utf8');

  const page = sizeOf(successCss, '.ui-sx--check-circled .ui-sx__check');
  const panel = sizeOf(calloutCss, '.ui-success__check--circled');

  assert.deepEqual(panel, page,
    `the inline panel sizes the circled mark ${panel.w}x${panel.h} while the confirmation draws it `
    + `${page.w}x${page.h}. The kit promises one status size everywhere, and `
    + 'docs/components.md#success-confirmations, react/README.md and the changelog all state '
    + 'the number — move all four together or none.');
  assert.equal(page.w, page.h, 'the mark is square; a Lucide glyph in a 24 box has no other shape');

  // The guarantee is a number a reader can look up, so hold the number too: a
  // matched pair that both drifted would otherwise satisfy the assertion above.
  assert.equal(page.w, 20,
    'the circled mark left 20px. That number is published in docs/components.md, react/README.md '
    + 'and site/changelog.mjs; change those in the same commit or put it back.');

  // The rule only reaches the panel if SuccessPanel writes the modifier, and only
  // for the circled mark. A class nothing emits would pass the comparison above.
  const panelOf = (props) => markup(({ h, kit }) => h(kit.SuccessPanel, props));
  assert.match(await panelOf({ check: 'circled' }), /class="ui-success__check ui-success__check--circled"/,
    'SuccessPanel check="circled" stopped writing the modifier, so the 20px rule reaches nothing');
  assert.doesNotMatch(await panelOf({ check: 'line' }), /ui-success__check--circled/,
    'the line mark took the circled box; it is sized by the panel, not by the status rule');
  assert.doesNotMatch(await panelOf({}), /ui-success__check--circled/, 'the default took the circled box');
});
