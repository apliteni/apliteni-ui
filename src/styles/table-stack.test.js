/* Rule: below the one-column step, `.ui-table--stack` lays a row out as a block, and the
 * header row is clipped rather than removed.
 *
 * This resolves the stylesheet through JSDOM's cascade at a width rather than reading its
 * declarations, because the defect it guards against is a specificity one: `--dense`,
 * `--compact` and `__title` reach a cell with two classes, so a one-class stack rule loses
 * to them. Reading declarations would report the rule present and the layout broken.
 *
 * why: docs/specification.md#dense-financial-tables
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import { substitute, tokensFor } from '../../stories/lib/contrast.js';

const CSS = readFileSync(
  path.join(path.dirname(fileURLToPath(import.meta.url)), 'table.css'),
  'utf8',
);

/**
 * The spacing scale, named rather than restated: this gate says which step a gap owes, and
 * what that step is worth stays in src/tokens/tokens.css. A renamed step fails here.
 */
const SCALE = tokensFor('light', 'default');
const step = (token) => {
  const px = SCALE.get(token);
  assert.ok(px, `src/tokens/tokens.css no longer carries ${token}`);
  return px;
};

/* What a stacked row's gaps owe. The row pays sideways what a dense cell pays, so the hover
 * outline and the row separator keep the clearance they had at the width above the step; it
 * pays one step more down the page, because a row is now several lines and the gap between
 * two rows has to beat the gaps inside one. The values sit a dense column gap apart, and the
 * paragraph takes the smallest step there is, because it belongs to the row above it.
 * Measured in Chromium by scripts/evidence/table-stack.mjs, which also proves the text lands
 * on the card's text edge — the arithmetic this gate cannot do, because JSDOM lays nothing out.
 */
const GAPS = {
  'padding-top': '--space-3',
  'padding-bottom': '--space-3',
  'padding-left': '--space-3',
  'padding-right': '--space-3',
  'column-gap': '--space-3',
  'row-gap': '--space-1',
};

// 390px is the phone the issue names; 1280px is the width the same markup has to be
// untouched at, because a modifier that reshapes the desktop table is a different bug.
const PHONE = 390;
const DESKTOP = 1280;

/** Blank out comments, keeping newlines so line numbers stay true. */
const decomment = (css) => css.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));

/** `(max-width: 560px)` and its conjunctions. Anything else is a case this cannot judge. */
const mediaApplies = (condition, width) =>
  condition.split(/\s+and\s+/).map((p) => p.trim()).every((part) => {
    const m = /^\((max|min)-width:\s*(\d+(?:\.\d+)?)px\)$/.exec(part);
    assert.ok(m, `table.css asks a media condition this gate cannot evaluate: ${part}`);
    return m[1] === 'max' ? width <= Number(m[2]) : width >= Number(m[2]);
  });

/**
 * A stylesheet as it stands at one viewport width: top-level rules in source order, with
 * the body of every media block that applies spliced in at its place, so the cascade JSDOM
 * resolves is the one a browser would resolve at that width.
 */
function sheetAt(css, width) {
  const source = decomment(css);
  let out = '';
  for (let i = 0; i < source.length;) {
    const at = source.indexOf('@media', i);
    if (at < 0) { out += source.slice(i); break; }
    out += source.slice(i, at);
    const open = source.indexOf('{', at);
    const condition = source.slice(at + '@media'.length, open).trim();
    let depth = 1;
    let end = open + 1;
    for (; end < source.length && depth; end++) {
      if (source[end] === '{') depth++;
      else if (source[end] === '}') depth--;
    }
    if (mediaApplies(condition, width)) out += source.slice(open + 1, end - 1);
    i = end;
  }
  return substitute(out, tokensFor('light', 'default'));
}

/* -- The subjects, composed rather than listed ------------------------------ */

/**
 * The density modifiers are discovered, because they are the selectors the cell rules have
 * to outrank: one added to table.css later is swept the day it lands. Each is composed with
 * `--stack`, and again with the sticky/pinned pair a dense table is actually shipped in.
 */
const DENSITIES = (() => {
  const found = [...new Set(decomment(CSS).match(/ui-table--(?:dense|compact|zebra)/g) ?? [])].sort();
  assert.deepEqual(
    found, ['ui-table--compact', 'ui-table--dense', 'ui-table--zebra'],
    'the density modifiers this gate composes against are no longer the ones table.css carries',
  );
  return ['', ...found];
})();

