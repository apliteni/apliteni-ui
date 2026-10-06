/* Rule: the card header's two vertical gaps — title to description, description to what
 * follows — are steps of the spacing scale.
 *
 * Scope is those two declarations, not the sheet. `stories/table-rhythm.test.js` says why a
 * whole-sheet sweep is a different argument ("~160 declarations of argument about which are
 * rhythm and which are a component's own interior"), and card.css carries its share of those:
 * the icon gap and a setting row's hint offset are interior, and neither is this rule.
 *
 * The gap was 5px, which is off the scale and tight enough that a card's description read as
 * part of its heading rather than under it. Artur marked it on #532. The steps are read out of
 * tokens.css, never repeated here.
 *
 * why: docs/foundations.md#spacing-and-rhythm
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { TARGET_MIN } from '../../stories/guidelines/_accessibility-floor.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const read = (rel) => readFileSync(path.join(here, rel), 'utf8');

/** Blank out comments, keeping newlines so line numbers stay true. */
const decomment = (css) => css.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));

const CSS = decomment(read('card.css'));

/** The scale, by name and by px, read from the tokens. */
const SPACE = Object.fromEntries(
  [...decomment(read('../tokens/tokens.css')).matchAll(/--(space-[\w-]+):\s*(\d+(?:\.\d+)?)px/g)]
    .map((m) => [`--${m[1]}`, Number(m[2])]),
);

test('the scale this gate measures against was actually found', () => {
  assert.ok(Object.keys(SPACE).length >= 8, `only ${Object.keys(SPACE).length} steps read from tokens.css`);
});

/** The bottom margin of one rule, as written. */
function bottomMargin(css, selector) {
  const rule = new RegExp(`(?:^|\\})\\s*\\${selector}\\s*\\{([^}]*)\\}`).exec(css);
  if (!rule) return null;
  const body = rule[1];
  const shorthand = /(?:^|;)\s*margin:\s*([^;]+)/.exec(body);
  const longhand = /(?:^|;)\s*margin-bottom:\s*([^;]+)/.exec(body);
  if (longhand) return longhand[1].trim();
  if (!shorthand) return null;
  const parts = shorthand[1].trim().split(/\s+/);
  // top | right | bottom | left, with CSS's own fallbacks for 1-3 values.
  return (parts.length >= 3 ? parts[2] : parts[0]);
}

/** A written value as a step name, or null when it is off the scale. */
function step(value) {
  if (value === null) return null;
  const token = /^var\(\s*(--space-[\w-]+)\s*\)$/.exec(value.trim());
  if (token) return SPACE[token[1]] === undefined ? null : token[1];
  const px = /^(\d+(?:\.\d+)?)px$/.exec(value.trim());
  if (!px) return value.trim() === '0' ? '0' : null;
  const found = Object.entries(SPACE).find(([, n]) => n === Number(px[1]));
  return found ? found[0] : null;
}

const PAIR = [
  ['.ui-card__title', 'the gap under a card title is what separates it from its description'],
  ['.ui-card__sub', 'the gap under a card description is what separates the header from the card'],
];

test('both card-header gaps are steps of the scale', () => {
  const problems = [];
  let measured = 0;
  for (const [selector, what] of PAIR) {
    const value = bottomMargin(CSS, selector);
    if (value === null) {
      problems.push(`${selector}: no bottom margin found at all — ${what}`);
      continue;
    }
    measured += 1;
    if (!step(value)) problems.push(`${selector}: ${value} is not 0 and not a --space-* step — ${what}`);
  }
  assert.equal(measured, PAIR.length, 'both gaps must be measured, not one');
  assert.deepStrictEqual(problems, []);
});

// The description has to read as its own line under the heading, so the gap above it is not
// the tightest step the scale has. 4px put it back where it was.
test('the title gap is roomy enough to separate two text ranks', () => {
  const name = step(bottomMargin(CSS, '.ui-card__title'));
  assert.ok(name && name !== '0', 'the card title lost its bottom margin');
  assert.ok(
    SPACE[name] >= SPACE['--space-2'],
    `the card title's bottom margin is ${SPACE[name]}px; a description one step above the `
    + 'floor reads as part of the heading, which is what #532 was marked for',
  );
});

/* -- The gate's own gate ---------------------------------------------------- */

