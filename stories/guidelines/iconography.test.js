/* Rule: a control goes wordless only for an action on the closed list.
 *
 * `iconOnlyAllowed` in src/assets/icons.js names the actions that may drop their visible
 * text. This walks every control that goes wordless and checks the glyph it hands over
 * against that list. Two spellings are read, because the kit writes both: a call to
 * button({ iconOnly }) and a hand-written <button> that carries an aria-label and nothing
 * but a glyph. The shell controls allowed by #460 use neither — they compute their glyph
 * rather than naming one — so this walk still never sees them.
 *
 * The accessibility gate next door proves an icon-only button always has a NAME. It
 * cannot prove the button should have been wordless — a `gear` with a perfect aria-label
 * is still a reader meeting an unlabelled cog one at a time. That is this gate.
 *
 * Discover subjects from source and check the coverage count.
 * Weaken the rule and confirm that its test fails.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { iconOnlyAllowed, iconNames } from '../../src/assets/icons.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');

const TREES = ['src', 'stories', 'site', 'react/src'];
const CODE = /\.(js|mjs|jsx|tsx)$/;
const SKIP = new Set(['node_modules', 'dist', 'public', 'storybook-static', '.git']);

const walk = (dir) => readdirSync(dir).flatMap((entry) => {
  if (SKIP.has(entry)) return [];
  const full = path.join(dir, entry);
  if (statSync(full).isDirectory()) return walk(full);
  return CODE.test(entry) ? [full] : [];
});

const sources = TREES
  .map((t) => path.join(root, t))
  .filter((d) => existsSync(d))
  .flatMap(walk)
  .sort();

// A call site is the word `iconOnly` plus the glyph named NEAREST to it. Both
// spellings the kit uses are read: the object form `icon: 'x'` that button()
// takes, and the JSX attribute `icon="x"` that <Button> takes.
//
// Nearest, not first: three icon-only buttons in a row sit inside one window,
// and taking the first match reported all three as the first one's glyph.
const WINDOW = 220;
const GLYPH = /\bicon\s*[:=]\s*['"]([A-Za-z][A-Za-z0-9]*)['"]/g;

// A test names a glyph to assert what the function does with it, not to decide
// what a reader should meet — src/components/button.test.js hands `trash` to an
// icon-only button precisely to prove a blank label still gets a name. That is
// the function under test, not a control the kit ships. Excluded as a category
// rather than by filename, and counted below so the exclusion stays visible.
const isTest = (f) => /\.test\.(js|mjs|jsx|tsx)$/.test(f);

// A guideline page draws the violation on purpose — that is what a don't
// specimen IS, and a gate that reads it makes the rule unillustratable. The
// convention those pages already use is the marker: the export that renders the
// wrong half is named `<rule>Dont`. Recognised as a naming convention, not as a
// list of files, and counted below so it cannot quietly swallow a real one.
const DONT = /\b(?:export\s+)?const\s+\w*Dont\s*=/g;
const dontSpans = (text) => [...text.matchAll(DONT)].map((m) => [m.index, m.index + 400]);
const insideDont = (spans, at) => spans.some(([a, b]) => at >= a && at <= b);

const callSites = [];
let excluded = 0;
for (const file of sources) {
  const text = readFileSync(file, 'utf8');
  // The declaration and the docs of the flag are not call sites of it.
  if (file.endsWith(path.join('src', 'assets', 'icons.js'))) continue;
  for (const hit of text.matchAll(/\biconOnly\b/g)) {
    const from = Math.max(0, hit.index - WINDOW);
    const around = text.slice(from, hit.index + WINDOW);
    // A type declaration or a prop being destructured names no glyph — skip it
    // rather than guess, and let the count below notice if that swallows a real one.
    const named = [...around.matchAll(GLYPH)]
      .map((m) => ({ glyph: m[1], distance: Math.abs(from + m.index - hit.index) }))
      .sort((a, b) => a.distance - b.distance);
    if (!named.length) continue;
    if (isTest(file) || insideDont(dontSpans(text), hit.index)) { excluded += 1; continue; }
    const line = text.slice(0, hit.index).split('\n').length;
    callSites.push({ file: path.relative(root, file), line, glyph: named[0].glyph, how: 'iconOnly' });
  }
}

/* -- the second spelling ---------------------------------------------------
 * A hand-written control: a <button> whose attributes carry an aria-label and
 * whose contents are a glyph and no words. snippet() and React Snippet are
 * written this way — neither says `iconOnly`, so the walk above cannot see
 * either, and #474 added two wordless controls the gate was not reviewing.
 *
 * A literal counts as a glyph only if `iconNames` actually has it. Without that
 * check the walk reads `status === 'idle' ? 'copy' : 'check'` and reports the
 * glyph as `idle`.
 *
 * The RESTING glyph is the first one named: a control that swaps its glyph to
 * confirm is still the action it rests as, and `check` on a copy button is
 * feedback rather than a second action to put on the list. A control that named
 * its states in the other order would be reported by its confirmation and fail
 * here — loudly, which is the safe direction for a gate to be wrong in.
 */
