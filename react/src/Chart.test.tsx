// What the chart owes a reader who cannot see it, and a reader who can only
// point at it.
//
// Limits. JSDOM has no layout: every rect is zero, so the readout's PLACEMENT is
// not measured here (its arithmetic is react/src/tip.ts, exercised through
// Tooltip.test.tsx's mocked geometry), the plot falls back to its unmeasured
// column width, and the scroll fade is checked as the class the scroll handler
// writes rather than as a painted gradient. Nothing here measures contrast
// (react/src/contrast.test.tsx), the grid's hairline against the zero rule, or
// the focus ring as painted; the browser captures on the pull request carry those. What colour
// each series is drawn in, and whether it clears the graphic bar, is measured in
// react/src/Chart.contrast.test.tsx. Screen-reader speech is not run — the live
// region's text is read from the DOM. A bar is a path rather than a rect, so the
// geometry assertions read its box back out of the `d` with boxOf().
import { describe, expect, it, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Chart, type ChartPeriod, type ChartSeries } from './Chart';
import { placeTip } from './tip';
// Plain JS outside this workspace's tsconfig, imported for its arithmetic the
// way react/src/contrast.test.tsx imports it.
// @ts-expect-error -- untyped JS module, deliberately shared across the gates.
import { substitute, tokensFor } from '../../stories/lib/contrast.js';

const readRepo = (rel: string) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');

afterEach(cleanup);

const MONTHS = ['Jan 2026', 'Feb 2026', 'Mar 2026', 'Apr 2026'];
const INCOME = [1200, 1500, 1400, 900];
const SPEND = [800, 900, 850, 500];
const NET = INCOME.map((v, i) => v - SPEND[i]);

const periods: ChartPeriod[] = MONTHS.map((label, i) => (i === 3
  ? { label, estimated: true, note: 'April is still running' }
  : { label }));
const series: ChartSeries[] = [
  { id: 'income', name: 'Income', values: INCOME, shape: 'bars', tone: 'good' },
  { id: 'spend', name: 'Spend', values: SPEND, shape: 'bars-below', tone: 'bad' },
  { id: 'net', name: 'Net', values: NET, shape: 'line' },
];
const eur = (n: number) => `${n < 0 ? '−' : ''}€${Math.abs(n).toLocaleString('en-US')}`;

const months = (extra: Partial<React.ComponentProps<typeof Chart>> = {}) => render(
  <Chart title="Income and spend by month" periods={periods} series={series} format={eur}
    {...extra as object} />,
);
// <details> maps to role=group too, so the frame is asked for by name.
const frame = () => screen.getByRole('group', { name: /Arrow keys/ });
const plot = () => screen.getByRole('img');
const markEl = (id: string) => plot().querySelector(`[data-mark="${id}"] .ui-chart__hit`) as Element;
/** A pointer resting on one mark: the event is fired on the mark and bubbles. */
const hover = (id: string) => fireEvent.mouseMove(markEl(id));
const classOf = (el: Element) => el.getAttribute('class') ?? '';
/**
 * The box a bar draws, read back off the path the component wrote. A bar is a
 * path and not a rect because SVG gives a rect one radius for all four corners
 * and a bar standing on the zero line needs none at its foot; this walks the pen
 * through the `d` and returns the extremes, which is what the geometry below used
 * to read off x/y/width/height.
 */
const boxOf = (el: Element) => {
  const xs: number[] = [];
  const ys: number[] = [];
  let x = 0;
  let y = 0;
  for (const [, cmd, args] of (el.getAttribute('d') ?? '').matchAll(/([A-Za-z])([^A-Za-z]*)/g)) {
    const n = (args.match(/-?\d*\.?\d+/g) ?? []).map(Number);
    if (cmd === 'M') { [x, y] = n; } else if (cmd === 'V') { [y] = n; } else if (cmd === 'v') { y += n[0]; } else if (cmd === 'H') { [x] = n; } else if (cmd === 'h') { x += n[0]; } else if (cmd === 'a') { x += n[5]; y += n[6]; }
    xs.push(x);
    ys.push(y);
  }
  return { x: Math.min(...xs), y: Math.min(...ys),
    width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) };
};
/** Where a bar spends its corner radius: the y of each arc the path draws. */
const arcsOf = (el: Element) => {
  const d = el.getAttribute('d') ?? '';
  const out: number[] = [];
  let y = 0;
  for (const [, cmd, args] of d.matchAll(/([A-Za-z])([^A-Za-z]*)/g)) {
    const n = (args.match(/-?\d*\.?\d+/g) ?? []).map(Number);
    if (cmd === 'M') { [, y] = n; } else if (cmd === 'V') { [y] = n; } else if (cmd === 'v') { y += n[0]; } else if (cmd === 'a') { y += n[6]; out.push(y); }
  }
  return out;
};
const toneOf = (el: Element) => /ui-chart__tone--(\w+)/.exec(classOf(el))?.[1];

/* -- the name, and the data without a pointer ------------------------------ */

it('names the chart, and says how to step through it', () => {
  months();
  expect(plot()).toHaveAccessibleName('Income and spend by month');
  expect(frame()).toHaveAccessibleName('Income and spend by month. Arrow keys step through the 4 columns.');
});

it('offers the same numbers as a table, with the exact values the formatter gives', () => {
  months();
  const table = screen.getByRole('table', { name: 'Income and spend by month' });
  expect(within(table).getAllByRole('columnheader').map((c) => c.textContent))
    .toEqual(['Period', 'Income', 'Spend', 'Net']);
  const april = within(table).getByRole('row', { name: /Apr 2026/ });
  expect(within(april).getAllByRole('cell').map((c) => c.textContent)).toEqual(['€900', '€500', '€400']);
  expect(screen.getByText('Values as a table')).toHaveClass('ui-focusable');
});

it('prints whole units on the axis and exact values in the table', () => {
  const { container } = render(
    <Chart title="Fees" periods={[{ label: 'Jan 2026' }, { label: 'Feb 2026' }]}
      series={[{ id: 'f', name: 'Fees', values: [10.4, 20.6] }]}
      format={(n) => `€${n.toFixed(2)}`} />,
  );
  const ticks = [...container.querySelectorAll('.ui-chart__tick')].map((t) => t.textContent);
  expect(ticks.every((t) => /^€\d+\.00$/.test(t!)), `axis printed ${ticks.join(', ')}`).toBe(true);
  expect(within(screen.getByRole('table')).getByText('€20.60')).toBeInTheDocument();
});

it('a sparkline drops the axis, the legend and the table, and still names its range', () => {
  const { container } = render(
    <Chart variant="spark" title="Income" periods={periods} series={[series[0]]} format={eur} />,
  );
  expect(container.querySelector('.ui-chart__axis')).toBeNull();
  expect(container.querySelector('.ui-chart__legend')).toBeNull();
  expect(screen.queryByRole('table')).toBeNull();
  expect(plot()).toHaveAccessibleName('Income. €1,200 to €900.');
});

