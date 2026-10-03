import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import {
  prefersReducedMotion, staggerDelay, initReveal, replay, playEntrance, ENTRANCE_FALLBACK_MS,
  transitionMs,
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

/* transitionMs() — the length a caller waiting on a fade sizes its backstop timer
 * from. jsdom reports back whatever is written inline, which is enough to hold the
 * arithmetic: the unit, the longest of a list, and the delay that goes with it.
 *
 * LIMITS: jsdom resolves no cascade and no tokens, so a value spelled
 * `var(--dur-med)` is not what is read here. That the panel this is called on
 * actually computes to 250ms is measured in a browser by
 * scripts/evidence/filter-bar-fit.mjs. This process installs no `window` on
 * globalThis, which is the one environment a missing element cannot throw in, so
 * the cases below say nothing about what a consumer's engine does with one:
 * stories/motion-missing-element.test.js asks that with a window present, in
 * jsdom and in Chromium.
 */
const styled = (css) => {
  const { window } = new JSDOM(`<div id="x" style="${css}"></div>`);
  return window.document.getElementById('x');
};

test('transitionMs reads a duration in either unit', () => {
  assert.equal(transitionMs(styled('transition-duration: 250ms')), 250);
  assert.equal(transitionMs(styled('transition-duration: 0.4s')), 400);
});

test('transitionMs takes the longest property, with its own delay', () => {
  // The dropdown panel's shape: three properties, one of them the longest.
  assert.equal(transitionMs(styled('transition-duration: 120ms, 250ms, 80ms')), 250);
  // A delay list shorter than the duration list repeats, as the spec says.
  assert.equal(transitionMs(styled('transition-duration: 100ms, 250ms; transition-delay: 50ms')), 300);
  assert.equal(
    transitionMs(styled('transition-duration: 100ms, 200ms; transition-delay: 300ms, 0ms')),
    400,
    'the longest SUM, not the longest duration',
  );
});

test('transitionMs is 0 where there is nothing to read', () => {
  // A backstop timer of 0 still fires; one of NaN never does, which is the failure
  // this guards — an element off the DOM, or one whose view has gone. Where a
  // window IS present these same arguments reach getComputedStyle, which refuses
  // them; that is the gate named above, not this test.
  assert.equal(transitionMs(null), 0);
  assert.equal(transitionMs(undefined), 0);
  assert.equal(transitionMs({}), 0);
  assert.equal(transitionMs(styled('color: red')), 0);
});
