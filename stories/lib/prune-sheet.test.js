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

test('a class name is read as a whole identifier, including non-ASCII characters', () => {
  const here = new Set(['ui-reviewé', 'a_b', '日本']);
  assert.ok(couldMatch('.ui-reviewé', here));
  assert.ok(couldMatch('.a_b .日本', here));
  assert.ok(!couldMatch('.ui-review', here), 'the ASCII prefix alone is a different class');
  assert.ok(!couldMatch('.ui-reviewéx', here));
  assert.equal(pruneSheet('.ui-reviewé{color:red}.gone{color:blue}', here), '.ui-reviewé{color:red}');
});

test('selector forms the reader skips never drop a rule that can match', () => {
  const css = [
    ':is(.gone, .b){color:red}', ':where(.gone) .b{top:1px}', '.a:is(.gone,.b){left:1px}',
    '.a:not(.gone){width:1px}', '.a:has(.gone){height:1px}', '.b:nth-child(2 of .gone){right:1px}',
    '.a[class~="gone"]{bottom:1px}', '.a{--gone:.gone}', '@supports (display:grid){.gone{top:2px}.a{top:3px}}',
    '@layer base{.gone{top:4px}}', '@layer base{.a{top:5px}}', '@container (min-width:1px){.gone{top:6px}}',
  ].join('');
  const kept = pruneSheet(css, new Set(['a', 'b']));
  for (const need of [':is(.gone, .b)', ':where(.gone) .b', '.a:is(.gone,.b)', '.a:not(.gone)', '.a:has(.gone)',
    '.b:nth-child(2 of .gone)', '.a[class~="gone"]', '--gone:.gone', '.a{top:3px}', '@layer base{.a{top:5px}}']) {
    assert.ok(kept.includes(need), `${need} was dropped`);
  }
  assert.ok(!kept.includes('top:2px') && !kept.includes('top:6px'), 'rules that cannot match stay in the sheet');
});

test('an @layer block emptied of rules stays, because its first mention fixes the layer order', () => {
  assert.equal(pruneSheet('@layer base{.gone{top:4px}}.a{top:1px}', present), '@layer base{}.a{top:1px}');
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