/* -- the pointer target ----------------------------------------------------- */

/** A hit area's box, read off the rect the component writes. */
const hitBox = (id: string) => {
  const el = markEl(id);
  const n = (name: string) => Number(el.getAttribute(name));
  return { x: n('x'), y: n('y'), w: n('width'), h: n('height') };
};
/** Answer `(max-width: 560px) and (pointer: coarse)` the way a phone would. */
const coarse = (matches: boolean) => vi.stubGlobal('matchMedia', (query: string) => ({
  matches, media: query, addEventListener() {}, removeEventListener() {},
}));
/**
 * JSDOM lays nothing out, so the plot falls back to `FALLBACK_COL`. This hands
 * it a measured width instead — the one input that decides how much room a
 * point's target has across — the way a browser's first `clientWidth` read
 * would. The component reads it once before it looks for a ResizeObserver.
 */
const measuredAt = (width: number) =>
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(width);

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

it('a fine pointer keeps every mark at the kit\'s 24px floor', () => {
  coarse(false);
  months();
  expect(hitBox('net-1')).toMatchObject({ w: 24, h: 24 });
});

it('a coarse pointer below the phone step grows a point to 44, inside its own column', () => {
  coarse(true);
  months();
  // 44x44: the floor src/styles/tap-zone.css declares, which the bars already
  // clear with a full-height band half a column wide.
  expect(hitBox('net-1'), 'the point reaches the phone floor').toMatchObject({ w: 44, h: 44 });
  // And takes it out of its own column only. A 48px column holds a 44px target
  // with two pixels to spare each side, so no month's point answers for the one
  // beside it. why: guidelines/accessibility-floor.md#tap-target-on-a-phone
  const [a, b] = [hitBox('net-1'), hitBox('net-2')];
  expect(a.x + a.w, `${a.x + a.w} reached into the next column, which starts at ${b.x}`)
    .toBeLessThanOrEqual(b.x);
  // The bar underneath keeps its band: a point that swallowed the column would
  // leave the month's income and spend with nothing to answer a tap with.
  expect(hitBox('income-1').w).toBe(48);
  expect(hitBox('income-1').h).toBeGreaterThan(44);
});

it('a sparkline keeps the 24px floor across rather than letting one point answer for three', () => {
  coarse(true);
  measuredAt(4 * 16); // four columns at the sheet's --ui-chart-col for a sparkline, 16px
  render(
    <Chart variant="spark" title="Income" periods={periods} series={[{ ...series[0], shape: 'line' }]}
      format={eur} />,
  );
  // 16px columns cannot each hold 44 ACROSS: growing them would make one point
  // answer for nearly three months, which is the one thing the floor must not
  // do, so the points keep the AA floor they are drawn with. Down there is
  // nothing to share a column with, so the target takes the whole phone floor
  // — the box the chart draws in is grown to hold it.
  expect(hitBox('income-1')).toMatchObject({ w: 24, h: 44 });
});

/**
 * The failure #543's re-review measured: the sparkline's points carried a
 * nominal 28 x 32 and a phone could only touch 28 x 19.4 of it, because the
 * rect was centred on a point sitting 2px below the top of a 32px drawing and
 * the chart's edge clipped the rest. A tap on the first point opened nothing.
 * So the box and the target are read together here: attributes alone certify
 * nothing.
 */
const boxOfSvg = () => {
  const svg = plot();
  const [, vy, , vh] = (svg.getAttribute('viewBox') ?? '').split(/\s+/).map(Number);
  return { top: vy, bottom: vy + vh, height: vh, drawn: Number(svg.getAttribute('height')) };
};

it('no point\u2019s target is clipped by the box the chart draws in', () => {
  coarse(true);
  measuredAt(11 * 28); // the sparkline's own columns in a stat tile at 390
  const eleven = Array.from({ length: 11 }, (_, i) => ({ label: `M${i}` }));
  render(
    <Chart variant="spark" title="Income" periods={eleven} format={eur}
      series={[{ id: 'income', name: 'Income', shape: 'line',
        values: [1, 9, 3, 7, 2, 8, 4, 6, 5, 9, 1] }]} />,
  );
  const box = boxOfSvg();
  // The box is as tall as the floor and the element is drawn at that height, so
  // nothing a point is given falls outside what the reader can touch.
  expect(box.height, 'the box holds a whole phone target').toBeGreaterThanOrEqual(44);
  expect(box.drawn, 'the element is as tall as its box').toBe(box.height);
  // Every point, named one by one, including both ends of the line — the two
  // the review found clipped.
  const ids = Array.from({ length: 11 }, (_, i) => `income-${i}`);
  expect(ids.filter((id) => markEl(id)).length, 'every point was measured').toBe(11);
  const clipped = ids.filter((id) => {
    const t = hitBox(id);
    return t.h < 44 || t.y < box.top - 0.01 || t.y + t.h > box.bottom + 0.01;
  });
  expect(clipped, 'these points reach past the chart\u2019s edge, so a tap there misses')
    .toEqual([]);
  // And the drawing itself did not change size: the line a reader sees is the
  // 32px sparkline, sitting in the middle of the taller box.
  expect(box.top, 'the drawing is centred in the box').toBeCloseTo(-6, 5);
});

it('two lines in one column split the room between their points', () => {
  coarse(true);
  // Far enough apart that the floor is not what decides the answer, and close
  // enough that the full 44 would not fit between them.
  render(
    <Chart title="Two lines" periods={periods} format={eur}
      series={[{ id: 'a', name: 'A', values: [1400, 1400, 1400, 1400], shape: 'line' },
        { id: 'b', name: 'B', values: [1190, 1190, 1190, 1190], shape: 'line' }]} />,
  );
  // The drawn points, read off the boxes the readout is placed against, which
  // the target does not move.
  const drawn = (id: string) =>
    Number(plot().querySelector(`[data-anchor="${id}"]`)!.getAttribute('y'));
  const apart = Math.abs(drawn('a-1') - drawn('b-1'));
  expect(apart, 'the two points are between the floor and the phone target apart')
    .toBeGreaterThan(24);
  expect(apart).toBeLessThan(44);
  const [a, b] = [hitBox('a-1'), hitBox('b-1')];
  // The upper point keeps the whole floor where it can and stops at the
  // midpoint between the two, rather than being shrunk to the distance between
  // them: it reaches from the top of the box down to that midpoint and no
  // further, so neither point answers for any part of the other line.
  const mid = (drawn('a-1') + drawn('b-1')) / 2 + 12; // the drawn box is 24, centred
  expect(a.h, 'the point keeps at least the AA floor').toBeGreaterThanOrEqual(24);
  expect(a.y + a.h, `${a.y + a.h} stopped short of or crossed the midpoint at ${mid}`)
    .toBeCloseTo(mid, 0);
  expect(a.y + a.h, `${a.y + a.h} crossed the other line's point at ${b.y}`)
    .toBeLessThanOrEqual(b.y + 0.1);
});

