/* The 1.5 CSS px line, and the arithmetic that puts a glyph on one side of it.
 *
 * The stroke-width rule drew the line and stories/signal-contrast.test.js was the only thing
 * that knew it. The glyph-box rule extends it to every stroked glyph in the kit, so the
 * number now decides two gates and lives in neither of them.
 *
 * why: docs/specification.md#icons-and-glyphs
 *      docs/specification.md#icons-and-glyphs */

/** CSS px at which a stroke paints as one. Under this a stroke cannot put three
 *  quarters of its colour into any device pixel row at 1x — worst-case sub-pixel
 *  phase splits a stroke of width w evenly across two rows, so its peak coverage
 *  is w / 2 — and a ratio computed from the nominal colour is not the ratio that
 *  reaches the eye. */
export const SOLID_STROKE = 1.5;

/** The box every glyph the icon factory draws is stated in. Read back from
 *  src/assets/icons.js by both gates rather than trusted here. */
export const VIEWBOX = 24;

/** What a reader sees, in CSS px: a stroke-width is stated in the glyph's own
 *  coordinate system, so the box it is drawn at scales it. */
export const renderedPx = (strokeWidth, boxPx, units) => (strokeWidth * boxPx) / units;

/** The stroke-width a glyph of this box needs to reach the line — the inverse of
 *  renderedPx, for an error message that says what to write instead of only what
 *  is wrong. Rounded up to a tenth, which is the precision these stylesheets use. */
export const needsWidth = (boxPx, units) =>
  Math.ceil((SOLID_STROKE * units * 10) / boxPx) / 10;
