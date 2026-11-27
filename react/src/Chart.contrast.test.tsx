// Contrast gate for the chart's series colours. Each tone is a fixed pair of
// tokens: the strong tone, which every bar, line, legend key and dot is painted
// in, and the fade that fills an area. The strong tone holds the 3:1 floor; the
// fade does not and is not meant to.
// Tones are discovered from the stylesheet and their names from the component's
// own union, so a tone added to one and not the other fails before it can ship a
// colour nobody measured.
// why: #740, docs/components.md#chart
//
// Limits: the ratios are the stylesheet's values, not painted pixels, so
// antialiasing, the ramp between the two ends, host overrides and a consumer's
// own --ui-chart-ground are out; the browser captures on the PR carry the paint.
// A bar's rest strength is blended onto its ground as a flat colour, so the measured ratio is the bar's
// top, not its fade. The zero
// rule, the isolated point's rim and the line's casing are not series and are not measured
// here. Nor is one series against another — two series are told apart by the side
// of zero they stand on and by the legend, never by hue alone.
// A line over the fills of a line look is measured against the fills at their
// top strength, one fill or two laid over each other, which is the strongest
// ground the ramp reaches. Three fills over one point are out.
// The same list, kept current, is stories/guidelines/accessibility-coverage.json.
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Chart, type ChartTone } from './Chart';
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
   * The fades are the colours under the floor: on the card, where the kit draws a
   * chart, each fails 3:1 by design, and the same measurement that passes the
   * strong tones rejects every one of them. On the page the dark neutral fade
   * measures 3.39:1, which harms nothing, so the page is not asserted here. */
  it('rejects every fade end on the card, where an area\'s base carries no value', () => {
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

  /* A bar at rest draws at less than full strength, and the active bar at full
   * strength. The sheet sets the rest strength in one rule, which names the tones
   * that take it. Each named tone, blended onto its ground at that strength, must
   * still clear 3:1. The rejection is the same measurement for every tone: at the
   * same strength some tones fall under 3:1, which is why the rule names only
   * some of them. */
  const REST = /:is\(([^)]*)\)\.ui-chart__bar:not\(\.is-active\)\s*\{\s*opacity:\s*([\d.]+);\s*\}/.exec(CHART_CSS);
  const restRows = (names: string[], strength: number) => THEMES.flatMap((theme) =>
    (Object.keys(GROUNDS) as (keyof typeof GROUNDS)[]).flatMap((ground) => names.map((name) => {
      const { tone, behind } = measure(theme, 'default', ground, TONES.get(name)!.strong);
      const seen = tone!.slice(0, 3).map((c, i) => c * strength + behind![i] * (1 - strength));
      return { where: `${name} at rest on the ${ground}, ${theme}`, value: ratio([...seen, 1], behind) as number };
    })));

  it('clears 3:1 for every tone the rest rule names, at the rule\'s strength', () => {
    expect(REST, 'the one rest rule was not found in src/styles/chart.css').not.toBeNull();
    const names = [...REST![1].matchAll(/\.ui-chart__tone--([\w-]+)/g)].map(([, name]) => name);
    const strength = Number(REST![2]);
    expect(names.length, 'the rule names at least one tone').toBeGreaterThan(0);
    for (const name of names) expect(TONES.has(name), `${name} is a tone the sheet paints`).toBe(true);
    expect(strength).toBeLessThan(1);
    const rows = restRows(names, strength);
    expect(rows).toHaveLength(names.length * 2 * THEMES.length);
    for (const row of rows) {
      expect(row.value, `${row.where} measures ${row.value.toFixed(2)}:1`).toBeGreaterThanOrEqual(AA_LARGE);
    }
  });

  it('rejects the rest strength for a tone the rule leaves out', () => {
    const strength = Number(REST![2]);
    expect(restRows([...TONES.keys()], strength).filter((row) => row.value < AA_LARGE).length,
      'every tone clears 3:1 at the rest strength, so this check rejects nothing').toBeGreaterThan(0);
  });

  /* A line look fills under each line, so a line crosses the fill of another
   * line, or two fills laid over each other. Where a casing of the ground lies
   * under every stroke, the line touches the ground and not the fills. Where it
   * does not, the line touches the fills. The rows measure what the rendered
   * chart puts beside the line. */
  const TOP = Number(/\.ui-chart__fill-top\s*\{[^}]*stop-opacity:\s*([\d.]+);/.exec(CHART_CSS)?.[1]);
  const over = (under: number[], paint: Rgba) => under.map((c, i) => paint[i] * TOP + c * (1 - TOP));
  const fillRows = (cased: boolean) => THEMES.flatMap((theme) => ACCENTS.flatMap((accent) =>
    (Object.keys(GROUNDS) as (keyof typeof GROUNDS)[]).flatMap((ground) => {
      const at = (name: string) => measure(theme, accent, ground, TONES.get(name)!.strong);
      const names = [...TONES.keys()];
      const behind = at(names[0]).behind!.slice(0, 3);
      const stacks = [...names.map((a) => [a]), ...names.flatMap((a) => names.map((b) => [a, b]))];
      return names.flatMap((line) => stacks.map((stack) => {
        const fills = stack.reduce((under, name) => over(under, at(name).tone!), behind);
        const beside = cased ? behind : fills;
        return {
          where: `${line} line over the ${stack.join(' and ')} fill on the ${ground}, ${theme}, ${accent} accent`,
          value: ratio(at(line).tone, [...beside, 1]) as number,
        };
      }));
    })));
  const lineChart = () => render(
    <Chart variant="line" look="thin" title="Income and spend" format={(v: number) => String(v)}
      periods={['Jan', 'Feb', 'Mar', 'Apr'].map((label) => ({ label }))}
      series={[{ id: 'income', name: 'Income', tone: 'info', values: [40, 10, 40, 10] },
        { id: 'spend', name: 'Spend', tone: 'accent', values: [10, 40, 10, 40] }]} />,
  );
  /** True when a wider casing of the ground lies under every stroke of the line look. */
  const casedLines = () => {
    const { container } = lineChart();
    const drawn = [...container.querySelectorAll('line.ui-chart__line-casing, line.ui-chart__line')];
    const at = (el: Element) => ['x1', 'y1', 'x2', 'y2'].map((n) => el.getAttribute(n)).join(' ');
    const strokes = drawn.filter((el) => el.classList.contains('ui-chart__line'));
    expect(strokes.length, 'the line look draws its strokes as segments').toBe(6);
    const width = (name: string) => Number(/stroke-width:\s*([\d.]+)/
      .exec(new RegExp(`\\.ui-chart__${name}\\s*\\{([^}]*)\\}`).exec(CHART_CSS)?.[1] ?? '')?.[1]);
    const ground = /\.ui-chart__line-casing\s*\{[^}]*stroke:\s*var\(--ui-chart-ground\)/.test(CHART_CSS);
    return ground && width('line-casing') > width('line') && strokes.every((stroke) => drawn
      .slice(0, drawn.indexOf(stroke))
      .some((el) => el.classList.contains('ui-chart__line-casing') && at(el) === at(stroke)));
  };

  it('clears 3:1 for every line against the fills it crosses, under every accent', () => {
    expect(TOP, 'the fill\'s top strength was not found in src/styles/chart.css').toBeGreaterThan(0);
    const rows = fillRows(casedLines());
    const n = TONES.size;
    expect(rows).toHaveLength(THEMES.length * ACCENTS.length * 2 * n * (n + n * n));
    expect(rows.filter((row) => row.value < AA_LARGE)
      .map((row) => `${row.where}: ${row.value.toFixed(2)}:1`)).toEqual([]);
  });

  it('rejects a line laid straight on the fills', () => {
    expect(fillRows(false).filter((row) => row.value < AA_LARGE).length,
      'every line clears 3:1 on bare fills, so this check rejects nothing').toBeGreaterThan(0);
  });

  it('rejects a tone whose value stops resolving instead of scoring it', () => {
    const { tone } = measure('light', 'default', 'card', 'var(--no-such-token)');
    expect(tone, 'an unresolvable tone is null, never a silent black that would '
      + 'fabricate a passing ratio against a light ground').toBeNull();
  });
});