const RECIPES = DENSITIES.flatMap((density) => [false, true].map((pinned) => ({
  pinned,
  classes: ['ui-table', 'ui-table--hover', 'ui-table--stack', density,
    ...(pinned ? ['ui-table--sticky', 'ui-table--pinned'] : [])].filter(Boolean).join(' '),
})));

const MARKUP = RECIPES.map(({ classes, pinned }, i) => `
  <table class="${classes}" role="table" data-recipe="${i}">
    <thead role="rowgroup"><tr role="row">
      <th scope="col" role="columnheader">Who</th><th scope="col" role="columnheader">Title</th>
      <th scope="col" role="columnheader" class="ui-table__num">Num</th>
      <th scope="col" role="columnheader">Change</th>
    </tr></thead>
    <tbody role="rowgroup"><tr role="row">
      <td role="cell" class="${pinned ? 'ui-table__identity' : ''}" data-cell="identity">who</td>
      <td role="cell" class="ui-table__title" data-cell="title">title</td>
      <td role="cell" class="ui-table__num" data-cell="num">1.00</td>
      <td role="cell" class="ui-table__long" data-cell="long">a sentence that runs on</td>
    </tr></tbody>
  </table>`).join('');

/** Every recipe's parts, resolved from one stylesheet at one width. */
function resolve(css, width) {
  const win = new JSDOM(`<style>${sheetAt(css, width)}</style>${MARKUP}`).window;
  const at = (el, prop) => win.getComputedStyle(el).getPropertyValue(prop);
  const out = RECIPES.map((recipe, i) => {
    const table = win.document.querySelector(`[data-recipe="${i}"]`);
    const head = table.tHead;
    const body = table.tBodies[0];
    const cell = (name) => table.querySelector(`[data-cell="${name}"]`);
    const parts = (el, props) => Object.fromEntries(props.map((p) => [p, at(el, p)]));
    return {
      recipe,
      table: parts(table, ['display', 'min-width']),
      head: parts(head, ['display', 'position', 'clip-path', 'height']),
      body: parts(body, ['display']),
      row: parts(body.rows[0], ['display', 'flex-wrap', 'padding-top', 'padding-right',
        'padding-bottom', 'padding-left', 'column-gap', 'row-gap']),
      cells: Object.fromEntries(['identity', 'title', 'num', 'long'].map((name) =>
        [name, parts(cell(name), ['display', 'white-space', 'position', 'padding-left', 'width', 'flex-basis', 'height'])])),
    };
  });
  win.close();
  return out;
}

/* What this gate cannot see; the #499 captures at 390px cover it instead:
 *   - JSDOM does no layout, so nothing here proves a row fits 390px without scrolling.
 *   - `substitute` resolves spacing tokens but not colour ones, so cssstyle drops a
 *     shorthand carrying `var(--border)`: no paint and no row separator is measured.
 *   - A clipped `thead` keeping any `display` but `none` is what leaves the header in the
 *     accessibility tree. Whether a screen reader reads it is not JSDOM's to say.
 */

/* -- The rule --------------------------------------------------------------- */

