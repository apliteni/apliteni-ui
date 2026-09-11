/* Rule: each rank in docs/specification.md#labels-and-titles is held by the rules
 * that claim it with a `/* rank: label *​/` note, and the ranks keep their order.
 *
 * What it does not reach:
 * - a caption or a title written without a note. Nothing here decides from a
 *   selector that a rule is a label, so such a rule is outside the ranks.
 * - a later rule that re-sizes a noted one, like the page title's 25px step
 *   below 720px in layout.css. Overrides are not followed.
 * - a consumer's own scale. This reads the kit's tokens and nobody else's.
 *
 * why: docs/specification.md#labels-and-titles
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { kitSheetNames } from '../../scripts/lib/icon-cascade.js';
import { card } from '../components/index.js';

const src = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = path.resolve(src, '..');
const SPEC = readFileSync(path.join(root, 'docs/specification.md'), 'utf8');
const TOKENS = readFileSync(path.join(src, 'tokens/tokens.css'), 'utf8');
const SHEETS = kitSheetNames(src).map((rel) => ({ rel, css: readFileSync(path.join(src, rel), 'utf8') }));

/** The rank table under "## Labels and titles", top row first. */
const readRanks = (spec) => {
  const section = spec.split(/^## /m).find((s) => s.startsWith('Labels and titles'));
  assert.ok(section, 'docs/specification.md has no "## Labels and titles" section to read the ranks from');
  return [...section.matchAll(/^\|\s*`([a-z-]+)`\s*\|\s*`(--[\w-]+)`\s*\|\s*`(--[\w-]+)`\s*\|\s*([^|]+?)\s*\|/gm)]
    .map(([, name, size, weight, leading]) => ({
      name, size, weight, leading: leading === 'inherited' ? null : leading.replace(/`/g, ''),
    }));
};

const asDecl = (v) => (v.startsWith('--') ? `var(${v})` : v);
const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '');

/** Every rule carrying a rank note, with the declarations its block holds. */
const notedRules = (sheets) => sheets.flatMap(({ rel, css }) => [...css.matchAll(/\/\*\s*rank:\s*([\w-]+)\s*\*\//g)]
  .map((m) => {
    const where = `src/${rel}:${css.slice(0, m.index).split('\n').length}`;
    const open = css.lastIndexOf('{', m.index);
    const end = css.indexOf('}', m.index);
    if (open < 0 || end < 0 || css.lastIndexOf('}', m.index) > open) return { where, rank: m[1], outside: true };
    const decls = {};
    for (const d of stripComments(css.slice(open + 1, end)).split(';')) {
      const at = d.indexOf(':');
      if (at > 0) decls[d.slice(0, at).trim().toLowerCase()] = d.slice(at + 1).trim().replace(/\s+/g, ' ');
    }
    const selector = stripComments(css.slice(css.lastIndexOf('}', open) + 1, open)).trim();
    return { where, rank: m[1], selector, decls };
  }));

const rankProblems = (ranks, rules) => {
  const byName = new Map(ranks.map((r) => [r.name, r]));
  const out = [];
  for (const r of rules) {
    if (r.outside) {
      out.push(`${r.where} carries a rank note outside any rule. Put it inside the block it describes.`);
      continue;
    }
    const rank = byName.get(r.rank);
    if (!rank) {
      out.push(`${r.where} \`${r.selector}\` claims rank "${r.rank}", which is not a row of the table in `
        + `docs/specification.md#labels-and-titles (${[...byName.keys()].join(', ')}).`);
      continue;
    }
    const want = { 'font-size': asDecl(rank.size), 'font-weight': asDecl(rank.weight) };
    if (rank.leading) want['line-height'] = asDecl(rank.leading);
    for (const [prop, value] of Object.entries(want)) {
      if (r.decls[prop] !== value) {
        out.push(`${r.where} \`${r.selector}\` is rank ${rank.name}, whose ${prop} is ${value}; `
          + `the rule has ${r.decls[prop] ?? 'none'}.`);
      }
    }
    if (!rank.leading && 'line-height' in r.decls) {
      out.push(`${r.where} \`${r.selector}\` is rank ${rank.name}, which inherits its line-height; `
        + `the rule sets ${r.decls['line-height']}.`);
    }
  }
  return out;
};

const px = (tokens, name) => {
  const m = new RegExp(`${name}\\s*:\\s*([\\d.]+)px`).exec(tokens);
  assert.ok(m, `${name} is not a px value in src/tokens/tokens.css`);
  return Number(m[1]);
};

const orderProblems = (ranks, tokens) => ranks.slice(1).flatMap((r, i) => {
  const above = ranks[i];
  return px(tokens, r.size) < px(tokens, above.size) ? [] : [
    `${r.name} (${r.size}, ${px(tokens, r.size)}px) is not smaller than ${above.name} `
    + `(${above.size}, ${px(tokens, above.size)}px) above it.`,
  ];
});

const RANKS = readRanks(SPEC);
const RULES = notedRules(SHEETS);

/* The real count. Was 14 at #268: body, page-title and card-title once each,
 * seven labels (eyebrow, table head, nav caption, menu group, footer column
 * title, code sample label, confirmation eyebrow) and four chips (badge, pill,
 * menu row badge, version badge). Move it in the commit that adds or drops a
 * note, and say which. */
const EXPECTED_NOTES = 14;

test('the table has its five ranks and every one is taken', () => {
  assert.deepEqual(RANKS.map((r) => r.name), ['page-title', 'card-title', 'body', 'label', 'chip']);
  for (const r of RANKS) {
    assert.ok(RULES.some((n) => n.rank === r.name),
      `no rule in the kit claims rank ${r.name}. A rank nobody takes is a row the table has outgrown.`);
  }
  assert.equal(RULES.length, EXPECTED_NOTES,
    `found ${RULES.length} rank notes, expected ${EXPECTED_NOTES}: ${RULES.map((r) => r.where).join(', ')}`);
});

test('every rule that claims a rank sets that rank’s size, weight and line-height', () => {
  assert.deepEqual(rankProblems(RANKS, RULES), []);
});

test('each rank is smaller than the one above it', () => {
  assert.deepEqual(orderProblems(RANKS, TOKENS), []);
});

test('a card title is a heading one level under the page title', () => {
  assert.match(card({ title: 'Payouts' }), /^<div class="ui-card"><h2 class="ui-card__title">Payouts<\/h2>/);
  assert.match(card({ title: 'Payouts', level: 3 }), /<h3 class="ui-card__title">Payouts<\/h3>/);
  assert.match(card({ title: 'Payouts', level: 1 }), /<h2 class="ui-card__title">/,
    'level 1 is the page title’s, so a card falls back to h2 rather than competing with it');
  assert.doesNotMatch(card({ body: '<p>x</p>' }), /<h\d/);
});

/* -- The mutations that kill each case ---------------------------------------- */

const mutate = (rel, from, to) => SHEETS.map((s) => {
  if (s.rel !== rel) return s;
  const css = s.css.replace(from, to);
  assert.notEqual(css, s.css, `the mutation of ${rel} did not land — the rule moved, so move the mutation`);
  return { ...s, css };
});

test('a table head moved back to the chip size is caught', () => {
  const got = rankProblems(RANKS, notedRules(mutate('styles/table.css',
    /(\/\* rank: label \*\/\s*font-size:\s*)var\(--text-sm\)/, '$1var(--text-xs)')));
  assert.equal(got.length, 1, got.join('\n'));
  assert.match(got[0], /table\.css:\d+ `\.ui-table th` is rank label, whose font-size is var\(--text-sm\)/);
});

test('a card title set at body leading is caught', () => {
  const got = rankProblems(RANKS, notedRules(mutate('styles/card.css',
    'line-height: var(--leading-snug);', 'line-height: var(--leading-normal);')));
  assert.equal(got.length, 1, got.join('\n'));
  assert.match(got[0], /card\.css:\d+ `\.ui-card__title` is rank card-title, whose line-height/);
});

test('a note naming a rank the table lacks is caught', () => {
  const got = rankProblems(RANKS, notedRules(mutate('styles/base.css', '/* rank: label */', '/* rank: caption */')));
  assert.equal(got.length, 1, got.join('\n'));
  assert.match(got[0], /claims rank "caption"/);
});

test('a card title token moved under the body size breaks the order', () => {
  const got = orderProblems(RANKS, TOKENS.replace(/--text-lg:\s*18px/, '--text-lg: 14px'));
  assert.ok(got.some((p) => /^body .* is not smaller than card-title/.test(p)), got.join('\n'));
});
