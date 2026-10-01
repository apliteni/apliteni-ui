// Resolves source CSS with forced focus-visible, in the default mode and in
// forced colors. JSDOM cannot prove keyboard reachability, clipping, or the
// per-surface ring gap — contrast.js substitutes each custom property once for the
// whole sheet, so --ring-gap: inherit is not measurable here — and it cannot show
// what the system repaints an outline as. Chromium captures at 390px and 1280px
// cover those, including one forced-colors frame.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { snippet } from '../src/components/index.js';
import { desugar, substitute, tokensFor } from './lib/contrast.js';
import { leafRules } from './lib/motion-css.js';

const source = ['base', 'code'].map(name => readFileSync(new URL(`../src/styles/${name}.css`, import.meta.url), 'utf8')).join('\n');
const quiet = style => ['', 'none'].includes(style.boxShadow);

function check(css, theme, accent) {
  const vars = tokensFor(theme, accent);
  const resolved = desugar(substitute(css, vars)).replace(/calc\(([-\d.]+)px \+ ([-\d.]+)px\)/g, (_, a, b) => `${Number(a) + Number(b)}px`);
  const win = new JSDOM(`<style>${resolved}</style>${[false, true].flatMap(reveal => [true, false].map(copy => snippet({ reveal, copy, code: '<a href="#example">Example</a>' }))).join('')}<button class="ui-focusable">Reference</button>`).window;
  const reference = win.document.querySelector('.ui-focusable');
  reference.setAttribute('data-ui-state', 'focus-visible');
  const expected = win.getComputedStyle(reference);
  assert.notEqual(expected.boxShadow, 'none');
  assert.ok(expected.boxShadow);
  const targets = win.document.querySelectorAll('.ui-snippet button, .ui-snippet a[href], .ui-snippet pre, .ui-snippet [tabindex]');
  assert.equal(targets.length, 10, 'two copy buttons, four code regions and four composed links');
  for (const target of targets) {
    const card = target.closest('.ui-snippet');
    target.setAttribute('data-ui-state', 'focus-visible');
    const style = win.getComputedStyle(target);
    const cardStyle = win.getComputedStyle(card);
    assert.equal(style.outline, expected.outline, `${target.tagName} suppresses the native outline`);
    assert.match(style.outline, /transparent/);
    if (target.tagName === 'PRE') {
      // A <pre> flush with its card and with no radius of its own can only draw
      // a square ring, so the card draws it instead. #474
      assert.equal(style.boxShadow, 'none', 'the code region paints no ring of its own');
      assert.equal(cardStyle.boxShadow, expected.boxShadow, 'the card carries the code ring');
      // JSDOM leaves an undeclared shorthand empty and does not expand longhands.
      assert.ok(['', '0', '0px'].includes(style.borderRadius), 'the pre is square, which is why it cannot carry the ring');
      assert.ok(Number.parseFloat(cardStyle.borderRadius) > 0, 'the card the ring follows is rounded');
    } else {
      assert.equal(style.boxShadow, expected.boxShadow, `${target.tagName} uses the shared ring`);
      assert.ok(quiet(cardStyle), 'only the code region hands its ring to the card');
    }
    target.removeAttribute('data-ui-state');
    assert.ok(quiet(win.getComputedStyle(target)), 'ring is keyboard-focus only');
    assert.ok(quiet(win.getComputedStyle(card)), 'the card ring is keyboard-focus only');
  }
  for (const root of win.document.querySelectorAll('.ui-snippet')) {
    assert.equal(win.getComputedStyle(root).overflow, 'hidden', 'the card still clips its code');
  }
  win.close();
}
for (const theme of ['light', 'dark']) for (const accent of ['default', 'ocean']) {
  test(`Snippet focus uses the kit ring: ${theme}/${accent}`, () => check(source, theme, accent));
}

// Each mutation removes one declaration the fix depends on, so a later edit that
// drops it fails here rather than in a screenshot nobody re-takes.
for (const [name, mutate, expected] of [
  ['the shared ring selector', css => css.replace('.ui-snippet :focus-visible,', ''), /suppresses the native outline/],
  ['the ring on the card', css => css.replace(/\.ui-snippet:has\(pre:focus-visible\) \{[^}]*\}/, ''), /the card carries the code ring/],
  ['the square ring on the pre', css => css.replace('.ui-snippet pre:focus-visible { box-shadow: none; }', ''), /paints no ring of its own/],
  ['the clip on the card', css => css.replace('border-radius: var(--radius-md);\n  overflow: hidden;', 'border-radius: var(--radius-md);\n  overflow: visible;'), /still clips/],
]) {
  test(`rejects removing ${name}`, () => {
    const mutated = mutate(source);
    assert.notEqual(mutated, source, 'the mutation found its declaration');
    assert.throws(() => check(mutated, 'light', 'default'), expected);
  });
}

