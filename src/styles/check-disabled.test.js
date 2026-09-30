/* Rule: a disabled checkbox or radio reads as unavailable — and keeps reading that
 * way under a pointer. why: #429, guidelines/accessibility-floor.md#disabled-control-legibility
 *
 * The paint is measured where every other disabled control is measured, by
 * stories/guidelines/accessibility-floor.test.js against the specimen #429 added.
 * Two things that walk cannot see are held here: it renders no hover, and it reads
 * no pseudo-element, so the mark inside a checked-and-off box is invisible to it.
 *
 * Limits: a declaration gate proves what the sheet says, not what a browser paints;
 * the browser evidence is in the PR. It scans `.ui-check` only. `.ui-input`,
 * `.ui-select` and `.ui-textarea` also carry unqualified `:hover` rules, outranked
 * by their own later `:disabled` rules at equal specificity — this gate models
 * neither specificity nor source order, so it would miss that pair drifting apart.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseColour, ratio } from '../../stories/lib/contrast.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const read = (rel) => readFileSync(path.join(here, rel), 'utf8');
const INPUT_CSS = read('input.css');
const TOKENS = read('../tokens/tokens.css');

// Comments are blanked, not stripped: a commented-out rule must not count as a
// declaration, and the line numbers stay usable in a failure message.
const blank = (css) => css.replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ' '));
const rules = (css) => [...blank(css).matchAll(/([^{}]+)\{([^{}]*)\}/g)]
  .filter(([, selector]) => !selector.trim().startsWith('@'))
  .map(([, selector, body]) => ({ selector: selector.trim(), body }));

/* Every way a hover rule can reach a `.ui-check` control, and whether the rule
 * excuses a disabled one. The subject is the SELECTOR, not the property: a hover
 * rule that moved from `border-color` to `background` or `box-shadow` would be the
 * same defect, so nothing here reads the body. `:enabled` and `:not(:disabled)`
 * are both accepted spellings; anything else is a leak. */
const ENABLED_ONLY = /:enabled\b|:not\(\s*:disabled\s*\)/;
function hoverLeaks(css) {
  return rules(css).flatMap(({ selector }) => selector.split(',')
    .map((part) => part.trim())
    .filter((part) => part.includes('.ui-check') && part.includes(':hover') && !ENABLED_ONLY.test(part)));
}

