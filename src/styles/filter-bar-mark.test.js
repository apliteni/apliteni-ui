/* Rule: the filter chip's open menu marks its current value with a soft accent wash, and
 * only the filter bar does — every other listbox keeps Dropdown's trailing check. A forced
 * palette drops the wash, so the check comes back inside the bar too. why: #466
 *
 * The browser evidence (the rendered menu at two widths in both themes, and the measured
 * contrast of each label against the washed ground) is in the pull request. What is held
 * here is what the sheet says, because the four parts of this treatment are easy to move
 * apart by hand: the wash, the hidden check, the one-ink label, and the forced-colours
 * fallback each live in their own rule.
 *
 * Limits: a declaration gate proves what the sheet declares, not what a browser paints. It
 * does not model specificity or source order, so it cannot see the wash being outranked by
 * a later rule — that pairing is what the hover and focus assertions below stand in for,
 * and they check the selector exists, not that it wins. It reads filter-bar.css alone, so
 * a kit-wide change made in dropdown.css would not register here.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const read = (rel) => readFileSync(path.join(here, rel), 'utf8');
const BAR_CSS = read('filter-bar.css');
const DROPDOWN_CSS = read('dropdown.css');

// Comments are blanked, not stripped: a commented-out rule must not count as a declaration.
const blank = (css) => css.replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ' '));
const rules = (css) => [...blank(css).matchAll(/([^{}]+)\{([^{}]*)\}/g)]
  .filter(([, selector]) => !selector.trim().startsWith('@'))
  .map(([, selector, body]) => ({ selector: selector.trim().replace(/\s+/g, ' '), body: body.trim() }));
// The forced-colours block, taken on its own, so a rule outside it cannot satisfy it.
const forcedBlock = (css) => {
  const at = blank(css).search(/@media\s*\(\s*forced-colors\s*:\s*active\s*\)/);
  return at === -1 ? '' : blank(css).slice(at, blank(css).indexOf('\n}', blank(css).indexOf('{', at)));
};
const find = (css, test_) => rules(css).filter(({ selector }) => selector.split(',')
  .some((part) => test_(part.trim())));

const SELECTED = (part) => part.includes('.ui-filter-bar') && part.includes('.ui-dropdown__item.is-selected');
// The resting row: no state pseudo-class, so the hover and focus rules below cannot stand
// in for a wash the row does not have when nothing is pointing at it.
const RESTING = (part) => SELECTED(part) && !/:(hover|focus|active)/.test(part)
  && !part.includes('__tick') && !part.includes('__label');
const ACCENT_WASH = /background:\s*color-mix\([^)]*var\(--accent\)/;

test('the chosen row in a filter menu takes an accent wash at rest', () => {
  const washed = find(BAR_CSS, RESTING).filter(({ body }) => ACCENT_WASH.test(body));
  assert.ok(washed.length >= 1, 'no resting .ui-filter-bar .ui-dropdown__item.is-selected rule paints an --accent wash');
});

test('the wash answers hover and focus itself, so neither replaces it', () => {
  for (const state of [':hover', ':focus-visible']) {
    const answered = find(BAR_CSS, (part) => SELECTED(part) && part.includes(state))
      .filter(({ body }) => /background:\s*color-mix\([^)]*var\(--accent\)/.test(body));
    assert.ok(answered.length >= 1,
      `the chosen row has no ${state} rule of its own, so .ui-dropdown__item${state} replaces its wash`);
  }
});

test('the trailing check is hidden in the bar and nowhere else', () => {
  const hidden = find(BAR_CSS, (part) => SELECTED(part) && part.includes('.ui-dropdown__tick'))
    .filter(({ body }) => /display:\s*none/.test(body));
  assert.ok(hidden.length >= 1, 'the bar does not hide the trailing check');
  // Dropdown still shows it: this treatment is the filter bar's alone.
  const shown = find(DROPDOWN_CSS, (part) => part.includes('.is-selected') && part.includes('.ui-dropdown__tick'))
    .filter(({ body }) => /display:\s*inline-flex/.test(body));
  assert.ok(shown.length >= 1, 'dropdown.css no longer shows the check for a selected row');
  assert.equal(find(DROPDOWN_CSS, (part) => part.includes('.ui-filter-bar')).length, 0,
    'the filter bar treatment leaked into dropdown.css');
});

test('every label in the menu keeps one ink, and a disabled row keeps its own', () => {
  const inked = find(BAR_CSS, (part) => SELECTED(part) && part.includes('.ui-dropdown__label'));
  const plain = inked.filter(({ selector }) => !selector.includes('.is-disabled'));
  assert.ok(plain.length >= 1, 'the chosen row does not restate its label ink, so it keeps Dropdown\'s step down to --text');
  assert.ok(plain.every(({ body }) => /color:\s*var\(--strong\)/.test(body)),
    'the chosen row\'s label is not --strong, so it does not match its neighbours');
  // The pairing, not a :not() — an enabled-only selector would claim a distinction the bar
  // does not draw, because a row inside a disabled bar carries no .is-disabled of its own.
  const spared = inked.filter(({ selector }) => /\.is-selected\.is-disabled/.test(selector));
  assert.ok(spared.length >= 1, 'no rule gives a disabled chosen row its own ink, so it reads as available');
  assert.ok(spared.every(({ body }) => /color:\s*inherit/.test(body)),
    'the disabled chosen row does not inherit the row ink Dropdown already sets for it');
  assert.ok(inked.indexOf(spared[0]) > inked.indexOf(plain[0]),
    'the disabled rule comes first, so at equal specificity the --strong rule overrides it');
});

test('a forced palette brings the check back, because the wash does not survive one', () => {
  const forced = forcedBlock(BAR_CSS);
  assert.notEqual(forced, '', 'filter-bar.css has no (forced-colors: active) block');
  assert.match(forced, /\.ui-filter-bar[^{]*\.is-selected[^{]*\.ui-dropdown__tick\s*\{[^}]*display:\s*inline-flex/,
    'the forced-colours block does not restore the trailing check');
});

test('the scan rejects each way this treatment can come apart, and accepts what is there', () => {
  const sheet = (css) => css;
  const washOf = (css) => find(sheet(css), RESTING).filter(({ body }) => ACCENT_WASH.test(body)).length;
  // A commented-out wash is not a wash.
  assert.equal(washOf('/* .ui-filter-bar .ui-dropdown__item.is-selected { background: color-mix(in srgb, var(--accent) 10%, transparent); } */'), 0);
  // A wash on some other component is not this one.
  assert.equal(washOf('.ui-table .ui-dropdown__item.is-selected { background: color-mix(in srgb, var(--accent) 10%, transparent); }'), 0);
  // A flat token is not a wash: the point is a tint over whatever the panel is.
  assert.equal(washOf('.ui-filter-bar .ui-dropdown__item.is-selected { background: var(--accent); }'), 0);
  // A hover-only wash is not a wash: the row must carry it when nothing points at it.
  assert.equal(washOf('.ui-filter-bar .ui-dropdown__item.is-selected:hover { background: color-mix(in srgb, var(--accent) 16%, transparent); }'), 0);
  // What the sheet actually carries is accepted.
  assert.equal(washOf(BAR_CSS) >= 1, true);
});
