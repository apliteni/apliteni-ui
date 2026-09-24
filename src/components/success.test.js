/* The rank of success()'s title, which is a heading on a page-sized component.
 *
 * It used to be an `h3` at every layout, so a page whose whole content is a
 * success() had no `h1` at all and an outline that opened three ranks down —
 * the fault Guidelines / The page names and #275 fixed. The rank follows the
 * layout now, and a caller who knows better passes `level`.
 *
 * Gated here because no screen under stories/apps/ renders success(), so
 * stories/guidelines/the-page.test.js cannot reach it: it discovers its
 * subjects by rendering those screens, and a component nothing renders is a
 * component that gate is silent about.
 *
 * why: docs/specification.md#the-page
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { success, successCheck } from './success.js';
import { successPanel } from './index.js';

/** The tag and text of the title success() drew, refusing anything else. */
const title = (opts) => {
  const html = success(opts);
  const m = /<(h[1-6]) class="ui-sx__title">([^<]*)<\/\1>/.exec(html);
  assert.ok(m, `success(${JSON.stringify(opts)}) drew no heading for its title: ${html}`);
  return { tag: m[1], text: m[2] };
};

// ---- the layout answers "how much of the screen does this own" ---------------

test('hero and split are the page a flow lands on, so their title is its h1', () => {
  for (const layout of ['hero', 'split']) {
    assert.equal(
      title({ layout }).tag, 'h1',
      `success({ layout: '${layout}' }) is the whole of the screen it lands on, so its title is the `
      + 'page title. A page with no h1 opens its outline below the rank a reader is listening for.',
    );
  }
});

test('compact sits beside other content, so its title is an h2', () => {
  assert.equal(
    title({ layout: 'compact' }).tag, 'h2',
    'success({ layout: \'compact\' }) shares the page, so its title sits under the page\'s own h1 '
    + 'rather than claiming to be it',
  );
});

test('the default layout is hero, and it carries hero\'s rank', () => {
  assert.equal(title({}).tag, title({ layout: 'hero' }).tag);
});

// ---- and the caller who knows better -----------------------------------------

test('`level` overrides the layout, at every rank a heading has', () => {
  for (const layout of ['hero', 'split', 'compact']) {
    for (const level of [1, 2, 3, 4, 5, 6]) {
      assert.equal(
        title({ layout, level }).tag, `h${level}`,
        `success({ layout: '${layout}', level: ${level} }) drew another rank — \`level\` is the `
        + 'caller\'s answer for a page whose shape this component cannot see',
      );
    }
  }
});

test('`level` takes the number a caller is likely to have, written either way', () => {
  assert.equal(title({ level: '3' }).tag, 'h3', 'a rank read off an attribute arrives as a string');
});

// `Number()` is the coercion, so `true` reads as 1 the way it does everywhere
// else in JS, and is left out of the list below rather than guarded against: a
// caller passing a boolean as a heading rank has a bug this component cannot
// name better than the page's own outline will.
test('a `level` that is not a heading rank falls back to the layout, rather than drawing an <hundefined>', () => {
  for (const level of [0, 7, -1, 1.5, null, undefined, NaN, 'h2', 'two', '', {}, []]) {
    assert.equal(
      title({ layout: 'compact', level }).tag, 'h2',
      `success({ level: ${JSON.stringify(level)} }) drew something other than the layout's own rank`,
    );
  }
});

// ---- the look is the class's, not the rank's ---------------------------------

test('only the tag moves: the title keeps its class and its text at every rank', () => {
  const hero = title({ layout: 'hero', title: 'Payout sent' });
  const compact = title({ layout: 'compact', title: 'Payout sent' });
  assert.equal(hero.text, 'Payout sent');
  assert.equal(compact.text, hero.text);
  for (const level of [1, 2, 3]) {
    assert.match(
      success({ level, title: 'Payout sent' }), /<h[1-6] class="ui-sx__title">Payout sent<\/h[1-6]>/,
      'the title stopped carrying .ui-sx__title, which is what paints it — the rank is the outline, '
      + 'the class is the look, and moving one must not move the other',
    );
  }
});

test('block confirmation shares the full-page check and keeps text escaped', () => {
  const html = successPanel({ title: '<Done>', sub: 'Saved & sent' });
  assert.ok(html.includes(successCheck()));
  assert.ok(success().includes(successCheck()));
  assert.ok(html.includes('&lt;Done&gt;'));
  assert.ok(html.includes('Saved &amp; sent'));
  assert.ok(!successPanel().includes('ui-success__sub'));
});