/** Everything a stacked row has to be, as lines a reader can act on. */
function stackedProblems({ recipe, table, head, body, row, cells }) {
  const say = (s) => `${recipe.classes}: ${s}`;
  const problems = [];

  if (table.display !== 'block') problems.push(say(`the table is ${table.display}, not a block`));
  if (table['min-width'] !== '0px') problems.push(say(`the table keeps min-width ${table['min-width']}`));
  if (body.display !== 'block') problems.push(say(`the row group is ${body.display}, not a block`));
  if (row.display !== 'flex') problems.push(say(`the row is ${row.display}, so its cells still make columns`));
  if (row['flex-wrap'] !== 'wrap') problems.push(say(`the row is ${row['flex-wrap']}, so the long cell cannot take a line`));

  /* Every gap the row draws, against the step it owes. The hover outline draws at the row's
   * own edge, so the row — not the table — carries the inset, or the outline lands hard
   * against the text on both sides (#71); "some inset" was what this asked for until r31,
   * and it passed the row at a step narrower than the same table's above the fold. */
  for (const [prop, token] of Object.entries(GAPS)) {
    if (row[prop] !== step(token)) {
      problems.push(say(`the row's ${prop} is ${row[prop] || '(unset)'}, not ${token} (${step(token)})`));
    }
  }
  // Inside a row has to stay tighter than between two rows, or the paragraph reads as the
  // next entry. Compared rather than asserted: the step between rows is two paddings and a
  // rule, so it is a sum and not itself a token.
  if (Number.parseFloat(row['row-gap']) >= 2 * Number.parseFloat(row['padding-top'])) {
    problems.push(say(
      `the row's gaps (${row['row-gap']}) are no tighter than the step between two rows `
      + `(2 × ${row['padding-top']}), so the paragraph reads as the next row`,
    ));
  }

  // The header has no column to sit over, and a cell still has to read with its column's
  // name — so it is clipped out of the picture and left in the accessibility tree.
  if (head.display === 'none') problems.push(say('the header row is display:none, which takes it out of the accessibility tree too'));
  if (head.position !== 'absolute') problems.push(say(`the header row is ${head.position}, so it still takes room`));
  if (head['clip-path'] !== 'inset(50%)') problems.push(say(`the header row is not clipped: clip-path ${head['clip-path']}`));
  if (head.height !== '1px') problems.push(say(`the clipped header row is ${head.height} tall`));

  for (const [name, cell] of Object.entries(cells)) {
    if (cell['white-space'] !== 'normal') {
      problems.push(say(`the ${name} cell keeps white-space: ${cell['white-space']} — a stacked cell wraps`));
    }
    if (cell.display !== 'block') problems.push(say(`the ${name} cell is ${cell.display}, not a block`));
    if (cell['padding-left'] !== '0px') problems.push(say(`the ${name} cell keeps the column inset ${cell['padding-left']}`));
    /* A block cell reads --compact's row height as a fixed height, not a floor, so a
     * wrapped paragraph spills through the separator and lands on the next row (#532's
     * re-review measured 71.56px of text in a 33px cell). The text's own height is in
     * Chromium's half of this, which lays the lines out; this says the cap is gone. */
    if (cell.height !== 'auto') {
      problems.push(say(`the ${name} cell is capped at ${cell.height} — a stacked cell is as tall as its text`));
    }
  }
  if (cells.title.width !== 'auto') {
    problems.push(say(`the title cell keeps width ${cells.title.width}, which has no column to be a share of`));
  }
  if (cells.long['flex-basis'] !== '100%') {
    problems.push(say(`the long cell is ${cells.long['flex-basis']} wide, so it shares the first line`));
  }
  if (recipe.pinned && cells.identity.position !== 'static') {
    problems.push(say(`the identity cell is still ${cells.identity.position} — there is no column left to pin`));
  }
  return problems;
}

test('every stack recipe lays its row out as a block below the one-column step', () => {
  const resolved = resolve(CSS, PHONE);
  assert.equal(resolved.length, RECIPES.length, 'every composed recipe must be measured');
  assert.ok(RECIPES.length >= 8,
    `only ${RECIPES.length} recipes composed — the sweep has stopped covering the densities`);
  assert.deepStrictEqual(resolved.flatMap(stackedProblems), []);
});

test('the modifier does nothing above the one-column step', () => {
  const problems = [];
  for (const { recipe, table, head, row, cells } of resolve(CSS, DESKTOP)) {
    const say = (s) => `${recipe.classes}: ${s} at ${DESKTOP}px`;
    if (table.display !== 'table') problems.push(say(`the table is ${table.display}`));
    if (row.display !== 'table-row') problems.push(say(`the row is ${row.display}`));
    if (head.position !== 'static') problems.push(say(`the header row is ${head.position}`));
    if (cells.long['flex-basis'] !== 'auto') problems.push(say(`the long cell is ${cells.long['flex-basis']} wide`));
    // `__title` keeps the column it has always taken; only a stacked row takes it away.
    if (cells.title.width !== '99%') problems.push(say(`the title cell is ${cells.title.width}`));
    // The height reset belongs to the stacked row alone: a compact desktop table keeps the
    // row height it ships with, and a table that was never compact never had one.
    const wants = recipe.classes.includes('ui-table--compact') ? '33px' : 'auto';
    if (cells.num.height !== wants) problems.push(say(`the num cell is ${cells.num.height} tall, not ${wants}`));
  }
  assert.deepStrictEqual(problems, []);
});

