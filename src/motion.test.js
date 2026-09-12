import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import {
  prefersReducedMotion, staggerDelay, initReveal, replay, playEntrance, ENTRANCE_FALLBACK_MS,
} from './motion.js';

// The rendered Motion story is exercised by the axe pass in stories/a11y.test.js;
// here we verify the framework-free helpers behave off-DOM (SSR / node) without
// throwing. The playEntrance tests below use a jsdom element without installing
// a document on globalThis.

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

// playEntrance() runs on a jsdom element without putting a document on
// globalThis, so the off-DOM tests above still see no document.
const mounted = () => {
  const { window } = new JSDOM('<div id="x"><span id="kid"></span></div>');
  return { node: window.document.getElementById('x'), window };
};

test('playEntrance adds the class and takes it off at the element’s own animationend', () => {
  const { node, window } = mounted();
  playEntrance(node);
  assert.ok(node.classList.contains('is-entering'));
  node.dispatchEvent(new window.Event('animationend'));
  assert.equal(node.classList.contains('is-entering'), false);
});

test('a descendant’s animationend bubbling up does not end the entrance', () => {
  const { node, window } = mounted();
  playEntrance(node, 'is-arriving');
  node.querySelector('#kid').dispatchEvent(new window.Event('animationend', { bubbles: true }));
  assert.ok(node.classList.contains('is-arriving'), 'a child finishing is not the element finishing');
  node.dispatchEvent(new window.Event('animationend'));
  assert.equal(node.classList.contains('is-arriving'), false);
});

test('with no animationend the class still comes off, after the fallback', () => {
  mock.timers.enable({ apis: ['setTimeout'] });
  try {
    const { node } = mounted();
    playEntrance(node);
    mock.timers.tick(ENTRANCE_FALLBACK_MS - 1);
    assert.ok(node.classList.contains('is-entering'));
    mock.timers.tick(1);
    assert.equal(node.classList.contains('is-entering'), false, 'left half-applied');
  } finally {
    mock.timers.reset();
  }
});

test('playing again restarts the entrance and cancels the first one’s fallback', () => {
  mock.timers.enable({ apis: ['setTimeout'] });
  try {
    const { node } = mounted();
    playEntrance(node);
    mock.timers.tick(ENTRANCE_FALLBACK_MS - 100);
    playEntrance(node);
    mock.timers.tick(200); // past the first call's fallback
    assert.ok(node.classList.contains('is-entering'), 'the first fallback cut the second entrance short');
    mock.timers.tick(ENTRANCE_FALLBACK_MS);
    assert.equal(node.classList.contains('is-entering'), false);
  } finally {
    mock.timers.reset();
  }
});

test('playEntrance tolerates nothing to play on', () => {
  assert.doesNotThrow(() => { playEntrance(null); playEntrance({}); });
});

// The fallback exists for an animation that never ran, so it must outlast the
// slowest one the kit can play. Read from the token file, not restated.
test('the entrance fallback outlasts the slowest duration token', () => {
  const tokens = readFileSync(new URL('./tokens/tokens.css', import.meta.url), 'utf8');
  const times = [...tokens.matchAll(/--dur-[\w-]+\s*:\s*var\(\s*--[\w-]+\s*,\s*(\d*\.?\d+)(m?s)\s*\)/g)]
    .map(([, n, unit]) => Number(n) * (unit === 's' ? 1000 : 1));
  assert.ok(times.length >= 2, 'the --dur-* tokens were not found in src/tokens/tokens.css');
  assert.ok(
    ENTRANCE_FALLBACK_MS > Math.max(...times),
    `ENTRANCE_FALLBACK_MS is ${ENTRANCE_FALLBACK_MS}ms and the slowest token is ${Math.max(...times)}ms, `
    + 'so the fallback would cut a real entrance short',
  );
});
