// What layout.css does with a split control row: its last control goes to the end of
// the line, and below the phone step it stays in the row beside the group before it.
// The rows that must use it are held on the React screens in
// react/src/export-at-the-row-end.test.tsx.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

/* The sheet's two declarations of the selector, told apart by the phone query
 * rather than by which one comes first: reading `match()` alone would take
 * whichever is written earlier, so moving one above the other would quietly
 * swap which rule this gate is checking. */
const splitRules = () => {
  const css = readFileSync(new URL('./layout.css', import.meta.url), 'utf8');
  const phone = css.match(/@media \(max-width: 560px\)\s*\{([\s\S]*?)\n\}/);
  const inPhone = phone ? phone[1] : '';
  const outside = css.replace(inPhone, '');
  const pick = (text) => text.match(/\.ui-toolbar--split\s*>\s*:last-child\s*\{([^}]*)\}/);
  const group = inPhone.match(/\.ui-toolbar--split\s*>\s*:nth-last-child\(2\)\s*\{([^}]*)\}/);
  return { base: pick(outside), phone: pick(inPhone), group };
};

test('export at the row end: layout.css moves the split row\'s last control', () => {
  const { base } = splitRules();
  assert.ok(base, 'layout.css declares no `.ui-toolbar--split > :last-child` rule outside the phone query');
  assert.match(base[1], /margin-inline-start:\s*auto/,
    'the split row\'s last control needs `margin-inline-start: auto` to reach the end');
});

/* The other half of the same rule, two rounds of it. Above the phone step "the end
 * of the line" is a place; below it the margin was leaving the export alone against
 * the right edge of an otherwise empty row — measured at x=338 on a 390 screen and
 * x=268 on a 320 one, in a row 284px and 214px wide — so r31 dropped it. Dropped,
 * the export started a line of its own under the clear button, which r34 read as the
 * filter row's third control again, drawn vertically. So the group BEFORE the end
 * control is given a basis: a flex line breaks on hypothetical sizes, and a group
 * asking for more than the line takes it alone whatever it shrinks to afterwards.
 * Both declarations are read, because either alone leaves the export off the row.
 *
 * WHAT THIS DOES NOT REACH: paint, for the reason the first half records —
 * JSDOM lays out no flex, so the position is read from the source rule. The
 * rendered x positions above are in the pull request's captures. */
test('export at the row end: below the phone step the end control stays in the row', () => {
  const { phone, group } = splitRules();
  assert.ok(phone, 'the 560px query declares no `.ui-toolbar--split > :last-child` rule, so the '
    + 'export keeps the auto margin on a phone and lands alone against the right edge');
  assert.match(phone[1], /margin-inline-start:\s*0/,
    'below the phone step the split row\'s last control must drop the auto margin, not keep it');
  assert.match(phone[1], /align-self:\s*start/,
    'the end control must keep its own height beside a group that wraps to two lines');
  assert.ok(group, 'the 560px query gives the group before the end control no basis, so the group '
    + 'takes the whole line and the end control drops under it');
  assert.match(group[1], /flex:\s*1\s+1\s+\d+%/,
    'the group needs a fractional basis — on `auto` its content is its hypothetical size and the '
    + 'line breaks before the end control');
  assert.match(group[1], /min-width:\s*0/, 'without this the group cannot shrink to the basis it was given');
});
