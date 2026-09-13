import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * What the back link's sheet decides that nothing else checks: that the colour
 * holds against a host stylesheet's link rule, that the target is 24px tall, and
 * that a long destination clips rather than wrapping.
 * Read as text, because the package ships CSS as its artifact: the first two are
 * `var()` values, which jsdom resolves to nothing, and the third is an ellipsis,
 * which needs a layout jsdom does not have. What the clip looks like when a
 * browser does the layout is docs/evidence/back-label-long-*.png.
 * why: docs/specification.md#the-back-link
 */
const here = path.dirname(fileURLToPath(import.meta.url));
const read = (rel) => readFileSync(path.join(here, rel), 'utf8');
const decomment = (css) => css.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));

const CSS = decomment(read('back.css'));
const rules = [...CSS.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
  .map((m) => ({ selector: m[1].trim().replace(/\s+/g, ' '), body: m[2] }));
const SPACE = Object.fromEntries(
  [...decomment(read('../tokens/tokens.css')).matchAll(/--(space-[\w-]+):\s*(\d+)px/g)].map((m) => [m[1], Number(m[2])]),
);

/** Specificity as [ids, classes, types] — enough for the selectors this sheet writes. */
const specificity = (sel) => {
  const s = sel.replace(/::[\w-]+/g, '');
  const ids = (s.match(/#[\w-]+/g) || []).length;
  const classes = (s.match(/\.[\w-]+|\[[^\]]+\]|:(?!:)[\w-]+/g) || []).length;
  const types = (s.replace(/\[[^\]]+\]/g, '').match(/(?:^|[\s>+~])[a-z][\w-]*/gi) || []).length;
  return [ids, classes, types];
};
const beats = (a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2];

test('the sheet is being read', () => {
  assert.ok(rules.length >= 5, `parsed ${rules.length} rules out of back.css`);
});

test('every rule that paints the link its colour outranks a host a:link and a:hover', () => {
  const painting = rules.filter((r) => /(?:^|;)\s*color\s*:/.test(r.body));
  assert.ok(painting.length >= 2, 'no colour rules found — the check is reading nothing');
  for (const r of painting) {
    for (const host of ['a:link', 'a:visited', 'a:hover']) {
      assert.ok(beats(specificity(r.selector), specificity(host)) > 0,
        `"${r.selector}" is ${specificity(r.selector)} and loses to a host "${host}"`);
    }
  }
});

test('the resting colour is a token, and not the accent', () => {
  const rest = rules.find((r) => r.selector === '.ui-back[href]');
  assert.ok(rest, 'no resting colour rule for .ui-back[href]');
  const color = /color\s*:\s*([^;]+)/.exec(rest.body)[1].trim();
  assert.match(color, /^var\(--[\w-]+\)$/);
  assert.doesNotMatch(color, /accent/);
});

test('the link is at least a 24px target', () => {
  const base = rules.find((r) => r.selector === '.ui-back');
  const m = /min-height\s*:\s*var\(--(space-[\w-]+)\)/.exec(base.body);
  assert.ok(m, '.ui-back declares no min-height from the spacing scale');
  assert.ok(SPACE[m[1]] >= 24, `--${m[1]} is ${SPACE[m[1]]}px`);
});

test("the destination's name clips to one line rather than wrapping", () => {
  // The link stands above the page title, so a second line moves the page down.
  // Which four declarations, and why min-width is one of them: back.css's own
  // note on the rule. That it EXISTS at all is src/styles/label-coverage.test.js.
  const decl = (rule, prop) => new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*([^;]+)`).exec(rule.body)?.[1].trim();
  const label = rules.find((r) => r.selector === '.ui-back__label');
  assert.ok(label, 'no rule for .ui-back__label');
  assert.equal(decl(label, 'white-space'), 'nowrap');
  assert.equal(decl(label, 'overflow'), 'hidden');
  assert.equal(decl(label, 'text-overflow'), 'ellipsis');
  // A flex item's own floor is its content, so the three above never come into
  // play without this: the label refuses to shrink and the link overflows instead.
  assert.equal(decl(label, 'min-width'), '0');

  // And the link itself needs a ceiling. `width: fit-content` resolves to at
  // least the box's own min-content, which a `nowrap` label makes the whole
  // destination name — so without this the four declarations above are dead and
  // the link pushes through the column. Measured: docs/evidence/back-label-*.png.
  const base = rules.find((r) => r.selector === '.ui-back');
  assert.equal(decl(base, 'max-width'), '100%');
});
