/* Rule: a media query breaks at one of the kit's documented steps, and nowhere
 * else.
 *
 * A breakpoint is the one width a token cannot express — a media query cannot
 * read a custom property — so the value stays a literal and the discipline has
 * to come from somewhere else. That somewhere is a documented list with a gate
 * over it, which is this file.
 *
 * The list is NOT written here. It is read out of the table under `## Breakpoints`
 * in docs/specification.md at run time, because two copies of three numbers is
 * the defect this gate exists to prevent — a list in the docs and a list in a
 * test drift the same way six literals in ten files drifted.
 *
 * Subjects are swept, never enumerated: every `@media` prelude in src/styles and
 * site contributes whatever px values it carries, and a file is in scope by
 * existing. The sweep reads RAW TEXT rather than parsed <style> blocks. site's
 * pages carry CSS in `style="…"` attributes as well as in <style>, and chrome.mjs
 * carries a whole stylesheet inside a template literal; raw text is the stricter
 * reading of all three, and a false positive from prose that happened to spell
 * `@media (max-width: 900px)` is a failure that points at something real.
 *
 * Directories are skipped, which is what keeps site/public out: it is build
 * output that does not exist in CI, so a gate reading it would measure the last
 * build rather than the source.
 *
 * why: docs/specification.md#breakpoints
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const at = (rel) => path.join(root, rel);
const read = (rel) => readFileSync(at(rel), 'utf8');

/** Blank out comments, keeping newlines so line numbers stay true. */
const decomment = (css) => css.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));

/* -- The list, read from the specification rather than repeated ------------- */

const SPEC = 'docs/specification.md';
const HEADING = '## Breakpoints';

const section = (() => {
  const md = read(SPEC);
  const start = md.indexOf(`\n${HEADING}\n`);
  assert.ok(
    start !== -1,
    `${SPEC} no longer has a "${HEADING}" heading, and that section is where this gate reads the `
    + 'list it enforces. Rename it and the gate has nothing to check, so it fails loudly instead.',
  );
  const rest = md.slice(start + 1);
  const end = rest.indexOf('\n## ', 1);
  return end === -1 ? rest : rest.slice(0, end);
})();

/** Every `| 860px |` row in that section's table, widest first. */
const STEPS = [...section.matchAll(/^\|\s*`?(\d+)px`?\s*\|/gm)].map((m) => Number(m[1]));

assert.ok(
  STEPS.length >= 2,
  `${SPEC} → "${HEADING}" lists fewer than two steps. The list is the first cell of each table `
  + 'row, written as `560px`; a gate that read an empty list would pass over every query in the '
  + 'kit and report the same green as a gate that checked them all.',
);
assert.deepStrictEqual(
  STEPS, [...new Set(STEPS)].sort((a, b) => b - a),
  `${SPEC} → "${HEADING}" lists its steps out of order or twice over. Widest first, each once — `
  + `got ${STEPS.join(', ')}.`,
);

/* -- The surfaces, swept rather than listed --------------------------------- */

/** Every .css under src/, at whatever depth it was put. */
const kitSheets = (dir = 'src') => {
  const out = [];
  for (const f of readdirSync(at(dir)).sort()) {
    const rel = `${dir}/${f}`;
    if (statSync(at(rel)).isDirectory()) out.push(...kitSheets(rel));
    else if (f.endsWith('.css')) out.push({ where: rel, text: read(rel) });
  }
  return out;
};

/** Every file whose text can carry a media query, as `{ where, text }`. */
const surfaces = () => {
  const out = [...kitSheets()];
  for (const f of readdirSync(at('site')).sort()) {
    const rel = `site/${f}`;
    if (statSync(at(rel)).isDirectory()) continue;
    if (f.endsWith('.html') || f.endsWith('.mjs') || f.endsWith('.css')) {
      out.push({ where: rel, text: read(rel) });
    }
  }
  return out;
};

/**
 * Every px literal inside a media prelude, with where it sits.
 *
 * The prelude is everything between `@media` and the `{` that opens its block,
 * so this is blind to which feature carried the value: `max-width`, `min-width`
 * and the range form `(width <= 560px)` are all read the same way, and a query
 * that asks about motion rather than width contributes nothing because it holds
 * no px.
 */
