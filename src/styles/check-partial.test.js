/* Rule: a checkbox with some of its group on reads as partly on — the checked fill with
 * a level dash where the tick goes — for the kit's box and for DataTable's selection
 * box alike. why: #619
 *
 * Browsers hold `indeterminate` as a property, so no story or markup sets it by
 * attribute and the paint is never reached by a walk that reads attributes. This gate
 * reads the sheet for the rules that draw it, measures the dash against its fill, and
 * proves it fails when a rule is removed.
 *
 * Limits: a declaration gate proves what the sheet says, not what a browser paints; the
 * browser captures and the tap-zone measurement are in the PR. It reads the default
 * accent in each theme; stories/accent-contrast.test.js owns the other accents' fills.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseColour, ratio } from '../../stories/lib/contrast.js';
import { splitSelectorList } from '../../scripts/lib/selector-list.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const INPUT_CSS = readFileSync(path.join(here, 'input.css'), 'utf8');
const TOKENS = readFileSync(path.join(here, '../tokens/tokens.css'), 'utf8');

const blank = (css) => css.replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ' '));
// A rule may sit inside @media, so the at-rule prelude is not a rule and the body is.
const rules = (css) => [...blank(css).matchAll(/([^{}]+)\{([^{}]*)\}/g)]
  .filter(([, selector]) => !selector.trim().startsWith('@'))
  .map(([, selector, body]) => ({ selector: selector.trim(), body }));
const bodiesOf = (css, selector) => rules(css).filter((r) => splitSelectorList(r.selector).includes(selector)).map((r) => r.body);
const bodyOf = (css, selector) => bodiesOf(css, selector).join(' ') || undefined;

/* The two boxes that take the partial paint. */
const HOSTS = ['.ui-check input[type="checkbox"]', '.ui-table__selection input[type="checkbox"]'];

/** Everything the partial paint needs, as one finding per missing piece. */
function partialFindings(css) {
  const out = [];
  const need = (host, suffix, patterns, why) => {
    const selector = `${host}${suffix}`;
    const body = bodyOf(css, selector);
    if (body === undefined) { out.push(`${selector} is not declared — ${why}`); return; }
    for (const [pattern, what] of patterns) if (!pattern.test(body)) out.push(`${selector} ${what}`);
  };
  for (const host of HOSTS) {
    need(host, ':indeterminate', [
      [/background:\s*var\(--accent\)/, 'lost the checked fill'],
      [/border-color:\s*var\(--accent\)/, 'lost the checked edge'],
    ], 'the partial box is an empty box again');
    need(host, ':indeterminate::after', [
      [/content:\s*""/, 'draws nothing'],
      [/width:\s*10px/, 'lost the dash width'],
      [/height:\s*0\b/, 'is not a single line'],
      [/border-width:\s*2px 0 0/, 'is not a 2px dash'],
      [/border:\s*solid var\(--accent-contrast\)/, 'lost its ink'],
    ], 'the partial box has no dash');
    need(host, ':disabled:indeterminate', [
      [/background:\s*var\(--disabled-ink\)/, 'lost the disabled fill'],
    ], 'an unavailable partial box keeps the live accent');
    need(host, ':disabled:indeterminate::after', [
      [/border-color:\s*var\(--disabled-surface\)/, 'lost the disabled dash ink'],
    ], 'an unavailable partial box has the live dash');
    need(host, ':disabled:is(:checked, :indeterminate)::after', [
      [/border-color:\s*GrayText/, 'is not GrayText'],
    ], 'forced colours draw an unavailable mark like an available one');
    const dark = `:where(:root[data-theme="dark"]) ${host}:enabled:is(:checked, :indeterminate)::after`;
    const darkBody = bodyOf(css, dark);
    if (darkBody === undefined) out.push(`${dark} is not declared — the dark dash falls back to white ink`);
    else if (!/border-color:\s*var\(--signal-contrast\)/.test(darkBody)) out.push(`${dark} lost --signal-contrast`);
  }
  for (const selector of [
    '.ui-check input:disabled',
    '.ui-check input:disabled:is(:checked, :indeterminate)',
    '.ui-check input[type="checkbox"]:disabled:is(:checked, :indeterminate)',
    '.ui-table__selection input[type="checkbox"]:disabled',
    '.ui-table__selection input[type="checkbox"]:disabled:is(:checked, :indeterminate)',
  ]) {
    if (!/border-color:\s*GrayText/.test(bodyOf(css, selector) ?? '')) out.push(`${selector} has no GrayText edge in forced colours`);
  }
  for (const [selector, ink] of [['.ui-check input[type="radio"]:checked::after', 'CanvasText'], ['.ui-check input[type="radio"]:disabled:checked::after', 'GrayText']]) {
    if (!new RegExp(`background:\\s*${ink}`).test(bodyOf(css, selector) ?? '')) out.push(`${selector} has no ${ink} dot in forced colours`);
  }
  return out;
}

