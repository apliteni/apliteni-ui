/* Rule: a CSS selector list is split on its top-level commas and nowhere else.
 *
 * Discover subjects from source and check the coverage count.
 *
 * Two sweeps. The first takes every rule the kit's stylesheets declare whose
 * prelude carries a comma inside parentheses and requires the shared splitter
 * to hand each one back whole; a naive split has to fail the same sweep, so the
 * subjects are known to exercise the bug. The second takes every comma split in
 * the five swept paths below and requires each one to be either the shared
 * splitter or a listed value split — a selector split written by hand is the
 * defect of #521 arriving again, and no gate reads it.
 */

/* State what this test cannot measure.
 *
 * WHAT THIS GATE DOES NOT REACH:
 *   - A selector list that never reaches `splitSelectorList` at all. A gate
 *     matching a whole rule head as one string, or slicing it with a regex, is
 *     invisible to both sweeps.
 *   - Whether the split parts are then USED correctly. A gate that takes the
 *     right selector and compares it against the wrong list reads as green.
 *   - A comma split spelled any other way: through a variable (`const c = ','`),
 *     built at run time, written as a regex (`.split(/,/)`, `.split(/[\s,]+/)`)
 *     or with the space inside the string (`.split(', ')`). The sweep matches the
 *     one literal spelling `.split(',')`. One regex split exists today —
 *     stories/glyph-stroke.test.js splitting an SVG `viewBox` — and it reads a
 *     value, not a selector list. No selector list is split any of these ways.
 *   - A file outside the five swept paths — `react/test/`, `.storybook/`,
 *     `react/.storybook/`. None of them holds a comma split of any spelling
 *     today, so nothing is hiding there; they are simply not swept.
 *   - The CSS subjects come from the stylesheets this repository tracks, so a
 *     parenthesised comma a consumer writes in its own sheet is covered by the
 *     splitter but is not in the subject list.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { splitSelectorList } from './selector-list.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const RULE = /([^{}]+)\{([^{}]*)\}/g;
const decomment = (css) => css.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));

/* ---- the splitter itself ------------------------------------------------- */

test('a comma inside a functional pseudo-class stays with its selector', () => {
  const cases = [
    [':where(.a, .b) :focus-visible', [':where(.a, .b) :focus-visible']],
    [':is(a,b), c', [':is(a,b)', 'c']],
    ['.a:not(.b, .c) .d, .e', ['.a:not(.b, .c) .d', '.e']],
    ['.a:has(:is(b, c)), .d', ['.a:has(:is(b, c))', '.d']],
    ['[data-x="a,b"], .y', ['[data-x="a,b"]', '.y']],
    ["[data-x='a,b']", ["[data-x='a,b']"]],
    ['.a\\,b, .c', ['.a\\,b', '.c']],
    ['li:nth-child(2n + 1), li:nth-child(3)', ['li:nth-child(2n + 1)', 'li:nth-child(3)']],
    ['  .a ,  .b  ', ['.a', '.b']],
    ['.a,, .b', ['.a', '.b']],
    ['.only', ['.only']],
  ];
  for (const [input, want] of cases) {
    assert.deepEqual(splitSelectorList(input), want, `split of ${input}`);
  }
});

test('a selector list with no parentheses splits exactly as a plain comma split did', () => {
  // The replacement is not allowed to move the parts of the lists the kit is
  // already full of; only the parenthesised ones may change.
  const plain = ['.a, .b', '.ui-card', 'thead th, tbody td, tfoot td', '.a > .b, .c ~ .d'];
  for (const one of plain) {
    assert.deepEqual(splitSelectorList(one), one.split(',').map((s) => s.trim()).filter(Boolean), one);
  }
});

/* ---- sweep one: the kit's own parenthesised selectors -------------------- */

/** Every file git tracks in the five swept paths: the four trees `npm test`
 *  walks, plus react/src, whose gates run under vitest. */
const tracked = execFileSync('git', ['ls-files', '-z', 'src', 'stories', 'site', 'scripts', 'react/src'], { cwd: root, encoding: 'utf8' })
  .split('\0').filter(Boolean);

/** Every rule prelude the tracked stylesheets declare, with its sheet.
 *  Tracked, not walked: a site or Storybook build drops a bundled copy of the
 *  kit inside these trees, and counting it would count every rule twice. */
const SHEETS = tracked.filter((file) => file.endsWith('.css'));
const PRELUDES = SHEETS
  .flatMap((file) => [...decomment(readFileSync(path.join(root, file), 'utf8')).matchAll(RULE)]
    .map(([, selector]) => ({ file, selector: selector.trim() }))
    .filter(({ selector }) => !selector.startsWith('@')));

/** A prelude a plain comma split cannot handle: a comma inside parentheses. */
const PARENTHESISED = PRELUDES.filter(({ selector }) => /\([^()]*,[^()]*\)/.test(selector));

/**
 * Two things have to hold of a split. Every part must carry its own brackets —
 * a fragment ending inside `:where(` is not a selector and matches nothing —
 * and the parts must put the prelude back, so a splitter cannot pass by
 * dropping the halves it could not place.
 */
function offences(selector, split) {
  const parts = split(selector);
  const out = [];
  const bare = (s) => s.replace(/\s+/g, '');
  for (const part of parts) {
    const depth = [...part].reduce((d, c) => d + (c === '(' || c === '[' ? 1 : (c === ')' || c === ']' ? -1 : 0)), 0);
    if (depth !== 0) out.push(`${part} — a part ends mid-parenthesis`);
  }
  if (bare(parts.join(',')) !== bare(selector)) out.push(`${selector} — the parts do not put it back`);
  return out;
}

