/* Rule: a control goes wordless only for an action on the closed list.
 *
 * `iconOnlyAllowed` in src/assets/icons.js names the actions that may drop
 * their visible text. This walks every call site that asks for one and checks
 * the glyph it hands over against that list.
 *
 * The accessibility gate next door proves an icon-only button always has a
 * NAME. It cannot prove the button should have been wordless in the first place
 * — a `gear` with a perfect aria-label is still a reader meeting an unlabelled
 * cog one at a time. That is this gate.
 *
 * The call sites are DISCOVERED, never listed: every .js/.mjs/.jsx/.tsx under
 * the four trees `npm test` and the build actually read is swept for the word
 * `iconOnly`, and the count is asserted so a walk that reads nothing cannot
 * pass.
 *
 * why: CONTRIBUTING.md#a-gate-discovers-its-subjects-and-never-enumerates-them
 * why: CONTRIBUTING.md#a-rule-is-proven-by-the-mutation-that-kills-its-case
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { iconOnlyAllowed } from '../../src/assets/icons.js';

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
// and taking the first match reported all three as the first one's glyph. That
// version named a real violation and two invented ones, which is the failure
// mode a gate can least afford — the next reader stops trusting the list.
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
    callSites.push({ file: path.relative(root, file), line, glyph: named[0].glyph });
  }
}

test('the walk reaches the call sites it is meant to review', () => {
  assert.ok(sources.length > 50, `only ${sources.length} source files swept — the walk lost a tree`);
  assert.ok(callSites.length > 0, 'no icon-only call site found at all — the walk reads nothing');
  assert.ok(excluded > 0,
    'no test fixture was excluded, so the exclusion is either dead or the walk is missing the tests');
});

test('every icon-only control is one the closed list allows', () => {
  const allowed = Object.keys(iconOnlyAllowed);
  const offenders = callSites
    .filter((c) => !allowed.includes(c.glyph))
    .map((c) => `${c.file}:${c.line} — iconOnly with “${c.glyph}”, which is not on the list`);
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
