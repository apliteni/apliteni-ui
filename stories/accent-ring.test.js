/* The vanilla picker's selection ring names the swatch it rings.
 *
 * Every case here puts the PAGE on a different accent from the selected swatch,
 * which is the only arrangement that can tell the swatch's own colour from
 * var(--accent). The ring is also held to 3:1 contrast against the gap it sits
 * in, the WCAG non-text floor for a state indicator.
 *
 * JSDOM reads the source cascade: it does not read browser paint, antialiasing,
 * the focus ring or anything an assistive technology announces, and the rest of
 * the measurement's limits are listed in stories/lib/accent-ring.js.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { accentPicker } from '../src/components/index.js';
import { ACCENTS, accentSwatchStyle } from '../src/logic/accents.js';
import { accentColour, accentRingCss, measureAccentRing, paints } from './lib/accent-ring.js';

/** A page accent that is NOT the one being selected. */
const otherThan = (accent) => ACCENTS[(ACCENTS.indexOf(accent) + 1) % ACCENTS.length];

for (const theme of ['light', 'dark']) {
  test(`vanilla selected swatches ring in their own accent in ${theme}`, () => {
    const choices = new JSDOM(accentPicker()).window;
    const accents = [...choices.document.querySelectorAll('button')].map((b) => b.dataset.accentPick);
    choices.close();
    assert.deepEqual([...accents].sort(), [...ACCENTS].sort(), 'all shipped choices discovered');
    let measured = 0;
    for (const accent of accents) {
      const page = otherThan(accent);
      const win = new JSDOM(accentPicker({ active: accent })).window;
      const style = win.document.createElement('style');
      style.textContent = accentRingCss(theme, page, accentSwatchStyle(accent));
      win.document.head.appendChild(style);
      const selected = win.document.querySelectorAll('button.is-active');
      assert.equal(selected.length, 1);

      measureAccentRing(selected[0], win, accentColour(theme, accent));
      // The page accent is a different colour here, so "ring == own accent"
      // above is a real comparison and not two names for one value.
      assert.notEqual(paints(accentColour(theme, accent)), paints(accentColour(theme, page)));
      assert.throws(
        () => measureAccentRing(selected[0], win, accentColour(theme, page)),
        /not the swatch it rings/,
        'a ring in the page accent must fail this gate',
      );
      selected[0].style.boxShadow = 'none';
      assert.throws(() => measureAccentRing(selected[0], win, accentColour(theme, accent)), /has a box-shadow/);
      win.close();
      style.remove();
      measured++;
    }
    assert.equal(measured, accents.length, 'every selected choice measured');
  });
}
