/* Rule: each rank in docs/specification.md#labels-and-titles is held by the rules
 * that claim it with a `/* rank: label *​/` note, and the ranks keep their order.
 *
 * What it does not reach:
 * - a label or a caption written without a note. Nothing here decides from a
 *   selector what rank a rule is, so such a rule is outside the ranks.
 * - a later rule that re-sizes a noted one, like the page title's 25px step
 *   below 720px in layout.css. Overrides are not followed.
 * - a consumer's own scale. This reads the kit's tokens and nobody else's.
 *
 * why: docs/specification.md#labels-and-titles
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { kitSheetNames, walk } from '../../scripts/lib/icon-cascade.js';
import { card } from '../components/index.js';

const src = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = path.resolve(src, '..');
const SPEC = readFileSync(path.join(root, 'docs/specification.md'), 'utf8');
const TOKENS = readFileSync(path.join(src, 'tokens/tokens.css'), 'utf8');

/* The subjects: the sheets the kit ships, in import order, and then every other
 * file this repo draws with. A guideline page writes its CSS in a template
 * literal, and a rank note there is the same claim a stylesheet makes — #310 put
 * the first one on a story. `docs` is in the list for the review prototypes
 * under docs/reviews/, which draw their screenshots in the kit's own faces and
 * are subjects of scripts/font-loading.test.js for that reason. A gate's own
 * file is skipped: the notes in the mutations below are strings, not rules
 * anybody renders.
 * why: CONTRIBUTING.md#a-gate-discovers-its-subjects-and-never-enumerates-them */
const DRAWN_IN = ['stories', 'site', 'docs', 'react/src', '.storybook'];
const READ = /\.(?:css|m?js|jsx|tsx?|html)$/;
const SHEETS = [
  ...kitSheetNames(src).map((rel) => ({ rel: `src/${rel}`, css: readFileSync(path.join(src, rel), 'utf8') })),
  ...DRAWN_IN.map((dir) => path.join(root, dir)).filter(existsSync).flatMap((dir) => walk(dir)
    .filter((f) => READ.test(f) && !/\.test\.[a-z]+$/.test(f))
    .map((f) => ({ rel: path.relative(root, f), css: readFileSync(f, 'utf8') }))),
];

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
const blankComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));

/** Every rule carrying a rank note, with the declarations its block holds. A note
 *  is read in any case and with anything after the name, so a misspelt one is a
 *  finding rather than a rule that left the ranks. Braces are found with comments
 *  blanked, so a `{}` in a comment cannot end a block. */
const notedRules = (sheets) => sheets.flatMap(({ rel, css }) => {
  const text = blankComments(css);
  return [...css.matchAll(/\/\*\s*rank\s*:\s*([^*]*?)\s*\*\//gi)].map((m) => {
    const where = `${rel}:${css.slice(0, m.index).split('\n').length}`;
    const open = text.lastIndexOf('{', m.index);
    const end = text.indexOf('}', m.index);
    if (open < 0 || end < 0 || text.lastIndexOf('}', m.index) > open) return { where, rank: m[1], outside: true };
    const decls = {};
    for (const d of text.slice(open + 1, end).split(';')) {
      const at = d.indexOf(':');
      if (at > 0) decls[d.slice(0, at).trim().toLowerCase()] = d.slice(at + 1).trim().replace(/\s+/g, ' ');
    }
    const selector = text.slice(text.lastIndexOf('}', open) + 1, open).trim();
    return { where, rank: m[1], selector, decls };
  });
});

