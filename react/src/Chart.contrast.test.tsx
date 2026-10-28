// Contrast gate for the chart's series colours. Each tone is a fixed pair of
// tokens: the strong data end, which every mark ends in, and the fade at a bar's
// base. The strong end holds the 3:1 floor; the fade does not and is not meant to.
// Tones are discovered from the stylesheet and their names from the component's
// own union, so a tone added to one and not the other fails before it can ship a
// colour nobody measured.
// why: #740, docs/components.md#react-charts
//
// Limits: the ratios are the stylesheet's values, not painted pixels, so
// antialiasing, the ramp between the two ends, host overrides and a consumer's
// own --ui-chart-ground are out; the browser captures on the PR carry the paint. The zero
// rule, the isolated point's rim and the line's casing are not series and are not measured
// here. Nor is one series against another — two series are told apart by the side
// of zero they stand on and by the legend, never by hue alone.
// The same list, kept current, is stories/guidelines/accessibility-coverage.json.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { ChartTone } from './Chart';
import {
  // stories/lib/contrast.js is plain JS outside this workspace's tsconfig. It is
  // imported for its arithmetic, unit-tested in stories/lib/contrast.test.js.
  // @ts-expect-error -- untyped JS module, deliberately shared across the gates.
  AA_LARGE, colourOf, ratio, tokensFor,
} from '../../stories/lib/contrast.js';

const read = (path: string) => readFileSync(fileURLToPath(new URL(path, import.meta.url)), 'utf8');
const CHART_CSS = read('../../src/styles/chart.css');
const ACCENTS_CSS = read('../../src/tokens/accents.css');
const CHART_TSX = read('./Chart.tsx');

type Rgba = [number, number, number, number];

/** Every tone the stylesheet declares, as
 *  `.ui-chart__tone--NAME { --ui-chart-tone: STRONG; --ui-chart-fade: FADE; }`. */
const TONES = new Map<string, { strong: string; fade: string }>(
  [...CHART_CSS.matchAll(
    /\.ui-chart__tone--([\w-]+)\s*\{\s*--ui-chart-tone:\s*([^;}]+);\s*--ui-chart-fade:\s*([^;}]+)[;\s]*\}/g,
  )].map(([, name, strong, fade]) => [name, { strong: strong.trim(), fade: fade.trim() }]),
);

/** The same names as the component's own union, which is what a caller may pass. */
const DECLARED = new Set(
  [...(/export type ChartTone\s*=([\s\S]*?);/.exec(CHART_TSX)?.[1] ?? '')
    .matchAll(/'([\w-]+)'/g)].map(([, name]) => name),
);

/** Accent names as accents.css declares them; the default accent carries none. */
const ACCENTS = ['default', ...new Set(
  [...ACCENTS_CSS.matchAll(/\[data-accent="([\w-]+)"\]/g)].map(([, name]) => name),
)];

const THEMES = ['light', 'dark'] as const;

/* The two grounds the kit draws a chart on. `--ui-chart-ground` defaults to the
 * card, which is where the showcase puts every chart; a chart laid straight on
 * the page gets the page instead, and a tone has to clear both. */
const GROUNDS = { card: '--surface', page: '--bg' } as const;

/** The resolved tone and its ground for one cell of the matrix. */
function measure(theme: string, accent: string, ground: keyof typeof GROUNDS, value: string) {
  const base: Map<string, string> = tokensFor(theme, accent);
  const groundValue = base.get(GROUNDS[ground]);
  // The ground is substituted the way the cascade substitutes it, so a tone
  // written as a mix towards --ui-chart-ground resolves against the real one.
  const vars = new Map([...base, ['--ui-chart-ground', groundValue!]]);
  const tone = colourOf(value, vars) as Rgba | null;
  const behind = colourOf(`var(${GROUNDS[ground]})`, vars) as Rgba | null;
  return { tone, behind, vars };
}

