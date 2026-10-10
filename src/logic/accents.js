// The accents the kit ships, and the paints one accent swatch needs.
//
// Every copy of the picker reads this module, so there is one list and one set of
// paints rather than a copy per renderer. src/components/index.js and
// react/src/AccentPicker.tsx call accentSwatchStyle(); site/chrome.mjs and
// site/index.html still hand-keep the same four gradients. Held by
// stories/accent-swatch.test.js, which derives both sides out of src/tokens/.
// why: docs/components.md#page-furniture. See issues #190 and #429.
export const ACCENTS = ['default', 'phoenix', 'ocean', 'emerald'];

// Per accent, the gradient's two stops — each the value src/tokens/ declares for
// that accent. The swatch gate reads the tokens and this table apart and
// compares them.
const PAINTS = {
  default: { from: '#bd8cff', to: '#b479ff' },
  phoenix: { from: '#ff8a5c', to: '#ff6a3d' },
  ocean: { from: '#5ab0ff', to: '#3b9dff' },
  emerald: { from: '#3ad9a0', to: '#16c98a' },
};

/**
 * The custom properties one swatch button carries, as property → value.
 *
 * An accent with no entry here gets `--swatch: transparent`, which is what it
 * had before this module existed: the strip shows an empty circle you can still
 * press, and the swatch gate reports it by name. Selected, that circle wears the
 * same near-black tick, which is ink for a fill rather than for the surface
 * showing through it — a cost that belongs to the missing paints, not the mark.
 * Painting the circle as some other accent would be worse.
 */
export function accentSwatchStyle(accent) {
  const paint = PAINTS[accent];
  if (!paint) return { '--swatch': 'transparent' };
  return { '--swatch': `linear-gradient(135deg,${paint.from},${paint.to})` };
}
