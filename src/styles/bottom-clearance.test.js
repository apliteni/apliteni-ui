import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// --ui-app-bottom-clearance is a published guarantee and lives only in CSS, which
// jsdom does not render and no mounted test reads. These checks hold the four
// declarations the contract is made of, in the sheets that ship them.
//
// Limits: this reads the sheets, not a layout. That the clearance equals the bar
// it clears, and that a scrolled action lands above it, is the browser's, and the
// showcase captures at 390 carry that evidence. Consumers reading the token in
// their own CSS are outside this repository and outside this check.
// why: docs/specification.md#react-appshell
const here = path.dirname(fileURLToPath(import.meta.url));
const read = (file) => readFileSync(path.join(here, '../../react/src', file), 'utf8');
const SHELL = read('AppShell.css');
const TOAST = read('Toast.css');

// Each case names the sheet it holds, the line it must find, and the mutation that
// has to break it — a declaration nothing rejects is a declaration nothing holds.
const CASES = [
  {
    what: 'the clearance is declared under the bar, not the shell',
    sheet: () => SHELL,
    find: /:root:has\(\.ui-react-app__bottom\)\s*\{[^}]*--ui-app-bottom-clearance:\s*calc\(96px \+ env\(safe-area-inset-bottom\)\)/,
    // The regression this gate exists for: key it on the shell again and every
    // one-section phone page pads 96px for a bar it does not draw.
    breaks: (css) => css.replace(':root:has(.ui-react-app__bottom)', ':root:has(.ui-react-app)'),
  },
  {
    what: 'the root scroll padding reads the clearance with a 0px fallback',
    sheet: () => SHELL,
    find: /scroll-padding-bottom:\s*var\(--ui-app-bottom-clearance,\s*0px\)/,
    breaks: (css) => css.replace('scroll-padding-bottom: var(--ui-app-bottom-clearance, 0px)',
      'scroll-padding-bottom: var(--ui-app-bottom-clearance)'),
  },
  {
    what: 'the page bottom padding reads the clearance with a 0px fallback',
    sheet: () => SHELL,
    find: /\.ui-react-app \.ui-app__main \{[^}]*padding-bottom:\s*var\(--ui-app-bottom-clearance,\s*0px\)/,
    // Anchored on the rule: `scroll-padding-bottom` ends in the same text, and a
    // bare replace would mutate that line instead and leave this one standing.
    breaks: (css) => css.replace('.ui-app__main { padding-bottom: var(--ui-app-bottom-clearance, 0px)',
      '.ui-app__main { padding-bottom: calc(96px + env(safe-area-inset-bottom))'),
  },
  {
    what: 'the toast stack adds the clearance to its offset, with a 0px fallback',
    sheet: () => TOAST,
    find: /bottom:\s*calc\(var\(--space-4\) \+ var\(--ui-app-bottom-clearance,\s*0px\)\)/,
    breaks: (css) => css.replace('calc(var(--space-4) + var(--ui-app-bottom-clearance, 0px))', 'var(--space-4)'),
  },
];

test('the shipped sheets carry the bottom-clearance contract', () => {
  assert.equal(CASES.length, 4, 'every part of the contract must be measured');
  for (const { what, sheet, find } of CASES) assert.match(sheet(), find, what);
});

test('the check rejects each part of the contract when it is broken', () => {
  for (const { what, sheet, find, breaks } of CASES) {
    const mutated = breaks(sheet());
    assert.notEqual(mutated, sheet(), `the mutation for "${what}" must change the sheet`);
    assert.doesNotMatch(mutated, find, `breaking "${what}" must be rejected`);
  }
});

// The spec is the only place a consumer reads the condition from, so it may not
// drift back to the unconditional sentence the token never kept.
test('the specification states the condition the token is declared under', () => {
  const spec = readFileSync(path.join(here, '../../docs/specification.md'), 'utf8');
  assert.match(spec, /While the bottom bar is drawn — below 560px, for a list with somewhere to go — the\s+shell sets `--ui-app-bottom-clearance`/);
  assert.match(spec, /`var\(--ui-app-bottom-clearance, 0px\)`/);
});
