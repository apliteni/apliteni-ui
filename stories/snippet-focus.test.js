// Resolves source CSS with forced focus-visible. JSDOM cannot prove keyboard
// reachability or clipping; Chromium captures cover those at 390px.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { snippet } from '../src/components/index.js';
import { desugar, substitute, tokensFor } from './lib/contrast.js';

const source = ['base', 'code'].map(name => readFileSync(new URL(`../src/styles/${name}.css`, import.meta.url), 'utf8')).join('\n');
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
    target.setAttribute('data-ui-state', 'focus-visible');
    const style = win.getComputedStyle(target);
    assert.equal(style.boxShadow, expected.boxShadow, `${target.tagName} uses the shared ring`);
    assert.equal(style.outline, expected.outline, `${target.tagName} suppresses the native outline`);
    assert.match(style.outline, /transparent/);
    target.removeAttribute('data-ui-state');
    assert.ok(['', 'none'].includes(win.getComputedStyle(target).boxShadow), 'ring is keyboard-focus only');
  }
  for (const root of win.document.querySelectorAll('.ui-snippet')) {
    assert.equal(win.getComputedStyle(root).overflow, 'visible', 'the code ring is not clipped');
    assert.equal(win.getComputedStyle(root).minWidth, '0px', 'scrolling code can shrink in a grid');
  }
  win.close();
}
for (const theme of ['light', 'dark']) for (const accent of ['default', 'ocean']) {
  test(`Snippet focus uses the kit ring: ${theme}/${accent}`, () => check(source, theme, accent));
}
test('rejects removal of Snippet focus coverage', () => {
  assert.throws(() => check(source.replace('.ui-snippet :focus-visible,', ''), 'light', 'default'), /uses the shared ring/);
});