const queries = () => {
  const found = [];
  for (const { where, text } of surfaces()) {
    const src = decomment(text);
    for (const m of src.matchAll(/@media\b([^{]*)\{/g)) {
      const line = src.slice(0, m.index).split('\n').length;
      const prelude = m[1];
      for (const px of prelude.matchAll(/(\d+(?:\.\d+)?)px/g)) {
        found.push({ where, line, value: Number(px[1]), prelude: `@media ${prelude.trim()}` });
      }
    }
  }
  return found;
};

/* -- The rule --------------------------------------------------------------- */

test('every breakpoint is one of the documented steps', () => {
  const offences = queries()
    .filter((q) => !STEPS.includes(q.value))
    .map((q) => `${q.where}:${q.line}  ${q.prelude}`);

  assert.deepStrictEqual(
    offences,
    [],
    `a media query breaks at a width that is not a step of the kit.\n`
    + `  The steps are ${STEPS.map((s) => `${s}px`).join(', ')}, listed under "${HEADING}" in `
    + `${SPEC} with what changes at each.\n`
    + '  Move the query to the step above the one it wants — a reflow at a wider viewport gives\n'
    + '  the layout more room than it had, never less — or add a step to that table and say what\n'
    + '  viewport class it is:\n  '
    + offences.join('\n  '),
  );
});

// The list is held from both ends. Without this, "documented" would only ever
// grow: a stray could be legalised by typing it into the table, and the table
// would end up as the same six-numbers-in-ten-files it replaced, one row at a
// time.
test('every documented step is a step something queries', () => {
  const used = new Set(queries().map((q) => q.value));
  const dead = STEPS.filter((s) => !used.has(s));

  assert.deepStrictEqual(
    dead, [],
    `${SPEC} → "${HEADING}" documents a step no query breaks at: `
    + `${dead.map((s) => `${s}px`).join(', ')}.\n`
    + '  A step nobody uses is an aspiration in a list that is meant to describe the kit. Delete\n'
    + '  the row, or write the query that needs it.',
  );
});

/* -- The gate can see, and says so ------------------------------------------ */

// A sweep that finds nothing reports the same green as a sweep that finds
// nothing wrong. Both trees carry breakpoints and both are swept; a tree that
// drops out is coverage lost in silence.
test('both swept trees contribute a breakpoint', () => {
  const all = queries();
  assert.ok(all.length > 0, 'no media query was discovered — this gate is checking nothing');

  const trees = new Set(all.map((q) => q.where.split('/')[0]));
  assert.deepStrictEqual(
    [...trees].sort(), ['site', 'src'],
    `only ${[...trees].join(' and ')} contributed a breakpoint. The kit breaks in its own sheets `
    + 'and the site breaks in its pages, and both are in scope.',
  );
});

// The two halves of the sweep that can rot without a sound. A media query in a
// .css file is found by any reader; one inside an HTML <style> block and one
// inside a JS template literal are found only because this sweep reads raw
// text. Both are asserted by KIND, discovered rather than named — the claim is
// "the site still writes CSS in a page and in a module", not "line 76 of
// chrome.mjs".
test('CSS written into a page and into a module is swept', () => {
  const kinds = new Map();
  for (const q of queries()) kinds.set(path.extname(q.where), q.where);

  for (const [ext, what] of [
    ['.html', 'a <style> block inside a site page'],
    ['.mjs', 'a stylesheet inside a template literal in a site module'],
  ]) {
    assert.ok(
      kinds.has(ext),
      `no ${ext} in site/ carries a media query any more, so this gate has stopped proving it `
      + `reads ${what}. Point it at whatever carries that CSS now, or drop the kind and say why `
      + 'it stopped mattering.',
    );
  }
  assert.ok(kinds.has('.css'), 'no stylesheet in src/styles carries a media query');
});

// site/public is a build artefact: present locally after `site/build.mjs`, absent
// in CI. The exclusion is structural — the site half of surfaces() skips
// directories — so it is asserted structurally too, and holds whether or not the
// directory exists in the checkout running this. src/ is walked to any depth,
// because a stylesheet put in a new folder under src is kit CSS the day it
// lands, and nothing there is built.
test('the site is swept a directory deep, which is what keeps the build output out', () => {
  const nested = surfaces().map((s) => s.where)
    .filter((w) => w.startsWith('site/') && !/^site\/[^/]+$/.test(w));
  assert.deepStrictEqual(
    nested, [],
    'the sweep reached a file below site/. site/public is built output that does not exist in '
    + 'CI, so a gate that reads it either fails there or drops coverage in silence: '
    + nested.join(', '),
  );

  const sheets = kitSheets().map((s) => s.where);
  assert.ok(
    sheets.some((w) => !w.startsWith('src/styles/')),
    'every .css the src walk found is in src/styles, so a stylesheet put anywhere else under '
    + 'src would be swept by code no test exercises. Point this at whatever else carries CSS, '
    + 'or flatten the walk and say why depth stopped mattering.',
  );
});
