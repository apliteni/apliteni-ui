// A selected React swatch that also holds keyboard focus keeps both signals.
//
// The edge then carries two colours — the page's accent, which the kit's focus
// ring paints, and the selected swatch's own accent — so every case puts the page
// on a DIFFERENT accent from the one selected. Two bands in one colour cannot
// fail an adjacency check. AccentPicker.ring.test.tsx measures the resting
// shadow, where one band stands in one gap, and cannot reach this state. The
// arithmetic is shared with the vanilla gate; the coverage is separate. The
// measurement's limits, including the halo it cannot composite, are listed in
// stories/lib/accent-focus.js. See issues #429 and #472.
import { cleanup, render } from '@testing-library/react';
import { ACCENTS, accentSwatchStyle } from '@apliteni/apliteni-ui';
import { AccentPicker, type Accent } from './AccentPicker';
// @ts-expect-error -- shared contrast arithmetic; coverage stays in this workspace.
import { accentColour, accentRingCss } from '../../stories/lib/accent-ring.js';
// @ts-expect-error -- shared contrast arithmetic; coverage stays in this workspace.
import { BAND_FLOOR, measureFocusedBands, ringGap } from '../../stories/lib/accent-focus.js';

/** A page accent that is NOT the one being selected. */
const otherThan = (accent: Accent) => ACCENTS[(ACCENTS.indexOf(accent) + 1) % ACCENTS.length];

afterEach(() => { cleanup(); });

for (const theme of ['light', 'dark']) {
  it(`separates focus from selection on the focused selected swatch in ${theme}`, () => {
    expect(ACCENTS).toHaveLength(4);
    let measured = 0;
    for (const accent of ACCENTS) {
      const page = otherThan(accent);
      const style = document.createElement('style');
      style.textContent = accentRingCss(theme, page, accentSwatchStyle(accent));
      document.head.appendChild(style);
      const { container } = render(<AccentPicker value={accent} onChange={() => {}} />);
      const selected = container.querySelector<HTMLElement>('button.is-active');
      expect(selected).not.toBeNull();
      // desugar() in accentRingCss rewrites :focus-visible to this attribute,
      // because JSDOM matches no focus pseudo-class of its own.
      selected!.setAttribute('data-ui-state', 'focus-visible');

      const want = {
        ring: accentColour(theme, page),
        selection: accentColour(theme, accent),
        ground: ringGap(theme, page),
      };
      const { bands, ratios, halos } = measureFocusedBands(selected, window, want);
      expect(halos).toBe(1);
      expect(Math.min(...ratios)).toBeGreaterThanOrEqual(BAND_FLOOR);

      // The failing mutation: the composition this PR replaced, where the
      // selection band was laid straight against the kit's band.
      const ringWidth = bands[1].spread;
      selected!.style.boxShadow = `0 0 0 ${bands[0].spread}px ${bands[0].raw}, `
        + `0 0 0 ${ringWidth}px ${bands[1].raw}, 0 0 0 ${ringWidth + 3}px ${bands.at(-1).raw}`;
      expect(() => measureFocusedBands(selected, window, want)).toThrow(`under the ${BAND_FLOOR}:1 ring floor`);
      // And a composition that keeps only the focus ring: legible, and it has
      // erased the only mark saying which accent is on.
      selected!.style.boxShadow = `0 0 0 ${bands[0].spread}px ${bands[0].raw}, 0 0 0 ${ringWidth}px ${bands[1].raw}`;
      expect(() => measureFocusedBands(selected, window, want)).toThrow('focus erased the selection band');

      cleanup();
      style.remove();
      measured++;
    }
    expect(measured).toBe(ACCENTS.length);
  });
}
