/**
 * The segmented control's chosen option is a raised step and nothing else.
 *
 * Pinned, not floored: the step is below the 3:1 WCAG 1.4.11 asks of a state
 * indicator, and that is the accepted cost of the option Artur picked on r23,
 * so a floor here would assert a bar this control knowingly does not clear.
 * The numbers otherwise lived only in a PR body, where the next edit to either
 * token would have moved them with nobody measuring. docs/components.md states the
 * step for a consumer; this holds it.
 * Forced-colors mode, where the step is gone entirely, is covered next door in
 * src/styles/segmented.test.js. why: #475, measured on #473
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseColour, ratio, substitute, tokensFor } from './lib/contrast.js';

const THEMES = ['dark', 'light'];
const resolve = (name, theme) => parseColour(substitute(`var(${name})`, tokensFor(theme)));

/** Measured in Chromium, and recomputed from the tokens here on every run. */
const STEP = { dark: 1.51, light: 1.18 };

/** The ink does not help: --strong against --text is a rounding error apart. */
const INK_IS_NOT_A_CUE = 1.5;

test('the raised step is the pinned value in both themes', () => {
  for (const theme of THEMES) {
    const pill = resolve('--seg-active-bg', theme);
    const track = resolve('--surface-2', theme);
    assert.ok(pill && track, `${theme}: the step's two tokens must both resolve`);
    const measured = ratio(pill, track);
    assert.equal(
      Number(measured.toFixed(2)), STEP[theme],
      `\nthe ${theme} step moved to ${measured.toFixed(2)}:1; it was pinned at ${STEP[theme]}:1.\n`
      + 'This is the whole visible difference between a chosen segment and its neighbours.\n'
      + 'If you raised it, say so and move the number. If you lowered it, the control is\n'
      + 'losing the only cue it has. Either way a person decides, not a re-run.\n',
    );
  }
});

test('the step is below the state-indicator floor, which is why it is pinned and not floored', () => {
  for (const theme of THEMES) {
    assert.ok(
      STEP[theme] < 3,
      `the ${theme} step now clears 3:1 — retire this exemption and give the control a real floor`,
    );
  }
});

test('ink is not a second cue, so the reader page may say the step carries selection alone', () => {
  for (const theme of THEMES) {
    const chosen = resolve('--strong', theme);
    const other = resolve('--text', theme);
    const measured = ratio(chosen, other);
    assert.ok(
      measured < INK_IS_NOT_A_CUE,
      `${theme}: --strong now reads ${measured.toFixed(2)}:1 against --text. If the ink became a real\n`
      + 'second cue, docs/components.md and this file both understate the control and should say so.',
    );
  }
});

test('the tokens the step is made of are opaque, so the measurement means something', () => {
  for (const theme of THEMES) {
    for (const name of ['--seg-active-bg', '--surface-2']) {
      const [, , , alpha] = resolve(name, theme);
      assert.equal(alpha, 1, `${theme}: ${name} is translucent, so the step cannot be measured from tokens alone`);
    }
  }
});
