// Rule: a focused code region inside a Snippet draws ONE indicator, and the card draws it.
//
// A `<pre>` flush with its card on three sides and with no radius of its own can only
// draw a square band, cutting a line across the rounded card. So the card draws the band
// for it (#474), and the pre draws nothing at all.
//
// Resolves the source CSS with `:focus-visible` forced on, in both themes and two
// accents. Since #578 the band is a real `outline`, which is what makes this reading
// shorter than it was: there is one property to resolve rather than a box-shadow band
// plus a transparent outline standing in for it under forced colours, and the kit has no
// `forced-colors` block left to emulate.
//
// WHAT THIS DOES NOT READ. JSDOM cannot prove keyboard reachability or clipping, and it
// evaluates no media query. What the system repaints an outline AS is the browser's
// business; this reads which boxes declare one, because that is what decides how many
// indicators appear and what shape they are. Chromium captures at 390px and 1280px cover
// the rest.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { snippet } from '../src/components/index.js';
import { desugar, substitute, tokensFor } from './lib/contrast.js';

const source = ['base', 'code'].map(name => readFileSync(new URL(`../src/styles/${name}.css`, import.meta.url), 'utf8')).join('\n');
/** Nothing a reader can see on this property. JSDOM leaves an undeclared shorthand empty. */
const bare = value => ['', 'none'].includes(value);

function check(css, theme, accent) {
  const vars = tokensFor(theme, accent);
  const resolved = desugar(substitute(css, vars)).replace(/calc\(([-\d.]+)px \+ ([-\d.]+)px\)/g, (_, a, b) => `${Number(a) + Number(b)}px`);
  const win = new JSDOM(`<style>${resolved}</style>${[false, true].flatMap(reveal => [true, false].map(copy => snippet({ reveal, copy, code: '<a href="#example">Example</a>' }))).join('')}<button class="ui-focusable">Reference</button>`).window;
  const reference = win.document.querySelector('.ui-focusable');
  reference.setAttribute('data-ui-state', 'focus-visible');
  const expected = win.getComputedStyle(reference);
  // The band itself, read off a control that takes it plainly, so every assertion below
  // compares against what the kit actually draws rather than against a literal.
  assert.ok(!bare(expected.outline), 'the reference control draws no band at all');
  assert.match(expected.outline, /(?:^|\s)2px(?:\s|$)/, 'the band is no longer 2px of solid ink');
  assert.doesNotMatch(expected.outline, /transparent/, 'the band is a visible outline, not a stand-in');

  const targets = win.document.querySelectorAll('.ui-snippet button, .ui-snippet a[href], .ui-snippet pre, .ui-snippet [tabindex]');
  assert.equal(targets.length, 10, 'two copy buttons, four code regions and four composed links');
  for (const target of targets) {
    const card = target.closest('.ui-snippet');
    target.setAttribute('data-ui-state', 'focus-visible');
    const style = win.getComputedStyle(target);
    const cardStyle = win.getComputedStyle(card);
    if (target.tagName === 'PRE') {
      assert.equal(style.outline, 'none', 'the code region paints no band of its own');
      assert.equal(cardStyle.outline, expected.outline, 'the card carries the code band');
      // JSDOM leaves an undeclared shorthand empty and does not expand longhands.
      assert.ok(['', '0', '0px'].includes(style.borderRadius), 'the pre is square, which is why it cannot carry the band');
      assert.ok(Number.parseFloat(cardStyle.borderRadius) > 0, 'the card the band follows is rounded');
      assert.equal([target, card].filter(el => !bare(win.getComputedStyle(el).outline)).length, 1,
        'one focused code region draws one indicator, not two');
    } else {
      assert.equal(style.outline, expected.outline, `${target.tagName} uses the shared band`);
      assert.ok(bare(cardStyle.outline), 'only the code region hands its band to the card');
    }
    // Nothing writes a focus box-shadow any more: the band left that property in #578, so
    // anything there while a control has focus is a second indicator.
    assert.ok(bare(style.boxShadow), `${target.tagName} paints a box-shadow beside the band`);
    target.removeAttribute('data-ui-state');
    assert.ok(bare(win.getComputedStyle(target).outline), 'band is keyboard-focus only');
    assert.ok(bare(win.getComputedStyle(card).outline), 'the card band is keyboard-focus only');
  }
  for (const root of win.document.querySelectorAll('.ui-snippet')) {
    assert.equal(win.getComputedStyle(root).overflow, 'hidden', 'the card still clips its code');
  }
  win.close();
}
for (const theme of ['light', 'dark']) for (const accent of ['default', 'ocean']) {
  test(`Snippet focus uses the kit band: ${theme}/${accent}`, () => check(source, theme, accent));
}

// Each mutation removes one declaration the fix depends on, so a later edit that
// drops it fails here rather than in a screenshot nobody re-takes.
for (const [name, mutate, expected] of [
  ['the shared ring selector', css => css.replace('.ui-snippet :focus-visible,', ''), /uses the shared band/],
  ['the band on the card', css => css.replace(/\.ui-snippet:has\(pre:focus-visible\) \{[^}]*\}/, ''), /the card carries the code band/],
  // Without it the pre takes base.css's band itself: a square one, inside the card's
  // rounded one, which is the two-indicator defect #474 corrected.
  ['the suppression on the pre', css => css.replace('.ui-snippet pre:focus-visible { outline: none; }', ''), /paints no band of its own/],
  ['the clip on the card', css => css.replace('border-radius: var(--radius-md);\n  overflow: hidden;', 'border-radius: var(--radius-md);\n  overflow: visible;'), /still clips/],
]) {
  test(`rejects removing ${name}`, () => {
    const mutated = mutate(source);
    assert.notEqual(mutated, source, 'the mutation found its declaration');
    assert.throws(() => check(mutated, 'light', 'default'), expected);
  });
}

// ---- forced colours -------------------------------------------------------
//
// Forced colours drops every box-shadow and repaints the outlines it is left. Until #578
// that mattered here: the band was a box-shadow, so every consumer carried a transparent
// 2px outline for the system to repaint, the pre's was a square one inside the card's, and
// code.css carried an `@media (forced-colors: active)` block to take it off again. That
// block and the stand-in are both gone — the band IS an outline, the pre declares `none`
// in every colour mode, and the reading above is the reading in forced colours too.
//
// What is left to hold is that nothing brings either of them back.
test('nothing is left for forced colours to correct', () => {
  assert.doesNotMatch(source, /forced-colors/,
    'a forced-colors block is back in base.css or code.css. The band is a real outline '
    + 'now, so one is either a second indicator or a correction for one');
  const standIns = [...source.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter(([, , body]) => /outline\s*:\s*2px solid transparent/.test(body))
    .map(([, selector]) => selector.trim().replace(/\s+/g, ' '));
  assert.deepEqual(standIns, [], 'a transparent stand-in outline is back; it would be the '
    + 'second indicator the system repaints beside the band');
});