/* -- the one tab stop ------------------------------------------------------- */

it('puts one element in the tab order inside the plot, and it is the frame', async () => {
  const user = userEvent.setup();
  const { container } = months();
  // Read from the rendered DOM rather than from the stylesheet. A browser makes
  // an overflowing box keyboard-focusable on its own, and the ring it draws
  // there is its own, not the kit's — which is what #543's review found on
  // `.ui-chart__scroll`. Anything the chart leaves in the tab order has to
  // carry the kit's ring: `.ui-focusable`, or — for the table's scroller —
  // `.ui-table-scroll`, which src/styles/table.css rings itself.
  const tabbable = [...container.querySelectorAll<HTMLElement>('*')]
    .filter((el) => el.tabIndex >= 0 || el.tagName === 'SUMMARY');
  expect(tabbable.map(classOf))
    .toEqual(['ui-chart__frame ui-tip-host ui-focusable', 'ui-focusable', 'ui-table-scroll']);

  // The third stop is inside the <details> the reader opens, so it exists only
  // once they have asked for the table; it is named, because a browser would
  // otherwise hand a screen reader an unnamed scroll region. JSDOM lays nothing
  // out, so the kit's band on it is read off the sheet rather than painted.
  const scroll = container.querySelector('.ui-table-scroll')!;
  expect(scroll.closest('details')).not.toBeNull();
  expect(scroll).toHaveAttribute('role', 'region');
  expect(scroll).toHaveAccessibleName(/Income and spend by month, as a table/);
  expect(readRepo('../../src/styles/table.css'))
    .toMatch(/\.ui-table-scroll:focus-visible\s*\{[^}]*--ring-scroll/);

  // The scroller says `-1` out loud rather than relying on not being reached:
  // that attribute is the opt-out a browser's focusable-scroller rule reads.
  expect(container.querySelector('.ui-chart__scroll')).toHaveAttribute('tabindex', '-1');

  await user.tab();
  expect(frame()).toHaveFocus();
  await user.tab();
  expect(frame(), 'a second Tab leaves the plot instead of landing inside it').not.toHaveFocus();
  expect(container.querySelector('.ui-chart__scroll')).not.toHaveFocus();
});

// The paint behind that tab stop, with every token resolved — the raw rule says
// `var(--ring)`, which proves nothing about what a reader sees. JSDOM matches no
// `:focus-visible` and substitutes no `var()`, so the values are resolved here
// the way the contrast gate resolves them, per theme. Whether the browser then
// paints it is a browser question, answered by the captures on the PR.
describe.each(['dark', 'light'])('the kit ring resolves [%s]', (theme) => {
  it('is a real ring over a transparent outline, and the chart adds none of its own', () => {
    const base = readRepo('../../src/styles/base.css');
    const tokens = readRepo('../../src/tokens/tokens.css') + readRepo('../../src/tokens/brand.generated.css');
    const vars = tokensFor(theme);
    const rule = /\.ui-focusable:focus-visible[^{]*\{([^}]*)\}/.exec(base)![1];
    const resolved = substitute(rule, vars);
    expect(tokens, 'the ramp the resolver reads').toContain('--ring:');
    expect(resolved, 'every token resolved').not.toContain('var(');
    expect(resolved, 'a real outline survives forced colours').toMatch(/outline:\s*2px solid transparent/);
    const shadow = /box-shadow:\s*([^;]+)/.exec(resolved)![1];
    expect(shadow, 'the ring carries real colours, not the browser\'s default').toMatch(/#[0-9a-f]{3,8}|rgba?\(/i);
    expect(readRepo('../../src/styles/chart.css'),
      'the chart declares no outline of its own, so nothing reverts to the browser\'s')
      .not.toMatch(/outline\s*:/);
  });
});

it('steps columns with the arrows, Home and End, and announces each one politely', async () => {
  const user = userEvent.setup();
  months();
  const live = screen.getByRole('status');
  await user.tab();
  expect(frame()).toHaveFocus();
  expect(live).toHaveTextContent('Jan 2026. Income €1,200. Spend €800. Net €400.');
  await user.keyboard('{ArrowRight}');
  expect(live).toHaveTextContent('Feb 2026. Income €1,500. Spend €900. Net €600.');
  await user.keyboard('{ArrowLeft}{ArrowLeft}');
  expect(live, 'the first column is the floor').toHaveTextContent('Jan 2026.');
  await user.keyboard('{End}');
  expect(live).toHaveTextContent('Apr 2026. Income €900. Spend €500. Net €400. Estimated — April is still running.');
  await user.keyboard('{Home}');
  expect(live).toHaveTextContent('Jan 2026.');
});

it('selects a column with Enter only when the chart is selectable', async () => {
  const user = userEvent.setup();
  const onSelect = vi.fn();
  const { unmount } = months({ onSelect });
  await user.tab();
  await user.keyboard('{ArrowRight}{Enter}');
  expect(onSelect, 'a chart that is not selectable selects nothing').not.toHaveBeenCalled();
  unmount();

  months({ onSelect, selectable: true });
  await user.tab();
  await user.keyboard('{ArrowRight}{Enter}');
  expect(onSelect).toHaveBeenCalledWith(1);
  expect(screen.getByRole('status')).toHaveTextContent('Selected.');
  expect(screen.getByRole('row', { name: /Feb 2026/ })).toHaveAttribute('aria-current', 'true');
});

it('a click picks the column its mark belongs to', async () => {
  const user = userEvent.setup();
  const onSelect = vi.fn();
  months({ onSelect, selectable: true });
  await user.click(markEl('spend-2'));
  expect(onSelect).toHaveBeenCalledWith(2);
});

/* -- the readout ----------------------------------------------------------- */

it('opens the kit readout on the mark the pointer rests on, with one comparison', () => {
  months();
  hover('income-1');
  const tip = screen.getByRole('tooltip');
  expect(tip).toHaveClass('ui-tip', 'is-open');
  expect(tip.querySelector('.ui-tip__label')).toHaveTextContent('Income, Feb 2026');
  expect(tip.querySelector('.ui-tip__value')).toHaveTextContent('€1,500');
  expect(tip.querySelector('.ui-tip__detail')).toHaveTextContent('+25.0% on Jan');
  expect(tip.querySelectorAll('.ui-tip__detail'), 'one comparison at most').toHaveLength(1);
});

it('prints the unfinished state in the readout instead of a comparison, and in the legend', () => {
  const { container } = months();
  hover('income-3');
  expect(screen.getByRole('tooltip').querySelector('.ui-tip__detail'))
    .toHaveTextContent('Estimated — April is still running');
  const key = [...container.querySelectorAll('.ui-chart__key')].find((k) => k.textContent?.startsWith('Estimated'))!;
  expect(key).toHaveTextContent('Estimated April is still running');
});

it('draws an unfinished period hollow, with a dashed edge in its own tone', () => {
  const { container } = months();
  const bars = [...container.querySelectorAll('path.ui-chart__bar')];
  const april = bars.filter((b) => b.classList.contains('is-estimated'));
  expect(april, 'one hollow bar per bar series in the unfinished column').toHaveLength(2);
  // A wash of the bar's own tone over the chart's ground, inside the dashed
  // edge. Bare ground read as a placeholder box once the bar was capped at a
  // mark's width; the wash gives the period the mass the reader is counting.
  const rule = /\.ui-chart__bar\.is-estimated\s*\{([^}]*)\}/.exec(readRepo('../../src/styles/chart.css'))![1];
  expect(rule).toMatch(/fill:\s*color-mix\(in srgb, var\(--ui-chart-tone\) \d+%, var\(--ui-chart-ground\)\)/);
  expect(rule, 'the dash is the cue a reader who cannot see the tone still gets')
    .toContain('stroke-dasharray: 3 2');
  expect(container.querySelectorAll('pattern'), 'no hatch is declared').toHaveLength(0);
  const segments = [...container.querySelectorAll('line.ui-chart__line')];
  expect(segments).toHaveLength(3);
  expect(segments.filter((s) => s.classList.contains('is-estimated')),
    'the segment into the unfinished month is dashed').toHaveLength(1);
});

