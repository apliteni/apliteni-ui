// What callout.css guarantees about a toast's timer line, read as text: JSDOM runs no
// animation and resolves no @media. The React Toast's own tests drive the pause.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const callout = readFileSync(new URL('./callout.css', import.meta.url), 'utf8');

test('the timer line pauses under the pointer and under focus', () => {
  const rule = callout.match(/([^{}]*\.ui-toast__timer[^{}]*)\{[^}]*animation-play-state:\s*paused[^}]*\}/);
  assert.ok(rule, 'no rule pauses the timer line');
  for (const state of [':hover', ':focus-within']) {
    assert.ok(rule[1].includes(`.ui-toast${state} > .ui-toast__timer.is-running`), `the line does not pause on ${state}`);
  }
});

test('reduced motion hides the timer line instead of drawing it full', () => {
  const block = callout.match(/@media \(prefers-reduced-motion: reduce\)\s*\{([\s\S]*?)\n\}/);
  assert.match(block[1], /\.ui-toast__timer\s*\{[^}]*display:\s*none/);
});
