/* Rule: the table's row rhythm is steps of the spacing scale. Every padding,
 * margin and gap in the table's sheet is either 0 or a --space-* step, base
 * rhythm and --dense modifier alike.
 *
 * Scope is ONE SHEET, and that is the rule's scope rather than a shortcut: the
 * table is the component the kit hands a density modifier. Widening to the rest
 * of src/styles is ~160 declarations of argument about which are rhythm and
 * which are a component's own interior; that argument is not this gate's.
 *
 * The steps are read out of tokens.css, never repeated here.
 *
 * why: docs/specification.md#spacing-and-rhythm
 * why: CONTRIBUTING.md#a-gate-discovers-its-subjects-and-never-enumerates-them
 * why: CONTRIBUTING.md#a-rule-is-proven-by-the-mutation-that-kills-its-case
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const read = (rel) => readFileSync(path.join(root, rel), 'utf8');

/** Blank out comments, keeping newlines so line numbers stay true. */
const decomment = (css) => css.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));

const DECL = /(?:^|[;{}])\s*(--[\w-]+|-?[a-zA-Z][\w-]*)\s*:\s*([^;{}]*)/g;
const PX = /(\d+(?:\.\d+)?)px/g;

/** The properties that space a box. A rhythm is written in these and nowhere else. */
const SPACING_PROP = /^(padding|margin|gap|row-gap|column-gap)(-|$)/;

/* -- The scale, read from the tokens rather than repeated ------------------- */

const TOKENS = 'src/tokens/tokens.css';
const SHEET = 'src/styles/table.css';

const SPACE = [...decomment(read(TOKENS))
  .matchAll(/--(space-[\w-]+):\s*(\d+(?:\.\d+)?)px\s*;/g)]
  .map((m) => ({ name: `--${m[1]}`, value: Number(m[2]) }))
  .sort((a, b) => a.value - b.value);

assert.ok(
  SPACE.length > 0,
  `${TOKENS} declares no --space-* step in px, and that scale is the whole of this rule. `
  + 'Rename it and the gate would pass over an empty set, so it fails here instead.',
);

const stepFor = (n) => SPACE.find((s) => s.value === n);

/** The nearest step, or both of them when the number sits exactly between two. */
const nearest = (n) => {
  const best = Math.min(...SPACE.map((s) => Math.abs(s.value - n)));
  return SPACE.filter((s) => Math.abs(s.value - n) === best)
    .map((s) => `${s.name} (${s.value}px)`).join(' or ');
};

/* -- The subjects, swept rather than listed --------------------------------- */

/** Every box-spacing declaration in a sheet, with the line it sits on. */
export const spacingDecls = (raw) => {
  const css = decomment(raw);
  const found = [];
  for (const m of css.matchAll(DECL)) {
    const [, prop, value] = m;
    if (!SPACING_PROP.test(prop)) continue;
    found.push({
      line: css.slice(0, m.index + m[0].indexOf(prop)).split('\n').length,
      prop,
      value: value.trim(),
    });
  }
  return found;
};

/** The px literals in a declaration's value. A step is written as var(--space-N). */
export const literals = (value) => [...value.matchAll(PX)].map((m) => Number(m[1]));

const subjects = () => spacingDecls(read(SHEET));

/* -- The rule --------------------------------------------------------------- */

test('the table writes no row rhythm as a literal', () => {
  const offences = subjects()
    .filter((s) => literals(s.value).length > 0)
    .map((s) => `${SHEET}:${s.line}  ${s.prop}: ${s.value}`
      + `  → ${literals(s.value).map((n) => `${n}px is ${nearest(n)}`).join(', ')}`);

  assert.deepStrictEqual(
    offences,
    [],
    'a row rhythm is written out as a literal.\n'
    + `  The steps are ${SPACE.map((s) => `${s.name} (${s.value}px)`).join(', ')}, in ${TOKENS}.\n`
    + '  Take the nearest step; where a number sits exactly between two, the tie goes to what\n'
    + '  the value is for — --dense rounds down because it exists to fit more rows, an inset\n'
    + '  rounds up because it exists to clear an edge. Say which, in the sheet:\n  '
    + offences.join('\n  '),
  );
});

test('every step the table names is a step that exists', () => {
  const named = [...read(SHEET).matchAll(/var\(\s*(--space-[\w-]+)\s*\)/g)].map((m) => m[1]);
  const unknown = [...new Set(named)].filter((n) => !SPACE.some((s) => s.name === n));

  assert.deepStrictEqual(
    unknown,
    [],
    `${SHEET} reads a spacing token that ${TOKENS} does not declare. An unresolved var() `
    + 'computes to nothing and the padding silently disappears, which no rule above would see.',
  );
});