// A ranked rule tightens its letters or leaves them alone; spacing them out is
// what capitals needed, and the capitals are gone.
const NOT_SPACED = /^(?:0|normal|-[\d.]+[a-z]*|var\(--tracking-(?:tight|normal)\))$/;

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
    if ('font' in r.decls) {
      out.push(`${r.where} \`${r.selector}\` writes the font shorthand, which can carry a size, weight and `
        + 'line-height this gate does not read. Write the longhands.');
    }
    if ('letter-spacing' in r.decls && !NOT_SPACED.test(r.decls['letter-spacing'])) {
      out.push(`${r.where} \`${r.selector}\` spaces its letters out (${r.decls['letter-spacing']}); that was `
        + 'for capitals, and a ranked rule sets none.');
    }
    const want = { 'font-size': asDecl(rank.size), 'font-weight': asDecl(rank.weight) };
    if (rank.leading) want['line-height'] = asDecl(rank.leading);
    for (const [prop, value] of Object.entries(want)) {
      if (r.decls[prop] !== value) {
        out.push(`${r.where} \`${r.selector}\` is rank ${rank.name}, whose ${prop} is ${value}; `
          + `the rule has ${r.decls[prop] ?? 'none'}.`);
      }
    }
    // `inherit` is the one line-height a rank that inherits one may write, and a
    // restated selector needs it: an earlier rule for the same element can have
    // pinned a number, and omitting the property does not take that back.
    if (!rank.leading && 'line-height' in r.decls && r.decls['line-height'] !== 'inherit') {
      out.push(`${r.where} \`${r.selector}\` is rank ${rank.name}, which inherits its line-height; `
        + `the rule sets ${r.decls['line-height']}. Write \`inherit\` or nothing.`);
    }
  }
  return out;
};

const px = (tokens, name) => {
  const m = new RegExp(`${name}\\s*:\\s*([\\d.]+)px`).exec(tokens);
  assert.ok(m, `${name} is not a px value in src/tokens/tokens.css`);
  return Number(m[1]);
};

const weight = (tokens, name) => {
  const m = new RegExp(`${name}\\s*:\\s*(\\d+)`).exec(tokens);
  assert.ok(m, `${name} is not a number in src/tokens/tokens.css`);
  return Number(m[1]);
};

// A rank is under the one above it by size, or — where two share a size — by
// weight. `label` and `caption` are both 13px and only the weight separates them.
const orderProblems = (ranks, tokens) => ranks.slice(1).flatMap((r, i) => {
  const above = ranks[i];
  const [size, over] = [px(tokens, r.size), px(tokens, above.size)];
  if (size < over) return [];
  if (size > over) {
    return [`${r.name} (${r.size}, ${size}px) is not smaller than ${above.name} `
      + `(${above.size}, ${over}px) above it.`];
  }
  const [light, heavy] = [weight(tokens, r.weight), weight(tokens, above.weight)];
  return light < heavy ? [] : [
    `${r.name} shares ${above.name}'s ${size}px and is not lighter than it `
    + `(${r.weight}, ${light} against ${above.weight}, ${heavy}).`,
  ];
});

const RANKS = readRanks(SPEC);
const RULES = notedRules(SHEETS);

/* The real count. Was 14 at #268: body, page-title and card-title once each,
 * seven labels (eyebrow, table head, nav caption, menu group, footer column
 * title, code sample label, confirmation eyebrow) and four chips (badge, pill,
 * menu row badge, version badge). 15 at #310, which added the caption on
 * Guidelines / The page — the first note outside the kit's own sheets. Move it
 * in the commit that adds or drops a note, and say which. */
const EXPECTED_NOTES = 15;

test('the table has its six ranks and every one is taken', () => {
  assert.deepEqual(RANKS.map((r) => r.name),
    ['page-title', 'card-title', 'body', 'label', 'caption', 'chip']);
  for (const r of RANKS) {
    assert.ok(RULES.some((n) => n.rank === r.name),
      `no rule claims rank ${r.name}. A rank nobody takes is a row the table has outgrown.`);
  }
  assert.equal(RULES.length, EXPECTED_NOTES,
    `found ${RULES.length} rank notes, expected ${EXPECTED_NOTES}: ${RULES.map((r) => r.where).join(', ')}`);
});

test('every rule that claims a rank sets that rank’s size, weight and line-height', () => {
  assert.deepEqual(rankProblems(RANKS, RULES), []);
});

test('each rank is under the one above it', () => {
  assert.deepEqual(orderProblems(RANKS, TOKENS), []);
});