test('every parenthesised selector the kit writes survives the shared splitter', () => {
  // A floor rather than an exact count: every CSS edit in the repository would
  // move an exact one, and the subject set this gate measures is the next line.
  assert.ok(PRELUDES.length > 500, `only ${PRELUDES.length} rules discovered — the sweep lost its sheets`);
  assert.equal(
    PARENTHESISED.length, 9,
    'the kit\'s parenthesised selector lists changed; field-zoom\'s :not(:where(…)) is one, '
    + 'layout.css\'s collapsed rail rows are four, and nav.css and table.css carry the rest',
  );
  const bad = PARENTHESISED.flatMap(({ file, selector }) => offences(selector, splitSelectorList).map((o) => `${file}  ${o}`));
  assert.deepEqual(bad, [], `the shared splitter tore a selector apart:\n  ${bad.join('\n  ')}`);
});

test('a plain comma split fails that same sweep, so the subjects exercise the bug', () => {
  const naive = (selector) => selector.split(',').map((s) => s.trim()).filter(Boolean);
  const torn = PARENTHESISED.filter(({ selector }) => offences(selector, naive).length > 0);
  assert.equal(
    torn.length, PARENTHESISED.length,
    'a plain comma split now handles a subject, so this sweep no longer proves anything',
  );
});

/* ---- sweep two: no gate splits a selector by hand ----------------------- */

const SPLIT = /([A-Za-z_$][\w$]*(?:\??\.[A-Za-z_$][\w$]*)*|\]|\))\s*\??\.split\(\s*(['"]),\2\s*\)/g;
const SOURCE = /\.(js|mjs|cjs|ts|tsx)$/;

/**
 * Comma splits that are not selector lists. An entry is a claim about what the
 * receiver holds; the gate requires every one of them to still be there, so a
 * stale entry fails rather than widening the allowance silently.
 */
const VALUE_SPLITS = [
  ['react/src/dialog.ts', 'list', 'a duration list read off a transition'],
  ['scripts/font-loading.test.js', 'stack', 'a font-family stack'],
  ['scripts/tag-on-bump.test.js', ')', "the --json flag's field names"],
  ['src/components/toasts.js', 'transform', 'a computed transform matrix'],
  ['src/styles/typeface-roles.test.js', ']', 'a font-family stack'],
  ['stories/apps/shell-states.test.js', 'travel.value', 'a transition value, twice'],
  ['stories/apps/shell-states.test.js', 'decl.value', 'a transition value'],
  ['stories/motion-tokens.test.js', 'd.value', 'a transition value'],
];

/** Every literal comma split in the trees `npm test` walks, as file + receiver. */
function commaSplits(files, readFile) {
  const out = [];
  for (const file of files) {
    if (!SOURCE.test(file)) continue;
    if (file === 'scripts/lib/selector-list.js' || file === 'scripts/lib/selector-list.test.js') continue;
    const src = readFile(file);
    for (const line of src.split('\n')) {
      SPLIT.lastIndex = 0;
      let m;
      while ((m = SPLIT.exec(line)) !== null) out.push({ file, receiver: m[1] });
    }
  }
  return out;
}

const found = commaSplits(tracked, (file) => readFileSync(path.join(root, file), 'utf8'));

test('no gate splits a selector list by hand', () => {
  assert.ok(found.length > 0, 'the source sweep found no comma split at all — it is measuring nothing');
  const listed = new Set(VALUE_SPLITS.map(([file, receiver]) => `${file}\t${receiver}`));
  const unlisted = [...new Set(found
    .filter(({ file, receiver }) => !listed.has(`${file}\t${receiver}`))
    .map(({ file, receiver }) => `${file}  ${receiver}.split(',')`))];
  assert.deepEqual(
    unlisted, [],
    'a comma split that is not the shared splitter and not a listed value split. If it reads a '
    + 'CSS selector list, use splitSelectorList from scripts/lib/selector-list.js (#521); if it '
    + 'reads a value, add it to VALUE_SPLITS with what it splits:\n  ' + unlisted.join('\n  '),
  );
  const seen = new Set(found.map(({ file, receiver }) => `${file}\t${receiver}`));
  const stale = VALUE_SPLITS.filter(([file, receiver]) => !seen.has(`${file}\t${receiver}`))
    .map(([file, receiver]) => `${file}  ${receiver}`);
  assert.deepEqual(stale, [], `VALUE_SPLITS names a split that is gone:\n  ${stale.join('\n  ')}`);
});

test('the source sweep reports a selector split put back', () => {
  const fixture = { 'stories/made-up.test.js': "const a = rule.selector.split(',').map((s) => s.trim());" };
  const reported = commaSplits(Object.keys(fixture), (file) => fixture[file]);
  assert.deepEqual(reported, [{ file: 'stories/made-up.test.js', receiver: 'rule.selector' }]);
});

test('the shared splitter is read by every gate that was reading a selector list', () => {
  const self = ['scripts/lib/selector-list.js', 'scripts/lib/selector-list.test.js'];
  const callers = tracked.filter((file) => SOURCE.test(file) && !self.includes(file)
    && /splitSelectorList\s*\(/.test(readFileSync(path.join(root, file), 'utf8')));
  assert.equal(
    callers.length, 25,
    'the set of gates reading a selector list changed; #521 moved twenty-four of them onto the '
    + "shared splitter, four of which are the focus-ring gates the issue named, and the contrast "
    + "lib's own gate reads it to sweep state bases",
  );
});