// ---- forced colors --------------------------------------------------------
//
// That mode does two things and both are emulated here: the
// `(forced-colors: active)` block applies, and every box-shadow is dropped. JSDOM
// evaluates no media query, so the block is flattened in by hand after the shadows
// are stripped, which is also the proof the block is reachable at all. What the
// system repaints a declared outline AS is the browser's business; this checks
// which boxes declare one, because that is what decides how many focus
// indicators appear and what shape they are.
const FORCED = /forced-colors\s*:\s*active/;

function emulateForcedColors(css) {
  const flattened = leafRules(css)
    .filter(rule => rule.at.some(prelude => FORCED.test(prelude)))
    .map(rule => `${rule.selector} { ${rule.decls.map(d => `${d.prop}: ${d.value}`).join('; ')} }`);
  assert.ok(flattened.length, 'no @media (forced-colors: active) block left to emulate');
  return [css.replace(/box-shadow\s*:[^;}]+/g, 'box-shadow: none'), ...flattened].join('\n');
}

function checkForcedColors(css, theme) {
  const vars = tokensFor(theme, 'default');
  const resolved = desugar(substitute(emulateForcedColors(css), vars));
  const win = new JSDOM(`<style>${resolved}</style>${snippet({ code: 'curl -s https://example.com/api' })}`).window;
  const card = win.document.querySelector('.ui-snippet');
  const pre = card.querySelector('pre');
  const button = card.querySelector('.ui-snippet__copy');
  const declares = style => !['', 'none'].includes(style.outline);

  pre.setAttribute('data-ui-state', 'focus-visible');
  assert.ok(quiet(win.getComputedStyle(pre)) && quiet(win.getComputedStyle(card)),
    'forced colors leaves no box-shadow, so an outline is the only focus signal left');
  // The pre is flush with the card on three sides and has no radius, so any
  // outline on it is the square ring again — and the card is already drawing one.
  assert.equal(win.getComputedStyle(pre).outline, 'none',
    'the code region declares no outline in forced colors');
  assert.match(win.getComputedStyle(card).outline, /(?:^|\s)2px(?:\s|$)/,
    'the card declares the outline that replaces it');
  assert.equal([pre, card].filter(el => declares(win.getComputedStyle(el))).length, 1,
    'one focused code region draws one indicator, not two');
  pre.removeAttribute('data-ui-state');

  // The copy button is the other keyboard target. It keeps its own outline, and
  // the card must not add a second one around it.
  button.setAttribute('data-ui-state', 'focus-visible');
  assert.match(win.getComputedStyle(button).outline, /(?:^|\s)2px(?:\s|$)/,
    'the copy button keeps its outline in forced colors');
  assert.ok(!declares(win.getComputedStyle(card)),
    'the card draws no outline while the copy button has focus');
  win.close();
}

for (const theme of ['light', 'dark']) {
  test(`Snippet focus draws one indicator in forced colors: ${theme}`, () => checkForcedColors(source, theme));
}

// The defect this block fixes, restored: before #474's correction the pre kept the
// transparent outline in forced colors too, and the system repainted it as a square
// inside the card's rounded one.
test('rejects letting the code region keep an outline in forced colors', () => {
  const mutated = source.replace(
    '  .ui-snippet pre:focus-visible { outline: none; }',
    '  .ui-snippet pre:focus-visible { outline: 2px solid transparent; }');
  assert.notEqual(mutated, source, 'the mutation found the rule');
  assert.throws(() => checkForcedColors(mutated, 'light'), /the code region declares no outline in forced colors/);
});

test('rejects removing the forced-colors block', () => {
  const mutated = source.replace(/@media \(forced-colors: active\) \{[^}]*\}\s*\}/, '');
  assert.notEqual(mutated, source, 'the mutation found the block');
  assert.throws(() => checkForcedColors(mutated, 'light'), /no @media \(forced-colors: active\) block left/);
});

test('rejects dropping the card outline the forced-colors signal rests on', () => {
  const mutated = source.replace('.ui-snippet:has(pre:focus-visible) { outline: 2px solid transparent;',
    '.ui-snippet:has(pre:focus-visible) {');
  assert.notEqual(mutated, source, 'the mutation found the declaration');
  assert.throws(() => checkForcedColors(mutated, 'light'), /the card declares the outline that replaces it/);
});