describe('the chart\'s tones', () => {
  it('declares the same tones in the stylesheet and in the type a caller writes against', () => {
    expect(TONES.size, 'tones were discovered from src/styles/chart.css. A renamed class or a '
      + 'reformatted declaration would empty this and pass every row below vacuously')
      .toBeGreaterThanOrEqual(7);
    expect([...TONES.keys()].sort(), 'the stylesheet draws a tone the ChartTone union does not '
      + 'offer, or the union offers one the stylesheet cannot paint')
      .toEqual([...DECLARED].sort());
    // Typed against the union so a tone added to both, but never measured here,
    // cannot slip past: the cast below is the only place the two meet.
    for (const name of TONES.keys()) expect(DECLARED.has(name as ChartTone)).toBe(true);
  });

  it('paints every tone the same under every accent the kit ships', () => {
    expect(ACCENTS.length, 'only the default accent was derived from src/tokens/accents.css. A '
      + 'renamed attribute would silently shrink the check').toBeGreaterThanOrEqual(4);
    for (const theme of THEMES) {
      for (const [name, { strong, fade }] of TONES) {
        const at = (accent: string) => [strong, fade]
          .map((value) => measure(theme, accent, 'card', value).tone);
        for (const accent of ACCENTS) {
          expect(at(accent), `${name} in ${theme} moved with the ${accent} accent. A chart's `
            + 'palette is fixed, so a product accent never repaints a series').toEqual(at('default'));
        }
      }
    }
  });

  it('clears 3:1 for every strong end, on both grounds, in both themes', () => {
    const rows: { where: string; value: number }[] = [];
    for (const theme of THEMES) {
      for (const ground of Object.keys(GROUNDS) as (keyof typeof GROUNDS)[]) {
        for (const [name, { strong }] of TONES) {
          const { tone, behind } = measure(theme, 'default', ground, strong);
          const where = `${name} on the ${ground}, ${theme}`;
          expect(tone, `${where}: the tone does not resolve to a colour`).not.toBeNull();
          expect(behind, `${where}: the ground does not resolve to a colour`).not.toBeNull();
          expect(tone![3], `${where}: a mark is opaque, so a reader measures one colour`).toBe(1);
          rows.push({ where, value: ratio(tone, behind) });
        }
      }
    }

    expect(rows, 'every tone × ground × theme is measured')
      .toHaveLength(TONES.size * 2 * THEMES.length);
    const tightest = rows.reduce((a, b) => (b.value < a.value ? b : a));
    for (const row of rows) {
      expect(row.value, `${row.where} measures ${row.value.toFixed(2)}:1 against the ${AA_LARGE}:1 `
        + `graphic bar. The tightest row in the matrix is ${tightest.where} at `
        + `${tightest.value.toFixed(2)}:1`).toBeGreaterThanOrEqual(AA_LARGE);
    }
  });

  /* Rejection, twice: once for a colour under the bar, and once for a value the
   * gate cannot read. A gate that passes whatever it is handed measures nothing.
   * The fades are the colours under the bar: on the card, where the kit draws a
   * chart, each fails 3:1 by design, and the same measurement that passes the
   * strong ends rejects every one of them. On the page the dark neutral fade
   * measures 3.39:1, which harms nothing, so the page is not asserted here. */
  it('rejects every fade end on the card, where a bar\'s base carries no value', () => {
    const rows = THEMES.flatMap((theme) => [...TONES].map(([name, { fade }]) => {
      const { tone, behind } = measure(theme, 'default', 'card', fade);
      expect(tone, `${name} fade, ${theme}: the fade does not resolve to a colour`).not.toBeNull();
      expect(tone![3], `${name} fade, ${theme}: the base is opaque too`).toBe(1);
      return { where: `${name} fade on the card, ${theme}`, value: ratio(tone, behind) as number };
    }));
    expect(rows).toHaveLength(TONES.size * THEMES.length);
    expect(rows.filter((row) => row.value >= AA_LARGE),
      'a fade clears 3:1 on the card, so it is a second strong colour and no longer a base')
      .toEqual([]);
  });

  it('rejects a tone whose value stops resolving instead of scoring it', () => {
    const { tone } = measure('light', 'default', 'card', 'var(--no-such-token)');
    expect(tone, 'an unresolvable tone is null, never a silent black that would '
      + 'fabricate a passing ratio against a light ground').toBeNull();
  });
});
