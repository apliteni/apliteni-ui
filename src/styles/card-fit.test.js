/* Rule: a card that frames one content-width block ends where the block ends, and no card
 * modifier ships a width the page cannot contain (#504).
 *
 * A table stops at its values now, so a card that kept filling its column left the slack as
 * white space — a 359px table in a 1232px card on the finance composition showcase. The
 * answer is `.ui-card--fit`. The hazard it introduces is the opposite one: a width that is
 * not a percentage escapes its column, and a card whose contents are wider than the room
 * would then push the page sideways. So this reads every width a card rule sets out of the
 * sheet and requires each to be capped.
 *
 * It also holds the row this change made wrap: `.ui-card__row` puts its two ends at the far
 * ends of one line, and at 320 the React table's column-scroll group — that row — took the
 * document to 352px before it was allowed to wrap.
 *
 * Subjects are discovered from the sheet, not listed here: every rule whose selector names
 * `.ui-card` and whose body sets `width`. A modifier added later is a subject the day it
 * lands, and a renamed one fails this rather than passing it quietly.
 *
 * What it does not reach: a rendered width or a rendered page. jsdom computes neither, and
 * nothing in either workspace does. The widths behind this rule — the card's box against its
 * table's at 1280, 390 and 320, and the document's own scroll width at each — are read off
 * Chromium and recorded in the pull request.
 *
 * why: docs/specification.md#spacing-and-rhythm
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CSS = readFileSync(path.join(HERE, 'card.css'), 'utf8');

// A comment names declarations in prose, so it goes before any body is read.
const noComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');

/** Top-level rules only; a card sets no width inside a media block today. */
const rulesIn = (css) => [...noComments(css).matchAll(/([^{}]+)\{([^{}]*)\}/g)]
  .map(([, selector, body]) => ({ selector: selector.trim(), body }))
  .filter(({ selector }) => selector && !selector.startsWith('@'));

const declaration = (body, property) => {
  const found = [...body.matchAll(new RegExp(`(?:^|;|\\s)${property}\\s*:\\s*([^;}]+)`, 'g'))];
  return found.length ? found[found.length - 1][1].trim() : null;
};

/** Every rule that gives a card a width of its own. */
const cardWidthRules = (css) => rulesIn(css)
  .filter(({ selector, body }) => /\.ui-card(?:--[\w-]+)?\b/.test(selector)
    && !/__/.test(selector) && declaration(body, 'width'));

function cardWidths(css) {
  const rules = cardWidthRules(css);
  assert.ok(rules.length > 0, 'no card rule sets a width — the subject is gone');
  const problems = [];
  let measured = 0;

  for (const { selector, body } of rules) {
    const width = declaration(body, 'width');
    const cap = declaration(body, 'max-width');
    // A percentage, `auto` or `inherit` cannot exceed the column by itself. Anything
    // sized to its own contents — fit-content, max-content, a length — can, so it
    // carries the cap in the same rule where a reader of the sheet will find it.
    const contained = /^(auto|inherit|100%|\d+(?:\.\d+)?%)$/.test(width);
    if (!contained && cap !== '100%') {
      problems.push(`${selector} sizes a card to its contents (width: ${width}) and is not capped at 100%`);
    }
    measured += 1;
  }
  assert.equal(measured, rules.length, 'every card width rule must be measured once');

  // The modifier the rule above exists for. Named, because a sheet with no card width
  // at all would otherwise satisfy every check in this function.
  const fit = rules.find(({ selector }) => selector.split(',').some((s) => s.trim() === '.ui-card--fit'));
  if (!fit) problems.push('.ui-card--fit is gone: a card around one table has nothing to end it');
  else if (declaration(fit.body, 'width') !== 'fit-content') {
    problems.push(`.ui-card--fit must size to its contents, not ${declaration(fit.body, 'width')}`);
  }
  return problems;
}

test('a card sized to its contents is capped at the room it has', () => {
  assert.deepEqual(cardWidths(CSS), []);
});

test('the card-width gate rejects a card that can push the page sideways', () => {
  for (const [name, mutation] of [
    ['the cap dropped from the fit modifier',
      CSS.replace('.ui-card--fit { width: fit-content; max-width: 100%; }', '.ui-card--fit { width: fit-content; }')],
    ['a fit modifier capped at something other than the room',
      CSS.replace('.ui-card--fit { width: fit-content; max-width: 100%; }',
        '.ui-card--fit { width: fit-content; max-width: 60rem; }')],
    ['a later modifier sized to its contents and left uncapped',
      `${CSS}\n.ui-card--hug { width: max-content; }`],
    ['a later modifier given a fixed width',
      `${CSS}\n.ui-card--panel { width: 42rem; }`],
  ]) {
    assert.ok(cardWidths(mutation).length > 0, `${name} must be rejected`);
  }
  assert.deepEqual(
    cardWidths(CSS.replace('.ui-card--fit { width: fit-content; max-width: 100%; }',
      '.ui-card--fit { width: 100%; }')),
    ['.ui-card--fit must size to its contents, not 100%'],
    'a fit modifier that fills its column instead must be reported',
  );
  assert.throws(() => cardWidths(noComments(CSS).replace(/width\s*:/g, 'inline-size:')),
    /no card rule sets a width/);
});

test('a card row wraps rather than running past the page', () => {
  const row = rulesIn(CSS).find(({ selector }) => selector === '.ui-card__row');
  assert.ok(row, '.ui-card__row is gone from the sheet');
  assert.equal(declaration(row.body, 'display'), 'flex');
  assert.equal(declaration(row.body, 'flex-wrap'), 'wrap',
    'the column-scroll group is this row, and two buttons that cannot share a line must wrap');
});

test('the row-wrap check rejects a row that cannot wrap', () => {
  const nowrap = CSS.replace('  flex-wrap: wrap;', '  flex-wrap: nowrap;');
  assert.notEqual(nowrap, CSS, 'the mutation must change the sheet');
  const row = rulesIn(nowrap).find(({ selector }) => selector === '.ui-card__row');
  assert.equal(declaration(row.body, 'flex-wrap'), 'nowrap');
});
