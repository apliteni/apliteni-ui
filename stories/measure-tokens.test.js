/* Rule: a page-scale width comes from a token, never a literal.
 *
 * Scanned by PROPERTY, never by a file/line allowlist — the shape ADR 0004 asks
 * for, and the same shape as stories/colour-tokens.test.js next door. Every
 * `max-width` declaration in scope is a subject by existing; a new stylesheet, a
 * new site page or a new chrome module joins by being in the directory, and one
 * that stops declaring a width leaves the count on its own.
 *
 * WHERE THE LINE IS. "Page-scale" is not a number written here: it is
 * `--measure`, read out of src/tokens/tokens.css at run time. A width at or
 * above the reading column is a page width and has to be a token. Below it is
 * component scale — a callout at 400px, an empty state at 340px, a drawer — and
 * the kit has no component measure scale yet. That gap is real and this gate
 * does not pretend to close it; #198 reconciled the page-scale values and left
 * the component ones, and the character measures (38ch, 44ch, 52ch, 60ch, 72ch)
 * with them. If a component scale ever lands, the floor here drops and this
 * comment is what should be deleted first.
 *
 * WHY A MEDIA QUERY IS NOT A SUBJECT. `@media (max-width: 860px)` is a
 * breakpoint — a question about the viewport, not a width assigned to a box.
 * The declaration regex only matches a property that follows `;`, `{`, `}` or
 * the start of the text, and the one inside `@media (…)` follows `(`, so it is
 * never picked up. That is load-bearing rather than lucky, and the last test in
 * this file is what says so: site/index.html really does carry a breakpoint at
 * exactly the threshold, so a leak would turn this gate red on a correct file.
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

const DECL = /(?:^|[;{}])\s*(--[\w-]+|-?[a-zA-Z][\w-]*)\s*:\s*([^;{}]*)/g;
const PX = /(\d+(?:\.\d+)?)px/g;

/* -- The floor, read from the token rather than repeated ------------------- */

const TOKENS = 'src/tokens/tokens.css';
const measureDecl = /--measure:\s*(\d+(?:\.\d+)?)px\s*;/.exec(decomment(read(TOKENS)));
assert.ok(
  measureDecl,
  `${TOKENS} declares no --measure in px, and that token is where this gate reads its floor. `
  + 'Rename it and this rule stops meaning anything, so it fails loudly instead.',
);
const FLOOR = Number(measureDecl[1]);

/* -- The surfaces, swept rather than listed -------------------------------- */

/** Every .css in src/styles — the kit's own sheets. */
const kitSheets = () =>
  readdirSync(at('src/styles'))
    .filter((f) => f.endsWith('.css'))
    .sort()
    .map((f) => ({ where: `src/styles/${f}`, css: read(`src/styles/${f}`) }));

/**
 * Every page and chrome module in site/, composed from source. Directories are
 * skipped, which is what keeps site/public out: it is a build artefact that does
 * not exist in CI, and a gate that read it would either fail there or silently
 * drop coverage. See ADR 0004.
 *
 * An .html contributes its <style> blocks; an .mjs contributes its whole text,
 * because the CSS lives in a template literal and pulling the literal apart
 * would need a JS parser to tell one backtick from another. Scanning the raw
 * text is the stricter reading — a `max-width:` written in JS for some other
 * reason would be flagged, and none is.
 */
const siteSurfaces = () => {
  const out = [];
  for (const f of readdirSync(at('site')).sort()) {
    const rel = `site/${f}`;
    if (statSync(at(rel)).isDirectory()) continue;
    if (f.endsWith('.html')) {
      const html = read(rel);
      for (const m of html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)) {
        // Keep the offset so a reported line number is the line in the FILE.
        out.push({ where: rel, css: html.slice(0, m.index).replace(/[^\n]/g, ' ') + m[1] });
      }
    } else if (f.endsWith('.mjs')) {
      out.push({ where: rel, css: read(rel) });
    }
  }
  return out;
};

/** Every `max-width` declaration across both trees, with where it sits. */
const subjects = () => {
  const found = [];
  for (const { where, css: raw } of [...kitSheets(), ...siteSurfaces()]) {
    const css = decomment(raw);
    for (const m of css.matchAll(DECL)) {
      const [, prop, value] = m;
      if (prop !== 'max-width') continue;
      const line = css.slice(0, m.index + m[0].indexOf(prop)).split('\n').length;
      found.push({ where, line, value: value.trim() });
    }
  }
  return found;
};

/** The px literals in a value that are at or above the floor. */
const pageScaleLiterals = (value) =>
  [...value.matchAll(PX)].map((m) => Number(m[1])).filter((n) => n >= FLOOR);

/* -- The rule -------------------------------------------------------------- */

test('no literal page-scale width outside src/tokens', () => {
  const all = subjects();
  const offences = all
    .filter((s) => pageScaleLiterals(s.value).length > 0)
    .map((s) => `${s.where}:${s.line}  max-width: ${s.value}`);

  assert.deepStrictEqual(
    offences,
    [],
    `a page-scale width (>= ${FLOOR}px, the --measure floor) is written out as a literal.\n`
    + '  The page is --container and the reading column is --measure, both in '
    + `${TOKENS}.\n  Take the token, or add a step to that scale and say what it is for:\n  `
    + offences.join('\n  '),
  );
});

/* -- The gate can see, and says so ----------------------------------------- */

// A sweep that finds nothing reports the same green as a sweep that finds
// nothing wrong. Both trees have to contribute, and the kit's own container has
// to be among what was read — otherwise a refactor that moved every width out
// of scope would leave this file passing over an empty set.
test('both swept trees contribute a subject, and the container is one of them', () => {
  const all = subjects();
  assert.ok(all.length > 0, 'no max-width declaration was discovered — this gate is checking nothing');

  const trees = new Set(all.map((s) => s.where.split('/')[0]));
  assert.deepStrictEqual(
    [...trees].sort(), ['site', 'src'],
    `only ${[...trees].join(' and ')} contributed a subject. Both trees carry page widths and `
    + 'both are swept; a tree that drops out is coverage lost in silence.',
  );

  const containers = all.filter((s) => s.value.includes('var(--container)'));
  assert.ok(
    containers.length >= 4,
    'fewer than four declarations read var(--container). The kit states the page width in '
    + `base.css, topbar.css and footer.css, and the site in its own chrome — found ${containers.length}: `
    + containers.map((s) => `${s.where}:${s.line}`).join(', '),
  );
});

// The threshold is only worth anything if a breakpoint at that exact value does
// not trip it, and site/index.html carries one: `@media (max-width: 860px)` for
// the bento grid. If the declaration regex ever started matching inside `@media
// (…)`, this gate would go red on a file that is correct — so the exclusion is
// asserted directly rather than left to be inferred from a green run.
test('a media-query breakpoint is not a subject, even at the floor exactly', () => {
  const html = read('site/index.html');
  assert.match(
    html, new RegExp(`@media\\s*\\(max-width:\\s*${FLOOR}px\\)`),
    `site/index.html no longer carries a breakpoint at exactly ${FLOOR}px, so this test has `
    + 'stopped proving that a breakpoint and a width are told apart. Point it at another '
    + 'page-scale breakpoint, or delete it and say why the distinction stopped mattering.',
  );

  const scanned = subjects().filter((s) => s.where === 'site/index.html');
  assert.ok(
    scanned.every((s) => !/^\s*\d+px\)/.test(s.value)),
    'a media-query condition was read as a declaration — the sweep is now counting breakpoints '
    + 'as widths, and every page-scale breakpoint in the repo is about to fail this gate',
  );
});
