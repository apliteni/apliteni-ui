/* The Follow-the-consequence specimen, checked on the vanilla side.
 *
 * The React showcase has a gate for the same rule, and the judgement is shared from
 * stories/lib/accent-paint.js; this is the coverage check for the other workspace, which
 * AGENTS.md asks to keep separate. It exists because it was missing: the 55% accent edge
 * the previous round removed could be put back on this file alone and the whole
 * repository stayed green.
 *
 * Discover the subjects from the page's own RULES rather than naming them, so a specimen
 * added or renamed later fails here until it is measured.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { accentOffences, accentLines, accentMixes } from '../lib/accent-paint.js';
import { RULES, SPEC_CSS } from './_density-and-accents.js';

const RULE = 'follow-the-consequence';
const specimen = RULES.find((rule) => rule.id === RULE);

test('the page still carries the rule this gate is for', () => {
  assert.ok(specimen, `no rule on this page has the id "${RULE}" — the gate is checking nothing`);
  for (const side of ['doHtml', 'dontHtml']) {
    assert.equal(typeof specimen[side], 'function', `${RULE} must render a ${side} specimen`);
  }
});

/** The two cards of one panel, with what each one is and whether its name is accented. */
function panel(html) {
  const dom = JSDOM.fragment(`<div>${html}</div>`);
  const grid = dom.querySelector('.gda-panes');
  assert.ok(grid, 'the specimen must render its two-pane grid');
  const cards = [...grid.children].map((card) => ({
    title: card.querySelector('.ui-card__title')?.textContent.trim(),
    accent: card.classList.contains('gda-pane--accent'),
  }));
  return { wide: [...grid.classList].find((c) => c.endsWith('-wide')), cards };
}

test('the Do accents the saved pane and the Dont accents the source, in one card order', () => {
  const sides = [panel(specimen.doHtml()), panel(specimen.dontHtml())];
  assert.equal(sides.length, 2);
  for (const { cards } of sides) {
    assert.deepEqual(cards.map((c) => c.title), ['Extracted fields', 'Source document'],
      'both panels print the same two cards in the same order, so only the emphasis moves');
    assert.equal(cards.filter((c) => c.accent).length, 1,
      'exactly one card in a panel carries the accent');
  }
  const [doSide, dontSide] = sides;
  assert.equal(doSide.wide, 'gda-panes--saved-wide');
  assert.equal(dontSide.wide, 'gda-panes--source-wide');
  assert.equal(doSide.cards.find((c) => c.accent).title, 'Extracted fields',
    'the Do puts the accent on the pane whose values get saved');
  assert.equal(dontSide.cards.find((c) => c.accent).title, 'Source document',
    'the Dont puts it on the source, which is the thing the rule forbids');
});

test('the specimen still differs between Do and Dont below the stacking breakpoint', () => {
  // Side by side the panels differ on width; stacked they cannot, so the order has to
  // carry it. A stack that leads with the same card in both panels shows nothing.
  assert.match(SPEC_CSS, /@media\s*\(max-width:\s*560px\)/,
    'the pair must stack below a width where a 2:1 split leaves no room for a word');
  assert.match(SPEC_CSS, /\.gda-panes--source-wide\s*>\s*:first-child\s*\{[^}]*order:\s*2/,
    'stacked, the Dont must lead with the source pane or the two panels read alike');
  assert.match(SPEC_CSS, /\.gda-panes--saved-wide\s*\{[^}]*minmax\(0,\s*2fr\)\s*minmax\(0,\s*1fr\)/,
    'without minmax(0, …) both tracks sit on their min-content floors and the ratio is ignored');
});

/* The shared judgement, applied to this page's own sheet: the accent names a pane, and
 * nothing on this page draws a line from it. Measured against the page that carries the
 * rule, so a Dont specimen cannot demonstrate the forbidden thing by drawing it. */
test('no specimen on this page paints the accent as a line', () => {
  assert.ok(SPEC_CSS.includes('gda-pane'), 'the sheet this gate reads must hold the specimen');
  assert.deepEqual(accentOffences(SPEC_CSS, 'stories/guidelines/_density-and-accents.js'), []);
});

test('the check rejects the accent edge this PR removed, in every spelling it was written', () => {
  const edges = [
    '.gda-pane--accent { border-color: color-mix(in srgb, var(--accent) 55%, transparent); }',
    '.gda-pane--accent { border-color: color-mix(in srgb, transparent 45%, var(--accent)); }',
    '.gda-pane--accent { --edge: color-mix(in srgb, var(--accent) 55%, transparent); border-color: var(--edge); }',
    '.gda-pane--accent { border-color: var(--accent-strong); }',
    '.gda-pane--accent { box-shadow: 0 0 0 2px var(--accent); }',
  ];
  for (const edge of edges) {
    assert.notDeepEqual(accentOffences(`${SPEC_CSS}\n${edge}`, 'mutation'), [],
      `this edge must be rejected: ${edge}`);
  }
  assert.equal(edges.length, 5, 'update the count when a spelling is added');
});

test('the check leaves accent ink and neutral edges alone', () => {
  // The carrier itself, and the Dont on this same page that colours labels and values
  // with the accent on purpose, must both pass; a gate that fails them fails the page.
  assert.deepEqual(accentOffences('.x .ui-card__title { color: var(--accent); }', 'ink'), []);
  assert.deepEqual(accentOffences('.y { border-color: var(--border-strong); }', 'neutral'), []);
  assert.equal(accentLines('.z { outline: 1px solid var(--accent); }').length, 1);
  assert.equal(accentMixes('color-mix(in srgb, var(--accent) 22%, transparent)')[0].percent, 22);
});
