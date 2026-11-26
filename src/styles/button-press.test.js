// A press reads 80ms (--dur-instant), the frame of feedback under a finger, not
// the control's 150ms (--dur-fast). #900 retimed the press from 150ms to 80ms.
// The cascade is resolved in JSDOM after token substitution; nothing is laid out.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { substitute, tokensFor } from '../../stories/lib/contrast.js';

const rawCss = readFileSync(new URL('./button.css', import.meta.url), 'utf8');

const pressTime = (sheet = rawCss) => {
  const dom = new JSDOM(`<style>${substitute(sheet, tokensFor('light', 'default'))}</style><button class="ui-btn">Save</button>`);
  try {
    const style = dom.window.getComputedStyle(dom.window.document.querySelector('.ui-btn'));
    const props = style.transitionProperty.split(',').map((s) => s.trim());
    const durations = style.transitionDuration.split(',').map((s) => s.trim());
    const at = props.indexOf('transform');
    return { at, duration: durations[at] };
  } finally {
    dom.window.close();
  }
};

test('the press transform reads 80ms (--dur-instant), not the control 150ms', () => {
  const { at, duration } = pressTime();
  assert.notEqual(at, -1, 'no transform transition found to time');
  assert.equal(duration, '0.08s');
});

test('the check reports a press re-timed to the control duration', () => {
  const broken = rawCss.replace('transform var(--dur-instant) var(--ease)', 'transform var(--dur-fast) var(--ease)');
  assert.notEqual(broken, rawCss, 'no press transition found to change');
  assert.equal(pressTime(broken).duration, '0.15s');
});