// Round 32 (#543): the ramp down each bar was the one shape in the drawing that
// carried no number. It let the middle of a bar go while both edges held, so two
// months were compared as two shaded cylinders.
it('paints every bar in one flat tone, with no ramp and no second paint', () => {
  const { container } = months();
  expect(container.querySelectorAll('linearGradient'), 'no ramp is declared').toHaveLength(0);
  for (const bar of container.querySelectorAll('path.ui-chart__bar')) {
    expect((bar as SVGElement).style.getPropertyValue('--ui-chart-paint'),
      'a bar names no paint of its own').toBe('');
  }
  const css = readRepo('../../src/styles/chart.css');
  expect(/\.ui-chart__bar\s*\{([^}]*)\}/.exec(css)![1]).toContain('fill: var(--ui-chart-tone)');
  expect(css, 'and nothing is left to style a ramp with').not.toMatch(/ui-chart__fade|ui-chart-paint/);
});

// Material's rule, and the reason a bar is a path: the top of a bar has to
// measure the bar's length, and a rounded foot lifts it off the one rule the
// chart draws.
it('spends a bar\'s corner radius on the end away from zero, and none on the foot', () => {
  const { container } = months();
  const svg = container.querySelector('.ui-chart__svg')!;
  const zeroY = Number(svg.querySelector('.ui-chart__zero')!.getAttribute('y1'));
  // The tolerance is the radius itself, read from the component: an arc leaves
  // the edge it rounds exactly that far, so hard-coding it here would fail the
  // next time the radius moves and would say nothing about where the arc is.
  const radius = Number(/const BAR_RADIUS = (\d+)/.exec(readRepo('./Chart.tsx'))![1]);
  for (const bar of svg.querySelectorAll('path.ui-chart__bar')) {
    const box = boxOf(bar);
    const arcs = arcsOf(bar);
    expect(arcs, `${classOf(bar)} rounds exactly one end`).toHaveLength(2);
    const onZero = Math.abs(box.y - zeroY) < Math.abs(box.y + box.height - zeroY) ? 'top' : 'bottom';
    const far = onZero === 'top' ? box.y + box.height : box.y;
    for (const at of arcs) {
      expect(Math.abs(at - far), `${classOf(bar)} rounds the end it stands on`).toBeLessThanOrEqual(radius);
    }
  }
});

// A bridge step floats between two running totals and stands on nothing, so there
// is no foot to keep square and both ends are rounded.
it('rounds both ends of a bar that stands on nothing', () => {
  const { container } = render(
    <Chart variant="bridge" title="Cash" format={eur}
      steps={[{ label: 'Opening', value: 1000 }, { label: 'Sales', value: 400 },
        { label: 'Fees', value: -150 }, { label: 'Closing', kind: 'total' }]} />,
  );
  const bars = [...container.querySelectorAll('path.ui-chart__bar')];
  // Opening and Closing stand on zero; Sales and Fees float above it.
  expect(bars.map((b) => arcsOf(b).length), 'two corners on the ends, four in the middle')
    .toEqual([2, 4, 4, 2]);
});

it('a tap opens the readout, a second tap on the same mark closes it', () => {
  months();
  fireEvent.touchStart(markEl('income-1'));
  fireEvent.touchEnd(markEl('income-1'));
  expect(screen.getByRole('tooltip')).toHaveClass('is-open');
  fireEvent.touchStart(markEl('income-1'));
  fireEvent.touchEnd(markEl('income-1'));
  expect(screen.queryByRole('tooltip')).toBeNull();
});

/**
 * The whole touch sequence, which is `touchstart`, `touchend` and then the click
 * a browser synthesises behind them. #543's review found the round-32 test
 * firing only the first two, which is why an opening tap was picking the column
 * underneath it and nothing caught that.
 */
const tap = (id: string) => {
  fireEvent.pointerDown(markEl(id), { pointerType: 'touch' });
  fireEvent.touchStart(markEl(id));
  fireEvent.touchEnd(markEl(id));
  fireEvent.click(markEl(id));
};

it('the tap that opens a readout picks nothing; the tap that closes it picks', () => {
  const onSelect = vi.fn();
  months({ selectable: true, onSelect });

  tap('income-1');
  expect(screen.getByRole('tooltip')).toHaveClass('is-open');
  expect(onSelect, 'the opening tap answers what the mark is worth and does nothing else')
    .not.toHaveBeenCalled();
  expect(screen.getByRole('status')).toHaveTextContent('Feb 2026. Income €1,500.');
  expect(screen.getByRole('status'), 'and says nothing about a selection that did not happen')
    .not.toHaveTextContent('Selected');

  tap('income-1');
  expect(screen.queryByRole('tooltip'), 'the same mark again closes the readout').toBeNull();
  expect(onSelect, 'the closing tap is a second, deliberate press and keeps the action')
    .toHaveBeenCalledWith(1);
});

it('a tap that moves the readout to another mark is an opening tap too', () => {
  const onSelect = vi.fn();
  months({ selectable: true, onSelect });
  tap('income-1');
  tap('income-2');
  expect(screen.getByRole('tooltip')).toHaveTextContent('Mar 2026');
  expect(onSelect).not.toHaveBeenCalled();
});

it('an opening tap still lets its click through to the page', () => {
  const onPageClick = vi.fn();
  render(
    // The host's own listener, which the chart is inside rather than part of.
    <div onClick={onPageClick}>
      <Chart title="Income and spend by month" periods={periods} series={series} format={eur}
        selectable />
    </div>,
  );
  tap('income-1');
  // The guideline blocks the MARK's click action on the opening tap, not the
  // event: a host that wires its own handler around the chart still hears it.
  // why: guidelines/hover-readouts.md#tap-to-open-or-close
  expect(onPageClick).toHaveBeenCalledTimes(1);
});

