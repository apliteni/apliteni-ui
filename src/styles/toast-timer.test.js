// What callout.css guarantees about a toast's timer line, read as text: JSDOM runs no
// animation and resolves no @media. The React Toast's own tests drive the pause.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { colourOf, composite, ratio, tokensFor } from '../../stories/lib/contrast.js';

const callout = readFileSync(new URL('./callout.css', import.meta.url), 'utf8');

test('the timer line and the ring pause under the pointer and under focus', () => {
  const rule = callout.match(/([^{}]*\.ui-toast__timer[^{}]*)\{[^}]*animation-play-state:\s*paused[^}]*\}/);
  assert.ok(rule, 'no rule pauses the timer line');
  for (const state of [':hover', ':focus-within']) {
    assert.ok(rule[1].includes(`.ui-toast${state} > .ui-toast__timer.is-running`), `the line does not pause on ${state}`);
    assert.ok(rule[1].includes(`.ui-toast${state} .ui-toast__ring-arc.is-running`), `the ring does not pause on ${state}`);
  }
});

test('reduced motion hides the timer line, and the ring steps instead of gliding', () => {
  const block = callout.match(/@media \(prefers-reduced-motion: reduce\)\s*\{([\s\S]*?)\n\}/);
  assert.match(block[1], /\.ui-toast__timer\s*\{[^}]*display:\s*none/);
  // The kit's net would end a running ring at once, so the ring drops its animation and the script steps it.
  assert.match(block[1], /\.ui-toast__ring-arc\.is-running\s*\{[^}]*animation:\s*none/);
  assert.doesNotMatch(block[1], /\.ui-toast__ring[^{]*\{[^}]*display:\s*none/);
});

test('forced colours keep the ring and give it a system colour', () => {
  const block = callout.match(/@media \(forced-colors: active\)\s*\{([\s\S]*?)\n\}/);
  assert.ok(block, 'callout.css has no forced-colours block for the ring');
  assert.match(block[1], /\.ui-toast__ring\s*\{[^}]*color:\s*ButtonText/);
  assert.doesNotMatch(block[1], /display:\s*none/);
});

test('the action hover fill shows on the notice ground in both themes', () => {
  const fills = {
    dark: callout.match(/\n\.ui-toast__action:hover\s*\{[^}]*background:\s*([^;]+);/)[1].trim(),
    light: callout.match(/:root\[data-theme="light"\]\) \.ui-toast__action:hover\s*\{[^}]*background:\s*([^;]+);/)?.[1].trim(),
  };
  for (const [theme, fill] of Object.entries(fills)) {
    assert.ok(fill, `callout.css has no ${theme} hover fill for the action`);
    const vars = tokensFor(theme);
    const ground = colourOf('var(--surface)', vars);
    const step = ratio(composite(colourOf(fill, vars), ground), ground);
    // The light fill steps 1.14:1 and the dark fill 1.11:1. A fill equal to the ground steps 1.
    assert.ok(step >= 1.05, `${theme}: the hover fill ${fill} steps ${step.toFixed(2)}:1 off the notice ground`);
  }
});
