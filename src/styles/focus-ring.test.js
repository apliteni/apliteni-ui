import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Every link and button the React shell writes must take the kit ring, so none falls
// back to the browser's own outline. Subjects are discovered from the markup, so a new
// shell control joins by existing. why: #457
//
// Limits. It reads the cascade, not paint: ring visibility against the surface behind
// it is stories/focus-ring.test.js and the contrast ledger, and whether
// :focus-visible matches is the browser's, measured in the captures. Discovery reads
// literal class strings, so a className built as a template literal is invisible here
// and the count is a floor rather than a census. Controls composed from other
// components carry their own classes and are covered where those are measured.
const here = path.dirname(fileURLToPath(import.meta.url));
const SHELL = readFileSync(path.join(here, '../../react/src/AppShell.tsx'), 'utf8');
const SHEETS = ['base.css', 'layout.css', 'topbar.css', 'nav.css', 'button.css']
  .map((file) => readFileSync(path.join(here, file), 'utf8')).join('\n');

// One entry per <a>/<button> the shell writes with a literal class list.
const shellControls = () => [...SHELL.matchAll(/<(a|button)\s[^>]*className="([^"{}]+)"/g)]
  .map((match) => ({ tag: match[1], classes: match[2].split(/\s+/).filter(Boolean) }));

// Rules that paint the kit ring, with the selectors that reach it.
const ringSelectors = (css) => [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
  .filter(([, , body]) => /outline:\s*var\(--ring\)/.test(body))
  .flatMap(([, selector]) => selector.split(','))
  .filter((part) => part.includes(':focus-visible'));

// An element is covered when any one of its classes reaches a ring rule.
const covered = (selectors, control) => control.classes
  .some((cls) => selectors.some((part) => new RegExp(`\\.${cls}(?![\\w-])[^,]*:focus-visible`).test(part)));

test('every link and button the shell writes takes the kit ring', () => {
  const controls = shellControls();
  assert.equal(controls.length, 4, 'every shell control with a literal class list must be measured');
  const bare = controls.filter((control) => !covered(ringSelectors(SHEETS), control))
    .map((control) => control.classes.join(' '));
  assert.deepEqual(bare, [], `these shell controls fall back to the native outline: ${bare}`);
});

// One mutation per control, listing every line that reaches it: the rejection this proves
// is a control with no ring rule at all, not one rule fewer. `.toggle` is reached twice,
// by the shared ring list in base.css and by the vanilla topbar's own one-liner, so
// dropping either alone leaves the other.
const MUTATIONS = [
  ['.toggle:focus-visible,\n', '.toggle:focus-visible { outline: var(--ring); outline-offset: var(--ring-offset); }\n'],
  ['.ui-app__brand:focus-visible { outline: var(--ring); outline-offset: var(--ring-offset); border-radius: var(--radius-xs); }\n'],
];

test('the check rejects a shell control dropped from the ring', () => {
  for (const lines of MUTATIONS) {
    let stripped = SHEETS;
    for (const line of lines) {
      const next = stripped.replace(line, '');
      assert.notEqual(next, stripped, `the mutation must remove ${line.trim()}`);
      stripped = next;
    }
    assert.ok(shellControls().some((control) => !covered(ringSelectors(stripped), control)),
      `removing ${lines.map((line) => line.trim()).join(' and ')} must be rejected`);
  }
});