/* -- The gate's own gate ---------------------------------------------------- */

// Each mutation is a way the rule would be got wrong by someone tidying the stylesheet.
// The first is the one that matters: it is the shape the rule would have been written in
// without the specificity note above, and it fails only because the cascade is resolved.
const MUTATIONS = [
  ['the cell rules written with one class, so --dense and __title outrank them',
    (css) => css.replaceAll('.ui-table.ui-table--stack > tbody > tr > td', '.ui-table--stack td')],
  ['the header row removed instead of clipped',
    (css) => css.replace('.ui-table.ui-table--stack > thead {\n    position: absolute;',
      '.ui-table.ui-table--stack > thead {\n    display: none; position: absolute;')],
  ['the long cell left to share the first line',
    (css) => css.replace('td.ui-table__long { flex: 0 0 100%;', 'td.ui-table__long { flex: 0 1 auto;')],
  ['the row inset put back on the table, where the hover outline cannot use it',
    (css) => css.replace('padding: var(--space-3); border-bottom:',
      'padding: var(--space-3) 0; border-bottom:')],
  ['the row inset taken a step in, so the outline loses the clearance it had above the fold',
    (css) => css.replace('padding: var(--space-3); border-bottom:',
      'padding: var(--space-3) var(--space-2); border-bottom:')],
  ['the gaps written as numbers off the scale',
    (css) => css.replace('column-gap: var(--space-3); row-gap: var(--space-1);',
      'column-gap: 10px; row-gap: 5px;')],
  ['the paragraph given the step between two rows, so it reads as the next entry',
    (css) => css.replace('row-gap: var(--space-1);', 'row-gap: var(--space-6);')],
  ['the row left as a table row',
    (css) => css.replace('> tbody > tr {\n    display: flex;', '> tbody > tr {\n    display: table-row;')],
  ['the compact row height left on a stacked cell, where it caps a wrapped paragraph',
    (css) => css.replace('max-width: 100%; height: auto;', 'max-width: 100%;')],
  ['the stacked block moved to a step that is not the one-column one',
    (css) => css.replace('@media (max-width: 560px) {\n  .ui-table.ui-table--stack {',
      '@media (max-width: 360px) {\n  .ui-table.ui-table--stack {')],
];

// JSDOM lays nothing out, so the scroll-wrapper bleed is held as a declaration and measured
// in Chromium instead (the #499 round-3 captures). Without it the card's own
// `:has(> .ui-table--dense)` rule bleeds the wrapper a step too far and the stacked text
// drifts 4px off the card's text edge, which is how the re-review found it.
const wrapperBleed = (css) =>
  /\.ui-card > \.ui-table-scroll:has\(> \.ui-table--stack\)\s*\{([^}]*)\}/.exec(decomment(css))?.[1] ?? null;

test('a stacked table in a scroll wrapper is bled by the step the row pays back', () => {
  const rule = wrapperBleed(CSS);
  assert.ok(rule, 'no stacked scroll-wrapper rule: a stacked log inside a scroll region drifts');
  assert.match(rule, /margin-inline:\s*calc\(-1 \* var\(--space-4\)\)/,
    "the wrapper owes the row's --space-3 plus its own --space-1 of focus clearance");

  /* Deleting it is the shape the r3 re-review measured. It now asks for the same step as
   * main's `:has(> .ui-table--dense)` rule, so a dense stacked table would survive the
   * deletion; a stacked table that is not dense gets no bleed from that rule at all, which
   * is what this one is here for, and the mutation below is still rejected. */
  assert.equal(
    wrapperBleed(CSS.replace(/\.ui-card > \.ui-table-scroll:has\(> \.ui-table--stack\)\s*\{[^}]*\}/, '')),
    null,
    'removing the rule must be rejected',
  );
});

test('the gate rejects every way the stacked row has to be got wrong', () => {
  const survived = [];
  for (const [what, mutate] of MUTATIONS) {
    const mutated = mutate(CSS);
    assert.notEqual(mutated, CSS,
      `the mutation "${what}" no longer matches table.css, so it proves nothing`);
    if (resolve(mutated, PHONE).flatMap(stackedProblems).length === 0) survived.push(what);
  }
  assert.deepStrictEqual(survived, [], 'a mutation passed this gate unnoticed');
});