/* -- The tie-break, held rather than argued for ----------------------------- */

/** The `padding` of one rule block, as four numbers, with every step resolved. */
const paddingOf = (raw, selector) => {
  const css = decomment(raw);
  const block = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .find((m) => m[1].split(',').some((s) => s.trim() === selector));
  if (!block) return null;
  const decl = [...block[2].matchAll(DECL)].reverse().find((m) => m[1] === 'padding');
  if (!decl) return null;

  const parts = decl[2].trim().split(/\s+(?![^(]*\))/).map((p) => {
    if (p === '0') return 0;
    const tok = /^var\(\s*(--[\w-]+)\s*\)$/.exec(p);
    const step = tok && SPACE.find((s) => s.name === tok[1]);
    return step ? step.value : Number(/^(\d+(?:\.\d+)?)px$/.exec(p)?.[1] ?? NaN);
  });
  const [t, r = t, b = t, l = r] = parts;
  return { top: t, right: r, bottom: b, left: l };
};

// The tie-break in the sheet — 14px down to 12, 10px down to 8 — is only right
// if the modifier stays visibly tighter than the rhythm it modifies. Rounding a
// tie up would have left --dense one step from base and nothing here would have
// noticed, because the rule above only ever objects to literals.
test('the dense rhythm is tighter than the base rhythm it modifies', () => {
  const css = read(SHEET);
  const base = paddingOf(css, '.ui-table td');
  const dense = paddingOf(css, '.ui-table--dense td');

  assert.ok(base && dense, `${SHEET} no longer states a padding for both \`.ui-table td\` and `
    + '`.ui-table--dense td`. Those two are what "dense" means here; if the sheet says it another '
    + 'way now, this comparison has to be restated rather than deleted.');

  assert.ok(
    dense.top < base.top && dense.bottom < base.bottom,
    `--dense is ${dense.top}/${dense.bottom}px down against the base table's ${base.top}/`
    + `${base.bottom}px, so it is not the tighter rhythm. A ledger takes the modifier to fit more `
    + 'rows on a screen; a step that does not buy a shorter row is the wrong step.',
  );
});

/* -- The gate can see, and says so ------------------------------------------ */

// A sweep that finds nothing reports the same green as a sweep that finds
// nothing wrong. Two things are checked: that the sheet contributed subjects at
// all, and that the sweep found as many `padding`s as a dumber count of them —
// a DECL regex that quietly stopped matching would otherwise pass forever.
test('the sweep sees every padding in the sheet', () => {
  const css = decomment(read(SHEET));
  const all = spacingDecls(css);
  assert.ok(all.length > 0, `no box-spacing declaration was found in ${SHEET} — this gate checks nothing`);

  const dumbCount = [...css.matchAll(/padding(-[a-z]+)?\s*:/g)].length;
  assert.equal(
    all.filter((s) => s.prop.startsWith('padding')).length,
    dumbCount,
    `the sweep found a different number of paddings in ${SHEET} than a plain count of `
    + '`padding:` does. One of the two is wrong, and the sweep is the one that matters.',
  );

  assert.ok(
    all.some((s) => stepFor(12) && s.value.includes(`var(${stepFor(12).name})`)),
    'the dense and zebra insets read a step; if that stopped being true the rest of this '
    + 'gate would still be green, because it only ever objects to literals.',
  );
});

// The mechanism, on input this file controls: the rule has to reject a literal
// and accept a step, or the green above says nothing about either (the mutation rule).
test('the check rejects a literal and accepts a step', () => {
  const specimen = `
    .a { padding: 7px; }
    .b { padding: var(--space-2) var(--space-3); margin: 0 auto; }
    .c { gap: 0; padding-left: 13px; }
    .d { border-width: 3px; font-size: 11px; }`;

  const offending = spacingDecls(specimen)
    .filter((s) => literals(s.value).length > 0)
    .map((s) => `${s.prop}:${s.value}`);

  assert.deepStrictEqual(
    offending, ['padding:7px', 'padding-left:13px'],
    'the check either missed a literal rhythm or objected to something that is not one — '
    + 'a border-width and a font-size are px and are not spacing.',
  );
  assert.equal(nearest(7), '--space-2 (8px)');
  assert.equal(nearest(14), '--space-3 (12px) or --space-4 (16px)', 'a tie must name both steps');
});