test('the partial paint is declared for the kit box and DataTable\'s selection box', () => {
  assert.deepEqual(partialFindings(INPUT_CSS), [], 'the partial paint is incomplete');
});

test('the sweep rejects each way of losing the partial paint', () => {
  const mutate = (from, to) => {
    assert.ok(INPUT_CSS.includes(from), `mutation target moved: ${from}`);
    return INPUT_CSS.replace(from, to);
  };
  const caught = (css) => partialFindings(css).length > 0;
  const survivors = [
    // The dash removed.
    ['dash rule renamed', mutate('.ui-check input[type="checkbox"]:indeterminate::after,', '.ui-check input[type="checkbox"]:indeterminate-x::after,')],
    ['dash narrowed to nothing', mutate('width: 10px; height: 0;', 'width: 0; height: 0;')],
    ['dash given a fill instead of a border', mutate('border-width: 2px 0 0;', 'border-width: 0;')],
    // The fill removed: an empty box again.
    ['fill removed', mutate('.ui-check input[type="checkbox"]:indeterminate,', '.ui-check input[type="checkbox"]:indeterminate-x,')],
    // The selection box left on the browser's paint.
    ['selection box left out', INPUT_CSS.replaceAll('.ui-table__selection input[type="checkbox"]:indeterminate', '.ui-x input')],
    // Dark ink and the unavailable paint.
    ['dark dash back on white ink', mutate('border-color: var(--signal-contrast); }', 'border-color: var(--accent-contrast); }')],
    ['unavailable dash keeps the live ink', mutate('.ui-check input[type="checkbox"]:disabled:indeterminate::after,', '.ui-check input[type="checkbox"]:disabled:indeterminate-x::after,')],
    ['forced-colours radio dot removed', mutate('.ui-check input[type="radio"]:checked::after { background: CanvasText; }', '')],
    ['forced-colours checked edge removed', mutate('.ui-check input:disabled:is(:checked, :indeterminate),\n', '')],
    ['forced-colours partial edge outranked', mutate('  .ui-check input[type="checkbox"]:disabled:is(:checked, :indeterminate),\n  .ui-table__selection input[type="checkbox"]:disabled,', '  .ui-table__selection input[type="checkbox"]:disabled,')],
    ['forced-colours edge removed', mutate('{ border-color: GrayText; }\n  .ui-check input[type="checkbox"]:disabled:is', '{ border-color: CanvasText; }\n  .ui-check input[type="checkbox"]:disabled:is')],
  ].filter(([, css]) => !caught(css)).map(([name]) => name);
  assert.deepEqual(survivors, [], 'these removals leave the partial paint looking complete');
});

const themeVars = (theme) => {
  const at = TOKENS.indexOf(`:root[data-theme="${theme}"]`);
  assert.notEqual(at, -1, `no :root[data-theme="${theme}"] block in tokens.css`);
  const body = TOKENS.slice(at, TOKENS.indexOf('\n}', at));
  return Object.fromEntries([...body.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
};

/* The dash is a mark, so it answers to the 3:1 a graphic needs against the fill it
 * sits on. Light inks it with --accent-contrast, dark with --signal-contrast. */
test('the dash clears 3:1 on the partial box\'s fill in both themes', () => {
  const ink = { light: '--accent-contrast', dark: '--signal-contrast' };
  for (const theme of ['light', 'dark']) {
    const vars = themeVars(theme);
    const fill = parseColour(vars['--accent']);
    const mark = parseColour(vars[ink[theme]]);
    assert.ok(ratio(mark, fill) >= 3, `${theme}: the dash measures ${ratio(mark, fill).toFixed(2)}:1 on the accent fill`);
  }
});
