import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { splitSelectorList } from '../../scripts/lib/selector-list.js';

// Every link and button the React shell writes must take the kit ring, so none falls
// back to the browser's own outline. Subjects are discovered from the markup, so a new
// shell control joins by existing. why: #457
//
// Limits. It reads the cascade, not paint: ring visibility against the surface behind
// it is the contrast ledger, and whether
// :focus-visible matches is the browser's, measured in the captures. Discovery reads
// literal class strings, so a className built as a template literal is invisible here
// and the count is a floor rather than a census. Controls composed from other
// components carry their own classes and are covered where those are measured.
const here = path.dirname(fileURLToPath(import.meta.url));
// The band's theme switch and the account menu are read with the shell's source.
const SHELL = ['AppShell.tsx', 'AccountMenu.tsx', 'ThemeToggle.tsx']
  .map((file) => readFileSync(path.join(here, '../../react/src', file), 'utf8')).join('\n');
const SHEETS = ['base.css', 'layout.css', 'topbar.css', 'nav.css', 'button.css']
  .map((file) => readFileSync(path.join(here, file), 'utf8')).join('\n');

// One entry per <a>/<button> the shell writes with a literal class list.
const shellControls = () => [...SHELL.matchAll(/<(a|button)\s[^>]*className="([^"{}]+)"/g)]
  .map((match) => ({ tag: match[1], classes: match[2].split(/\s+/).filter(Boolean) }));

// Rules that paint the kit ring, with the selectors that reach it.
const ringSelectors = (css) => [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
  .filter(([, , body]) => /outline:\s*var\(--ring\)/.test(body))
  .flatMap(([, selector]) => splitSelectorList(selector))
  .filter((part) => part.includes(':focus-visible'));

// An element is covered when any one of its classes reaches a ring rule.
const covered = (selectors, control) => control.classes
  .some((cls) => selectors.some((part) => new RegExp(`\\.${cls}(?![\\w-])[^,]*:focus-visible`).test(part)));

test('every link and button the shell writes takes the kit ring', () => {
  const controls = shellControls();
  // 5 -> 6: the React rail layout adds the brand link on the phone band.
  assert.equal(controls.length, 6, 'every shell control with a literal class list must be measured');
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

// A focused field keeps one accent ring. The four classes that draw their own border hide
// its ink while the ring shows. The browser captures check the painted line; this check holds
// the declarations and rejects a border brought back under the ring. why: #661
const FIELD_FOCUS = [
  ['input.css', '.ui-input:focus-visible'],
  ['input.css', '.ui-textarea:focus-visible'],
  ['input.css', '.ui-select:focus-visible'],
  ['dropdown.css', '.ui-dropdown__search-input:focus-visible'],
];
const fieldFocusBody = (sheet, selector) => {
  const css = sheet.replace(/\/\*[\s\S]*?\*\//g, '');
  const matches = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter(([, head]) => splitSelectorList(head).includes(selector));
  assert.equal(matches.length, 1, `${selector} needs one field focus rule`);
  return matches[0][2];
};
const checkFieldFocus = (sheets) => {
  assert.equal(FIELD_FOCUS.length, 4, 'text, textarea, select and Dropdown search are measured');
  for (const [file, selector] of FIELD_FOCUS) {
    const body = fieldFocusBody(sheets[file], selector);
    assert.match(body, /border-color:\s*transparent\s*;/, `${selector} hides its own border ink`);
    assert.match(body, /outline:\s*var\(--ring\)/, `${selector} keeps the kit ring`);
    assert.match(body, /outline-offset:\s*var\(--ring-offset\)/, `${selector} keeps the gap`);
  }
};

test('focused fields keep one ring with a transparent border', () => {
  const sheets = Object.fromEntries([...new Set(FIELD_FOCUS.map(([file]) => file))]
    .map((file) => [file, readFileSync(path.join(here, file), 'utf8')]));
  checkFieldFocus(sheets);
  for (const file of Object.keys(sheets)) {
    const changed = { ...sheets, [file]: sheets[file].replace('border-color: transparent;', 'border-color: var(--field-edge);') };
    assert.throws(() => checkFieldFocus(changed), /hides its own border ink/);
  }
});
