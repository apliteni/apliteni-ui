import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { splitSelectorList } from '../../scripts/lib/selector-list.js';
import { inlineLocals } from '../../stories/lib/contrast.js';

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

// Rules that paint the kit ring, outward or inward, with the selectors that reach it.
// The rail rows take the inward band since #789.
const ringSelectors = (css) => [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
  .filter(([, , body]) => /outline:\s*var\(--ring(?:-scroll)?\)/.test(body))
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

// A focused field keeps one accent ring. The five classes that draw their own border hide
// its ink while the ring shows, the Dropdown and DatePicker trigger since #837. The browser captures check the painted line; this check holds
// the declarations and rejects a border brought back under the ring. why: #661
// The edge also fades when focus arrives and when it leaves. A transition that the focus
// rule declares runs only on the way in, so the field's own rule fades a property of its
// own, and a hover's plain border-color changes at once. why: docs/foundations.md#motion
// Limit: it reads the declarations; the fade itself is measured in the PR's Chromium run.
const FIELD_FOCUS = [
  ['input.css', '.ui-input:focus-visible'],
  ['input.css', '.ui-textarea:focus-visible'],
  ['input.css', '.ui-select:focus-visible'],
  ['dropdown.css', '.ui-dropdown__search-input:focus-visible'],
  ['dropdown.css', '.ui-dropdown__trigger:focus-visible'],
];
const rulesOf = (sheet) => [...sheet.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^{}]*)\}/g)]
  .map(([, head, body]) => ({ selectors: splitSelectorList(head), body }));
const fieldFocusBody = (sheet, selector) => {
  const matches = rulesOf(sheet).filter(({ selectors }) => selectors.includes(selector));
  assert.equal(matches.length, 1, `${selector} needs one field focus rule`);
  return matches[0].body;
};
const checkFieldFocus = (sheets) => {
  assert.equal(FIELD_FOCUS.length, 5, 'text, textarea, select, Dropdown search and the trigger are measured');
  for (const [file, selector] of FIELD_FOCUS) {
    const raw = fieldFocusBody(sheets[file], selector);
    const body = inlineLocals(raw);
    assert.match(body, /border-color:\s*transparent\s*;/, `${selector} hides its own border ink`);
    assert.match(body, /outline:\s*var\(--ring\)/, `${selector} keeps the kit ring`);
    assert.match(body, /outline-offset:\s*var\(--ring-offset\)/, `${selector} keeps the gap`);
    const edge = /border-color:\s*var\((--[\w-]+)\)/.exec(raw)?.[1];
    assert.ok(edge, `${selector} names no edge property, so its edge cannot fade when focus leaves`);
    assert.doesNotMatch(raw, /(^|;)\s*transition/, `${selector} declares a transition, which runs only when focus arrives`);
    const field = selector.replace(':focus-visible', '');
    const own = rulesOf(sheets[file]).filter(({ selectors }) => selectors.includes(field)).map(({ body: b }) => b).join(';');
    assert.match(own, new RegExp(`transition:[^;]*${edge}\\s`), `${field} does not fade ${edge}, so the edge jumps when focus leaves`);
  }
};

test('focused fields keep one ring with a transparent border, and the edge fades in and out', () => {
  const sheets = Object.fromEntries([...new Set(FIELD_FOCUS.map(([file]) => file))]
    .map((file) => [file, readFileSync(path.join(here, file), 'utf8')]));
  checkFieldFocus(sheets);
  const mutations = [
    [/(--ui-[\w-]+-edge): transparent;/, '$1: var(--field-edge);', /hides its own border ink/],
    // The shape that faded the edge only on the way in.
    [/(--ui-[\w-]+-edge): transparent;\s*border-color: var\(\1\);/, 'border-color: transparent; transition: border-color 1s;', /names no edge property/],
    [/(--ui-[\w-]+-edge): transparent;/, '$1: transparent; transition: border-color 1s;', /runs only when focus arrives/],
    [/transition: (--ui-[\w-]+-edge) [^;]+;/g, '', /jumps when focus leaves/],
  ];
  for (const file of Object.keys(sheets)) {
    for (const [from, to, refusal] of mutations) {
      const changed = { ...sheets, [file]: sheets[file].replace(from, to) };
      assert.notEqual(changed[file], sheets[file], `${file}: the mutation ${from} did not apply`);
      assert.throws(() => checkFieldFocus(changed), refusal);
    }
  }
});

// Words that take the ring, a text link and the words that open a readout, get a corner and
// room at each side, and the margin gives the side room back, so focus moves no word.
// why: #814 (rev_136bd26bc559/d22). Limits: it reads the declarations; that the ring is
// whole inside a clipped phone cell is measured in the PR's captures.
const TOOLTIP = readFileSync(path.join(here, 'tooltip.css'), 'utf8');
const ruleBody = (css, selector) => [...css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^{}]*)\}/g)]
  .find(([, found]) => found.trim() === selector)?.[2];
const roomLentBack = (body) => {
  const room = /(?:^|;)\s*padding(?:-inline)?:\s*([^;]+);/.exec(body)?.[1].trim();
  const margin = /margin-inline:\s*([^;]+);/.exec(body)?.[1].trim();
  return Boolean(room) && margin === `calc(-1 * ${room})` && /border-radius:\s*var\(--radius-xs\)/.test(body);
};

test('a text link and the words that open a readout take a corner and room that moves no word', () => {
  for (const [css, selector] of [[SHEETS, 'a:not([class]):focus-visible'], [TOOLTIP, '.ui-tip-host > .ui-focusable:focus-visible']]) {
    const body = ruleBody(css, selector);
    assert.ok(body, `${selector} has no rule of its own`);
    assert.ok(roomLentBack(body), `${selector} takes no corner, or room that its margin does not give back`);
  }
  // Rejection: room that is not given back pushes the next word along.
  assert.equal(roomLentBack('padding-inline: var(--space-1); border-radius: var(--radius-xs);'), false);
  assert.equal(roomLentBack('padding-inline: var(--space-1); margin-inline: calc(-1 * var(--space-2)); border-radius: var(--radius-xs);'), false);
  assert.equal(roomLentBack('padding-inline: var(--space-1); margin-inline: calc(-1 * var(--space-1));'), false);
});
