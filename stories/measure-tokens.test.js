/* Rule: a width comes from a token, never a literal — and the unit picks the
 * scale. A box holding a COMPONENT takes a --panel-* step in px; a box holding
 * a LINE takes a --prose-* step in ch.
 *
 * Scanned by PROPERTY, never by a file/line allowlist — the shape ADR 0004 asks
 * for, and the same shape as stories/colour-tokens.test.js next door.
 *
 * The floor is not a number written here: it is the smallest step of the panel
 * scale, read out of src/tokens/tokens.css. Add a smaller step and the floor
 * follows it down on its own.
 *
 * A media query is a question about the viewport, not a width assigned to a
 * box, and the declaration regex never matches inside `@media (…)`. The last
 * test here says so against whatever live breakpoints sit at or above the floor.
 *
 * why: docs/adr/0011-two-scales-below-the-page-and-the-unit-picks-one.md
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

// The leading class carries `"` and `'` so a declaration inside an inline
// style="…" attribute is seen the same way as one inside a rule block — and the
// VALUE class carries them for the same reason, in reverse: a value that may
// cross a quote runs out of one attribute and eats the next one whole. The last
// declaration of `style="…width:300px"` did exactly that, swallowing twenty
// lines of markup and the `max-width` at the end of them, because nothing
// between them was a `;`, `{` or `}`.
const DECL = /(?:^|[;{}"'])\s*(--[\w-]+|-?[a-zA-Z][\w-]*)\s*:\s*([^;{}"']*)/g;
const PX = /(\d+(?:\.\d+)?)px/g;
const CH = /(\d+(?:\.\d+)?)ch/g;

/* -- The two scales, read from the tokens rather than repeated -------------- */

const TOKENS = 'src/tokens/tokens.css';
const tokenText = decomment(read(TOKENS));

const steps = (prefix, unit) =>
  [...tokenText.matchAll(new RegExp(`--(${prefix}-[\\w-]+):\\s*(\\d+(?:\\.\\d+)?)${unit}\\s*;`, 'g'))]
    .map((m) => ({ name: `--${m[1]}`, value: Number(m[2]) }));

const PANEL = steps('panel', 'px');
const PROSE = steps('prose', 'ch');

assert.ok(
  PANEL.length > 0,
  `${TOKENS} declares no --panel-* step in px, and that scale is where this gate reads its `
  + 'floor. Rename it and this rule stops meaning anything, so it fails loudly instead.',
);
assert.ok(
  PROSE.length > 0,
  `${TOKENS} declares no --prose-* step in ch, so the rule below — a measure is a token, not a `
  + 'literal — would have nothing to send a reader to.',
);

const FLOOR = Math.min(...PANEL.map((s) => s.value));

/* -- The surfaces, swept rather than listed -------------------------------- */

/** Every .css in src/styles — the kit's own sheets. */
const kitSheets = () =>
  readdirSync(at('src/styles'))
    .filter((f) => f.endsWith('.css'))
    .sort()
    .map((f) => ({ where: `src/styles/${f}`, css: read(`src/styles/${f}`) }));

/**
 * Blank everything in an HTML document EXCEPT the CSS in it, character for
 * character, so a reported line number is the line in the file.
 *
 * Two kinds of CSS live in these pages: <style> blocks, and `style="…"`
 * attributes. The attribute kind is not a corner case — the site carried a
 * reading column as `style="max-width:840px"` on a plain div, invisible to a
 * sweep that only opened <style>. The opening quote is kept so the declaration
 * has the leading delimiter DECL expects.
 */
const cssOnly = (html) => {
  const keep = new Uint8Array(html.length);
  const mark = (start, len) => { for (let i = start; i < start + len; i++) keep[i] = 1; };
  for (const m of html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)) {
    mark(m.index + m[0].indexOf(m[1]), m[1].length);
  }
  for (const m of html.matchAll(/\sstyle\s*=\s*("[^"]*"|'[^']*')/g)) {
    mark(m.index + m[0].indexOf(m[1]), m[1].length);
  }
  let out = '';
  for (let i = 0; i < html.length; i++) out += keep[i] ? html[i] : (html[i] === '\n' ? '\n' : ' ');
  return out;
};

/**
 * Every page and chrome module in site/, composed from source. Directories are
 * skipped, which is what keeps site/public out: it is a build artefact that does
 * not exist in CI, and a gate that read it would either fail there or silently
 * drop coverage. See ADR 0004.
 *
 * An .html contributes its CSS, wherever it is written; an .mjs contributes its
 * whole text, because the CSS lives in a template literal and pulling the
 * literal apart would need a JS parser to tell one backtick from another.
 * Scanning the raw text is the stricter reading — a `max-width:` written in JS
 * for some other reason would be flagged, and none is.
 */