it('an ordinary mouse click is not a tap, and still picks', async () => {
  const user = userEvent.setup();
  const onSelect = vi.fn();
  months({ selectable: true, onSelect });
  await user.click(markEl('income-1'));
  expect(onSelect).toHaveBeenCalledWith(1);
});

it('Escape dismisses the readout, and the pointer does not bring it straight back', () => {
  months();
  hover('income-1');
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(screen.queryByRole('tooltip')).toBeNull();
  hover('income-1');
  expect(screen.queryByRole('tooltip'), 'the mark Escape dismissed stays shut').toBeNull();
  hover('income-2');
  expect(screen.getByRole('tooltip')).toHaveTextContent('Mar 2026');
});

it('carries no tooltip role until it has a value to say', () => {
  const { container } = months();
  expect(container.querySelector('.ui-tip')).not.toHaveAttribute('role');
});

/* -- the bridge ------------------------------------------------------------ */

describe('bridge', () => {
  const steps = [
    { label: 'Opening', value: 1000 },
    { label: 'Sales', value: 400 },
    { label: 'Refunds', value: -150 },
    { label: 'Closing', kind: 'total' as const },
  ];
  const bridge = () => render(
    <Chart variant="bridge" title="Cash from opening to closing" steps={steps} format={eur} />,
  );

  it('walks to a closing total it works out itself, and tables the running total', () => {
    bridge();
    const rows = screen.getAllByRole('row').slice(1);
    expect(rows.map((r) => within(r).getAllByRole('cell').map((c) => c.textContent))).toEqual([
      ['€1,000', '€1,000'], ['€400', '€1,400'], ['−€150', '€1,250'], ['€1,250', '€1,250'],
    ]);
    expect(within(screen.getByRole('table')).getAllByRole('columnheader').map((c) => c.textContent))
      .toEqual(['Step', 'Amount', 'Running total']);
  });

  it('tones a rise, a fall and a total apart, and says so in the legend', () => {
    const { container } = bridge();
    expect([...container.querySelectorAll('.ui-chart__key')].map((k) => k.textContent))
      .toEqual(['Totals', 'Increases', 'Decreases']);
    expect([...container.querySelectorAll('path.ui-chart__bar')].map(toneOf))
      .toEqual(['neutral', 'good', 'bad', 'neutral']);
  });

  it('a step\'s readout carries the running total as its one comparison', () => {
    const { container } = bridge();
    fireEvent.mouseMove(container.querySelector('[data-mark="step-2"] .ui-chart__hit')!);
    const tip = screen.getByRole('tooltip');
    expect(tip.querySelector('.ui-tip__value')).toHaveTextContent('−€150');
    expect(tip.querySelector('.ui-tip__detail')).toHaveTextContent('Running total €1,250');
  });

  it('takes the caller\'s tones over its own', () => {
    const { container } = render(
      <Chart variant="bridge" title="Cost from opening to closing" steps={steps} format={eur}
        tones={{ rise: 'bad', fall: 'good', total: 'info' }} />,
    );
    expect([...container.querySelectorAll('path.ui-chart__bar')].map(toneOf))
      .toEqual(['info', 'bad', 'good', 'info']);
  });
});

/* -- the narrow width ------------------------------------------------------ */

it('scrolls the plot and marks the side that still hides columns', () => {
  const { container } = months();
  const scroll = container.querySelector('.ui-chart__scroll') as HTMLDivElement;
  expect(container.querySelector('.ui-chart__plot')).toHaveStyle({ '--ui-chart-cols': '4' });
  // JSDOM reports every box as zero, so the two edges are driven directly.
  Object.defineProperty(scroll, 'clientWidth', { value: 200, configurable: true });
  Object.defineProperty(scroll, 'scrollWidth', { value: 576, configurable: true });
  fireEvent.scroll(scroll);
  expect(scroll.className).toContain('is-more-after');
  expect(scroll.className).not.toContain('is-more-before');
  scroll.scrollLeft = 376;
  fireEvent.scroll(scroll);
  expect(scroll.className).toContain('is-more-before');
  expect(scroll.className).not.toContain('is-more-after');
});

it('keeps the value axis out of the scroller, so it stays put', () => {
  const { container } = months();
  const axis = container.querySelector('.ui-chart__axis')!;
  expect(axis.closest('.ui-chart__scroll'), 'an axis inside the scroller scrolls away').toBeNull();
  expect(axis.parentElement).toHaveClass('ui-chart__frame');
  expect(axis).toHaveAttribute('aria-hidden', 'true');
});

/* -- the nothing cases ----------------------------------------------------- */

it('draws an empty series without throwing, and says there is nothing to step', () => {
  render(<Chart title="Nothing yet" periods={[]} series={[]} format={eur} />);
  expect(frame()).toHaveAccessibleName('Nothing yet. Arrow keys step through the 0 columns.');
  fireEvent.keyDown(frame(), { key: 'ArrowRight' });
  expect(screen.getByRole('status')).toBeEmptyDOMElement();
});

/* -- axe ------------------------------------------------------------------- */

describe.each(['dark', 'light'])('axe [%s]', (theme) => {
  it('finds no violation in either variant', async () => {
    document.documentElement.setAttribute('data-theme', theme);
    months();
    render(<Chart variant="bridge" title="Cash from opening to closing" format={eur}
      steps={[{ label: 'Opening', value: 10 }, { label: 'Sales', value: 5 }, { label: 'Closing', kind: 'total' }]} />);
    const result = await axe.run(document.body, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
      resultTypes: ['violations'],
      rules: { 'color-contrast': { enabled: false } },
    });
    expect(result.violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
  });
});

it('draws no bar and tables an em dash where the caller gave no value', () => {
  const { container } = render(
    <Chart title="Fees" periods={periods}
      series={[{ id: 'f', name: 'Fees', values: [10, 20] }]} format={eur} />,
  );
  expect(container.querySelectorAll('path.ui-chart__bar'), 'two values, two bars').toHaveLength(2);
  const rows = screen.getAllByRole('row').slice(1);
  expect(rows.map((r) => within(r).getAllByRole('cell')[0].textContent)).toEqual(['€10', '€20', '—', '—']);
});

/* -- what the review of 0ff4c5d found ------------------------------------- */

