// Resolves source CSS with forced focus-visible. JSDOM cannot prove keyboard
// reachability, clipping, or the per-surface ring gap — contrast.js substitutes
// each custom property once for the whole sheet, so --ring-gap: inherit is not
// measurable here. Chromium captures at 390px and 1280px cover those.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { snippet } from '../src/components/index.js';
import { desugar, substitute, tokensFor } from './lib/contrast.js';

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