const themeVars = (theme) => {
  const at = TOKENS.indexOf(`:root[data-theme="${theme}"]`);
  assert.notEqual(at, -1, `no :root[data-theme="${theme}"] block in tokens.css`);
  const body = TOKENS.slice(at, TOKENS.indexOf('\n}', at));
  return Object.fromEntries([...body.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
};
const resolve = (vars, name, depth = 0) => {
  const value = vars[name];
  if (value === undefined || depth > 12) return value;
  const alias = /^var\(\s*(--[\w-]+)\s*\)$/.exec(value);
  return alias ? resolve(vars, alias[1], depth + 1) : value;
};
const THEMES = ['dark', 'light'];

test('no hover rule lights a disabled checkbox or radio', () => {
  assert.deepEqual(hoverLeaks(INPUT_CSS), [],
    'a .ui-check hover rule fires on a control that cannot be clicked');
});

test('the hover scan rejects every way of writing the leak, and nothing else', () => {
  const caught = (rule) => hoverLeaks(rule).length > 0;
  const missed = [
    '.ui-check input:hover { border-color: var(--accent); }',
    '.ui-check:hover input { border-color: var(--accent); }',
    '.ui-check input[type="radio"]:hover { border-color: var(--accent); }',
    // A different property is the same defect: the subject is the selector.
    '.ui-check input:hover { background: var(--accent); }',
    '.ui-check input:hover { box-shadow: 0 0 0 2px var(--accent); }',
    '.ui-check input:hover { border-color: var(--accent) !important; }',
    '@media (min-width: 560px) { .ui-check input:hover { border-color: var(--accent); } }',
    '@supports (color: red) { .ui-check input:hover { border-color: var(--accent); } }',
    '.ui-check input:enabled:hover, .ui-check input:hover { border-color: var(--accent); }',
    '.ui-check input:focus-visible, .ui-check input:hover { border-color: var(--accent); }',
    ':where(.ui-check) input:hover { border-color: var(--accent); }',
    '.ui-check input:not(:checked):hover { border-color: var(--accent); }',
  ].filter((rule) => !caught(rule));
  assert.deepEqual(missed, [], 'these light a disabled control and the scan lets them through');

  for (const fine of [
    '.ui-check input:enabled:hover { border-color: var(--accent); }',
    '.ui-check input:hover:enabled { border-color: var(--accent); }',
    '.ui-check input:not(:disabled):hover { border-color: var(--accent); }',
    '.ui-check input:enabled:hover, .ui-check input:enabled:focus-visible { border-color: var(--accent); }',
    // Not a .ui-check rule, and not a hover rule.
    '.ui-input:hover { border-color: var(--field-edge-hover); }',
    '.ui-check input:disabled { cursor: not-allowed; }',
    '/* .ui-check input:hover { border-color: var(--accent); } */',
  ]) {
    assert.equal(caught(fine), false, `false positive on: ${fine}`);
  }
});

/* The state has to be visible whether the box is empty or marked. An empty box
 * changes its own background and edge; a marked one also has to drop the accent,
 * because a full-strength accent fill IS the kit's "on and available" — the same
 * reason a disabled primary button gives its accent up (#220). */
test('the disabled box repaints, empty and marked', () => {
  const declared = (selector) => {
    const rule = rules(INPUT_CSS).find((r) => r.selector === selector);
    assert.ok(rule, `${selector} is not declared in input.css`);
    return rule.body;
  };
  const empty = declared('.ui-check input:disabled');
  assert.match(empty, /background:\s*var\(--disabled-surface\)/, 'the empty box keeps the live surface');
  assert.match(empty, /border-color:\s*var\(--disabled-border\)/, 'the empty box keeps the live edge');
  assert.match(empty, /cursor:\s*not-allowed/, 'the empty box still invites a click');

  const marked = declared('.ui-check input:disabled:checked');
  assert.doesNotMatch(marked, /var\(--accent\b/, 'a marked disabled box keeps the accent');
  assert.match(marked, /background:\s*var\(--disabled-ink\)/, 'a marked disabled box has no fill of its own');

  const label = declared('.ui-check:has(input:disabled)');
  assert.match(label, /color:\s*var\(--disabled-ink\)/, 'the words beside a disabled box keep body ink');
  assert.match(label, /cursor:\s*not-allowed/, 'the label is the click target and still invites a click');
  // A paint, not a fade: `opacity` takes the label and its box toward the ground
  // together, which is what #220 settled against.
  for (const selector of ['.ui-check input:disabled', '.ui-check input:disabled:checked', '.ui-check:has(input:disabled)']) {
    assert.doesNotMatch(declared(selector), /opacity\s*:/, `${selector} fades instead of painting`);
  }
});

/* The tick and the dot live in `::after`, which the story walk does not read, so
 * their pair is measured here. Inverting the token pair keeps the mark's contrast
 * on the off fill equal to the ink-on-surface pair the rest of the kit measures. */
test('the mark inside a marked disabled box stays legible on it, in both themes', () => {
  const tick = rules(INPUT_CSS).find((r) => r.selector === '.ui-check input[type="checkbox"]:disabled:checked::after');
  const dot = rules(INPUT_CSS).find((r) => r.selector === '.ui-check input[type="radio"]:disabled:checked::after');
  assert.ok(tick && dot, 'the disabled tick and dot are not declared');
  assert.match(tick.body, /border-color:\s*var\(--disabled-surface\)/, 'the disabled tick keeps --accent-contrast');
  assert.match(dot.body, /background:\s*var\(--disabled-surface\)/, 'the disabled dot keeps --accent-contrast');

  const expected = { dark: '6.24', light: '6.11' };
  for (const theme of THEMES) {
    const vars = themeVars(theme);
    const mark = parseColour(resolve(vars, '--disabled-surface'));
    const fill = parseColour(resolve(vars, '--disabled-ink'));
    assert.equal(ratio(mark, fill).toFixed(2), expected[theme],
      `${theme}: the disabled mark's pair moved off the measured token pair`);
  }
});

/* The specimen is the gate's subject. Without it the accessibility-floor walk finds
 * the new rules in the sheet and measures none of them, and this whole state goes
 * back to being unrendered. */
test('a story renders a disabled checkbox and a disabled radio', () => {
  const story = readFileSync(path.join(here, '../../stories/components/SwitchCheckbox.stories.js'), 'utf8');
  const calls = [...story.matchAll(/checkbox\(\{([^}]*)\}\)/g)].map((m) => m[1]);
  const off = calls.filter((args) => /\bdisabled:\s*true\b/.test(args));
  assert.ok(off.some((args) => !/type:/.test(args)), 'no disabled checkbox in the specimen');
  assert.ok(off.some((args) => /type:\s*'radio'/.test(args)), 'no disabled radio in the specimen');
  assert.ok(off.some((args) => /checked:\s*true/.test(args)), 'no marked-and-disabled control in the specimen');
});
