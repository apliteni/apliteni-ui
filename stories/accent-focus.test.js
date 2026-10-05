/* A focused selected vanilla swatch draws one accent edge: the kit's focus ring.
 *
 * Selection is said inside the circle, by the tick stories/accent-mark.test.js
 * measures, so the edge a selected swatch draws while focused is the edge an
 * unselected one draws — and this gate compares the two. Every case puts the page
 * on a DIFFERENT accent from the one selected, because a band in the selected
 * swatch's own accent is what has to be absent.
 *
 * The limits of the measurement, including the halo it cannot composite, are in
 * stories/lib/accent-focus.js. See issues #429 and #472.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { ratio } from './lib/contrast.js';
import { accentPicker } from '../src/components/index.js';
import { ACCENTS, accentSwatchStyle } from '../src/logic/accents.js';
import { accentColour, accentPickerCss, measureSelectionMark, paints } from './lib/accent-mark.js';
import { BAND_FLOOR, measureFocusedEdge, ringGround } from './lib/accent-focus.js';

/** A page accent that is NOT the one being selected. */
const otherThan = (accent) => ACCENTS[(ACCENTS.indexOf(accent) + 1) % ACCENTS.length];

for (const theme of ['light', 'dark']) {
  test(`a focused selected swatch draws one accent edge in ${theme}`, () => {
    const choices = new JSDOM(accentPicker()).window;
    const accents = [...choices.document.querySelectorAll('button')].map((b) => b.dataset.accentPick);
    choices.close();
    assert.deepEqual([...accents].sort(), [...ACCENTS].sort(), 'all shipped choices discovered');

    const measured = [];
    for (const accent of accents) {
      const page = otherThan(accent);
      const css = accentPickerCss(theme, page, accentSwatchStyle(accent));
      const win = new JSDOM(accentPicker({ active: accent })).window;
      const style = win.document.createElement('style');
      style.textContent = css;
      win.document.head.appendChild(style);
      const buttons = [...win.document.querySelectorAll('button')];
      const selected = buttons.find((button) => button.classList.contains('is-active'));
      const unselected = buttons.find((button) => !button.classList.contains('is-active'));
      assert.ok(selected && unselected, 'one swatch is selected and another is not');
      // desugar() in accentPickerCss rewrites :focus-visible to this attribute,
      // because JSDOM matches no focus pseudo-class of its own.
      for (const button of [selected, unselected]) button.setAttribute('data-ui-state', 'focus-visible');

      const want = {
        ring: accentColour(theme, page),
        selection: accentColour(theme, accent),
        accents: ACCENTS.map((a) => accentColour(theme, a)),
        ground: ringGround(theme, page),
      };
      const { bands, ratios, halos } = measureFocusedEdge(selected, win, want);
      assert.equal(halos, 0, 'the band has no halo since #578, on this control as on every other');
      for (const prop of ['boxShadow', 'outline', 'outlineOffset']) {
        assert.equal(
          win.getComputedStyle(selected)[prop], win.getComputedStyle(unselected)[prop],
          `selecting a swatch changes its ${prop}, so it adds to the edge it draws when focused. `
          + 'Whether this swatch is on is said by the tick inside the circle, which is the one '
          + 'signal that is not an accent',
        );
      }
      // Focus cannot erase that tick: the mark gate's own first assertion is that
      // exactly one rule in the picker's sheet draws a pseudo-element, so there
      // is no second rule able to cancel it under :focus-visible.
      const { ink, stops } = measureSelectionMark(css, want.accents);

      // The two compositions #472 shipped, in the order it shipped them: the
      // selection band laid straight against the kit's band, then the same band
      // given the ring's own gap width as a separator. Both have to be rejected,
      // or the assertions above are decoration.
      const ring = bands.at(-1);
      const gap = bands.at(-2) ?? { spread: ring.spread - ring.width, raw: paints(want.ground) };
      const resting = win.getComputedStyle(selected).boxShadow;
      const band = (spread, colour) => `0 0 0 ${spread}px ${colour}`;
      for (const [why, shadow] of [
        ['laid straight against the kit band', [
          band(gap.spread, gap.raw), band(ring.spread + 2, paints(want.selection)),
        ]],
        ['separated from it by the ring\'s own gap', [
          band(gap.spread, gap.raw),
          band(ring.spread + gap.spread, gap.raw), band(ring.spread + gap.spread + 2, paints(want.selection)),
        ]],
      ]) {
        selected.style.boxShadow = shadow.join(', ');
        assert.throws(
          () => measureFocusedEdge(selected, win, want),
          /own accent/,
          `a selection band ${why} must fail this gate`,
        );
      }
      // And a second band that claims no accent but is still close enough to the
      // ring's colour to read as one thick edge.
      const nearly = `rgb(${ring.colour.slice(0, 3).map((c) => Math.min(255, Math.round(c) + 4)).join(', ')})`;
      selected.style.boxShadow = [band(gap.spread, gap.raw), band(ring.spread + 2, nearly)].join(', ');
      assert.throws(
        () => measureFocusedEdge(selected, win, want),
        new RegExp(`under the ${BAND_FLOOR}:1 ring floor`),
        'a second band laid against the ring in nearly its own colour must fail this gate',
      );
      selected.style.boxShadow = resting;
      // And an edge with no ring on it at all. The band is an outline since #578, so
      // this is the carrier that has to go away for the ring to be missing.
      selected.style.outline = 'none';
      assert.throws(() => measureFocusedEdge(selected, win, want), /outline since #578/);
      // Put back on a box-shadow, the retired carrier draws nothing a browser paints
      // and must not read as the band either.
      selected.style.boxShadow = [band(gap.spread, gap.raw), band(ring.spread, ring.raw)].join(', ');
      assert.throws(() => measureFocusedEdge(selected, win, want), /outline since #578/);
      selected.style.outline = '';
      selected.style.boxShadow = '';

      win.close();
      style.remove();
      measured.push({
        accent,
        page,
        ratios,
        // Recorded, not asserted: the ring's gap band against the gradient the
        // circle wears. The gap is part of the indicator rather than a signal of
        // its own — the band it separates is read against the ground on both
        // sides, which the ratios above are — and the kit gives every
        // accent-filled control the same geometry. In light the circle's own dark
        // ramp sits close to the page, which is why the selection mark, and not
        // this edge, is what says the swatch is on.
        fill: stops.map((stop) => ratio(gap.colour, stop)),
        mark: stops.map((stop) => ratio(ink, stop)),
      });
    }

    assert.equal(measured.length, accents.length, 'every selected choice measured while focused');
    assert.ok(
      measured.every(({ ratios }) => ratios.length >= 2),
      'each edge reports a ratio per pair of bands that touch, plus the outermost against the ground',
    );
    assert.ok(
      measured.every(({ mark }) => Math.min(...mark) >= BAND_FLOOR),
      `every focused selected swatch keeps a mark at ${BAND_FLOOR}:1 or better on its own circle: `
      + measured.map(({ accent, mark }) => `${accent} ${mark.map((r) => r.toFixed(2)).join('/')}`).join(', '),
    );
  });
}
