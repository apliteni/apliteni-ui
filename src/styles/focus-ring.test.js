import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Every link and button the React shell writes must take the kit ring, so none
// falls back to the browser's own outline. Subjects are discovered from the
// markup rather than listed here, so a new shell control joins by existing.
//
// Limits: this reads the cascade, not paint. Whether the ring is visible against
// the surface behind it is stories/ring-surfaces.test.js and the contrast
// ledger; whether :focus-visible matches in a real browser is the browser's, and
// the showcase captures carry that evidence. Controls the shell composes from
// other components (Dropdown, Button) carry their own classes and are covered
// where those components are measured. Discovery reads literal class strings
// only, so a control whose className is a template literal — the bar's More
// button, and every row links() writes — is invisible here and is measured in
// the browser instead. The count below is therefore a floor on what the shell
// writes, not a census of it.
const here = path.dirname(fileURLToPath(import.meta.url));
const SHELL = readFileSync(path.join(here, '../../react/src/AppShell.tsx'), 'utf8');
const SHEETS = ['base.css', 'layout.css', 'topbar.css', 'nav.css', 'button.css']
  .map((file) => readFileSync(path.join(here, file), 'utf8')).join('\n');

// One entry per <a>/<button> the shell writes with a literal class list.
const shellControls = () => [...SHELL.matchAll(/<(a|button)\s[^>]*className="([^"{}]+)"/g)]
  .map((match) => ({ tag: match[1], classes: match[2].split(/\s+/).filter(Boolean) }));

// Rules that paint the kit ring, with the selectors that reach it.
const ringSelectors = (css) => [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
  .filter(([, , body]) => /box-shadow:\s*var\(--ring\)/.test(body))
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

test('the check rejects a shell control dropped from the ring', () => {
  for (const line of ['.toggle:focus-visible,\n', '.ui-app__brand:focus-visible,\n']) {
    const stripped = SHEETS.replace(line, '');
    assert.notEqual(stripped, SHEETS, `the mutation must remove ${line.trim()}`);
    assert.ok(shellControls().some((control) => !covered(ringSelectors(stripped), control)),
      `removing ${line.trim()} must be rejected`);
  }
});