const siteSurfaces = () => {
  const out = [];
  for (const f of readdirSync(at('site')).sort()) {
    const rel = `site/${f}`;
    if (statSync(at(rel)).isDirectory()) continue;
    if (f.endsWith('.html')) out.push({ where: rel, css: cssOnly(read(rel)) });
    else if (f.endsWith('.mjs')) out.push({ where: rel, css: read(rel) });
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

/** Every bare ch literal in a value. There is no floor here: ch IS the measure. */
const bareCh = (value) => [...value.matchAll(CH)].map((m) => Number(m[1]));

const nameFor = (scale, n) => (scale.find((s) => s.value === n) || {}).name;

/* -- The rule -------------------------------------------------------------- */

test('no literal box width outside src/tokens', () => {
  const offences = subjects()
    .filter((s) => pageScaleLiterals(s.value).length > 0)
    .map((s) => {
      const near = pageScaleLiterals(s.value).map((n) => nameFor(PANEL, n)).filter(Boolean)[0];
      return `${s.where}:${s.line}  max-width: ${s.value}${near ? `  → ${near}` : ''}`;
    });

  assert.deepStrictEqual(
    offences,
    [],
    `a box width (>= ${FLOOR}px, the smallest panel step) is written out as a literal.\n`
    + `  The page is --container, the reading column --measure, and a panel is one of `
    + `${PANEL.map((s) => `${s.name} (${s.value}px)`).join(', ')} — all in ${TOKENS}.\n`
    + '  Take the step, or add one to that scale and say what it is for:\n  '
    + offences.join('\n  '),
  );
});

test('no literal prose measure outside src/tokens', () => {
  const offences = subjects()
    .filter((s) => bareCh(s.value).length > 0)
    .map((s) => {
      const near = bareCh(s.value).map((n) => nameFor(PROSE, n)).filter(Boolean)[0];
      return `${s.where}:${s.line}  max-width: ${s.value}${near ? `  → ${near}` : ''}`;
    });

  assert.deepStrictEqual(
    offences,
    [],
    'a prose measure is written out as a literal in ch.\n'
    + `  The steps are ${PROSE.map((s) => `${s.name} (${s.value}ch)`).join(', ')}, in ${TOKENS}.\n`
    + '  ch resolves against the font-size of the element it is declared on, so put the step on\n'
    + '  the paragraph, not on a wrapper holding two type sizes:\n  '
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

// The style="…" half of the HTML sweep is the half that can rot without a
// sound: <style> blocks are found by any reader, an attribute is not. So one
// subject has to come from an attribute, and it is discovered rather than
// named — the assertion is "the site still states a width inline somewhere",
// not "line 209 of index.html".
test('an inline style attribute contributes a subject', () => {
  const inline = [];
  for (const f of readdirSync(at('site')).sort()) {
    if (!f.endsWith('.html')) continue;
    const html = read(`site/${f}`);
    for (const m of html.matchAll(/\sstyle\s*=\s*("[^"]*"|'[^']*')/g)) {
      if (!/max-width\s*:/.test(m[1])) continue;
      inline.push({ where: `site/${f}`, line: html.slice(0, m.index).split('\n').length });
    }
  }
  assert.ok(
    inline.length > 0,
    'no site page states a max-width in a style="…" attribute any more, so this gate has stopped '
    + 'proving it reads them. Delete the attribute half of cssOnly() and this test with it, or '
    + 'point it at whatever carries inline CSS now.',
  );

  // Present in the file is not the claim. The claim is that the sweep REACHED
  // it — so every inline width has to come back out of subjects(), at its own
  // line, or the attribute half is decorative.
  const seen = subjects().map((s) => `${s.where}:${s.line}`);
  const missed = inline.map((s) => `${s.where}:${s.line}`).filter((k) => !seen.includes(k));
  assert.deepStrictEqual(
    missed, [],
    'a max-width written in a style="…" attribute was not returned by the sweep, so an inline '
    + 'literal could sit there unseen: ' + missed.join(', '),
  );
});

// The threshold is only worth anything if a breakpoint at or above it does not
// trip it. site/index.html carries several, and they are found rather than
// listed: if the declaration regex ever started matching inside `@media (…)`,
// this gate would go red on a file that is correct — so the exclusion is
// asserted directly rather than left to be inferred from a green run.
test('a media-query breakpoint is not a subject, at or above the floor', () => {
  const html = read('site/index.html');
  const breakpoints = [...html.matchAll(/@media\s*\(max-width:\s*(\d+)px\)/g)]
    .map((m) => Number(m[1]))
    .filter((n) => n >= FLOOR);

  assert.ok(
    breakpoints.length > 0,
    `site/index.html carries no breakpoint at or above ${FLOOR}px, so this test has stopped `
    + 'proving that a breakpoint and a width are told apart. Point it at another page that '
    + 'carries one, or delete it and say why the distinction stopped mattering.',
  );

  const scanned = subjects().filter((s) => s.where === 'site/index.html');
  assert.ok(
    scanned.every((s) => !/^\s*\d+px\)/.test(s.value)),
    'a media-query condition was read as a declaration — the sweep is now counting breakpoints '
    + `as widths, and ${breakpoints.join(', ')} are about to fail this gate as literals`,
  );
});
