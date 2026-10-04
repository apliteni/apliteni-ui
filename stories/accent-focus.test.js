/* A selected vanilla swatch that also holds keyboard focus keeps both signals.
 *
 * The edge then carries two colours — the page's accent, which the kit's focus
 * ring paints, and the selected swatch's own accent — so every case here puts the
 * page on a DIFFERENT accent from the one selected. Two bands in one colour
 * cannot fail an adjacency check, and a gate that sets them equal proves nothing.
 *
 * This is the state stories/accent-ring.test.js cannot reach: that gate measures
 * the resting two-layer shadow, where one band stands in one gap. The limits of
 * the measurement, including the halo it cannot composite, are listed in
 * stories/lib/accent-focus.js. See issues #429 and #472.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { accentPicker } from '../src/components/index.js';
import { ACCENTS, accentSwatchStyle } from '../src/logic/accents.js';
import { accentColour, accentRingCss } from './lib/accent-ring.js';
import { BAND_FLOOR, measureFocusedBands, ringGap } from './lib/accent-focus.js';

/** A page accent that is NOT the one being selected. */
const otherThan = (accent) => ACCENTS[(ACCENTS.indexOf(accent) + 1) % ACCENTS.length];

for (const theme of ['light', 'dark']) {
  test(`a focused selected swatch separates focus from selection in ${theme}`, () => {
    const choices = new JSDOM(accentPicker()).window;
    const accents = [...choices.document.querySelectorAll('button')].map((b) => b.dataset.accentPick);
    choices.close();
    assert.deepEqual([...accents].sort(), [...ACCENTS].sort(), 'all shipped choices discovered');

    const measured = [];
    for (const accent of accents) {
      const page = otherThan(accent);
      const win = new JSDOM(accentPicker({ active: accent })).window;
      const style = win.document.createElement('style');
      style.textContent = accentRingCss(theme, page, accentSwatchStyle(accent));
      win.document.head.appendChild(style);
      const selected = win.document.querySelector('button.is-active');
      assert.ok(selected, 'one swatch is selected');
      // desugar() in accentRingCss rewrites :focus-visible to this attribute,
      // because JSDOM matches no focus pseudo-class of its own.
      selected.setAttribute('data-ui-state', 'focus-visible');

      const want = { ring: accentColour(theme, page), selection: accentColour(theme, accent), ground: ringGap(theme, page) };
      const { bands, ratios, halos } = measureFocusedBands(selected, win, want);
      assert.equal(halos, 1, 'the kit ring brings its one halo, which this gate skips and the browser samples cover');

      // The failing mutation: the composition this PR replaced, where the
      // selection band was laid straight against the kit's band with nothing
      // between them. It must be rejected, or the gate above is decoration.
      const ringWidth = bands[1].spread;
      selected.style.boxShadow = `0 0 0 ${bands[0].spread}px ${bands[0].raw}, `
        + `0 0 0 ${ringWidth}px ${bands[1].raw}, 0 0 0 ${ringWidth + 3}px ${bands.at(-1).raw}`;
      assert.throws(
        () => measureFocusedBands(selected, win, want),
        new RegExp(`under the ${BAND_FLOOR}:1 ring floor`),
        'two coloured bands laid against each other must fail this gate',
      );
      // And a composition that keeps only the focus ring must fail too: it is
      // legible, and it has erased the only mark saying which accent is on.
      selected.style.boxShadow = `0 0 0 ${bands[0].spread}px ${bands[0].raw}, 0 0 0 ${ringWidth}px ${bands[1].raw}`;
      assert.throws(() => measureFocusedBands(selected, win, want), /focus erased the selection band/);

      win.close();
      style.remove();
      measured.push({ accent, page, ratios });
    }

    assert.equal(measured.length, accents.length, 'every selected choice measured while focused');
    assert.ok(measured.every(({ ratios }) => ratios.length >= 3),
      'each edge reports a ratio per pair of bands that touch, plus the outermost against the ground');
  });
}
