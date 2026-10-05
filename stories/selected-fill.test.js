// Rule: a selected item is marked by a background highlight, and the highlight is one
// a reader can see on the ground that item stands on.
//
// Artur settled it on #578 round r34, on the open rail's current row: "Outline only for
// focus. Selected - use background highlight." Taking the edges off is half the change;
// the other half is that the fill left behind has to carry the mark. It did not. The
// kit paints a selected row `--surface`, and in the LIGHT theme `--surface` and
// `--bg-elevated` are both #ffffff — 1.000:1 — so on a card, a menu panel or a rail the
// fill drew nothing at all and the edge had been the whole mark. Removing the edge
// without moving the fill would have left those rows unmarked.
//
// So this measures the pair: every selected row's fill against the ground its own
// component paints under it, in both themes, against a floor.
//
// THE FLOOR is 1.1:1, which is not a WCAG number and is not pretending to be. WCAG has
// no contrast requirement for a background that carries no information by itself —
// these rows carry their own text at the kit's own ink ratios, which stories/contrast
// .test.js measures. 1.1:1 is the step the kit's own surfaces take between rungs, and
// it is the number below which a fill stops reading as a fill: --surface on
// --bg-elevated is 1.000 and was invisible, --surface-3 on --bg-elevated is 1.041 and
// is the next thing to it.
//
// COVERAGE LIMITS. The grounds are named here, not discovered: a row's ground is the
// component's own container, and no reader of the stylesheets can tell which container
// a given row ends up inside. Each one is cited to the rule that paints it, and the
// anti-vacuity check below fails if a subject stops resolving. A row whose ground is
// not fixed by its own component is not here and cannot be: the pager stands on the
// page in one showcase and on a card in another, which is recorded beside its rule in
// src/styles/pagination.css as the one selected mark #578 left as an edge.
//
// why: docs/specification.md#the-focus-ring
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { STYLE_FILES, substitute, tokensFor } from './lib/contrast.js';
import { parseColour, ratio } from './lib/contrast.js';

const source = STYLE_FILES.map((file) => readFileSync(file, 'utf8')).join('\n')
  .replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\n]/g, ' '));

/** The floor a fill has to clear to read as a fill. See the header. */
export const FILL_FLOOR = 1.1;

/**
 * The selected rows, each with the selector that paints it, the selector that paints
 * the ground under it, and what that ground is. `ground` is named rather than read,
 * because which container a row ends up in is not in the stylesheets.
 */
const SUBJECTS = [
  {
    name: 'the current row of a side nav or an open rail',
    rule: '.ui-nav__item.is-active', ground: '--surface',
    paintedBy: '.ui-app__rail, which layout.css paints --surface',
  },
  {
    name: 'the row a menu would pick',
    rule: '.ui-dropdown__item.is-active', ground: '--bg-elevated',
    paintedBy: '.ui-dropdown__panel, which dropdown.css paints --bg-elevated',
  },
  {
    name: 'the row the command palette would run',
    rule: '.ui-cmdk__item.is-active', ground: '--bg-elevated',
    paintedBy: '.ui-cmdk__panel, through --cmdk-surface',
  },
  {
    name: "the folded rail's current plate",
    rule: '.ui-nav--side.is-collapsed .ui-nav__item.is-active::before', ground: '--surface',
    paintedBy: '.ui-app__rail, which layout.css paints --surface',
  },
];

/** The `background` a rule declares, as written. */
const fillOf = (selector) => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const rule = new RegExp(`(?:^|\\})\\s*${escaped}\\s*\\{([^{}]*)\\}`).exec(source);
  assert.ok(rule, `${selector} no longer has a rule of its own; move this subject`);
  const value = /(?:^|;)\s*background(?:-color)?\s*:\s*([^;]+)/.exec(rule[1]);
  assert.ok(value, `${selector} declares no background; a selected row is marked by one`);
  return value[1].trim();
};

/** What a declared value paints in one theme. */
const paint = (value, theme) => {
  const vars = tokensFor(theme, 'default');
  const colour = parseColour(substitute(value, vars));
  assert.ok(colour, `${value} is not a colour this gate can read in ${theme}`);
  return colour;
};

const measure = (subject, theme) => ratio(
  paint(fillOf(subject.rule), theme),
  paint(`var(${subject.ground})`, theme),
);

for (const theme of ['light', 'dark']) {
  test(`a selected row's highlight is visible on its own ground: ${theme}`, () => {
    const read = SUBJECTS.map((subject) => ({ subject, contrast: measure(subject, theme) }));
    for (const { subject, contrast } of read) {
      assert.ok(contrast >= FILL_FLOOR,
        `${subject.name}: ${fillOf(subject.rule)} on ${subject.ground} measures `
        + `${contrast.toFixed(3)}:1 in ${theme}, under the ${FILL_FLOOR}:1 floor. Its ground is `
        + `${subject.paintedBy}. A selected item is marked by a background highlight since `
        + '#578 round r34, so a fill that does not step is a row with no mark on it');
    }
    // Anti-vacuity: every subject was read, and each one resolved to a real pair.
    assert.equal(read.length, 4, 'four selected rows have a ground their own component fixes');
    assert.ok(read.every(({ contrast }) => Number.isFinite(contrast) && contrast >= 1));
  });
}

test('the fill gate rejects a highlight that does not step off its ground', () => {
  // The exact regression this exists for: --surface on a --bg-elevated panel, which is
  // what the menu row and the palette row painted until #578 round r34 and which is
  // 1.000:1 in light. Read through the gate's own arithmetic, not a paraphrase.
  const flat = ratio(paint('var(--surface)', 'light'), paint('var(--bg-elevated)', 'light'));
  assert.equal(flat.toFixed(3), '1.000',
    'light --surface and --bg-elevated have come apart; this gate\'s subject has changed');
  assert.ok(flat < FILL_FLOOR, 'the floor no longer rejects the fill that was invisible');
  // And the fill each row actually takes clears it in both themes, by more than rounding.
  for (const theme of ['light', 'dark']) {
    for (const subject of SUBJECTS) {
      assert.ok(measure(subject, theme) > flat, `${subject.name} is no better than the flat pair in ${theme}`);
    }
  }
});
