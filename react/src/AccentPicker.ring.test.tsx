// The React picker's selection ring names the swatch it rings.
//
// Every case puts the PAGE on a different accent from the selected swatch, which
// is the only arrangement that can tell the swatch's own colour from
// var(--accent). JSDOM reads the source cascade of segmented.css; browser
// captures cover paint, the focus ring and geometry. The measurement's limits
// are listed in stories/lib/accent-ring.js.
import { cleanup, render } from '@testing-library/react';
import { ACCENTS, accentSwatchStyle } from '@apliteni/apliteni-ui';
import { AccentPicker, type Accent } from './AccentPicker';
// @ts-expect-error -- shared contrast arithmetic; coverage stays in this workspace.
import { accentColour, accentRingCss, measureAccentRing, paints } from '../../stories/lib/accent-ring.js';

/** A page accent that is NOT the one being selected. */
const otherThan = (accent: Accent) => ACCENTS[(ACCENTS.indexOf(accent) + 1) % ACCENTS.length];

afterEach(() => { cleanup(); });

for (const theme of ['light', 'dark']) {
  it(`rings the selected swatch in its own accent in ${theme}`, () => {
    expect(ACCENTS).toHaveLength(4);
    let measured = 0;
    for (const accent of ACCENTS) {
      const page = otherThan(accent);
      const style = document.createElement('style');
      style.textContent = accentRingCss(theme, page, accentSwatchStyle(accent));
      document.head.appendChild(style);
      const { container } = render(<AccentPicker value={accent} onChange={() => {}} />);
      const selected = container.querySelectorAll('button.is-active');
      expect(selected).toHaveLength(1);

      measureAccentRing(selected[0], window, accentColour(theme, accent));
      // The page accent is a different colour here, so "ring == own accent"
      // above is a real comparison and not two names for one value.
      expect(paints(accentColour(theme, accent))).not.toBe(paints(accentColour(theme, page)));
      expect(() => measureAccentRing(selected[0], window, accentColour(theme, page)))
        .toThrow('not the swatch it rings');
      (selected[0] as HTMLElement).style.boxShadow = 'none';
      expect(() => measureAccentRing(selected[0], window, accentColour(theme, accent)))
        .toThrow('has a box-shadow');
      cleanup();
      style.remove();
      measured++;
    }
    expect(measured).toBe(ACCENTS.length);
  });
}

it('takes its accent list and paints from the kit, so the two pickers cannot drift', () => {
  const { container } = render(<AccentPicker value="default" onChange={() => {}} />);
  const painted = [...container.querySelectorAll<HTMLElement>('button')];
  expect(painted.map(button => button.title))
    .toEqual(ACCENTS.map(accent => accent.charAt(0).toUpperCase() + accent.slice(1)));
  for (const [index, accent] of ACCENTS.entries()) {
    for (const [property, value] of Object.entries(accentSwatchStyle(accent))) {
      expect(painted[index].style.getPropertyValue(property)).toBe(value);
    }
  }
});

// wireTopbar(root = document) binds a click handler to every [data-accent-pick]
// it finds, applies the accent and writes it to localStorage. A half-migrated
// page must call it to wire its vanilla footer, so a React picker carrying that
// attribute gets adopted: the page accent changes, storage changes, and React
// never repairs its own DOM because `value` did not change.
it('carries no vanilla wiring hook for wireTopbar to adopt', () => {
  const { container } = render(<AccentPicker value="ocean" onChange={() => {}} />);
  expect(container.querySelectorAll('[data-accent-pick]')).toHaveLength(0);
});
