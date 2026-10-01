// The accents the kit ships, and the paints one accent swatch needs.
//
// Every copy of the picker reads this module, so there is one list and one set
// of paints rather than a copy per renderer. src/components/index.js and
// react/src/AccentPicker.tsx both call accentSwatchStyle(); site/chrome.mjs and
// site/index.html still hand-keep the same four gradients and must change with
// these. Held by stories/accent-swatch.test.js, which derives both sides out of
// src/tokens/ rather than restating them. See issue #190.
//
// The circle is `from` → `to`, the accent's dark ramp in BOTH themes, because a
// swatch shows you an accent you are not currently looking at. The selection
// ring is `dark` / `light`, and it needs a SOLID colour — a gradient is not a
// valid <color>, which is why the ring computed to `none` before #429 — so it
// is that accent's own --accent. The page accent will not do: the picker is
// documented to run before the host has applied anything, so a ring in
// var(--accent) paints every selection in whichever accent the page happens to
// be on. It takes a value per theme because the dark ramp the circle wears does
// not clear 3:1 on the light card (emerald is 2.15:1 on #ffffff).
export const ACCENTS = ['default', 'phoenix', 'ocean', 'emerald'];

// Per accent: the gradient's two stops, then its own --accent per theme. Each
// value is the one src/tokens/ declares for that accent; the swatch gate reads
// the tokens and this table apart and compares them.
const PAINTS = {
  default: { from: '#bd8cff', to: '#b479ff', dark: '#b479ff', light: '#6a2dcc' },
  phoenix: { from: '#ff8a5c', to: '#ff6a3d', dark: '#ff6a3d', light: '#a8370c' },
  ocean: { from: '#5ab0ff', to: '#3b9dff', dark: '#3b9dff', light: '#005ab4' },
  emerald: { from: '#3ad9a0', to: '#16c98a', dark: '#16c98a', light: '#076c48' },
};

/**
 * The custom properties one swatch button carries, as property → value.
 *
 * An accent with no entry here gets `--swatch: transparent` and no ring colour
 * at all, which is what it had before this module existed: the strip shows an
 * empty circle you can still press, and segmented.css falls the ring back to
 * var(--accent). Painting it as some other accent would be worse, and the
 * swatch gate reports the empty circle by name.
 */
export function accentSwatchStyle(accent) {
  const paint = PAINTS[accent];
  if (!paint) return { '--swatch': 'transparent' };
  return {
    '--swatch': `linear-gradient(135deg,${paint.from},${paint.to})`,
    '--swatch-ring-dark': paint.dark,
    '--swatch-ring-light': paint.light,
  };
}