it('leaves a real channel at zero instead of painting one over the marks', () => {
  const { container } = months();
  const svg = container.querySelector('.ui-chart__svg')!;
  const zero = svg.querySelector('.ui-chart__zero')!;
  const zeroY = Number(zero.getAttribute('y1'));

  // Nothing paints the chart's own ground across the plot any more. A stroke
  // laid over the marks erased a line series sitting on zero, sliced a dot near
  // it, and broke the picked column's accent frame where the two bars meet.
  expect(container.querySelector('.ui-chart__zero-gap'),
    'the ground stroke is gone, not moved').toBeNull();

  // The channel is the two bars stopping short, each by the same amount.
  const up = boxOf(svg.querySelector('path.ui-chart__bar.ui-chart__tone--good')!);
  const down = boxOf(svg.querySelector('path.ui-chart__bar.ui-chart__tone--bad')!);
  expect(zeroY - (up.y + up.height), 'the bar above gives up its inset').toBeCloseTo(1.5, 1);
  expect(down.y - zeroY, 'the bar below gives up the same').toBeCloseTo(1.5, 1);
  for (const bar of svg.querySelectorAll('path.ui-chart__bar')) {
    const box = boxOf(bar);
    expect(Math.min(Math.abs(box.y - zeroY), Math.abs(box.y + box.height - zeroY)),
      `${bar.getAttribute('class')} reaches the zero line`).toBeGreaterThanOrEqual(1.4);
  }

  // So the line and every bar's own stroke are painted after the rules, and
  // nothing of the chart's crosses them back.
  const kinds = [...svg.querySelectorAll('.ui-chart__grid, .ui-chart__zero, .ui-chart__bar, .ui-chart__line')]
    .map((el) => (el.classList.contains('ui-chart__grid') ? 'grid'
      : el.classList.contains('ui-chart__zero') ? 'zero'
        : el.classList.contains('ui-chart__bar') ? 'bar' : 'line'));
  expect(kinds.indexOf('zero'), 'the zero rule comes after the grid and before every mark')
    .toBe(kinds.lastIndexOf('grid') + 1);
  expect(kinds.lastIndexOf('zero')).toBe(kinds.indexOf('zero'));
  expect(kinds.slice(kinds.indexOf('zero') + 1).every((k) => k === 'bar' || k === 'line'),
    'nothing but marks is drawn after the rules').toBe(true);
});

it('keeps a line series whole where it sits on zero', () => {
  // The case the review measured: a net series at break-even. Its segments are
  // the last things painted across that row.
  const flat = [0, 0, 0, 0];
  const { container } = render(
    <Chart title="Net" periods={periods}
      series={[{ id: 'income', name: 'Income', values: INCOME, tone: 'good' },
        { id: 'net', name: 'Net', values: flat, shape: 'line' }]} format={eur} />,
  );
  const svg = container.querySelector('.ui-chart__svg')!;
  const zeroY = Number(svg.querySelector('.ui-chart__zero')!.getAttribute('y1'));
  const segments = [...svg.querySelectorAll('line.ui-chart__line')];
  expect(segments).toHaveLength(3);
  for (const segment of segments) {
    expect(Number(segment.getAttribute('y1'))).toBeCloseTo(zeroY, 1);
  }
  // No marker of its own: a dot on every point told a reader nothing the line had
  // not already drawn, and it is the shape that dated the chart hardest.
  expect(svg.querySelectorAll('circle.ui-chart__dot'), 'the line carries no markers')
    .toHaveLength(0);
  const painted = [...svg.querySelectorAll('.ui-chart__zero, .ui-chart__line')]
    .map((el) => (el.classList.contains('ui-chart__zero') ? 'zero' : 'mark'));
  expect(painted[0], 'the zero line first').toBe('zero');
  expect(painted.slice(1).every((k) => k === 'mark'),
    'every segment on the line is painted after it').toBe(true);
});

// The accent is a series now, so it cannot also mean "this one". The picked
// column is marked where no series is drawn — on its own label — with the shape
// the kit already gives a chosen thing: a rule the width of the column and the
// strong ink. Nothing is painted over a mark, which is what keeps every series
// measuring against the chart's own ground and nothing else.
// Selection is a background highlight and nothing else; an outline on this
// component belongs to focus, which the frame draws. The picked label keeps the
// weight, which is the half a reader who separates no colours still gets.
it('marks the picked column with a band behind it, and puts no hue on any mark', () => {
  const { container } = months({ selectable: true, selected: 3 });
  const svg = container.querySelector('.ui-chart__svg')!;
  expect(svg.querySelectorAll('.is-selected'), 'no mark carries the picked state').toHaveLength(0);

  const bands = [...svg.querySelectorAll('rect.ui-chart__band')];
  expect(bands, 'one band, behind the picked column').toHaveLength(1);
  expect(svg.firstElementChild, 'and behind every rule and every mark').toBe(bands[0]);
  const columnWidth = Number(svg.getAttribute('width')) / MONTHS.length;
  expect(Number(bands[0].getAttribute('x'))).toBeCloseTo(3 * columnWidth, 1);
  expect(Number(bands[0].getAttribute('width')), 'the column, not the bar in it')
    .toBeCloseTo(columnWidth, 1);

  const labels = [...container.querySelectorAll('.ui-chart__period')];
  expect(labels).toHaveLength(MONTHS.length);
  expect(labels.filter((el) => el.classList.contains('is-selected')).map((el) => el.textContent))
    .toEqual(['Apr']);
  expect(months({ selectable: true }).container.querySelectorAll('rect.ui-chart__band'),
    'and nothing picked draws no band').toHaveLength(0);

  const css = readRepo('../../src/styles/chart.css');
  const rule = /\.ui-chart__period\.is-selected\s*\{([^}]*)\}/.exec(css)![1];
  expect(rule, 'the label keeps the weight').toMatch(/font-weight:\s*600/);
  expect(rule, 'and takes back the body ink the row gives up').toContain('color: var(--strong)');
  expect(rule, 'the accent stays with the series').not.toContain('--accent');
  expect(rule, 'and the rule the label used to carry is gone').not.toContain('border');
  expect(/\.ui-chart__band\s*\{([^}]*)\}/.exec(css)![1],
    'the band is a quiet fill, not the accent').toBe(' fill: var(--surface-3); ');
});

// A waterfall whose steps do not carry their running total to the next column is
// a row of floating blocks, and the reader has to find the walk.
it('carries a bridge step\'s running total to the step beside it', () => {
  const { container } = render(
    <Chart variant="bridge" title="Cash" format={eur}
      steps={[{ label: 'Opening', value: 1000 }, { label: 'Sales', value: 400 },
        { label: 'Fees', value: -150 }, { label: 'Closing', kind: 'total' }]} />,
  );
  const svg = container.querySelector('.ui-chart__svg')!;
  const carries = [...svg.querySelectorAll('line.ui-chart__carry')];
  expect(carries, 'one between each pair of steps, and none after the last').toHaveLength(3);
  const bars = [...svg.querySelectorAll('path.ui-chart__bar')].map(boxOf);
  carries.forEach((carry, i) => {
    expect(Number(carry.getAttribute('y1')), 'level, at the total the step reached')
      .toBe(Number(carry.getAttribute('y2')));
    expect(Number(carry.getAttribute('x1')), 'from the step it leaves')
      .toBeCloseTo(bars[i].x + bars[i].width, 1);
    expect(Number(carry.getAttribute('x2')), 'to the step it meets')
      .toBeCloseTo(bars[i + 1].x, 1);
  });
  // Opening closes at 1000 and Sales opens there; Sales closes at 1400.
  const level = (i: number) => Number(carries[i].getAttribute('y1'));
  expect(level(0)).toBeCloseTo(bars[0].y, 1);
  expect(level(1)).toBeCloseTo(bars[1].y, 1);
  expect(months().container.querySelectorAll('line.ui-chart__carry'),
    'a months chart carries nothing between its columns').toHaveLength(0);
});

