/* Pruning a sheet leaves every computed style as it was, and drops only rules that cannot match.
 * Limit: the equivalence test compares one fixed document, not the stories; the walks' own
 * ledgers (stories/contrast-*.test.js) are what show the real catalogue reads the same. */
import assert from 'node:assert/strict';
import test from 'node:test';
import { JSDOM } from 'jsdom';
import { classesIn, couldMatch, pruneSheet } from './prune-sheet.js';

const present = new Set(['a', 'b']);

test('a rule that needs a class the document lacks is dropped', () => {
  assert.equal(pruneSheet('.a{color:red}.gone{color:blue}', present), '.a{color:red}');
});

test('a rule is kept when any selector in its list could match', () => {
  assert.equal(pruneSheet('.gone, .b{color:red}', present), '.gone, .b{color:red}');
});

test('a class inside :not() or :has() does not drop the rule', () => {
  assert.ok(couldMatch('.a:not(.gone)', present));
  assert.ok(couldMatch('.a:has(> .gone)', present));
  assert.ok(!couldMatch('.a .gone:hover', present));
});

test('a class named inside an attribute selector or a string does not count', () => {
  assert.ok(couldMatch('.a[title=".gone"]', present));
  assert.ok(couldMatch('.a[data-x~=".gone"]', present));
});

test('an escaped selector is kept because its class name is not read', () => {
  assert.ok(couldMatch('.sm\\:gone', present));
});

test('rules inside @media are pruned and an empty @media goes', () => {
  const css = '@media (min-width:1px){.a{color:red}.gone{color:blue}}@media print{.gone{color:blue}}';
  assert.equal(pruneSheet(css, present), '@media (min-width:1px){.a{color:red}}');
});

test('other at-rules stay whole, whatever they hold', () => {
  const css = '@keyframes gone{from{opacity:0}to{opacity:1}}@property --x{syntax:"*";inherits:false}';
  assert.equal(pruneSheet(css, present), css);
});

test('a brace inside a string does not end its block', () => {
  assert.equal(pruneSheet('.a::before{content:"}"}.gone{color:blue}', present), '.a::before{content:"}"}');
});

test('classesIn reads the root and every element below it', () => {
  const { document } = new JSDOM('<html class="r"><body><p class="x  y"></p><i></i></body></html>').window;
  assert.deepEqual([...classesIn(document.documentElement)].sort(), ['r', 'x', 'y']);
});

test('every computed style is the same with and without the pruned rules', () => {
  const css = [
    '.a{color:red}.a .b{margin-top:3px}.gone{color:blue}.a>.gone{padding:1px}',
    '.b:not(.gone){width:5px}.a:has(> .b){height:7px}.b + .gone{top:1px}',
    '@media (min-width:1px){.b{left:2px}.gone{left:9px}}',
  ].join('');
  const html = '<div class="a"><span class="b">t</span></div>';
  const read = (sheet) => {
    const { window } = new JSDOM(`<style>${sheet}</style>${html}`);
    return [...window.document.querySelectorAll('*')].map((el) => {
      const cs = window.getComputedStyle(el);
      return [...cs].map((name) => `${name}:${cs.getPropertyValue(name)}`).join(';');
    });
  };
  const pruned = pruneSheet(css, new Set(['a', 'b']));
  assert.ok(pruned.length < css.length, 'nothing was pruned, so the comparison proves nothing');
  assert.deepEqual(read(pruned), read(css));
});

test('the equivalence check fails when a rule that matches is pruned', () => {
  const css = '.a{color:red}';
  const read = (sheet) => {
    const { window } = new JSDOM(`<style>${sheet}</style><p class="a">t</p>`);
    return window.getComputedStyle(window.document.querySelector('p')).color;
  };
  assert.notEqual(read(pruneSheet(css, new Set())), read(css));
});
