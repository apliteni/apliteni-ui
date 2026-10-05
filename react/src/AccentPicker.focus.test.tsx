// A focused selected React swatch draws one accent edge: the kit's focus ring.
//
// Selection is said inside the circle, by the tick AccentPicker.mark.test.tsx
// measures, so the edge a selected swatch draws while it holds focus is the same
// edge an unselected one draws — and this gate compares the two. Every case puts
// the page on a DIFFERENT accent from the one selected, because a band in the
// selected swatch's own accent is what has to be absent. AccentPicker.mark
// .test.tsx reads a declaration out of the sheet and cannot see what the cascade
// leaves on the edge once `.is-active` and `:focus-visible` have both matched.
// The arithmetic is shared with the vanilla gate; the coverage is separate. Since
// #578 the band is an `outline` and the swatch keeps a `box-shadow` of its own, so
// the edge is what the two draw together and the gate reads both. The measurement's
// limits are listed in stories/lib/accent-focus.js. See issues #429, #472 and #578.
import { cleanup, render } from '@testing-library/react';
import { ACCENTS, accentSwatchStyle } from '@apliteni/apliteni-ui';
import { AccentPicker, type Accent } from './AccentPicker';
// @ts-expect-error -- shared contrast arithmetic; coverage stays in this workspace.
import { accentColour, accentPickerCss, measureSelectionMark, paints } from '../../stories/lib/accent-mark.js';
// @ts-expect-error -- shared contrast arithmetic; coverage stays in this workspace.
import { BAND_FLOOR, measureFocusedEdge, ringGround } from '../../stories/lib/accent-focus.js';

/** A page accent that is NOT the one being selected. */
const otherThan = (accent: Accent) => ACCENTS[(ACCENTS.indexOf(accent) + 1) % ACCENTS.length];

afterEach(() => { cleanup(); });

for (const theme of ['light', 'dark']) {
  it(`draws one accent edge on the focused selected swatch in ${theme}`, () => {
    expect(ACCENTS).toHaveLength(4);
    let measured = 0;
    for (const accent of ACCENTS) {
      const page = otherThan(accent);
      const css = accentPickerCss(theme, page, accentSwatchStyle(accent));
      const style = document.createElement('style');
      style.textContent = css;
      document.head.appendChild(style);
      const { container } = render(<AccentPicker value={accent} onChange={() => {}} />);
      const buttons = [...container.querySelectorAll<HTMLElement>('button')];
      const selected = buttons.find(button => button.classList.contains('is-active'));
      const unselected = buttons.find(button => !button.classList.contains('is-active'));
      expect(selected && unselected).toBeTruthy();
      // desugar() in accentPickerCss rewrites :focus-visible to this attribute,
      // because JSDOM matches no focus pseudo-class of its own.
      for (const button of [selected!, unselected!]) button.setAttribute('data-ui-state', 'focus-visible');

      const want = {
        ring: accentColour(theme, page),
        selection: accentColour(theme, accent),
        accents: ACCENTS.map(a => accentColour(theme, a)),
        ground: ringGround(theme, page),
      };
      const { bands, ratios, halos } = measureFocusedEdge(selected, window, want);
      expect(halos).toBe(0);
      expect(Math.min(...ratios)).toBeGreaterThanOrEqual(BAND_FLOOR);
      // Selecting a swatch adds nothing to the edge it draws when focused, on either
      // carrier the edge is drawn with.
      for (const prop of ['boxShadow', 'outline', 'outlineOffset'] as const) {
        expect(window.getComputedStyle(selected!)[prop])
          .toBe(window.getComputedStyle(unselected!)[prop]);
      }
      // And focus cannot erase the tick: exactly one rule in the picker's sheet
      // draws a pseudo-element, so there is no second rule able to cancel it.
      measureSelectionMark(css, want.accents);

      // The two compositions #472 shipped, in the order it shipped them: the
      // selection band laid straight against the kit's band, then the same band
      // given the ring's own gap width as a separator.
      // The band is the outermost of the two carriers; the swatch's own shadow is
      // inside it, and is the carrier a second signal would arrive on.
      const ring = bands.at(-1)!;
      const gap = bands.at(-2) ?? { spread: ring.spread - ring.width, raw: paints(want.ground) };
      const resting = window.getComputedStyle(selected!).boxShadow;
      const band = (spread: number, colour: string) => `0 0 0 ${spread}px ${colour}`;
      for (const shadow of [
        [band(gap.spread, gap.raw), band(ring.spread + 2, paints(want.selection))],
        [band(gap.spread, gap.raw),
          band(ring.spread + gap.spread, gap.raw), band(ring.spread + gap.spread + 2, paints(want.selection))],
      ]) {
        selected!.style.boxShadow = shadow.join(', ');
        expect(() => measureFocusedEdge(selected, window, want)).toThrow('own accent');
      }
      // A second band that claims no accent but is still close enough to the
      // ring's colour to read as one thick edge.
      const nearly = `rgb(${ring.colour.slice(0, 3).map((c: number) => Math.min(255, Math.round(c) + 4)).join(', ')})`;
      selected!.style.boxShadow = [band(gap.spread, gap.raw), band(ring.spread + 2, nearly)].join(', ');
      expect(() => measureFocusedEdge(selected, window, want)).toThrow(`under the ${BAND_FLOOR}:1 ring floor`);
      selected!.style.boxShadow = resting;
      // And an edge with no ring on it at all. The band is an outline since #578,
      // and putting it back on a box-shadow draws nothing a browser paints.
      selected!.style.outline = 'none';
      expect(() => measureFocusedEdge(selected, window, want)).toThrow('outline since #578');
      selected!.style.boxShadow = [band(gap.spread, gap.raw), band(ring.spread, ring.raw)].join(', ');
      expect(() => measureFocusedEdge(selected, window, want)).toThrow('outline since #578');
      selected!.style.outline = '';
      selected!.style.boxShadow = '';

      cleanup();
      style.remove();
      measured++;
    }
    expect(measured).toBe(ACCENTS.length);
  });
}
