/* Rule: a page-scale width comes from a token, never a literal.
 *
 * Scanned by PROPERTY, never by a file/line allowlist — the shape ADR 0004 asks
 * for, and the same shape as stories/colour-tokens.test.js next door.
 *
 * The floor is not a number written here: it is --measure, read out of
 * src/tokens/tokens.css. Below it is component scale, which has no tokens yet
 * (#208), so there is nothing for a literal down there to become.
 *
 * A media query is a question about the viewport, not a width assigned to a
 * box, and the declaration regex never matches inside `@media (…)`. The last
 * test here says so against a live breakpoint at exactly the floor.
 *
 * why: docs/adr/0009-a-page-has-two-widths-and-the-site-owns-the-container.md
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