const CONTROL = /<button\b([^>]*)>([\s\S]*?)<\/button>/g;
const GLYPH_LITERAL = /['"]([A-Za-z][A-Za-z0-9]*)['"]/g;
const ICON_CALL = /\bicon\s*\(\s*['"][A-Za-z][A-Za-z0-9]*['"]|<Icon\b[^>]*?\bname\s*=\s*(?:\{[^}]*\}|['"][^'"]*['"])/g;
const WORD = /[A-Za-z]{2,}/;
const GLYPHS = new Set(iconNames);

/** Glyph names, in source order, from the places a control names one. */
const glyphsIn = (inner) => [...inner.matchAll(ICON_CALL)]
  .flatMap((m) => [...m[0].matchAll(GLYPH_LITERAL)].map((g) => g[1]))
  .filter((name) => GLYPHS.has(name));

/** Whatever a reader would see as words once interpolations and tags are gone. */
const visibleWords = (inner) => inner
  .replace(/\$\{[\s\S]*?\}/g, '')
  .replace(/<[^>]*>/g, '')
  .replace(/\{[\s\S]*?\}/g, '')
  .trim();

let wordless = 0;
for (const file of sources) {
  const text = readFileSync(file, 'utf8');
  if (file.endsWith(path.join('src', 'assets', 'icons.js'))) continue;
  for (const control of text.matchAll(CONTROL)) {
    const [, attrs, inner] = control;
    if (!/aria-label/.test(attrs)) continue;
    if (WORD.test(visibleWords(inner))) continue;
    const glyphs = glyphsIn(inner);
    if (!glyphs.length) continue;
    const line = text.slice(0, control.index).split('\n').length;
    if (isTest(file) || insideDont(dontSpans(text), control.index)) { excluded += 1; continue; }
    if (callSites.some((c) => c.file === path.relative(root, file) && Math.abs(c.line - line) < 3)) continue;
    wordless += 1;
    callSites.push({ file: path.relative(root, file), line, glyph: glyphs[0], how: 'wordless' });
  }
}

test('the walk reaches the call sites it is meant to review', () => {
  assert.ok(sources.length > 50, `only ${sources.length} source files swept — the walk lost a tree`);
  assert.ok(callSites.length > 0, 'no icon-only call site found at all — the walk reads nothing');
  assert.ok(excluded > 0,
    'no test fixture was excluded, so the exclusion is either dead or the walk is missing the tests');
  assert.ok(wordless > 0,
    'no hand-written wordless control found, so the second spelling is dead and a control '
    + 'written the way snippet() writes one would go unreviewed');
});

// #474 gave the kit two wordless controls written the second way. Naming them is
// what makes either dropping out of the walk visible: a regex that stops matching
// the kit's spelling otherwise just shrinks the set in silence, and the counts
// above would still pass on the controls that remain.
test('the second spelling reaches both Snippet copy buttons', () => {
  const found = callSites.filter((c) => c.how === 'wordless').map((c) => `${c.file} ${c.glyph}`);
  for (const control of ['src/components/index.js copy', 'react/src/Snippet.tsx copy']) {
    assert.ok(found.includes(control),
      `${control} is wordless and is not in the walk — found: ${found.join(', ') || 'nothing'}`);
  }
});

test('every icon-only control is one the closed list allows', () => {
  const allowed = Object.keys(iconOnlyAllowed);
  const offenders = callSites
    .filter((c) => !allowed.includes(c.glyph))
    .map((c) => `${c.file}:${c.line} — ${c.how} with “${c.glyph}”, which is not on the list`);
  assert.deepEqual(offenders, [],
    `icon-only is allowed for: ${allowed.map((g) => `${g} (${iconOnlyAllowed[g]})`).join(', ')}`);
});

// The list is only worth having if a glyph off it would actually be caught. A
// window too narrow, a regex that stopped matching the kit's spelling, a tree
// dropped from TREES — each leaves the gate green against a violation. So the
// check is run once more against a list with the commonest allowance removed:
// the call sites that rely on it have to fail (the mutation rule).
test('removing an allowance turns the gate red — it is reading real call sites', () => {
  const weakened = Object.keys(iconOnlyAllowed).filter((g) => g !== 'x');
  const caught = callSites.filter((c) => !weakened.includes(c.glyph));
  assert.ok(caught.length > 0,
    'dropping “x” from the list caught nothing, so no call site using it was ever read');
});
