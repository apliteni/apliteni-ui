// The React picker marks the selected swatch with a tick, not with an accent.
//
// Every case puts the PAGE on a different accent from the selected swatch, which
// is the only arrangement that can tell a mark in the swatch's own colour from
// one in var(--accent). The ink is held to 3:1 against both stops of the gradient
// the circle wears and to being no accent at all, because the kit focus ring is
// this control's one accent edge — AccentPicker.focus.test.tsx holds that edge.
// JSDOM reads the source cascade of segmented.css and computes no
// pseudo-element, so the mark is read as the winning declaration; browser
// captures cover paint, the focus ring and geometry. The measurement's limits are
// listed in stories/lib/accent-mark.js.
import { cleanup, render } from '@testing-library/react';
import { ACCENTS, accentSwatchStyle } from '@apliteni/apliteni-ui';
import { AccentPicker, type Accent } from './AccentPicker';
// @ts-expect-error -- shared contrast arithmetic; coverage stays in this workspace.
import {
  MARK_FLOOR, accentColour, accentPickerCss, markDeclaration, markRule, measureSelectionMark, paints,
} from '../../stories/lib/accent-mark.js';

/** A page accent that is NOT the one being selected. */
const otherThan = (accent: Accent) => ACCENTS[(ACCENTS.indexOf(accent) + 1) % ACCENTS.length];

afterEach(() => { cleanup(); });

for (const theme of ['light', 'dark']) {
  it(`marks the selected swatch in ink that reads on it in ${theme}`, () => {
    expect(ACCENTS).toHaveLength(4);
    let measured = 0;
    const inks = new Set<string>();
    for (const accent of ACCENTS) {
      const page = otherThan(accent);
      const notAccents = ACCENTS.map(a => accentColour(theme, a));
      const css = accentPickerCss(theme, page, accentSwatchStyle(accent));
      const { container } = render(<AccentPicker value={accent} onChange={() => {}} />);
      const selected = container.querySelectorAll('button.is-active');
      expect(selected).toHaveLength(1);
      // The selector the measurement reads is the one this render matches, or the
      // declaration below belongs to a rule that never paints.
      expect(selected[0].matches(markRule(css).selector.replace('::after', ''))).toBe(true);

      const { ink, ratios, stops } = measureSelectionMark(css, notAccents);
      expect(Math.min(...ratios)).toBeGreaterThanOrEqual(MARK_FLOOR);
      // The page accent is a different colour here, so "the mark is no accent" is
      // a real comparison and not one value tested against itself.
      expect(paints(accentColour(theme, accent))).not.toBe(paints(accentColour(theme, page)));
      inks.add(paints(ink));

      // The same rejected compositions the vanilla gate proves, over this render.
      // `rewrite` fails loudly rather than matching nothing and reporting a
      // rejection the gate never made.
      const rewrite = (from: string, to: string) => {
        const out = css.replace(from, to);
        expect(out).not.toBe(css);
        return out;
      };
      const border = `border: ${markDeclaration(css, 'border')}`;
      for (const instead of [paints(accentColour(theme, accent)), paints(accentColour(theme, page))]) {
        expect(() => measureSelectionMark(rewrite(border, `border: solid ${instead}`), notAccents))
          .toThrow('which is an accent');
      }
      // The lighter stop, because the darker one IS this accent's own --accent in
      // dark and would be caught by the assertion above instead of by the floor.
      expect(() => measureSelectionMark(rewrite(border, `border: solid ${paints(stops[0])}`), notAccents))
        .toThrow(`under the ${MARK_FLOOR}:1 non-text floor`);
      expect(() => measureSelectionMark(rewrite(markRule(css).selector, '.ui-accent-picker__retired'), notAccents))
        .toThrow('exactly one pseudo-element');
      // A second rule able to cancel the first — how focus used to erase
      // selection, back when both signals lived in one box-shadow list.
      expect(() => measureSelectionMark(
        `${css}\n.ui-accent-picker button[data-ui-state~="focus-visible"]::after{content:none}`,
        notAccents,
      )).toThrow('exactly one pseudo-element');

      cleanup();
      measured++;
    }
    expect(measured).toBe(ACCENTS.length);
    // One ink reads on all eight stops, so a value per accent would be a table to
    // keep in step for nothing.
    expect(inks.size).toBe(1);
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
