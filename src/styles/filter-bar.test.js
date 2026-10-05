/**
 * Rule: no box on the filter row puts its words on a grey block, in every state and
 * not just the one that was photographed. The first fix turned the clear action's
 * resting fill off and left the rest to the kit — which kept their fill, the thing
 * being turned off, so a disabled or busy bar put the label back on
 * `rgb(33, 30, 45)`. #518's add control arrived with the same fill, from the kit's
 * trigger instead of the kit's button, and kept it when the row was off.
 *
 * So this reads button.css, works out which of its fills can land on THIS
 * control, and requires filter-bar.css to answer each. Read as text, like
 * pagination.test.js next door, because the package ships CSS as its artifact.
 * It measures the cascade and not pixels; the paint is measured in a browser.
 * why: docs/components.md#a-filter-row-holds-its-panels
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const read = (rel) => readFileSync(path.join(here, rel), 'utf8');
/** Blank out comments, keeping newlines so line numbers stay true. */
const decomment = (css) => css.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));

const BUTTON = decomment(read('button.css'));
const DROPDOWN = decomment(read('dropdown.css'));
const BAR = decomment(read('filter-bar.css'));
const ENTRY = read('../index.css');

const rules = (css) => [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
  .filter((m) => !m[1].trimStart().startsWith('@'))
  .flatMap((m) => m[1].trim().split(',').map((selector) => ({
    selector: selector.trim().replace(/\s+/g, ' '), body: m[2],
  })));
/** The last value a body declares for a property, `!important` stripped. */
const valueOf = (body, property) => {
  const found = [...body.matchAll(new RegExp(`(?:^|;)\\s*${property}\\s*:\\s*([^;}]+)`, 'g'))];
  return found.length ? found.at(-1)[1].trim().replace(/!\s*important\s*$/i, '') : null;
};
const fillOf = (body) => valueOf(body, 'background') ?? valueOf(body, 'background-color');

/* The ways a sheet can spell "paint nothing here", borrowed from
   button-disabled.test.js: a fully transparent colour however it is written, and
   the keywords that resolve a background to one. */
const INVISIBLE = /^\s*(transparent|none|initial|inherit|unset|revert(-layer)?|#(0{3,4}|0{6}|0{8})|rgba?\([^)]*[,/]\s*0*(\.0+)?%?\s*\)|hsla?\([^)]*[,/]\s*0*(\.0+)?%?\s*\))\s*$/i;
/* A fill carrying the control's own colour is not a grey block: `.ui-btn:hover`
   washes --accent over the surface, and that wash is the kit's and stays. */
const ACCENTED = /--accent|--pink/;

/* Specificity, counted for the shapes these two sheets actually use. A functional
   pseudo-class would make the count a lie, so one fails the parse instead. */
const specificity = (selector) => {
  assert.doesNotMatch(selector, /:(not|is|where|has)\(/,
    `\`${selector}\` carries a functional pseudo-class this comparator cannot weigh`);
  const ids = selector.match(/#[\w-]+/g) ?? [];
  const classes = selector.match(/\.[\w-]+|\[[^\]]+\]|:[\w-]+(?!\()/g) ?? [];
  const types = selector.replace(/\[[^\]]+\]/g, '').match(/(?:^|[\s>+~])[a-z][\w-]*/gi) ?? [];
  return [ids.length, classes.filter((c) => !/^::/.test(c)).length, types.length];
};
const outranks = (a, b) => {
  for (let i = 0; i < 3; i += 1) if (a[i] !== b[i]) return a[i] > b[i];
  return true; // A tie goes to the sheet imported later, asserted below.
};
/** The state qualifiers on a compound selector: `:disabled`, `[aria-busy="true"]`. A
 *  `data-filter-*` attribute is which box the rule is for, not a state it is in. */
const qualifiers = (compound) => (compound.match(/\[[^\]]+\]|:[\w-]+(?!\()/g) ?? [])
  .filter((q) => !/^\[data-filter-/.test(q)).sort();
const subset = (small, big) => small.every((q) => big.includes(q));

/* What the factory writes for this control, read from the factory rather than
   assumed: the variant decides which of the kit's rules can reach it at all. */
const FACTORY = read('../components/index.js');
const CLEAR_VARIANT = /variant = '(\w+)'/.exec(FACTORY)?.[1];
const CLEAR_SIZE = 'sm';

/* The kit fills that can land on one of the row's boxes: a rule on the kit class itself,
   with or without state qualifiers, carrying no OTHER variant's class. */
const kitFillsOf = (css, kit) => rules(css).filter(({ selector, body }) => {
  if (!selector.startsWith(kit)) return false;
  const variants = selector.match(/\.ui-btn--[\w-]+/g) ?? [];
  if (variants.some((v) => ![`.ui-btn--${CLEAR_VARIANT}`, `.ui-btn--${CLEAR_SIZE}`].includes(v))) return false;
  if (/[\s>+~]/.test(selector)) return false; // a descendant, not the control itself
  const fill = fillOf(body);
  return !!fill && !INVISIBLE.test(fill) && !ACCENTED.test(fill);
});
const kitFills = kitFillsOf(BUTTON, '.ui-btn');
/* And the ones the kit's trigger paints, which is the box `[data-filter-add]` holds. */
const triggerFills = kitFillsOf(DROPDOWN, '.ui-dropdown__trigger');

/* The sheet's answers: a transparent fill written for one of the row's boxes. */
const answersFor = (attr) => rules(BAR)
  .filter(({ selector, body }) => selector.includes(`[${attr}]`)
    && INVISIBLE.test(fillOf(body) ?? ''));
const answers = answersFor('data-filter-clear');
const addAnswers = answersFor('data-filter-add');

const unanswered = (kit, given) => kit.filter(({ selector }) => {
  const state = qualifiers(selector);
  const weight = specificity(selector);
  return !given.some((answer) => subset(qualifiers(answer.selector), state)
    && outranks(specificity(answer.selector), weight));
}).map(({ selector }) => selector);

test('both sheets are being read, and the later one is the filter bar', () => {
  // Every assertion below compares one sheet against the other, so an empty read
  // on either side passes whatever the kit does.
  assert.ok(rules(BUTTON).length >= 20, `parsed ${rules(BUTTON).length} rules out of button.css`);
  assert.ok(rules(DROPDOWN).length >= 20, `parsed ${rules(DROPDOWN).length} rules out of dropdown.css`);
  assert.ok(rules(BAR).length >= 8, `parsed ${rules(BAR).length} rules out of filter-bar.css`);
  assert.equal(CLEAR_VARIANT, 'secondary', `the button factory now defaults to ${CLEAR_VARIANT}`);
  // A tie on specificity is decided by import order, so the comparator above only
  // holds while filter-bar.css is the one imported second.
  assert.ok(ENTRY.indexOf('styles/filter-bar.css') > ENTRY.indexOf('styles/button.css'),
    'index.css imports filter-bar.css before button.css, so a tie now goes the other way');
});

test('every neutral fill the kit can paint on this control is discovered', () => {
  // The states, not a count: a kit that stopped painting one of these would make
  // the sweep below pass by having nothing to find.
  const states = kitFills.map((r) => r.selector).sort();
  assert.deepEqual(states, [
    '.ui-btn',
    '.ui-btn:disabled',
    '.ui-btn[aria-busy="true"]',
    '.ui-btn[aria-busy="true"]:active',
    '.ui-btn[aria-busy="true"]:hover',
    '.ui-btn[aria-busy="true"][data-btn-disabled]',
    '.ui-btn[aria-disabled="true"]',
  ], 'button.css paints a different set of neutral fills now — answer the new ones in filter-bar.css');
  // And the one fill that is NOT a grey block stays out of it, so the hover wash
  // is never frozen into this sheet.
  assert.equal(states.includes('.ui-btn:hover'), false,
    'the accent hover wash is being treated as a neutral fill');
});

test('the clear action answers every one of them with no fill at all', () => {
  assert.ok(answers.length >= 2, `filter-bar.css writes ${answers.length} transparent fills for it`);
  assert.deepEqual(unanswered(kitFills, answers), [],
    'these kit fills out-rank the clear action\'s own, so its words land on a grey block in that state',
  );
});

test('the sweep refuses a sheet that answers only the resting fill', () => {
  // The mutation that kills its case — the bug this gate was written for. Without
  // it, a comparator that stopped matching would report the sheet as covered
  // whatever it says.
  const restOnly = answers.filter((a) => qualifiers(a.selector).length === 0);
  assert.equal(restOnly.length, 1, 'expected exactly one unqualified resting answer');
  assert.deepEqual(unanswered(kitFills, restOnly).sort(), [
    '.ui-btn:disabled',
    '.ui-btn[aria-busy="true"]',
    '.ui-btn[aria-busy="true"]:active',
    '.ui-btn[aria-busy="true"]:hover',
    '.ui-btn[aria-busy="true"][data-btn-disabled]',
    '.ui-btn[aria-disabled="true"]',
  ], 'the resting rule alone is being read as covering the states it loses to');

  // And an answer written at too low a specificity is refused on weight alone.
  const weak = [{ selector: '[data-filter-clear] button:disabled', body: 'background: transparent' }];
  assert.deepEqual(unanswered(kitFills.filter((r) => r.selector === '.ui-btn[aria-busy="true"][data-btn-disabled]'), weak),
    ['.ui-btn[aria-busy="true"][data-btn-disabled]'],
    'a (0,2,1) answer is being read as out-ranking a (0,3,0) kit rule');
  // A rule for a different control is not an answer either.
  assert.equal(answers.every((a) => a.selector.includes('[data-filter-clear]')), true);
});

test('every neutral fill the kit can paint on the add control is discovered', () => {
  // The trigger paints at rest and nowhere else, so one answer covers every state — and
  // this is the assertion that notices the day that stops being true.
  assert.deepEqual(triggerFills.map((r) => r.selector).sort(), ['.ui-dropdown__trigger'],
    'dropdown.css paints a different set of neutral fills now — answer the new ones in filter-bar.css');
});

test('the add control answers every one of them with no fill at all', () => {
  assert.ok(addAnswers.length >= 1, `filter-bar.css writes ${addAnswers.length} transparent fills for it`);
  assert.deepEqual(unanswered(triggerFills, addAnswers), [],
    'the kit\'s trigger fill out-ranks the add control\'s own, so its words land on a grey block');
});

test('the sweep refuses a sheet that leaves the add control its kit fill', () => {
  assert.deepEqual(unanswered(triggerFills, []), ['.ui-dropdown__trigger'],
    'with no answer at all the sweep still reports the control as covered');
  // And an answer written at the kit's own weight is refused: the row's rule has to out-rank it.
  const weak = [{ selector: '[data-filter-add] .ui-dropdown__trigger', body: 'background: transparent' }];
  assert.deepEqual(unanswered(triggerFills, weak), [],
    'a (0,2,0) answer should out-rank the kit\'s (0,1,0) resting rule');
});

/* With no fill of its own the label is read on whatever is behind the bar, which
 * is the one case button-disabled.test.js measured --disabled-ink-bare for. That
 * gate only reads button.css, so the same rule is held here for this sheet. */
test('a disabled clear action takes the ink measured on every ground', () => {
  const off = rules(BAR).filter(({ selector }) => selector.includes('[data-filter-clear]')
    && /:disabled|\[aria-disabled="true"\]/.test(selector));
  assert.ok(off.length >= 2, `filter-bar.css writes ${off.length} disabled rules for the clear action`);
  const ink = off.map(({ body }) => valueOf(body, 'color')).filter(Boolean).at(-1);
  assert.equal(ink, 'var(--disabled-ink-bare)',
    'the disabled clear action paints no fill, so its words are read on the page — and that is the'
    + ' one ink button-disabled.test.js measures against every ground the kit paints.');
});

/* The edge is restated, and that is a change of its own: the row rests on --border-strong
 * where `.ui-btn` rests on --control-edge, so the row's resting rule sits deeper than the
 * kit's own disabled rule and would hold a live edge through it. #518 — the ink itself is
 * held by stories/filter-row-edge.test.js, which resolves it in both themes. */
test('a restated resting edge brings the unavailable edge with it', () => {
  const edgeOf = (selector) => rules(BAR).filter((r) => r.selector === selector)
    .map(({ body }) => valueOf(body, 'border-color')).filter(Boolean).at(-1);
  const rest = '.ui-filter-bar [data-filter-clear] button';
  assert.equal(edgeOf(rest), 'var(--border-strong)', 'the clear action no longer rests on the row\'s edge');
  for (const state of [':disabled', '[aria-disabled="true"]', '[aria-busy="true"][data-btn-disabled]']) {
    assert.equal(edgeOf(`${rest}${state}`) ?? restated(rest, state), 'var(--disabled-border)',
      `${state} is left to a kit rule this sheet's resting rule out-ranks`);
  }
});
/** The ink a grouped selector list gives one of its parts. */
function restated(rest, state) {
  const group = rules(BAR).find((r) => r.selector === `${rest}${state}`);
  return group ? valueOf(group.body, 'border-color') : null;
}
