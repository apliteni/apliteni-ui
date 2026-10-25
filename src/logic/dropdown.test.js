// dropdownMatch() and dropdownFiltering() are the kit's answer to "does this row
// stay?", exported so every dropdown asks rather than re-implements: the React
// <Dropdown> asks them, the way <CommandPalette> asks rankGroups(). These tests are
// the export's contract. #304
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dropdownMatch, dropdownFiltering, dropdownAvail } from './dropdown.js';

test('the matcher finds a substring anywhere in the label, not only at the front', () => {
  assert.equal(dropdownMatch('Acme Payments Ltd', 'payments'), true);
  assert.equal(dropdownMatch('US dollar (USD)', 'dollar'), true);
  assert.equal(dropdownMatch('US dollar (USD)', 'usd'), true);
  assert.equal(dropdownMatch('US dollar (USD)', 'euro'), false);
});

test('it ignores case, accents, and the letters that carry their own mark', () => {
  for (const [label, query] of [
    ['Polish złoty (PLN)', 'zloty'], ['Café', 'cafe'], ['Örebro', 'orebro'],
    ['Ärger', 'arger'], ['Straße', 'strasse'], ['Ærø', 'aero'], ['Œuvre', 'oeuvre'],
    ['Đà Nẵng', 'da nang'], ['Ísafjörður', 'isafjordur'], ['İstanbul', 'istanbul'],
  ]) {
    assert.equal(dropdownMatch(label, query), true, `${label} should be found by ${query}`);
  }
});

test('a query with nothing in it matches every row, so nothing is hidden', () => {
  for (const q of ['', '   ', undefined, null, '\u0301']) {
    assert.equal(dropdownMatch('Anything', q), true, `query ${JSON.stringify(q)}`);
    assert.equal(dropdownFiltering(q), false, `query ${JSON.stringify(q)} narrows nothing`);
  }
});

test('a label that is not a string is read the way the factory reads one', () => {
  for (const label of [undefined, null, 0, false]) {
    assert.equal(dropdownMatch(label, 'x'), false, `label ${JSON.stringify(label)}`);
    assert.equal(dropdownMatch(label, ''), true, `label ${JSON.stringify(label)} with no query`);
  }
  assert.equal(dropdownMatch(1250, '25'), true, 'a number label is its digits');
});

test('the query is trimmed and the label is not: a space inside a name still counts', () => {
  assert.equal(dropdownMatch('Back office', '  back off  '), true);
  assert.equal(dropdownMatch('Backoffice', 'back off'), false);
  assert.equal(dropdownFiltering('  x  '), true);
});

/* How tall a floating panel may be (moved from stories/dropdown-reach.test.js, #429). */

test('a menu opened 300px above the bottom of a phone is capped short of its content', () => {
  // The issue's own acceptance case: a 390x844 phone, a trigger ending 300px
  // above the bottom. 12 rows run well past this; the cap has to be short of
  // their full height and still end inside the viewport.
  const avail = dropdownAvail({
    anchorTop: 513, anchorBottom: 544, viewport: 844, gap: 9, inset: 8, min: 120,
  });
  assert.equal(avail, 300 - 9 - 8, 'the 300px below, less the trigger gap and the edge inset');
  const bottom = 544 + 9 + avail;
  assert.equal(bottom, 844 - 8, 'the panel ends one edge-inset above the viewport\'s bottom edge');
});

test('a room too small for the floor even after spending the inset is left uncapped', () => {
  // A trigger with its bottom 27px of raw room past the gap — short of the
  // 120px floor even once the whole inset is spent. Design review on #641:
  // capping here drew a 27px sliver hiding 446px of rows, worse than the
  // content-height panel it replaced. Infinity means "measure nothing," so the
  // sheet's own fallback stands and the panel keeps its content height.
  const avail = dropdownAvail({
    anchorTop: 777, anchorBottom: 808, viewport: 844, gap: 9, inset: 8, min: 120,
  });
  assert.equal(avail, Infinity, 'below the floor even spending the whole inset, the panel is left uncapped');
});

test('a trigger with no room left is also left uncapped, not pinned to a nought-pixel sliver', () => {
  // The gap alone already reaches the edge: there is no room the floor could
  // spend without passing it, and none to show a usable panel with either.
  const avail = dropdownAvail({
    anchorTop: 808, anchorBottom: 839, viewport: 844, gap: 9, inset: 8, min: 120,
  });
  assert.equal(avail, Infinity);
});

test('the floor leaves a tight room uncapped the same way above the trigger as below it', () => {
  // `up` measures from the trigger's own top, the same shape in both directions.
  const avail = dropdownAvail({
    anchorTop: 36, anchorBottom: 67, viewport: 844, gap: 9, inset: 8, min: 120, up: true,
  });
  assert.equal(avail, Infinity, 'below the floor even spending the whole inset, the panel is left uncapped');
});