// Two bar series standing on the same side of zero used to be drawn at the same
// x, one over the other: the second hid the first and only its readout gave the
// value away. They take a lane each instead.
it('lays two bar series in one band side by side, with ground between them', () => {
  const gap = Number(/const LANE_GAP = (\d+)/.exec(readRepo('./Chart.tsx'))![1]);
  const { container } = render(
    <Chart title="Income and spend" periods={periods} format={eur}
      series={[
        { id: 'income', name: 'Income', values: INCOME, shape: 'bars', tone: 'accent' },
        { id: 'spend', name: 'Spend', values: SPEND, shape: 'bars', tone: 'accent-soft' },
      ]} />,
  );
  const svg = container.querySelector('.ui-chart__svg')!;
  const bars = [...svg.querySelectorAll('path.ui-chart__bar')].map(boxOf);
  const income = bars.slice(0, MONTHS.length);
  const spend = bars.slice(MONTHS.length);
  expect(spend).toHaveLength(MONTHS.length);
  income.forEach((a, i) => {
    expect(a.x, 'the first series takes the left lane').toBeLessThan(spend[i].x);
    expect(spend[i].x - (a.x + a.width), 'with the ground between them')
      .toBeCloseTo(gap, 1);
    expect(a.width, 'and both lanes are drawn at one width').toBeCloseTo(spend[i].width, 1);
  });
  // Each lane answers for its own half of the column, so a pointer between the
  // two bars still has the bar it is nearer to answer with.
  const hits = [...svg.querySelectorAll('[data-mark] .ui-chart__hit')]
    .map((h) => ({ x: Number(h.getAttribute('x')), w: Number(h.getAttribute('width')) }));
  const columnWidth = Number(svg.getAttribute('width')) / MONTHS.length;
  expect(hits[0].w).toBeCloseTo(columnWidth / 2, 1);
  expect(hits[MONTHS.length].x).toBeCloseTo(columnWidth / 2, 1);
  // The mirror the issue asks for is unchanged: one lane each side of zero.
  const mirrored = months().container.querySelectorAll('path.ui-chart__bar');
  const xs = new Set([...mirrored].map((b) => Math.round(boxOf(b).x)));
  expect(xs.size, 'a mirrored chart draws one bar per column per side, centred')
    .toBe(MONTHS.length);
});

// A column grows with the card; a mark does not. Without the cap, twelve months
// at a desktop width were twelve 45px blocks and the plot read as one mass.
it('caps a bar at a mark\'s width however wide its column is', () => {
  const cap = Number(/const BAR_MAX = (\d+)/.exec(readRepo('./Chart.tsx'))![1]);
  const share = Number(/const BAR_SHARE = ([\d.]+)/.exec(readRepo('./Chart.tsx'))![1]);
  const { container } = months();
  const svg = container.querySelector('.ui-chart__svg')!;
  const columnWidth = Number(svg.getAttribute('width')) / MONTHS.length;
  const widths = [...svg.querySelectorAll('path.ui-chart__bar')].map((b) => boxOf(b).width);
  expect(new Set(widths).size, 'every bar is drawn at one width').toBe(1);
  expect(widths[0]).toBeLessThanOrEqual(cap);
  expect(widths[0], 'and never more than its share of a narrow column')
    .toBeLessThanOrEqual(columnWidth * share);
});

// Round 32 (#543): a hairline at every tick carries a bar's height across twelve
// columns to the label that names it, and the zero rule leads the ones it is
// measured against. Which of the two is heavier is a token here; the painted
// weight is in the browser captures.
it('draws a hairline at every tick and the zero rule over them', () => {
  const { container } = months();
  const svg = container.querySelector('.ui-chart__svg')!;
  const ticks = container.querySelectorAll('.ui-chart__tick').length;
  expect(ticks, 'the scale keeps a label at every tick').toBeGreaterThan(1);
  expect(svg.querySelectorAll('line.ui-chart__zero'), 'one zero rule').toHaveLength(1);
  expect(svg.querySelectorAll('line.ui-chart__grid'), 'a hairline at every other tick')
    .toHaveLength(ticks - 1);
  const css = readRepo('../../src/styles/chart.css');
  const strokeOf = (name: string) => /stroke:\s*var\((--[\w-]+)\)/
    .exec(new RegExp(`\\.ui-chart__${name}\\s*\\{([^}]*)\\}`).exec(css)![1])![1];
  expect(strokeOf('grid'), 'the grid is the kit\'s faintest edge').toBe('--border');
  expect(strokeOf('zero'), 'and the zero rule is the heavier one above it').toBe('--border-strong');
  // A sparkline is read against itself and has no zero to measure from, so it
  // draws neither.
  const { container: spark } = render(
    <Chart variant="spark" title="Income" periods={periods} format={eur}
      series={[{ id: 'income', name: 'Income', values: INCOME, shape: 'line' }]} />,
  );
  expect(spark.querySelectorAll('.ui-chart__grid, .ui-chart__zero')).toHaveLength(0);
});

// A line crosses bars of its own hue, where luminance alone does not separate
// them. The casing is the chart's own ground, carried under the stroke.
it('lays every line casing under every line stroke, and makes it the wider of the two', () => {
  const { container } = months();
  const svg = container.querySelector('.ui-chart__svg')!;
  const drawn = [...svg.querySelectorAll('line.ui-chart__line-casing, line.ui-chart__line')]
    .map((el) => (el.classList.contains('ui-chart__line-casing') ? 'casing' : 'stroke'));
  expect(drawn.length, 'a casing and a stroke for each of the three segments').toBe(6);
  expect(drawn.join(' '), 'no casing is drawn after a stroke it could cut')
    .toBe('casing casing casing stroke stroke stroke');

  const css = readRepo('../../src/styles/chart.css');
  const widthOf = (name: string) => Number(/stroke-width:\s*([\d.]+)/
    .exec(new RegExp(`\\.ui-chart__${name}\\s*\\{([^}]*)\\}`).exec(css)![1])![1]);
  expect(widthOf('line-casing')).toBeGreaterThan(widthOf('line'));
  expect(/\.ui-chart__line-casing\s*\{([^}]*)\}/.exec(css)![1],
    'the casing is the chart\'s own ground, so the line clears it everywhere')
    .toContain('stroke: var(--ui-chart-ground)');
  expect(css, 'and a sparkline, which crosses nothing, draws none')
    .toMatch(/\.ui-chart--spark \.ui-chart__line-casing \{ display: none; \}/);
});