test('a card title is a heading one level under the page title', () => {
  assert.match(card({ title: 'Payouts' }), /^<div class="ui-card"><h2 class="ui-card__title">Payouts<\/h2>/);
  assert.match(card({ title: 'Payouts', level: 3 }), /<h3 class="ui-card__title">Payouts<\/h3>/);
  assert.match(card({ title: 'Payouts', level: 6 }), /<h6 class="ui-card__title">Payouts<\/h6>/);
  assert.match(card({ title: 'Payouts', level: '3' }), /<h3 class="ui-card__title">/);
  assert.match(card({ title: 'Payouts', level: 7 }), /<h2 class="ui-card__title">/);
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
  const got = rankProblems(RANKS, notedRules(mutate('src/styles/table.css',
    /(\/\* rank: label \*\/\s*font-size:\s*)var\(--text-sm\)/, '$1var(--text-xs)')));
  assert.equal(got.length, 1, got.join('\n'));
  assert.match(got[0], /table\.css:\d+ `\.ui-table th` is rank label, whose font-size is var\(--text-sm\)/);
});

test('a card title set at body leading is caught', () => {
  const got = rankProblems(RANKS, notedRules(mutate('src/styles/card.css',
    'line-height: var(--leading-snug);', 'line-height: var(--leading-normal);')));
  assert.equal(got.length, 1, got.join('\n'));
  assert.match(got[0], /card\.css:\d+ `\.ui-card__title` is rank card-title, whose line-height/);
});

test('a note naming a rank the table lacks is caught', () => {
  const got = rankProblems(RANKS, notedRules(mutate('src/styles/base.css', '/* rank: label */', '/* rank: footnote */')));
  assert.equal(got.length, 1, got.join('\n'));
  assert.match(got[0], /claims rank "footnote"/);
});

test('a font shorthand in a ranked rule is refused', () => {
  const got = rankProblems(RANKS, notedRules(mutate('src/styles/badge.css',
    'font-weight: var(--weight-semibold);\n', 'font-weight: var(--weight-semibold);\n  font: 700 10px/1 var(--font-sans);\n')));
  assert.ok(got.some((p) => /badge\.css:\d+ `\.ui-badge` writes the font shorthand/.test(p)), got.join('\n'));
});

test('the capitals’ letter-spacing put back on the badge is caught', () => {
  const got = rankProblems(RANKS, notedRules(mutate('src/styles/badge.css',
    'font-weight: var(--weight-semibold);\n', 'font-weight: var(--weight-semibold);\n  letter-spacing: 0.12em;\n')));
  assert.equal(got.length, 1, got.join('\n'));
  assert.match(got[0], /`\.ui-badge` spaces its letters out \(0\.12em\)/);
});

test('a misspelt note is a finding, not a rule that left the ranks', () => {
  const got = rankProblems(RANKS, notedRules(mutate('src/styles/base.css', '/* rank: label */', '/* Rank: label, see spec */')));
  assert.equal(got.length, 1, got.join('\n'));
  assert.match(got[0], /claims rank "label, see spec"/);
});

test('braces in a comment do not end the block early', () => {
  const got = rankProblems(RANKS, notedRules(mutate('src/styles/table.css',
    /(\/\* rank: label \*\/\n)(\s*font-size:\s*)var\(--text-sm\)/, '$1  /* like .y {} */\n$2var(--text-xs)')));
  assert.equal(got.length, 1, got.join('\n'));
  assert.match(got[0], /`\.ui-table th` is rank label, whose font-size is var\(--text-sm\); the rule has var\(--text-xs\)/);
});

test('a caption at the label’s weight has nothing left to hold it under the label', () => {
  const got = orderProblems(RANKS.map((r) => (r.name === 'caption' ? { ...r, weight: '--weight-medium' } : r)), TOKENS);
  assert.equal(got.length, 1, got.join('\n'));
  assert.match(got[0], /caption shares label's 13px and is not lighter than it/);
});

test('a number where a rank inherits its leading is caught, and `inherit` is not', () => {
  const pinned = rankProblems(RANKS, notedRules(mutate('stories/guidelines/_the-page.js',
    'line-height: inherit;', 'line-height: 1.55;')));
  assert.equal(pinned.length, 1, pinned.join('\n'));
  assert.match(pinned[0], /`\.gc-cell__cap` is rank caption, which inherits its line-height; the rule sets 1\.55/);
  assert.deepEqual(rankProblems(RANKS, RULES), [], 'the rule as written says `inherit`, which is allowed');
});

test('a card title token moved under the body size breaks the order', () => {
  const got = orderProblems(RANKS, TOKENS.replace(/--text-lg:\s*18px/, '--text-lg: 14px'));
  assert.ok(got.some((p) => /^body .* is not smaller than card-title/.test(p)), got.join('\n'));
});
