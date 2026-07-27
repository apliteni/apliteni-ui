import { test } from 'node:test';
import assert from 'node:assert/strict';
import { prefersReducedMotion, staggerDelay, initReveal, replay } from './motion.js';

// Pure-logic tests only — no jsdom. The rendered Motion story is exercised by
// the axe pass in stories/a11y.test.js; here we verify the framework-free
// helpers behave off-DOM (SSR / node) without throwing.

test('prefersReducedMotion is false when matchMedia is absent (node)', () => {
  assert.equal(typeof globalThis.matchMedia, 'undefined');
  assert.equal(prefersReducedMotion(), false);
});

test('staggerDelay scales linearly and clamps negatives', () => {
  assert.equal(staggerDelay(0), 0);
  assert.equal(staggerDelay(3, 100), 300);
  assert.equal(staggerDelay(2), 240); // default 120ms step
  assert.equal(staggerDelay(-5, 100), 0);
});

test('initReveal no-ops without a document', () => {
  assert.equal(typeof globalThis.document, 'undefined');
  assert.doesNotThrow(() => {
    assert.equal(initReveal(), undefined);
  });
});

test('replay tolerates a missing / style-less element', () => {
  assert.doesNotThrow(() => {
    replay(null);
    replay({});
  });
});

test('replay resets and clears the inline animation on a fake element', () => {
  const calls = [];
  const el = { offsetWidth: 0, style: { set animation(v) { calls.push(v); } } };
  replay(el);
  assert.deepEqual(calls, ['none', '']);
});