it('draws the Estimated key in the tone of the series it describes, not in body ink', () => {
  const { container } = months();
  const key = [...container.querySelectorAll('.ui-chart__key')]
    .find((k) => k.textContent?.startsWith('Estimated'))!;
  expect(classOf(key), 'the key takes the tone of the unfinished bar it stands for')
    .toContain('ui-chart__tone--good');
  const css = readRepo('../../src/styles/chart.css');
  const rule = /\.ui-chart__key-estimated\s*\{([^}]*)\}/.exec(css)![1];
  expect(rule, 'the key strokes the tone').toContain('stroke: var(--ui-chart-tone)');
  expect(rule, 'and is hollow, the way the column it stands for is')
    .toContain('fill: var(--ui-chart-ground)');
  expect(rule, 'the key draws no maximum-contrast outline').not.toMatch(/var\(--(text|strong)\)/);
});

it('a bridge draws its Estimated key in the tone of the step that is not final', () => {
  const { container } = render(
    <Chart variant="bridge" title="Cash" format={eur}
      steps={[{ label: 'Opening', value: 1000 }, { label: 'Sales', value: 400 },
        { label: 'Fees', value: -150, estimated: true }, { label: 'Closing', kind: 'total' }]} />,
  );
  const key = [...container.querySelectorAll('.ui-chart__key')]
    .find((k) => k.textContent?.startsWith('Estimated'))!;
  expect(classOf(key), 'a falling step is the bad tone, not the first key in the legend')
    .toContain('ui-chart__tone--bad');
});

it('a cursor left past the end of a shortened series still announces', async () => {
  const user = userEvent.setup();
  const { rerender } = render(
    <Chart title="Fees" periods={periods} series={[{ id: 'f', name: 'Fees', values: INCOME }]} format={eur} />,
  );
  await user.tab();
  await user.keyboard('{End}');
  expect(screen.getByRole('status')).toHaveTextContent('Apr 2026.');
  rerender(
    <Chart title="Fees" periods={periods.slice(0, 2)}
      series={[{ id: 'f', name: 'Fees', values: INCOME.slice(0, 2) }]} format={eur} />,
  );
  await user.keyboard('{ArrowLeft}');
  expect(screen.getByRole('status'), 'the cursor is clamped rather than left off the end')
    .toHaveTextContent('Jan 2026.');
});

it('keeps the readout inside the part it belongs to', () => {
  // JSDOM has no layout, so the viewport and the three boxes are all given: a
  // frame whose top edge is the legend's bottom, and a mark just under it.
  // Nothing between the frame and the body clips, so without the bound the clip
  // box is the viewport and the readout is free to open over the chart's own
  // legend and top tick.
  for (const [prop, value] of [['clientWidth', 1280], ['clientHeight', 800]] as const) {
    Object.defineProperty(document.documentElement, prop, { value, configurable: true });
  }
  const host = document.createElement('div');
  const mark = document.createElement('div');
  const tip = document.createElement('span');
  host.append(mark, tip);
  document.body.append(host);
  const box = (top: number, bottom: number) =>
    ({ top, bottom, left: 100, right: 200, width: 100, height: bottom - top }) as DOMRect;
  vi.spyOn(host, 'getBoundingClientRect').mockReturnValue(box(120, 400));
  vi.spyOn(mark, 'getBoundingClientRect').mockReturnValue(box(130, 130));
  vi.spyOn(tip, 'offsetHeight', 'get').mockReturnValue(60);
  vi.spyOn(tip, 'offsetWidth', 'get').mockReturnValue(120);

  placeTip(host, mark, tip);
  expect(tip.classList.contains('is-below'),
    'unbounded, the viewport is the only ceiling and the readout opens upward over the legend')
    .toBe(false);

  placeTip(host, mark, tip, host);
  expect(tip.classList.contains('is-below'),
    'bounded by the frame, a mark with no room above flips below instead of leaving it')
    .toBe(true);
});

it('hands its own frame to the readout as that bound', () => {
  // The same case, through the component rather than through placeTip: a mark
  // with the legend just above it. JSDOM reports every box as zero, so the
  // frame, the anchor and the readout are given the geometry a browser would.
  for (const [prop, value] of [['clientWidth', 1280], ['clientHeight', 800]] as const) {
    Object.defineProperty(document.documentElement, prop, { value, configurable: true });
  }
  const { container } = months();
  const frameEl = container.querySelector<HTMLElement>('.ui-chart__frame')!;
  const tip = container.querySelector<HTMLElement>('.ui-tip')!;
  const anchor = container.querySelector('[data-anchor="income-0"]')!;
  const box = (top: number, bottom: number, left: number, right: number) =>
    ({ top, bottom, left, right, width: right - left, height: bottom - top }) as DOMRect;
  vi.spyOn(frameEl, 'getBoundingClientRect').mockReturnValue(box(120, 400, 100, 1200));
  vi.spyOn(anchor, 'getBoundingClientRect').mockReturnValue(box(130, 130, 110, 170));
  vi.spyOn(tip, 'offsetHeight', 'get').mockReturnValue(60);
  vi.spyOn(tip, 'offsetWidth', 'get').mockReturnValue(120);

  hover('income-0');
  expect(tip.classList.contains('is-below'),
    'the readout flips below rather than opening over the legend above the frame').toBe(true);
});

it('says under the pointer that a selectable column can be picked', () => {
  const plain = months().container.querySelector('.ui-chart')!;
  expect(classOf(plain), 'a chart that picks nothing claims nothing').not.toContain('ui-chart--pick');
  cleanup();
  const pick = months({ selectable: true }).container.querySelector('.ui-chart')!;
  expect(classOf(pick)).toContain('ui-chart--pick');
  const rule = /\.ui-chart--pick \[data-mark\]\s*\{([^}]*)\}/
    .exec(readRepo('../../src/styles/chart.css'))![1];
  expect(rule).toContain('cursor: pointer');
});

it('gives the named group focus when a column is clicked, and says which one', async () => {
  const user = userEvent.setup();
  const { container } = months();
  await user.click(markEl('spend-2'));
  // The nearest focusable ancestor of a mark is the scroller, which has no role
  // and no name; a pointer reader parked there never hears what the arrows do.
  expect(container.querySelector('.ui-chart__scroll')).not.toHaveFocus();
  expect(frame()).toHaveFocus();
  expect(frame()).toHaveAccessibleName(/Arrow keys step through/);
  expect(screen.getByRole('status'), 'the column the tap landed on, not the one the cursor was on')
    .toHaveTextContent('Mar 2026. Income €1,400. Spend €850. Net €550.');
  await user.keyboard('{ArrowRight}');
  expect(screen.getByRole('status'), 'the arrows carry on from there').toHaveTextContent('Apr 2026.');
});

it('a click on a selectable column picks it and announces that it is picked', async () => {
  const user = userEvent.setup();
  const onSelect = vi.fn();
  months({ selectable: true, onSelect });
  await user.click(markEl('income-1'));
  expect(onSelect).toHaveBeenCalledWith(1);
  expect(screen.getByRole('status')).toHaveTextContent('Feb 2026. Income €1,500. Spend €900. Net €600. Selected.');
});
