// Contrast gate for the chart's series colours. Restyle 01 put two series in one
// hue at two weights, the lighter a mix towards the ground; a weight chosen by
// eye can land anywhere, so this holds the floor. Tones are discovered from the
// stylesheet and their names from the component's own union, so a tone added to
// one and not the other fails before it can ship a colour nobody measured.
// why: #543, docs/components.md#react-charts
//
// Limits: the ratios are the stylesheet's values, not painted pixels, so
// antialiasing, host overrides and a consumer's own --ui-chart-ground are out;
// the browser captures on the PR carry the paint. A faded bar's middle, the zero
// rule, the dot's rim and the line's casing are not series and are not measured
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

/** Every tone the stylesheet declares, as `.ui-chart__tone--NAME { --ui-chart-tone: VALUE }`. */
const TONES = new Map<string, string>(
  [...CHART_CSS.matchAll(/\.ui-chart__tone--([\w-]+)\s*\{\s*--ui-chart-tone:\s*([^;}]+)[;\s]*\}/g)]
    .map(([, name, value]) => [name, value.trim()]),
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

  it('finds every accent the kit ships, so no accent goes unmeasured', () => {
    expect(ACCENTS.length, 'only the default accent was derived from src/tokens/accents.css. A '
      + 'renamed attribute would silently shrink the matrix').toBeGreaterThanOrEqual(4);
  });

  it('clears 3:1 for every tone, on both grounds, in both themes, under every accent', () => {
    const rows: { where: string; value: number }[] = [];
    for (const theme of THEMES) {
      for (const accent of ACCENTS) {
        for (const ground of Object.keys(GROUNDS) as (keyof typeof GROUNDS)[]) {
          for (const [name, value] of TONES) {
            const { tone, behind } = measure(theme, accent, ground, value);
            const where = `${name} on the ${ground}, ${theme}, ${accent} accent`;
            expect(tone, `${where}: the tone does not resolve to a colour`).not.toBeNull();
            expect(behind, `${where}: the ground does not resolve to a colour`).not.toBeNull();
            expect(tone![3], `${where}: a mark is opaque, so a reader measures one colour`).toBe(1);
            rows.push({ where, value: ratio(tone, behind) });
          }
        }
      }
    }

    expect(rows, 'every tone × ground × theme × accent is measured')
      .toHaveLength(TONES.size * 2 * THEMES.length * ACCENTS.length);
    const tightest = rows.reduce((a, b) => (b.value < a.value ? b : a));
    for (const row of rows) {
      expect(row.value, `${row.where} measures ${row.value.toFixed(2)}:1 against the ${AA_LARGE}:1 `
        + `graphic bar. The tightest row in the matrix is ${tightest.where} at `
        + `${tightest.value.toFixed(2)}:1`).toBeGreaterThanOrEqual(AA_LARGE);
    }
  });

  /* Rejection, twice: once for the number this gate exists to hold, and once for
   * a value it cannot read. A gate that passes whatever it is handed measures
   * nothing, so both mutations are run here rather than asserted about. */
  it('rejects the lighter weight drawn at the share the restyle\'s mock used', () => {
    const SOFT = /\.ui-chart__tone--accent-soft\s*\{\s*--ui-chart-tone:\s*([^;}]+)[;\s]*\}/;
    const shipped = SOFT.exec(CHART_CSS)?.[1];
    expect(shipped, 'the lighter weight of the accent is a color-mix this gate can re-weight')
      .toMatch(/color-mix\(in srgb, var\(--accent\) (\d+)%, var\(--ui-chart-ground\)\)/);

    // The mock drew the second series at 40%. Both of the ratios the
    // specification names for it are reproduced here, so the number in the
    // document and the number this gate measures cannot drift apart.
    const mock = shipped!.replace(/\d+%/, '40%');
    const failures = THEMES.flatMap((theme) => ACCENTS.flatMap((accent) =>
      (Object.keys(GROUNDS) as (keyof typeof GROUNDS)[]).map((ground) => {
        const { tone, behind } = measure(theme, accent, ground, mock);
        return { theme, accent, ground, value: ratio(tone, behind) };
      })))
      .filter((row) => row.value < AA_LARGE);
    expect(failures, 'the mock\'s 40% fails on every ground, in both themes, under every accent')
      .toHaveLength(2 * THEMES.length * ACCENTS.length);
    const named = (theme: string, ground: keyof typeof GROUNDS) => {
      const { tone, behind } = measure(theme, 'default', ground, mock);
      return Number(ratio(tone, behind).toFixed(2));
    };
    expect(named('dark', 'card'), 'the dark card ratio the specification prints').toBe(1.99);
    expect(named('light', 'card'), 'the light card ratio the specification prints').toBe(2.03);

    // And the shipped weight has room above the bar rather than sitting on it:
    // the mix crosses 3:1 at 67%, and 70% is what ships.
    const atShare = (share: number) => Math.min(...THEMES.flatMap((theme) =>
      ACCENTS.flatMap((accent) => (Object.keys(GROUNDS) as (keyof typeof GROUNDS)[]).map((ground) => {
        const { tone, behind } = measure(theme, accent, ground, shipped!.replace(/\d+%/, `${share}%`));
        return ratio(tone, behind) as number;
      }))));
    expect(atShare(66), 'a point below the floor still fails, so the floor is real')
      .toBeLessThan(AA_LARGE);
    expect(atShare(67), 'and the floor itself clears').toBeGreaterThanOrEqual(AA_LARGE);
  });

  it('rejects a tone whose value stops resolving instead of scoring it', () => {
    const { tone } = measure('light', 'default', 'card', 'var(--no-such-token)');
    expect(tone, 'an unresolvable tone is null, never a silent black that would '
      + 'fabricate a passing ratio against a light ground').toBeNull();
  });
});