test('the gate rejects the value it was written to retire, and its neighbours', () => {
  const survived = [];
  for (const [what, mutate] of [
    ['the original off-scale 5px', (css) => css.replace('margin: 0 0 var(--space-2);', 'margin: 0 0 5px;')],
    ['an off-scale value in the shorthand\'s 2-value form', (css) => css.replace('margin: 0 0 var(--space-2);', 'margin: 7px 0;')],
    ['a longhand that is off the scale', (css) => css.replace('margin: 0 0 var(--space-2);', 'margin-bottom: 13px;')],
    ['the description gap taken off the scale', (css) => css.replace('margin-bottom: var(--space-5);', 'margin-bottom: 18px;')],
    ['a token that is not a spacing step', (css) => css.replace('margin: 0 0 var(--space-2);', 'margin: 0 0 var(--radius-sm);')],
  ]) {
    const mutated = mutate(CSS);
    assert.notEqual(mutated, CSS, `the mutation "${what}" changes nothing, so it proves nothing`);
    const problems = PAIR.filter(([sel]) => !step(bottomMargin(mutated, sel)));
    if (problems.length === 0) survived.push(what);
  }
  assert.deepStrictEqual(survived, [], 'an off-scale card-header gap passed this gate');
});

test('the roominess check rejects the floor step', () => {
  const tight = CSS.replace('margin: 0 0 var(--space-2);', 'margin: 0 0 var(--space-1);');
  assert.notEqual(tight, CSS);
  assert.ok(SPACE[step(bottomMargin(tight, '.ui-card__title'))] < SPACE['--space-2']);
});

/* -- The link a block carries in its head ----------------------------------
 *
 * A second rule in the same head, and the same kind of argument: the link into
 * the report behind the block is a target standing on its own, not a word inside
 * a sentence, so it carries WCAG 2.5.8's 24px itself. The head's line box draws
 * 20.3px, which is what stories/guidelines/accessibility-floor.test.js measured
 * when the link first moved here on #505 — that gate reads the rendered box and
 * is the measurement; this one holds the declaration that answers it, so the
 * answer cannot be deleted and leave only a browser run to notice.
 *
 * Read out of the sheet rather than named here: TARGET_MIN is the floor's one
 * home, in stories/guidelines/_accessibility-floor.js.
 */
const headLink = () => {
  const found = [...CSS.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter(([, sel]) => sel.split(',').map((s) => s.trim()).includes('.ui-card__link'));
  assert.equal(found.length, 1, 'the card head link has no rule of its own, or more than one');
  return found[0][2];
};

test('the link in a card\'s head carries the target floor itself', () => {
  const body = headLink();
  const min = /min-height:\s*(\d+(?:\.\d+)?)px/.exec(body);
  assert.ok(min, 'the head link states no min-height, so its box is the line box again');
  assert.ok(Number(min[1]) >= TARGET_MIN,
    `the head link floors at ${min[1]}px, under the ${TARGET_MIN}px of WCAG 2.5.8`);
  // A min-height on an inline box does nothing: without the display change the
  // declaration above reads as an answer and measures as the line box it was.
  assert.match(/display:\s*(inline-flex|flex)/.exec(body)?.[0] || '', /flex/,
    'min-height on an inline link is not a box; the rule needs the display that gives it one');
});

test('the head-link gate rejects a floor that is only written down', () => {
  for (const [what, mutated] of [
    ['the floor dropped below 2.5.8', CSS.replace('min-height: 24px', 'min-height: 20px')],
    ['the floor with no box to apply to', CSS.replace('display: inline-flex; align-items: center; ', '')],
    ['the rule gone', CSS.replace(/\.ui-card__link \{[^}]*\}/, '')],
  ]) {
    assert.notEqual(mutated, CSS, `the mutation "${what}" changes nothing, so it proves nothing`);
    const body = [...mutated.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
      .filter(([, sel]) => sel.split(',').map((s) => s.trim()).includes('.ui-card__link'))[0]?.[2];
    const min = body ? /min-height:\s*(\d+(?:\.\d+)?)px/.exec(body) : null;
    const boxed = body ? /display:\s*(inline-flex|flex)/.test(body) : false;
    assert.ok(!(min && Number(min[1]) >= TARGET_MIN && boxed), `"${what}" passed the gate`);
  }
});
