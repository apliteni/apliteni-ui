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
import { render, screen, fireEvent, cleanup, within, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Chart, placeChartTip, type ChartLookSeries, type ChartPeriod, type ChartSeries } from './Chart';
import { Card } from './primitives/Card';
import type { ChartSlice } from './chart-looks';
import { stubPopover } from './test/popover';
// Plain JS outside this workspace's tsconfig, imported for its arithmetic the
// way react/src/contrast.test.tsx imports it.
// @ts-expect-error -- untyped JS module, deliberately shared across the gates.
import { substitute, tokensFor } from '../../stories/lib/contrast.js';
import { LinePoints, LineThin } from './Chart.stories';

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
const frame = () => screen.getByRole('group', { name: /Arrow keys/ });
/** The view switch in the corner is the first stop, so the frame is the second. */
const tabToFrame = async (user: ReturnType<typeof userEvent.setup>) => { await user.tab(); await user.tab(); };
const showTable = () => fireEvent.click(screen.getByRole('button', { name: 'Table' }));
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

/* Spend split two ways, for the line, area, stacked and donut looks. */
const costs: ChartLookSeries[] = [
  { id: 'payroll', name: 'Payroll', values: [600, 600, 650, 400], tone: 'accent' },
  { id: 'hosting', name: 'Hosting', values: [200, 300, 200, 100], tone: 'info' },
];
const slices: ChartSlice[] = [
  { id: 'payroll', name: 'Payroll', value: 600, tone: 'accent' },
  { id: 'hosting', name: 'Hosting', value: 200, tone: 'info' },
];
const LOOKS = [
  ['line', 'thin'], ['line', 'points'], ['line', 'labels'],
  ['area', 'flat'], ['area', 'curves'], ['area', 'stacked'], ['area', 'share'],
  ['stacked', 'columns'], ['stacked', 'share'], ['stacked', 'rows'],
  ['donut', 'thin'], ['donut', 'table'], ['donut', 'labels'],
] as const;
const lookChart = (variant: 'line' | 'area' | 'stacked', look?: string) => render(
  <Chart variant={variant} look={look as 'thin'} title="Spend by cost" periods={periods} series={costs} format={eur} />,
);

/* -- the name, and the data without a pointer ------------------------------ */

it('names the chart, and says how to step through it', () => {
  months();
  expect(plot()).toHaveAccessibleName('Income and spend by month');
  expect(frame()).toHaveAccessibleName('Income and spend by month. Arrow keys step through the 4 columns.');
});

// #736: in a titled card the switch sits at the end of the card's title row, so
// the chart draws no row of its own for it. JSDOM lays nothing out, so this reads
// where the switch lands; the browser captures on the PR show the row.
const inCard = (ui: React.ReactElement) => <Card title="Income and spend">{ui}</Card>;
it.each([
  ['in the chart\'s own head', (ui: React.ReactElement) => ui, '.ui-chart__head'],
  ['in a titled card\'s title row', inCard, '.ui-card__head > .ui-card__tools'],
])('swaps the chart for the same numbers as a table, with the exact values the formatter gives, %s', async (_, wrap, slot) => {
  const user = userEvent.setup();
  const { container } = render(wrap(
    <Chart title="Income and spend by month" periods={periods} series={series} format={eur} />,
  ));
  const chart = screen.getByRole('button', { name: 'Chart' });
  const toTable = screen.getByRole('button', { name: 'Table' });
  const toolbar = screen.getByRole('toolbar', { name: 'Income and spend by month, view' });
  expect(toolbar).toContainElement(chart);
  expect(container.querySelector(slot)).toContainElement(toolbar);
  expect(container.querySelectorAll('.ui-seg'), 'one switch, drawn once').toHaveLength(1);
  expect(container.querySelector('.ui-seg'), 'the view switch keeps the neutral form, not the accent')
    .not.toHaveClass('ui-seg--accent');
  expect(chart.textContent, 'the glyph is the whole label').toBe('');
  expect(chart, 'the chart is the view a reader opens on').toHaveAttribute('aria-pressed', 'true');
  expect(screen.queryByRole('table')).toBeNull();

  await user.tab();
  expect(chart, 'the switch is the first stop').toHaveFocus();
  await user.keyboard('{ArrowRight}');
  expect(toTable).toHaveAttribute('aria-pressed', 'true');
  expect(container.querySelector('.ui-chart__frame'), 'the table takes the plot\'s place').not.toBeVisible();
  const table = screen.getByRole('table', { name: 'Income and spend by month' });
  expect(within(table).getAllByRole('columnheader').map((c) => c.textContent))
    .toEqual(['Period', 'Income', 'Spend', 'Net']);
  const april = within(table).getByRole('row', { name: /Apr 2026/ });
  expect(within(april).getAllByRole('cell').map((c) => c.textContent)).toEqual(['€900', '€500', '€400']);

  await user.keyboard('{ArrowLeft}');
  expect(screen.queryByRole('table')).toBeNull();
  expect(frame()).toBeVisible();
});

it('keeps the legend under a titled card\'s title, and the switch in its own head outside one', () => {
  const { container, rerender } = render(inCard(
    <Chart title="Income and spend by month" periods={periods} series={series} format={eur} legend />,
  ));
  expect(container.querySelector('.ui-card__tools .ui-seg')).not.toBeNull();
  expect(container.querySelector('.ui-chart__head > .ui-chart__legend')).not.toBeNull();
  expect(container.querySelector('.ui-chart__head .ui-seg')).toBeNull();
  rerender(<Card><Chart title="Income and spend by month" periods={periods} series={series} format={eur} /></Card>);
  expect(container.querySelector('.ui-chart__head .ui-seg')).not.toBeNull();
  expect(container.querySelector('.ui-card__tools')).toBeNull();
});

it('draws one switch in a titled card\'s title row for two charts, and passes it on when its chart leaves', () => {
  // A mapped list, so the chart that stays keeps its instance when the first one leaves.
  const charts = (kept: ChartSeries[]) => inCard(<>
    {kept.map((s) => <Chart key={s.id} title={`${s.name} by month`} periods={periods} series={[s]} format={eur} />)}
  </>);
  const { container, rerender } = render(charts(series.slice(0, 2)));
  const inTitle = () => container.querySelectorAll('.ui-card__tools .ui-seg');
  expect(inTitle()).toHaveLength(1);
  expect(within(inTitle()[0] as HTMLElement).getAllByRole('button').map((b) => b.getAttribute('aria-label') ?? b.textContent))
    .toEqual(['Chart', 'Table']);
  expect(screen.getByRole('toolbar', { name: 'Income by month, view' })).toBe(inTitle()[0]);
  expect(container.querySelectorAll('.ui-chart__head .ui-seg'), 'the second chart keeps its own').toHaveLength(1);
  // When the owner leaves, the chart that stays takes the title row and drops its own head.
  rerender(charts(series.slice(1, 2)));
  expect(inTitle()).toHaveLength(1);
  expect(screen.getByRole('toolbar', { name: 'Spend by month, view' })).toBe(inTitle()[0]);
  expect(container.querySelector('.ui-chart__head'), 'no row is left under the title').toBeNull();
});

it('prints whole units on the axis and exact values in the table', () => {
  const { container } = render(
    <Chart title="Fees" periods={[{ label: 'Jan 2026' }, { label: 'Feb 2026' }]}
      series={[{ id: 'f', name: 'Fees', values: [10.4, 20.6] }]}
      format={(n) => `€${n.toFixed(2)}`} />,
  );
  const ticks = [...container.querySelectorAll('.ui-chart__tick')].map((t) => t.textContent);
  expect(ticks.every((t) => /^€\d+\.00$/.test(t!)), `axis printed ${ticks.join(', ')}`).toBe(true);
  showTable();
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

it('a sparkline owns the kit floor across by giving each point a wide enough column', () => {
  coarse(true);
  measuredAt(4 * 24); // four columns at the sheet's --ui-chart-col for a sparkline, 24px
  render(
    <Chart variant="spark" title="Income" periods={periods} series={[{ ...series[0], shape: 'line' }]}
      format={eur} />,
  );
  // A sparkline may still be narrower than the 44px phone target across,
  // because no point may answer for another period. It must still keep the
  // kit's 24px floor across, and the box grows to hold the phone floor down.
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
  // carry the kit's ring: `.ui-focusable`, the view switch's segment, which
  // src/styles/segmented.css rings, or — for the table's scroller —
  // `.ui-table-scroll`, which src/styles/table.css rings itself.
  const tabbable = () => [...container.querySelectorAll<HTMLElement>('*')]
    .filter((el) => el.tabIndex >= 0 && !el.closest('[hidden]')).map((el) => el.closest('.ui-seg') ? 'ui-seg' : classOf(el));
  expect(tabbable()).toEqual(['ui-seg', 'ui-chart__frame ui-tip-host ui-focusable']);

  // The table's scroller exists only once the reader has asked for the table,
  // and the plot has then left the tab order with the frame. It is named,
  // because a browser would otherwise hand a screen reader an unnamed scroll
  // region. JSDOM lays nothing out, so the kit's band on it is read off the
  // sheet rather than painted.
  showTable();
  expect(tabbable(), 'the hidden frame is no stop').toEqual(['ui-seg', 'ui-table-scroll']);
  const scroll = container.querySelector('.ui-table-scroll')!;
  expect(scroll).toHaveAttribute('role', 'region');
  expect(scroll).toHaveAccessibleName(/Income and spend by month, as a table/);
  expect(readRepo('../../src/styles/table.css'))
    .toMatch(/\.ui-table-scroll:focus-visible\s*\{[^}]*--ring-scroll/);

  // A scroller that fits says `-1` out loud rather than relying on not being reached:
  // that attribute is the opt-out a browser's focusable-scroller rule reads.
  expect(container.querySelector('.ui-chart__scroll')).toHaveAttribute('tabindex', '-1');

  fireEvent.click(screen.getByRole('button', { name: 'Chart' }));
  await tabToFrame(user);
  expect(frame()).toHaveFocus();
  await user.tab();
  expect(frame(), 'a second Tab leaves the plot instead of landing inside it').not.toHaveFocus();
  expect(container.querySelector('.ui-chart__scroll')).not.toHaveFocus();
});

it('makes an overflowing plot one more tab stop, named and ringed by the kit', async () => {
  // JSDOM lays nothing out, so the overflow is mocked before the render that
  // measures it. The ring is checked as the class `.ui-focusable`, not as
  // paint. axe's scrollable-region-focusable rule is not run: without layout it
  // passes even a scroller that is out of the tab order.
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(200);
  vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockReturnValue(576);
  const user = userEvent.setup();
  const { container } = months();
  const scroll = container.querySelector<HTMLElement>('.ui-chart__scroll')!;
  expect(scroll).toHaveAttribute('tabindex', '0');
  expect(scroll).toHaveAttribute('role', 'region');
  expect(scroll).toHaveAccessibleName('Income and spend by month. Scroll for more columns.');
  expect(classOf(scroll)).toContain('ui-focusable');

  await tabToFrame(user);
  expect(frame()).toHaveFocus();
  await user.tab();
  expect(scroll, 'the stop after the frame is the scroller').toHaveFocus();
});

it('leaves the keys of a focused scroller to the scroller', async () => {
  // The scroller sits inside the frame, so its key presses bubble to the
  // frame's handler. They must scroll the plot natively, not move the cursor
  // or pick a column. The native scroll itself is not measured: JSDOM has no layout.
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(200);
  vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockReturnValue(576);
  const user = userEvent.setup();
  const onSelect = vi.fn();
  const { container } = months({ onSelect, selectable: true });
  const scroll = container.querySelector<HTMLElement>('.ui-chart__scroll')!;
  const live = screen.getByRole('status');
  await tabToFrame(user);
  await user.tab();
  expect(scroll).toHaveFocus();
  const said = live.textContent;
  for (const key of ['ArrowRight', 'Enter', ' ']) {
    expect(fireEvent.keyDown(scroll, { key }), `${key} is not cancelled`).toBe(true);
  }
  expect(live.textContent, 'the cursor stays where it was').toBe(said);
  expect(onSelect, 'no column is picked').not.toHaveBeenCalled();
  showTable();
  expect(screen.queryByRole('row', { current: true }), 'no row is selected').toBeNull();
});

it('follows the plot as it starts and stops overflowing', () => {
  // A mocked ResizeObserver stands in for the browser's: JSDOM has none. The
  // test calls its callback after each change of the mocked scroll width.
  let notify = () => {};
  vi.stubGlobal('ResizeObserver', class {
    constructor(callback: () => void) { notify = callback; }
    observe() {}
    disconnect() {}
  });
  let wide = 200;
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(200);
  vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockImplementation(() => wide);
  const { container } = months();
  const scroll = container.querySelector<HTMLElement>('.ui-chart__scroll')!;
  const fits = () => {
    expect(scroll).toHaveAttribute('tabindex', '-1');
    expect(scroll).not.toHaveAttribute('role');
    expect(scroll).not.toHaveAccessibleName();
    expect(classOf(scroll)).not.toContain('ui-focusable');
  };
  fits();

  wide = 576;
  act(() => notify());
  expect(scroll).toHaveAttribute('tabindex', '0');
  expect(scroll).toHaveAttribute('role', 'region');
  expect(scroll).toHaveAccessibleName('Income and spend by month. Scroll for more columns.');
  expect(classOf(scroll)).toContain('ui-focusable');

  wide = 200;
  act(() => notify());
  fits();
});

// The paint behind that tab stop, with every token resolved — the raw rule says
// `var(--ring)`, which proves nothing about what a reader sees. JSDOM matches no
// `:focus-visible` and substitutes no `var()`, so the values are resolved here
// the way the contrast gate resolves them, per theme. Whether the browser then
// paints it is a browser question, answered by the captures on the PR.
describe.each(['dark', 'light'])('the kit ring resolves [%s]', (theme) => {
  it('uses the solid kit outline without a local ring or glow', () => {
    const base = readRepo('../../src/styles/base.css');
    const tokens = readRepo('../../src/tokens/tokens.css') + readRepo('../../src/tokens/brand.generated.css');
    const vars = tokensFor(theme);
    const rule = /\.ui-focusable:focus-visible[^{]*\{([^}]*)\}/.exec(base)![1];
    const resolved = substitute(rule, vars);
    expect(tokens, 'the ramp the resolver reads').toContain('--ring:');
    expect(resolved, 'every token resolved').not.toContain('var(');
    expect(resolved, 'the kit outline survives forced colours').toMatch(/outline:\s*1px solid #[0-9a-f]{3,8}/i);
    expect(resolved).toContain('outline-offset: 2px');
    expect(resolved).not.toContain('box-shadow');
    expect(readRepo('../../src/styles/chart.css'),
      'the chart declares no outline of its own, so nothing reverts to the browser\'s')
      .not.toMatch(/outline\s*:/);
    expect(readRepo('../../src/styles/chart.css'),
      'the chart keeps the same unpainted offset as the kit ring')
      .toMatch(new RegExp(`\\.ui-chart__frame:focus-visible\\s*\\{[^}]*outline-offset:\\s*var\\(--ring-offset,\\s*${vars.get('--ring-gap-width')}\\)`));
    expect(readRepo('../../src/styles/chart.css'),
      'the chart must not offset focus by the tick row')
      .not.toMatch(/outline-offset:\s*calc\([^)]*ui-chart-tick/);
  });
});

it('steps columns with the arrows, Home and End, and announces each one politely', async () => {
  const user = userEvent.setup();
  months();
  const live = screen.getByRole('status');
  await tabToFrame(user);
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
  await tabToFrame(user);
  await user.keyboard('{ArrowRight}{Enter}');
  expect(onSelect, 'a chart that is not selectable selects nothing').not.toHaveBeenCalled();
  unmount();

  months({ onSelect, selectable: true });
  await tabToFrame(user);
  await user.keyboard('{ArrowRight}{Enter}');
  expect(onSelect).toHaveBeenCalledWith(1);
  expect(screen.getByRole('status')).toHaveTextContent('Selected.');
  showTable();
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

// #863: WebKit collapses a zero-area SVG rect's bounding box to nothing at the
// svg's origin, which pinned the readout to the plot's top-left. The place is
// read from the anchor's own coordinates through the svg's screen box instead.
it('places the readout from the anchor\'s coordinates, not a collapsed zero-height rect', () => {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 576 216');
  const anchor = document.createElementNS(ns, 'rect');
  anchor.setAttribute('x', '248');
  anchor.setAttribute('y', '43.7');
  anchor.setAttribute('width', '32');
  anchor.setAttribute('height', '0');
  svg.appendChild(anchor);
  const tip = document.createElement('div');
  tip.className = 'ui-tip';
  document.body.append(svg, tip);

  // The svg's screen box, and the degenerate box WebKit reports for the
  // zero-height anchor: width 0 at the svg's origin.
  const rect = (r: Partial<DOMRect>) => r as DOMRect;
  vi.spyOn(svg, 'getBoundingClientRect').mockReturnValue(rect({ left: 150.7, top: 498.3, width: 576, height: 216 }));
  vi.spyOn(anchor, 'getBoundingClientRect').mockReturnValue(rect({ left: 150.7, top: 498.3, width: 0, height: 0 }));
  vi.spyOn(tip, 'offsetWidth', 'get').mockReturnValue(126.9);
  vi.spyOn(tip, 'offsetHeight', 'get').mockReturnValue(71.6);
  vi.spyOn(document.documentElement, 'clientWidth', 'get').mockReturnValue(834);
  vi.spyOn(document.documentElement, 'clientHeight', 'get').mockReturnValue(1194);

  placeChartTip(anchor, tip);

  // The bar's centre on the screen, 150.7 + 248 + 32/2, not the collapsed 150.7.
  expect(parseFloat(tip.style.getPropertyValue('--ui-tip-x'))).toBeCloseTo(414.7, 5);
  expect(parseFloat(tip.style.getPropertyValue('--ui-tip-y'))).toBeCloseTo(542, 5);

  svg.remove();
  tip.remove();
});

// #863: a bridge readout names the step once. The old label printed the step
// twice — `${open.name}, ${columns[open.column]?.label}` — because both carry
// the step's full name on a bridge, where each bar is a step and not a series.
it('a bridge readout says the step name once', () => {
  render(<Chart variant="bridge" title="Cash" format={eur}
    steps={[{ label: 'Opening cash balance', value: 120000 },
      { label: 'Customer cash inflow', value: 42600 }]} />);
  hover('step-0');
  const tip = screen.getByRole('tooltip');
  expect(tip).toHaveClass('ui-tip', 'is-open');
  expect(tip.querySelector('.ui-tip__label')!.textContent!.trim(), 'the step name once, not twice')
    .toBe('Opening cash balance');
  expect(tip.querySelector('.ui-tip__value')).toHaveTextContent('€120,000');
});

it('prints the unfinished state in the readout instead of a comparison, and draws no legend key for it', () => {
  expect(months().container.querySelector('.ui-chart__legend'), 'a legend only when asked for').toBeNull();
  cleanup();
  const { container } = months({ legend: true });
  hover('income-3');
  expect(screen.getByRole('tooltip').querySelector('.ui-tip__detail'))
    .toHaveTextContent('Estimated — April is still running');
  expect([...container.querySelectorAll('.ui-chart__key')].map((k) => k.textContent),
    'the words under the plot name the state, so the legend keys only the series')
    .toEqual(['Income', 'Spend', 'Net']);
});

// #841: an unfinished period keeps the solid mark every other period draws, and
// the words under the plot say which periods are not final.
const forecast: ChartPeriod[] = [
  { label: 'Oct 2026' }, { label: 'Nov 2026', estimated: 'incomplete' },
  { label: 'Dec 2026', estimated: 'projected' }, { label: 'Jan 2027', estimated: 'projected' },
  { label: 'Feb 2027', estimated: 'projected', note: 'from the signed contracts' },
];
const forecastSeries: ChartSeries[] = [
  { id: 'in', name: 'Cash in', values: [10, 12, 11, 13, 14], tone: 'good' },
  { id: 'net', name: 'Net', values: [4, 5, 3, 6, 7], shape: 'line' },
];
const forecastChart = (extra: Partial<React.ComponentProps<typeof Chart>> = {}) => render(
  <Chart title="Cash" periods={forecast} series={forecastSeries} format={eur} {...extra as object} />,
);

it('keeps the series fill and a solid edge on unfinished periods', () => {
  const { container } = months();
  const bars = [...container.querySelectorAll('path.ui-chart__bar')];
  const april = bars.filter((b) => b.classList.contains('is-estimated'));
  expect(april, 'one estimated bar per bar series in the unfinished column').toHaveLength(2);
  for (const bar of april) {
    const final = bars.find((b) => toneOf(b) === toneOf(bar) && !b.classList.contains('is-estimated'))!;
    expect((bar as SVGElement).getAttribute('style'),
      'an unfinished bar keeps the paint every final bar of its series has').toBe(final.getAttribute('style'));
  }
  const css = readRepo('../../src/styles/chart.css');
  expect(css, 'no mark draws a dash: not a bar, a line, a segment or a key').not.toContain('dasharray');
  expect(css, 'no rule restyles an unfinished mark').not.toContain('is-estimated');
  expect(container.querySelectorAll('pattern'), 'no hatch is declared').toHaveLength(0);
  const segments = [...container.querySelectorAll('line.ui-chart__line')];
  expect(segments).toHaveLength(3);
});

// The owner struck the words under the plot from the accepted picture, so a
// chart at rest prints no state: the readouts and the table name it.
const restingWords = (root: Element) => root.textContent!.toLowerCase();

it('prints no state words around the plot while no readout is open', () => {
  const { container } = forecastChart();
  expect(restingWords(container), 'no state words at rest').not.toMatch(/incomplete|projected|estimated/);
  cleanup();
  expect(restingWords(months().container), 'a plain estimate prints no word either').not.toMatch(/estimated/);
});

it('reads the state with the same word in the hover, keyboard and table readouts', async () => {
  const user = userEvent.setup();
  forecastChart();
  hover('in-1');
  expect(screen.getByRole('tooltip').querySelector('.ui-tip__detail')).toHaveTextContent(/^Incomplete$/);
  hover('in-4');
  expect(screen.getByRole('tooltip').querySelector('.ui-tip__detail'))
    .toHaveTextContent('Projected — from the signed contracts');
  await tabToFrame(user);
  fireEvent.keyDown(frame(), { key: 'End' });
  expect(screen.getByRole('status')).toHaveTextContent('Feb 2027. Cash in €14. Net €7. Projected — from the signed contracts.');
  fireEvent.keyDown(frame(), { key: 'ArrowLeft' });
  fireEvent.keyDown(frame(), { key: 'ArrowLeft' });
  fireEvent.keyDown(frame(), { key: 'ArrowLeft' });
  expect(screen.getByRole('status')).toHaveTextContent('Nov 2026. Cash in €12. Net €5. Incomplete.');
  showTable();
  expect([...document.querySelectorAll('.ui-chart__state')].map((s) => s.textContent))
    .toEqual(['Incomplete', 'Projected', 'Projected', 'Projected — from the signed contracts']);
});

// #841, Forecast boundary: one solid line stands before the first period that is
// not final, and "Not final" stands over that group. JSDOM has no layout, so the
// plot is the unmeasured 48px a column; the drawn pixels are in the PR captures.
it('draws one solid boundary and the words "Not final" before the first unfinished period', () => {
  const { container } = forecastChart();
  const svg = container.querySelector('.ui-chart__svg')!;
  const lines = svg.querySelectorAll('line.ui-chart__boundary');
  expect(lines, 'one boundary').toHaveLength(1);
  const columnWidth = Number(svg.getAttribute('width')) / forecast.length;
  expect(Number(lines[0].getAttribute('x1')), 'before Nov, the incomplete period').toBeCloseTo(columnWidth, 1);
  expect(lines[0].getAttribute('x1')).toBe(lines[0].getAttribute('x2'));
  const label = svg.querySelector('text.ui-chart__group')!;
  expect(label).toHaveTextContent(/^Not final$/);
  expect(Number(label.getAttribute('x')), 'the words stand over the group').toBeGreaterThan(columnWidth);
  const top = Math.min(...[...svg.querySelectorAll('path.ui-chart__bar')].map((b) => boxOf(b).y));
  expect(top, 'the bars stay under the words').toBeGreaterThan(Number(lines[0].getAttribute('y1')));
  const css = readRepo('../../src/styles/chart.css');
  expect(/\.ui-chart__boundary\s*\{([^}]*)\}/.exec(css)![1]).toContain('stroke: var(--chart-neutral)');

  showTable();
  expect(container.querySelector('.ui-chart__frame'), 'the table hides the group label with the plot')
    .not.toBeVisible();
  cleanup();
  const plain = render(<Chart title="Cash" periods={forecast.map((p) => ({ label: p.label }))}
    series={forecastSeries} format={eur} />).container;
  expect(plain.querySelector('.ui-chart__boundary, .ui-chart__group'), 'none when every period is final').toBeNull();
  cleanup();
  const line = render(<Chart variant="line" title="Cash" periods={forecast} series={costs} format={eur} />).container;
  expect(line.querySelector('.ui-chart__boundary'), 'the months chart draws it').toBeNull();
});

// #842: the label is drawn at --weight-medium and was measured at the body
// weight, so in a 154px plot its last letters ran past the plot's edge.
it('keeps the words "Not final" inside a narrow plot, measured at their own weight', () => {
  const ctx = { font: '', measureText(text: string) { return { width: text.length * (this.font.startsWith('500') ? 6 : 5) }; } };
  vi.stubGlobal('OffscreenCanvas', class { getContext() { return ctx; } });
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(154);
  const { container } = render(<Chart title="Cash" format={eur}
    periods={forecast.map((p, i) => (i < 4 ? { label: p.label } : p))} series={forecastSeries} />);
  const label = container.querySelector('text.ui-chart__group')!;
  expect(Number(label.getAttribute('x')) + 'Not final'.length * 6, 'the label ends inside the plot')
    .toBeLessThanOrEqual(154);
  vi.unstubAllGlobals();
});

it('prints a period with compare: false with its value and no comparison text', async () => {
  const user = userEvent.setup();
  const { container } = render(<Chart title="Margin" format={eur}
    periods={MONTHS.map((label) => ({ label, compare: false }))}
    series={[{ id: 'm', name: 'Margin', values: INCOME }, { id: 'net', name: 'Net', values: NET, shape: 'line' }]} />);
  for (const id of ['m-1', 'net-1']) {
    hover(id);
    const tip = screen.getByRole('tooltip');
    expect(tip.querySelector('.ui-tip__value'), id).not.toBeNull();
    expect(tip.querySelector('.ui-tip__detail'), `${id} has no comparison`).toBeNull();
  }
  await tabToFrame(user);
  fireEvent.keyDown(frame(), { key: 'ArrowRight' });
  expect(screen.getByRole('status')).toHaveTextContent(/^Feb 2026\. Margin €1,500\. Net €600\.$/);
  expect(container.textContent).not.toMatch(/% on/);
});

const values = (width: number, extra: Partial<React.ComponentProps<typeof Chart>> = {}) => {
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(width);
  vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockReturnValue(width);
  return months({ values: true, formatAxis: (n: number) => `€${n}`, ...extra } as object);
};
const printed = (root: Element) => [...root.querySelectorAll('text.ui-chart__value')].map((t) => t.textContent);

it('prints each bar\'s value over its end in formatAxis, and under a bar hung below zero', () => {
  const { container } = values(400);
  expect(printed(container)).toEqual([...INCOME, ...SPEND].map((n) => `€${n}`));
  const svg = container.querySelector('.ui-chart__svg')!;
  const bars = [...svg.querySelectorAll('path.ui-chart__bar')].map(boxOf);
  const texts = [...svg.querySelectorAll('text.ui-chart__value')];
  texts.forEach((t, i) => {
    const bar = bars[i];
    expect(Number(t.getAttribute('x')), 'centred on its bar').toBeCloseTo(bar.x + bar.width / 2, 1);
    const below = i >= INCOME.length;
    expect(classOf(t).includes('ui-chart__value--below'), 'a spend value hangs under its bar').toBe(below);
    if (below) expect(Number(t.getAttribute('y'))).toBeGreaterThan(bar.y + bar.height);
    else expect(Number(t.getAttribute('y'))).toBeLessThan(bar.y);
  });
  expect(Math.min(...bars.map((b) => b.y)), 'the plot keeps room over the tallest bar').toBeGreaterThan(14);
  const style = container.querySelector<HTMLElement>('.ui-chart')!.style;
  expect(parseFloat(style.getPropertyValue('--ui-chart-top')), 'the axis follows the room').toBeGreaterThan(2);
  expect(parseFloat(style.getPropertyValue('--ui-chart-bottom'))).toBeGreaterThan(2);
  cleanup();
  vi.restoreAllMocks();
  expect(printed(months().container), 'no value without the prop').toEqual([]);
});

// #842 re-review: an ordinary bar of -60000 printed its value under itself, but
// the room was kept over the plot, so the value fell out of the SVG. The test
// reads the text's anchor against a line box of 18px, not the drawn glyphs.
it('keeps the room for each value on the side it prints, for signed bars and signed hanging bars', () => {
  const k = (n: number) => `${n / 1000}k`;
  const inside = (root: Element, expected: [string, boolean][]) => {
    const svg = root.querySelector('.ui-chart__svg')!;
    const height = Number(svg.getAttribute('height'));
    const texts = [...svg.querySelectorAll('text.ui-chart__value')];
    expect(texts.map((t) => [t.textContent, classOf(t).includes('ui-chart__value--below')])).toEqual(expected);
    for (const t of texts) {
      const y = Number(t.getAttribute('y'));
      if (classOf(t).includes('ui-chart__value--below')) expect(y + 18, `${t.textContent} inside the plot`).toBeLessThanOrEqual(height);
      else expect(y - 12, `${t.textContent} inside the plot`).toBeGreaterThanOrEqual(0);
    }
  };
  inside(values(400, { periods: periods.slice(0, 1), formatAxis: k,
    series: [{ id: 'in', name: 'Income', values: [-60000], tone: 'good' }] }).container, [['-60k', true]]);
  cleanup();
  vi.restoreAllMocks();
  inside(values(640, { periods, formatAxis: k,
    series: [
      { id: 'in', name: 'Income', values: [40000, -20000, NaN, NaN], tone: 'good' },
      { id: 'out', name: 'Spend', values: [NaN, NaN, -30000, 50000], shape: 'bars-below', tone: 'bad' },
    ] }).container, [['40k', false], ['-20k', true], ['-30k', false], ['50k', true]]);
  cleanup();
  vi.restoreAllMocks();
  // A hanging bar of -30000 grows up beside the 40000 bar, so the two values
  // print on one side at one x, and neither prints.
  inside(values(640, { periods: periods.slice(0, 1), formatAxis: k,
    series: [
      { id: 'in', name: 'Income', values: [40000], tone: 'good' },
      { id: 'out', name: 'Spend', values: [-30000], shape: 'bars-below', tone: 'bad' },
    ] }).container, []);
});

it('leaves out only the values that do not fit, and keeps every exact value elsewhere', () => {
  // 4 columns of 30px: a two-figure value fits, a four-figure one does not.
  const { container } = values(120, {
    series: [{ id: 'in', name: 'Income', values: [12, 1500, 14, 1300], tone: 'good' }],
  });
  expect(printed(container), 'the short values stay at the text size').toEqual(['€12', '€14']);
  hover('in-1');
  expect(screen.getByRole('tooltip').querySelector('.ui-tip__value')).toHaveTextContent('€1,500');
  showTable();
  expect(screen.getByRole('table')).toHaveTextContent('€1,500');
});

// #842 review: two bars in one column sit 50px apart, so their two 74px values
// met although each one fitted half the column.
it('prints no two values over each other, and gives the room of hidden values back to the bars', () => {
  const pair = (width: number) => values(width, {
    periods: periods.slice(0, 1), formatAxis: eur,
    series: [
      { id: 'a', name: 'Income', values: [1234567], tone: 'good' },
      { id: 'b', name: 'Fees', values: [1234567], tone: 'neutral' },
    ],
  });
  const tops = (root: Element) => [...root.querySelectorAll('path.ui-chart__bar')].map((p) => boxOf(p).y);
  const { container } = pair(300);
  expect(printed(container), 'neither value fits the 50px between the bars').toEqual([]);
  hover('a-0');
  expect(screen.getByRole('tooltip').querySelector('.ui-tip__value')).toHaveTextContent('€1,234,567');
  showTable();
  expect(screen.getByRole('table')).toHaveTextContent('€1,234,567');
  cleanup();
  vi.restoreAllMocks();
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(300);
  const plain = tops(render(<Chart title="Fees" periods={periods.slice(0, 1)} format={eur}
    series={[{ id: 'a', name: 'Income', values: [1234567], tone: 'good' },
      { id: 'b', name: 'Fees', values: [1234567], tone: 'neutral' }]} />).container);
  cleanup();
  vi.restoreAllMocks();
  expect(tops(pair(300).container), 'no value prints, so no room is kept for one').toEqual(plain);
  cleanup();
  vi.restoreAllMocks();

  // Wider bars in four columns: every value that prints keeps its own ground.
  const { container: wide } = values(640, { formatAxis: eur });
  const texts = [...wide.querySelectorAll('text.ui-chart__value:not(.ui-chart__value--below)')];
  expect(texts.length).toBeGreaterThan(1);
  const spans = texts.map((t) => {
    const x = Number(t.getAttribute('x'));
    const half = (t.textContent!.length * 12 * 0.62) / 2;
    return [x - half, x + half];
  }).sort((a, b) => a[0] - b[0]);
  spans.slice(1).forEach(([left], i) => expect(left, 'apart from the value before it')
    .toBeGreaterThanOrEqual(spans[i][1]));
});

it('scrolls 24 months in a 154px card so no bar loses its name', () => {
  const months24: ChartPeriod[] = Array.from({ length: 24 }, (_, i) => ({
    label: `${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][i % 12]} ${2025 + Math.floor(i / 12)}`,
    estimated: i === 20 ? 'incomplete' as const : i > 20 ? 'projected' as const : undefined,
  }));
  // The plot keeps a column as wide as the widest name — a three-letter month,
  // 0.62 × 12px × 3 chars + the 8px gap = 30.32px, rounded up to 31px — so 24
  // months need 744px: wider than the 154px card, the plot scrolls instead of
  // stepping a name off its bar. JSDOM lays nothing out, so the plot and
  // scroller widths are stubbed to the sizes the sheet's min-width would produce.
  const FLOOR = 31;
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(function () {
    return (this as HTMLElement).classList.contains('ui-chart__plot') ? FLOOR * 24 : 154;
  });
  vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockImplementation(function () {
    return (this as HTMLElement).classList.contains('ui-chart__scroll') ? FLOOR * 24 : 154;
  });
  const { container } = render(<Chart title="Cash in" height={154} periods={months24} format={eur}
    series={[{ id: 'in', name: 'Cash in', values: months24.map((_, i) => 30 + i), tone: 'good' }]} />);
  const svg = container.querySelector('.ui-chart__svg')!;
  expect(svg.getAttribute('width'), 'the plot keeps a floor column per period').toBe('744');
  expect([...svg.querySelectorAll('path.ui-chart__bar')].map(boxOf), 'every bar').toHaveLength(24);
  expect(container.querySelector('.ui-chart__scroll'), 'the plot scrolls inside the card').toHaveAttribute('role', 'region');
  expect(readRepo('../../src/styles/chart.css'), 'months keeps the bridge scroll floor')
    .not.toMatch(/\.ui-chart--months \.ui-chart__plot \{ min-width: 0; \}/);
  const row = container.querySelector('.ui-chart__periods')!;
  expect(classOf(row), 'no label is stepped').not.toContain('ui-chart__periods--step');
  const labels = [...row.children].map((c) => c.textContent);
  expect(labels, 'one span per period').toHaveLength(24);
  // The chart opens at its latest period, so the columns scrolled away hide
  // their names and the four whole columns in view print theirs — no name is
  // stepped off the sequence and none is half.
  expect(labels.filter(Boolean), 'the columns in view keep their name')
    .toEqual(['Sep', 'Oct', 'Nov', 'Dec']);
  cleanup();
  vi.restoreAllMocks();
  const wide = months().container.querySelector('.ui-chart__periods')!;
  expect(classOf(wide), 'every label prints where each fits').not.toContain('ui-chart__periods--step');
  expect([...wide.children].map((c) => c.textContent)).toEqual(['Jan', 'Feb', 'Mar', 'Apr']);
});

// #867: the floor is the narrowest column where a name still fits, not a fixed
// 48px. Twelve three-letter months at 466px then fit without scrolling.
it('does not scroll twelve months at 466px, where every name fits its column', () => {
  const twelve: ChartPeriod[] = Array.from({ length: 12 }, (_, i) => ({
    label: `${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][i]} 2025`,
  }));
  const { container } = render(<Chart title="Income" periods={twelve} format={eur}
    series={[{ id: 'in', name: 'Income', values: twelve.map((_, i) => 10 + i), tone: 'good' }]} />);
  const chart = container.querySelector('.ui-chart') as HTMLElement;
  const col = parseFloat(chart.style.getPropertyValue('--ui-chart-col'));
  // The floor column is the widest name plus its gap, so twelve of them fit
  // inside a 466px card and the plot does not scroll there.
  expect(col, 'the floor column is the widest name, not the 48px default').toBeGreaterThan(0);
  expect(col, 'a name column is far under a twelfth of 466px').toBeLessThan(466 / 12);
  expect(col * 12, 'twelve floor columns fit inside 466px').toBeLessThanOrEqual(466);
});

// #867: the bridge keeps its own 88px column for short names and grows it for a
// word too wide to wrap, so a long bridge name scrolls instead of stepping off
// its bar. The floor is that word, past the bridge's 88px column.
it('grows a bridge column for a word wider than 88px, instead of stepping its name', () => {
  const steps = [
    { label: 'Reconciliation adjustments', short: 'Reconciliation', value: 100 },
    { label: 'Customer receipts', short: 'Receipts', value: 200 },
    { label: 'Supplier payments', short: 'Payments', value: -150 },
    { label: 'Closing cash balance', short: 'Closing', kind: 'total' as const },
  ];
  // The widest word, 14 letters at 0.62 × 12px plus the 8px gap, is 112.16px —
  // wider than the bridge's own 88px column — so the floor grows to 113px. The
  // plot keeps that column per step and scrolls instead of stepping a name off.
  const FLOOR = 113;
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(function () {
    return (this as HTMLElement).classList.contains('ui-chart__plot') ? FLOOR * 4 : 300;
  });
  vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockImplementation(function () {
    return (this as HTMLElement).classList.contains('ui-chart__scroll') ? FLOOR * 4 : 300;
  });
  const { container } = render(<Chart variant="bridge" title="Cash" format={eur} steps={steps} />);
  const chart = container.querySelector('.ui-chart') as HTMLElement;
  expect(chart.style.getPropertyValue('--ui-chart-col'), 'the bridge floor grows past its 88px column')
    .toBe('113px');
  const row = container.querySelector('.ui-chart__periods')!;
  expect(classOf(row), 'the long name is not stepped').not.toContain('ui-chart__periods--step');
  expect(container.querySelector('.ui-chart__scroll'), 'the bridge scrolls inside its card')
    .toHaveAttribute('role', 'region');
  cleanup();
  vi.restoreAllMocks();
});

it('hides the name of a column cut at the scroll edge, so a name is whole or gone', () => {
  const twelve: ChartPeriod[] = Array.from({ length: 12 }, (_, i) => ({
    label: `${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][i]} 2025`,
  }));
  const FLOOR = 31;
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(function () {
    return (this as HTMLElement).classList.contains('ui-chart__plot') ? FLOOR * 12 : 200;
  });
  vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockImplementation(function () {
    return (this as HTMLElement).classList.contains('ui-chart__scroll') ? FLOOR * 12 : 200;
  });
  const { container } = render(<Chart title="Income" periods={twelve} format={eur}
    series={[{ id: 'in', name: 'Income', values: twelve.map((_, i) => 10 + i), tone: 'good' }]} />);
  const labels = [...container.querySelectorAll('.ui-chart__period')].map((c) => c.textContent);
  // The chart opens at its latest period, so the left edge cuts a column; its
  // name hides, and the names whole in view print.
  expect(labels.filter(Boolean)).toEqual(['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']);
  expect(labels[5], 'the column cut at the left edge hides its name').toBe('');
});

// #863: the months and bridge charts keep every bar named. A short name whose
// words each fit its column prints and wraps; the old fit rule stepped by the
// whole label, so a two-word short name lost its bars even where it could wrap.
it('keeps every bar named on a months and bridge chart, stepping only where a word is too wide', () => {
  const regions: ChartPeriod[] = [
    { label: 'North region revenue', short: 'North rev', compare: false },
    { label: 'South region revenue', short: 'South rev', compare: false },
    { label: 'North region refunds', short: 'North ref', compare: false },
    { label: 'South region refunds', short: 'South ref', compare: false },
  ];
  const { container } = render(<>
    <Chart title="Net by region" periods={regions}
      series={[{ id: 'net', name: 'Net', values: [48200, 39100, -6400, -7100] }]} format={eur} />
    <Chart variant="bridge" title="Cash" format={eur}
      steps={[
        { label: 'Opening cash balance', short: 'Open cash', value: 120000 },
        { label: 'Customer cash inflow', short: 'Cash in', value: 42600 },
        { label: 'Supplier cash spends', short: 'Cash out', value: -21600 },
        { label: 'Closing cash balance', short: 'Close cash', kind: 'total' },
      ]} />
  </>);
  const rows = [...container.querySelectorAll('.ui-chart__periods')];
  expect(rows, 'one period row per chart').toHaveLength(2);
  for (const row of rows) {
    expect(classOf(row), 'every short name fits its column').not.toContain('ui-chart__periods--step');
  }
  expect([...rows[0].children].map((c) => c.textContent), 'the months chart keeps every short name')
    .toEqual(['North rev', 'South rev', 'North ref', 'South ref']);
  expect([...rows[1].children].map((c) => c.textContent), 'the bridge keeps every short name')
    .toEqual(['Open cash', 'Cash in', 'Cash out', 'Close cash']);
});

it('keeps the unfinished stretch of a sparkline one solid stroke', () => {
  const { container } = render(<Chart variant="spark" title="Cash" periods={forecast}
    series={forecastSeries.slice(1)} format={eur} />);
  expect(container.querySelector('line.ui-chart__line.is-estimated'), 'the line stays one solid stroke')
    .not.toBeNull();
});

/* -- the printed category labels -------------------------------------------
 * Limits. JSDOM has no layout and no canvas, so the width a label measures is
 * the component's own fallback (length × 12 × 0.62), the one a browser replaces
 * with its real measure. The spans below read the printed labels back from the
 * DOM and place them the way the sheet does: centred on their column, or flush
 * with the plot's edge. Two printed names on top of each other is the #882
 * failure. The charts are `stacked` charts: a `months` or `bridge` chart wraps each
 * name inside its own column (#863), so only the other variants step whole names. */

/** Twelve long unit names, the longest ones at the end, the shape of a finance
 *  report's "margin by unit" axis. The `LongCategoryNames` story uses the same
 *  names. The repeated-name case is the weight-600 test below. */
const LONG_UNITS = [
  'Payments Infrastructure', 'Developer Relations', 'Content Operations',
  'Global Partnerships', 'Enterprise Sales', 'Brand Marketing', 'Marketplace Growth',
  'Infrastructure Operations', 'Platform Engineering', 'Strategic Finance',
  'Customer Success', 'Bloom Affiliate Platform',
];

const labelWidth = (text: string) => text.length * 12 * 0.62;
/** The floor a printed label keeps beside its neighbour: --space-1, 4 px. */
const LABEL_FLOOR = 4;
/** The printed labels' pixel spans, in column order, as the sheet places them. */
const printedSpans = (row: Element, plotWidth: number) => {
  const count = row.children.length;
  const colWidth = plotWidth / count;
  return [...row.children].flatMap((child, i) => {
    const text = child.textContent ?? '';
    if (!text) return [];
    const w = labelWidth(text);
    const cls = classOf(child);
    if (cls.includes('is-start')) return [{ i, start: i * colWidth, end: i * colWidth + w }];
    if (cls.includes('is-end')) return [{ i, start: (i + 1) * colWidth - w, end: (i + 1) * colWidth }];
    const centre = (i + 0.5) * colWidth;
    return [{ i, start: centre - w / 2, end: centre + w / 2 }];
  });
};

// The sweep: each pick, and no pick, at 11 plot widths. They hold the 390px,
// 820px and 1440px widths of #882 and the 650.390625px plot of the design
// review's pick case. 11 widths stay inside the 5s budget of a test. Where
// main's step prints the picked name, the head must print it too: a pick never
// hides its own name (owner, rev_e24bde907983/d14). Main's step is the widest
// name's room over the column, counted from the last period. Limits: the
// widths are the fallback figures, not a browser's, and the sweep is finite.
it('prints no two category names on top of each other, and keeps the picked name, at every pick', () => {
  const room = Math.max(...LONG_UNITS.map(labelWidth)) + 8;
  const count = LONG_UNITS.length;
  for (const width of [390, 495, 600, 650.390625, 705, 820, 915, 1020, 1125, 1280, 1440]) {
    const mainStep = Math.max(1, Math.ceil(room / (width / count)));
    for (const pick of [undefined, ...LONG_UNITS.keys()]) {
      vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(width);
      vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockReturnValue(width);
      const { container } = render(<Chart variant="stacked" title="Margin by unit" selected={pick}
        periods={LONG_UNITS.map((unit) => ({ label: unit, short: unit }))}
        series={[{ id: 'margin', name: 'Margin', values: LONG_UNITS.map((_, i) => 20 + i), tone: 'accent' }]}
        format={eur} />);
      const row = container.querySelector('.ui-chart__periods')!;
      const spans = printedSpans(row, width);
      cleanup();
      vi.restoreAllMocks();
      const at = `${width}px, pick ${pick ?? 'none'}`;
      expect(spans.length, `${at} prints some names`).toBeGreaterThan(0);
      expect(spans.slice(1).filter((s, k) => s.start < spans[k].end + LABEL_FLOOR).map((s) => s.i),
        `${at}: every printed pair keeps the 4px floor`).toEqual([]);
      if (pick !== undefined && (count - 1 - pick) % mainStep === 0) {
        expect(spans.map((s) => s.i), `${at}: main prints the picked name, so the head does`).toContain(pick);
      }
    }
  }
});

// #882: the picked label is drawn at weight 600, wider than the body weight.
// At 258px the real face prints the picked name and the last name together, and
// the head's step check left them 1px apart, below the 4px floor. The widths
// are IBM Plex Sans 12px, measured in a Chromium browser: the picked name reads
// 134.098px at weight 600, and the two names read 120.949px and 121.096px at
// weight 400. The spans below read the same widths back, so the picked name is
// measured as drawn.
it('keeps the picked category name off the one before it, at its own weight', () => {
  const WIDTHS: Record<string, { regular: number; semibold: number }> = {
    'Infrastructure Operations': { regular: 120.949, semibold: 134.098 },
    'Bloom Affiliate Platform': { regular: 121.096, semibold: 127.295 },
  };
  vi.stubGlobal('OffscreenCanvas', class {
    getContext() {
      return {
        font: '',
        measureText(text: string) {
          const semibold = this.font.trimStart().startsWith('600');
          const w = WIDTHS[text];
          return { width: w ? (semibold ? w.semibold : w.regular) : text.length * 12 * 0.62 };
        },
      };
    }
  });
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(258);
  vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockReturnValue(258);
  const units = Array.from({ length: 12 }, (_, i) =>
    i % 2 === 0 ? 'Infrastructure Operations' : 'Bloom Affiliate Platform');
  const { container } = render(<Chart variant="stacked" title="Margin by unit" selected={0}
    periods={units.map((unit) => ({ label: unit, short: unit }))}
    series={[{ id: 'margin', name: 'Margin', values: units.map((_, i) => 20 + i), tone: 'accent' }]}
    format={eur} />);
  const row = container.querySelector('.ui-chart__periods')!;
  const plotWidth = 258;
  const colWidth = plotWidth / row.children.length;
  const spans = [...row.children].flatMap((child, i) => {
    const text = child.textContent ?? '';
    if (!text) return [];
    const cls = classOf(child);
    const semibold = cls.includes('is-selected');
    const raw = WIDTHS[text] ? (semibold ? WIDTHS[text].semibold : WIDTHS[text].regular) : text.length * 12 * 0.62;
    const w = raw;
    if (cls.includes('is-start')) return [{ i, start: i * colWidth, end: i * colWidth + w }];
    if (cls.includes('is-end')) return [{ i, start: (i + 1) * colWidth - w, end: (i + 1) * colWidth }];
    const centre = (i + 0.5) * colWidth;
    return [{ i, start: centre - w / 2, end: centre + w / 2 }];
  });
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  expect(spans.length, 'some names print').toBeGreaterThan(0);
  expect(spans.slice(1).filter((s, k) => s.start < spans[k].end + LABEL_FLOOR).map((s) => s.i),
    'every printed pair keeps the 4px floor').toEqual([]);
});

// #882, design review of 2b0d81a8, line 9: a pick changes the printed names only
// where main's names fall under the 4px floor. At these plot widths main prints
// the names below with the third name picked, and keeps 8.56px to 37.14px between
// them. The widths are IBM Plex Sans 12px at weight 400 and 600, read from an
// OffscreenCanvas in a full Chromium browser with the loaded face; a headless
// shell rounds each width to a whole pixel. Limits: JSDOM has no layout, so the
// plot's rounded clientWidth and its exact rect width are mocked.
it('prints main\'s names with a pick where main keeps the 4px floor', () => {
  const REGIONS: Record<string, [number, number]> = {
    'North America': [78.121, 80.821], 'South America': [78.973, 81.817],
    'Western Europe': [86.089, 89.02], 'Asia Pacific': [61.212, 64.218],
    'Middle East': [62.724, 64.852], Africa: [31.428, 33.144],
  };
  vi.stubGlobal('OffscreenCanvas', class {
    getContext() {
      return {
        font: '',
        measureText(text: string) {
          return { width: REGIONS[text][this.font.trimStart().startsWith('600') ? 1 : 0] };
        },
      };
    }
  });
  const names = Object.keys(REGIONS);
  const rows: [number[], string[]][] = [
    [[142.77, 143.77, 144.77, 145.77], ['South America', 'Africa']],
    [[189.77, 190.77, 191.77, 192.77, 193.77, 194.77], ['Western Europe', 'Africa']],
    [[284.77, 285.77, 286.77, 287.77, 288.77, 289.77, 290.77, 291.77, 292.77],
      ['South America', 'Asia Pacific', 'Africa']],
    [[582.77, 583.77, 584.77, 585.77, 586.77], names],
  ];
  for (const [plots, printed] of rows) {
    for (const plot of plots) {
      vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(Math.round(plot));
      vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockReturnValue(Math.round(plot));
      vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, plot, 100));
      const { container } = render(<Chart variant="stacked" title="Margin by region" selected={2}
        periods={names.map((name) => ({ label: name, short: name }))}
        series={[{ id: 'margin', name: 'Margin', values: names.map((_, i) => 20 + i), tone: 'accent' }]}
        format={eur} />);
      const labels = [...container.querySelector('.ui-chart__periods')!.children]
        .map((c) => c.textContent).filter(Boolean);
      cleanup();
      vi.restoreAllMocks();
      expect(labels, `${plot}px plot`).toEqual(printed);
    }
  }
  vi.unstubAllGlobals();
});

// #863: a bar is one flat tone from its foot on zero to its data end. No ramp
// fades it; the full tone carries the value at every point.
it('paints every bar one flat tone, with no ramp', () => {
  const { container } = render(<>
    <Chart variant="spark" title="One" periods={periods} series={series} format={eur} />
    <Chart variant="spark" title="Two" periods={periods} series={series} format={eur} />
  </>);
  const [one, two] = [...container.querySelectorAll('svg.ui-chart__svg')];
  expect([...one.querySelectorAll('linearGradient')], 'a bar chart emits no ramp').toHaveLength(0);
  expect([...two.querySelectorAll('linearGradient')], 'each bar chart emits no ramp').toHaveLength(0);
  for (const bar of one.querySelectorAll('path.ui-chart__bar')) {
    expect((bar as SVGElement).style.getPropertyValue('--ui-chart-paint'),
      'a bar names no ramp paint').toBe('');
  }
  const css = readRepo('../../src/styles/chart.css');
  expect(/\.ui-chart__bar\s*\{([^}]*)\}/.exec(css)![1])
    .toContain('fill: var(--ui-chart-tone)');
});

// #863: every months bar stays flat, one tone, like every other bar.
it('paints a months chart\'s bars one flat tone, like every other bar', () => {
  const { container } = months();
  expect([...container.querySelectorAll('linearGradient')], 'a months chart emits no ramp').toHaveLength(0);
  for (const bar of container.querySelectorAll('path.ui-chart__bar')) {
    expect((bar as SVGElement).style.getPropertyValue('--ui-chart-paint'),
      'a months bar names no ramp paint').toBe('');
    expect(classOf(bar), 'the bar keeps its own tone').toContain('ui-chart__tone--');
  }
});

// #863: a bridge bar stays flat, one tone from its step to the next.
it('paints a bridge bar one flat tone', () => {
  const { container } = render(<Chart variant="bridge" title="Cash" format={eur}
    steps={[{ label: 'Opening', value: 1000 }, { label: 'Sales', value: 400 },
      { label: 'Costs', value: -300 }, { label: 'Closing', kind: 'total' }]} />);
  expect([...container.querySelectorAll('linearGradient')], 'a bridge chart emits no ramp').toHaveLength(0);
  expect([...container.querySelectorAll('path.ui-chart__bar')].map(toneOf),
    'Opening, Sales, Costs, Closing').toEqual(['neutral', 'good', 'bad', 'neutral']);
  for (const bar of container.querySelectorAll('path.ui-chart__bar')) {
    expect((bar as SVGElement).style.getPropertyValue('--ui-chart-paint'),
      'a bridge bar names no ramp paint').toBe('');
  }
});

// #742: an area ramps over its own values, not over the box it fills, so the
// faint end sits at the layer's lowest top and the strong end at its highest.
it('ramps an area from its lowest top to its highest, and leaves a share flat', () => {
  for (const look of ['flat', 'stacked'] as const) {
    const { container } = lookChart('area', look);
    const fills = [...container.querySelectorAll('path.ui-chart__area')];
    expect(fills, `${look}: one fill a layer`).toHaveLength(2);
    for (const fill of fills) {
      const id = /^url\(#(.+)\)$/.exec((fill as SVGElement).style.getPropertyValue('--ui-chart-paint'))?.[1];
      const g = container.querySelector(`linearGradient[id="${id}"]`)!;
      expect(g, `${look}: every area names a ramp`).not.toBeNull();
      expect(g).toHaveAttribute('gradientUnits', 'userSpaceOnUse');
      expect(classOf(g)).toContain(`ui-chart__tone--${toneOf(fill)}`);
      const tops = [...container.querySelectorAll(`line.ui-chart__line.ui-chart__tone--${toneOf(fill)}`)]
        .flatMap((edge) => [Number(edge.getAttribute('y1')), Number(edge.getAttribute('y2'))]);
      expect([Number(g.getAttribute('y1')), Number(g.getAttribute('y2'))], `${look}: lowest top, then highest`)
        .toEqual([Math.max(...tops), Math.min(...tops)]);
      expect([...g.querySelectorAll('stop')].map((stop) => [classOf(stop), stop.getAttribute('offset')]))
        .toEqual([['ui-chart__fade-base', '0'], ['ui-chart__fade-end', '1']]);
    }
    cleanup();
  }
  const { container } = lookChart('area', 'share');
  expect(container.querySelector('linearGradient'), 'a share reaches the whole in every column').toBeNull();
});

/** Each pen position and control point of a path, in order, as [x, y]. */
const pointsOf = (el: Element) => [...(el.getAttribute('d') ?? '').matchAll(/[MLC]([^A-Za-z]*)/g)]
  .flatMap(([, args]) => {
    const n = (args.match(/-?\d*\.?\d+/g) ?? []).map(Number);
    return n.flatMap((_, k) => (k % 2 ? [] : [[n[k], n[k + 1]]]));
  });

// The owner's curves (#736): each series from zero over the one before it, a
// curve that never passes the values at its two ends, a wash that is clear at
// zero, and a point on every value. JSDOM paints nothing, so the wash's opacity
// and the ring's paint are read in the browser captures on the pull request.
it('draws a curves area from zero, unstacked, with each curve between its two values', async () => {
  const user = userEvent.setup();
  const { container } = lookChart('area', 'curves');
  const svg = container.querySelector('.ui-chart__svg')!;
  const zeroY = Number(svg.querySelector('.ui-chart__zero')!.getAttribute('y1'));
  const edges = [...svg.querySelectorAll('path.ui-chart__line')];
  expect(edges, 'one curve a column step and a series').toHaveLength(6);
  // Unstacked, a curve's start stands as far above zero as its own value.
  const unit = (zeroY - pointsOf(edges[0])[0][1]) / costs[0].values[0];
  for (const [k, layer] of costs.entries()) {
    const own = edges.filter((edge) => toneOf(edge) === layer.tone);
    own.forEach((edge, i) => {
      expect(Math.abs(zeroY - pointsOf(edge)[0][1] - unit * layer.values[i]), `${layer.name} ${i} from zero`)
        .toBeLessThanOrEqual(0.1);
    });
    expect(own, `${layer.name}, series ${k}`).toHaveLength(3);
  }
  for (const edge of edges) {
    const [start, c1, c2, end] = pointsOf(edge);
    const [lo, hi] = [Math.min(start[1], end[1]), Math.max(start[1], end[1])];
    for (const [, cy] of [c1, c2]) expect(cy >= lo && cy <= hi, `${edge.getAttribute('d')} bends past its values`).toBe(true);
  }
  for (const fill of svg.querySelectorAll('path.ui-chart__area')) {
    expect(Math.max(...pointsOf(fill).map(([, py]) => py)), 'a fill stands on zero').toBe(zeroY);
    const id = /^url\(#(.+)\)$/.exec((fill as SVGElement).style.getPropertyValue('--ui-chart-paint'))?.[1];
    const g = container.querySelector(`linearGradient[id="${id}"]`)!;
    expect(Number(g.getAttribute('y1')), 'the wash is clear at zero').toBe(zeroY);
    expect([...g.querySelectorAll('stop')].map((stop) => classOf(stop)))
      .toEqual(['ui-chart__wash-floor', 'ui-chart__wash-top']);
  }
  expect(svg.querySelectorAll('.ui-chart__dot'), 'a point on every value').toHaveLength(8);
  showTable();
  const table = screen.getByRole('table', { name: 'Spend by cost' });
  expect(within(table).getAllByRole('columnheader').map((c) => c.textContent), 'no total')
    .toEqual(['Period', 'Payroll', 'Hosting']);
  fireEvent.click(screen.getByRole('button', { name: 'Chart' }));
  await tabToFrame(user);
  await user.keyboard('{ArrowRight}');
  expect(screen.getByRole('status')).toHaveTextContent('Feb 2026. Payroll €600. Hosting €300.');
  expect(screen.getByRole('status')).not.toHaveTextContent('Total');
});

// Material's rule, and the reason a bar is a path: the top of a bar has to
// measure the bar's length, and a rounded foot lifts it off the one rule the
// chart draws. Look A's corner is small: --radius-xs or a quarter of the bar,
// whichever is smaller, never a full round end.
it('spends a bar\'s small corner on the end away from zero, and none on the foot', () => {
  const { container } = months();
  const svg = container.querySelector('.ui-chart__svg')!;
  const zeroY = Number(svg.querySelector('.ui-chart__zero')!.getAttribute('y1'));
  for (const bar of svg.querySelectorAll('path.ui-chart__bar')) {
    const box = boxOf(bar);
    const arcs = arcsOf(bar);
    // The data end carries the look-A corner: --radius-xs or a quarter of the
    // bar's width, whichever is smaller, capped by the bar's height. An arc
    // leaves the edge it rounds exactly that far, so the radius is also the
    // tolerance for where the arc sits.
    const radius = Math.min(6, box.width / 4, box.height);
    for (const [, r] of (bar.getAttribute('d') ?? '').matchAll(/a(-?\d*\.?\d+)/g)) {
      expect(Math.abs(Number(r) - radius), `${classOf(bar)} carries the small corner`).toBeLessThanOrEqual(0.1);
      expect(Number(r), `${classOf(bar)} is not fully round`).toBeLessThan(box.width / 2 - 0.1);
    }
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

// The stacked looks share the months chart's look-A corner: --radius-xs or a
// quarter of the bar, whichever is smaller. A design review of 63cffc79 found a
// fixed 4px radius here, which rounded a 12px column more than look A asks and
// a 20px share column less.
it('spends the look-A corner on the stacked columns, share and rows', () => {
  for (const [look, bar] of [['columns', 12], ['share', 20], ['rows', 12]] as const) {
    cleanup();
    const { container } = lookChart('stacked', look);
    const svg = container.querySelector('.ui-chart__svg')!;
    const segments = [...svg.querySelectorAll('path.ui-chart__segment')];
    expect(segments.length, `${look} draws segments`).toBeGreaterThan(0);
    const rounded = segments.filter((s) => /[aA]/.test(s.getAttribute('d') ?? ''));
    expect(rounded.length, `${look} rounds its top segment`).toBeGreaterThan(0);
    const radius = Math.min(6, bar / 4);
    for (const seg of segments) {
      for (const [, r] of (seg.getAttribute('d') ?? '').matchAll(/[aA](-?\d*\.?\d+)/g)) {
        expect(Math.abs(Number(r) - radius), `${look} carries the small corner, not a fixed 4px`)
          .toBeLessThanOrEqual(0.1);
      }
    }
  }
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
  // The mousedown behind a tap focuses the nearest focusable box, the scroller,
  // before the click hands focus back to the frame.
  act(() => plot().closest<HTMLElement>('.ui-chart__scroll')!.focus());
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

it('a tap after Escape opens the same mark again', () => {
  months();
  tap('income-1');
  expect(frame(), 'the tap leaves focus on the chart').toHaveFocus();
  tap('income-2');
  expect(screen.getByRole('tooltip'), 'a tap with the chart focused moves the readout').toHaveTextContent('Mar 2026');
  tap('income-1');
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(screen.queryByRole('tooltip')).toBeNull();
  tap('income-1');
  expect(screen.getByRole('tooltip'), 'a new tap is a deliberate press').toHaveTextContent('Feb 2026');
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
    <Chart variant="bridge" title="Cash from opening to closing" steps={steps} format={eur} legend />,
  );

  it('walks to a closing total it works out itself, and tables the running total', () => {
    bridge();
    showTable();
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

it('scrolls the plot and opens a chart of periods at its latest period', () => {
  const { container } = months();
  expect(container.querySelector('.ui-chart__plot')).toHaveStyle({ '--ui-chart-cols': '4' });
  cleanup();

  // A chart of periods wider than its box opens on its latest period, the one
  // a reader came for (#841); a bridge reads from its opening total. The widths
  // are set before the render, so the opening scroll reads them.
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(200);
  vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockReturnValue(576);
  const opening = (look: string) => {
    const left = (lookChart('line', look).container.querySelector('.ui-chart__scroll') as HTMLDivElement).scrollLeft;
    cleanup();
    return left;
  };
  expect(opening('labels'), 'the labels look opens at the end').toBe(376);
  expect(opening('thin'), 'the thin look opens at the end').toBe(376);
  expect(opening('points'), 'the points look opens at the end').toBe(376);
  const scrollOf = (el: HTMLElement) => (el.querySelector('.ui-chart__scroll') as HTMLDivElement).scrollLeft;
  expect(scrollOf(months().container), 'a months chart opens at the end').toBe(376);
  cleanup();
  expect(scrollOf(render(<Chart variant="bridge" title="Cash" format={eur}
    steps={[{ label: 'Opening', value: 1000 }, { label: 'Sales', value: 400 }]} />).container),
  'a bridge opens at its opening total').toBe(0);
});

// A chart that opens at its end must not open a readout on a period scrolled out
// of view: focus starts on the nearest column the reader can see.
it('opens the keyboard readout on a column in view when the plot opens at its end', async () => {
  const user = userEvent.setup();
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(200);
  // Every box reads 200px and the scroller holds 300px, so the plot opens at 100
  // and its 40px columns 3 and 4 are in view; column 0 is scrolled away.
  vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockReturnValue(300);
  forecastChart({ table: false });
  const scroll = document.querySelector('.ui-chart__scroll') as HTMLDivElement;
  expect(scroll.scrollLeft, 'the plot opens at its end').toBe(100);
  await user.tab();
  expect(screen.getByRole('status'), 'not Oct, which is scrolled away').toHaveTextContent(/^Jan 2027\./);
  expect(screen.getByRole('tooltip').querySelector('.ui-tip__label')).toHaveTextContent('Cash in, Jan 2027');
  vi.restoreAllMocks();
});

// A chart that scrolls its own plot re-places the keyboard readout beside its
// mark; the document scroll listener must not clear it first, as it did before
// #863 (a design review of 63cffc79 found Home and the arrows hid the readout).
// A page scroll with the pointer still closes it. JSDOM fires no scroll when a
// scrollLeft is written, so this fires the events and mocks the boxes the
// re-place reads.
it('keeps the keyboard readout open when the chart\'s own plot scrolls, and closes it on a page scroll', async () => {
  const user = userEvent.setup();
  const { container } = months();
  await tabToFrame(user);
  fireEvent.keyDown(frame(), { key: 'ArrowRight' });
  expect(screen.getByRole('tooltip')).toHaveClass('is-open');

  const scroller = container.querySelector('.ui-chart__scroll')!;
  const anchor = container.querySelector('[data-anchor="income-1"]')!;
  vi.spyOn(scroller, 'getBoundingClientRect').mockReturnValue(
    { left: 0, right: 200, top: 0, bottom: 100, width: 200, height: 100, x: 0, y: 0, toJSON: () => ({}) } as DOMRect);
  vi.spyOn(anchor, 'getBoundingClientRect').mockReturnValue(
    { left: 50, right: 60, top: 0, bottom: 10, width: 10, height: 10, x: 50, y: 0, toJSON: () => ({}) } as DOMRect);

  fireEvent.scroll(scroller);
  expect(screen.getByRole('tooltip'), 'the chart\'s own plot scroll keeps the readout open').toHaveClass('is-open');

  fireEvent.scroll(document);
  expect(screen.queryByRole('tooltip'), 'a page scroll still closes the readout').toBeNull();
  vi.restoreAllMocks();
});

// #863: WebKit collapses a zero-height anchor's bounding box to nothing at the
// svg's origin, so the scroll handler's visibility check read the bar as
// scrolled out (x -19.56, width 0) and closed the readout although the bar was
// in view. The check reads the anchor's own coordinates through the svg's box.
it('keeps the readout open when the anchor\'s collapsed rect sits outside the scroller but the bar is in view', async () => {
  const user = userEvent.setup();
  const { container } = months();
  await tabToFrame(user);
  fireEvent.keyDown(frame(), { key: 'ArrowRight' });
  expect(screen.getByRole('tooltip')).toHaveClass('is-open');

  const scroller = container.querySelector('.ui-chart__scroll')!;
  const anchor = container.querySelector('[data-anchor="income-1"]')!;
  const svg = anchor.closest('svg')!;
  const rect = (r: Partial<DOMRect>) => r as DOMRect;
  // The svg reports its real box; WebKit reports the collapsed anchor at the
  // svg's origin, off the left of the scroller and zero wide.
  vi.spyOn(svg, 'getBoundingClientRect').mockReturnValue(
    rect({ left: 0, top: 0, right: 192, bottom: 216, width: 192, height: 216, x: 0, y: 0 }));
  vi.spyOn(anchor, 'getBoundingClientRect').mockReturnValue(
    rect({ left: -19.56, top: 0, right: -19.56, bottom: 0, width: 0, height: 0, x: -19.56, y: 0 }));
  vi.spyOn(scroller, 'getBoundingClientRect').mockReturnValue(
    rect({ left: 0, top: 0, right: 200, bottom: 100, width: 200, height: 100, x: 0, y: 0 }));

  fireEvent.scroll(scroller);
  expect(screen.getByRole('tooltip'), 'the bar is in view, so the readout stays open').toHaveClass('is-open');
  vi.restoreAllMocks();
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
  it('finds no violation in any variant or look', async () => {
    document.documentElement.setAttribute('data-theme', theme);
    months();
    render(<Chart variant="bridge" title="Cash from opening to closing" format={eur}
      steps={[{ label: 'Opening', value: 10 }, { label: 'Sales', value: 5 }, { label: 'Closing', kind: 'total' }]} />);
    for (const [variant, look] of LOOKS) {
      if (variant === 'donut') render(<Chart variant="donut" look={look as 'thin'} title={`Spend ${look}`} slices={slices} format={eur} />);
      else render(<Chart variant={variant} look={look as 'thin'} title={`Spend ${variant} ${look}`} periods={periods} series={costs} format={eur} />);
    }
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
  showTable();
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

// A band centres the lanes it has, not the lanes the widest band has.
it('centres a band that has fewer lanes than the chart\'s widest', () => {
  const { container } = render(
    <Chart title="Income and spend" periods={periods} format={eur}
      series={[
        { id: 'a', name: 'Fees', values: INCOME, shape: 'bars', tone: 'accent' },
        { id: 'b', name: 'Sales', values: SPEND, shape: 'bars', tone: 'accent-soft' },
        { id: 'c', name: 'Spend', values: SPEND, shape: 'bars-below', tone: 'bad' },
      ]} />,
  );
  const svg = container.querySelector('.ui-chart__svg')!;
  const bars = [...svg.querySelectorAll('path.ui-chart__bar')].map(boxOf);
  const columnWidth = Number(svg.getAttribute('width')) / MONTHS.length;
  const below = bars.slice(MONTHS.length * 2);
  expect(below).toHaveLength(MONTHS.length);
  below.forEach((bar, i) => {
    expect(bar.x + bar.width / 2, 'the lone bar below zero sits on its column\'s centre')
      .toBeCloseTo(columnWidth * (i + 0.5), 1);
  });
  expect(new Set(bars.map((b) => Math.round(b.width * 10))).size,
    'and every bar in the chart is still one width').toBe(1);
});

// Look A (#841): a bar takes two thirds of its column, up to --space-12.
it('caps a bar at a mark\'s width however wide its column is', () => {
  const cap = Number(/const FIT_MAX = (\d+)/.exec(readRepo('./Chart.tsx'))![1]);
  const share = 2 / 3;
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

it('a bridge prints no word for its step that is not final, and keys no state', () => {
  const { container } = render(
    <Chart variant="bridge" title="Cash" format={eur}
      steps={[{ label: 'Opening', value: 1000 }, { label: 'Sales', value: 400 },
        { label: 'Fees', value: -150, estimated: true }, { label: 'Closing', kind: 'total' }]} legend />,
  );
  expect(restingWords(container), 'the readout names the step, not the resting chart').not.toMatch(/estimated/);
  expect(container.querySelector('.ui-chart__key-estimated')).toBeNull();
});

it('a cursor left past the end of a shortened series still announces', async () => {
  const user = userEvent.setup();
  const { rerender } = render(
    <Chart title="Fees" periods={periods} series={[{ id: 'f', name: 'Fees', values: INCOME }]} format={eur} />,
  );
  await tabToFrame(user);
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

it('opens the readout above its mark when the view has room there, over the legend', () => {
  // JSDOM has no layout, so the viewport and the boxes are given: a frame whose
  // top edge is the legend's bottom, and a mark just under it. Nothing between
  // the frame and the body clips, so the view is the only ceiling.
  // why: guidelines/hover-readouts.md#prefer-above-the-mark
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
  expect(tip.classList.contains('is-below'), 'the frame is no ceiling for the readout').toBe(false);
});

it('clamps a top-layer readout to its card, not only the view', () => {
  // The card is narrower than the view, so a readout that fits the view can still
  // run past the card's right edge; the clamp must stop at the card's content box.
  const layer = stubPopover();
  try {
    for (const [prop, value] of [['clientWidth', 820], ['clientHeight', 1180]] as const) {
      Object.defineProperty(document.documentElement, prop, { value, configurable: true });
    }
    const { container } = render(
      <Card title="Income and spend">
        <Chart title="Income and spend by month" periods={periods} series={series} format={eur} />
      </Card>,
    );
    const card = container.querySelector<HTMLElement>('.ui-card')!;
    const tip = container.querySelector<HTMLElement>('.ui-tip')!;
    const anchor = container.querySelector('[data-anchor="income-3"]')!;
    const box = (top: number, bottom: number, left: number, right: number) =>
      ({ top, bottom, left, right, width: right - left, height: bottom - top }) as DOMRect;
    // The last bar's centre is 710, its readout is 200 wide: centred at 610 its
    // right edge (810) clears the view (820) but not the card (780). The clamp
    // slides it 30px back so its right edge meets the card's content box.
    vi.spyOn(card, 'getBoundingClientRect').mockReturnValue(box(0, 1180, 40, 780));
    vi.spyOn(anchor, 'getBoundingClientRect').mockReturnValue(box(100, 120, 700, 720));
    vi.spyOn(tip, 'offsetWidth', 'get').mockReturnValue(200);
    vi.spyOn(tip, 'offsetHeight', 'get').mockReturnValue(60);

    hover('income-3');
    expect(tip.style.getPropertyValue('--ui-tip-shift'), 'the readout stops at the card, not the view').toBe('-30px');
  } finally {
    layer.restore();
  }
});

it('keeps a top-layer readout on-screen when its card is scrolled out of the view', () => {
  // The card's left edge is 115px off the view, so its content box begins at -115;
  // a readout centred on a mark just inside the view would follow that box off-screen.
  // The clamp must stop at the view's edge, the intersection of both bounds.
  const layer = stubPopover();
  try {
    for (const [prop, value] of [['clientWidth', 400], ['clientHeight', 800]] as const) {
      Object.defineProperty(document.documentElement, prop, { value, configurable: true });
    }
    const { container } = render(
      <Card title="Income and spend">
        <Chart title="Income and spend by month" periods={periods} series={series} format={eur} />
      </Card>,
    );
    const card = container.querySelector<HTMLElement>('.ui-card')!;
    const tip = container.querySelector<HTMLElement>('.ui-tip')!;
    const anchor = container.querySelector('[data-anchor="income-0"]')!;
    const box = (top: number, bottom: number, left: number, right: number) =>
      ({ top, bottom, left, right, width: right - left, height: bottom - top }) as DOMRect;
    vi.spyOn(card, 'getBoundingClientRect').mockReturnValue(box(0, 800, -115, 685));
    vi.spyOn(anchor, 'getBoundingClientRect').mockReturnValue(box(100, 120, 30, 50));
    vi.spyOn(tip, 'offsetWidth', 'get').mockReturnValue(200);
    vi.spyOn(tip, 'offsetHeight', 'get').mockReturnValue(60);

    hover('income-0');
    // The mark's centre is 40, so centred the readout's left edge sits at -60; the
    // view bound slides it back to 0 (shift +60) instead of letting the card push it off.
    expect(tip.style.getPropertyValue('--ui-tip-shift'), 'the view keeps the readout on-screen').toBe('60px');
  } finally {
    layer.restore();
  }
});

it('keeps the card clamp when the chart\u2019s own plot scrolls, on the top layer', () => {
  // A plot scroll re-places the readout; it must keep the same card-and-view
  // clamp as the open, not the frame box, so it cannot drift past the card.
  const layer = stubPopover();
  try {
    for (const [prop, value] of [['clientWidth', 820], ['clientHeight', 1180]] as const) {
      Object.defineProperty(document.documentElement, prop, { value, configurable: true });
    }
    const { container } = render(
      <Card title="Income and spend">
        <Chart title="Income and spend by month" periods={periods} series={series} format={eur} />
      </Card>,
    );
    const card = container.querySelector<HTMLElement>('.ui-card')!;
    const tip = container.querySelector<HTMLElement>('.ui-tip')!;
    const anchor = container.querySelector('[data-anchor="income-3"]')!;
    const scroller = container.querySelector<HTMLElement>('.ui-chart__scroll')!;
    const box = (top: number, bottom: number, left: number, right: number) =>
      ({ top, bottom, left, right, width: right - left, height: bottom - top }) as DOMRect;
    // The card's content box ends at 780, the view at 820; a 200px readout
    // centred on the mark at 710 stops at the card (shift -30), not the view.
    vi.spyOn(card, 'getBoundingClientRect').mockReturnValue(box(0, 1180, 40, 780));
    vi.spyOn(anchor, 'getBoundingClientRect').mockReturnValue(box(100, 120, 700, 720));
    vi.spyOn(tip, 'offsetWidth', 'get').mockReturnValue(200);
    vi.spyOn(tip, 'offsetHeight', 'get').mockReturnValue(60);
    // The mark is still inside the scroller's box, so the scroll re-places the
    // readout rather than closing it.
    vi.spyOn(scroller, 'getBoundingClientRect').mockReturnValue(box(0, 300, 600, 900));

    hover('income-3');
    expect(tip.style.getPropertyValue('--ui-tip-shift'), 'the open readout stops at the card').toBe('-30px');
    fireEvent.scroll(scroller);
    expect(tip.style.getPropertyValue('--ui-tip-shift'), 'the scroll keeps the card clamp, not the view').toBe('-30px');
  } finally {
    layer.restore();
  }
});

it('wraps a long top-layer readout to a narrow card', () => {
  // A 320px card's content box is 288px wide; a readout whose text is 312px wide
  // would run 24px past the card's right edge. Capping its width at the box lets
  // the text wrap instead of overflowing the card.
  const layer = stubPopover();
  try {
    for (const [prop, value] of [['clientWidth', 1280], ['clientHeight', 800]] as const) {
      Object.defineProperty(document.documentElement, prop, { value, configurable: true });
    }
    const { container } = render(
      <Card title="Income and spend">
        <Chart title="Income and spend by month" periods={periods} series={series} format={eur} />
      </Card>,
    );
    const card = container.querySelector<HTMLElement>('.ui-card')!;
    const tip = container.querySelector<HTMLElement>('.ui-tip')!;
    const anchor = container.querySelector('[data-anchor="income-3"]')!;
    const box = (top: number, bottom: number, left: number, right: number) =>
      ({ top, bottom, left, right, width: right - left, height: bottom - top }) as DOMRect;
    vi.spyOn(card, 'getBoundingClientRect').mockReturnValue(box(0, 800, 16, 304));
    vi.spyOn(anchor, 'getBoundingClientRect').mockReturnValue(box(100, 120, 290, 304));
    vi.spyOn(tip, 'offsetWidth', 'get').mockReturnValue(312);
    vi.spyOn(tip, 'offsetHeight', 'get').mockReturnValue(60);

    hover('income-3');
    expect(tip.style.maxWidth, 'the readout wraps to the card content box').toBe('min(var(--prose-caption), 288px)');
  } finally {
    layer.restore();
  }
});

it('places a wrapped readout by its wrapped height near the top of a scrolled card', () => {
  // The card is scrolled up so the mark sits 60px below the top of the view; the
  // readout's text wraps to the card's width, growing from one 40px line to two
  // 96px. Measuring the pre-wrap height would keep it above the mark and clip it
  // above the view; the wrapped height flips it below the mark instead.
  const layer = stubPopover();
  try {
    for (const [prop, value] of [['clientWidth', 400], ['clientHeight', 800]] as const) {
      Object.defineProperty(document.documentElement, prop, { value, configurable: true });
    }
    const { container } = render(
      <Card title="Income and spend">
        <Chart title="Income and spend by month" periods={periods} series={series} format={eur} />
      </Card>,
    );
    const card = container.querySelector<HTMLElement>('.ui-card')!;
    const tip = container.querySelector<HTMLElement>('.ui-tip')!;
    const anchor = container.querySelector('[data-anchor="income-0"]')!;
    const box = (top: number, bottom: number, left: number, right: number) =>
      ({ top, bottom, left, right, width: right - left, height: bottom - top }) as DOMRect;
    // A 320px card scrolled up out of the view; its content box spans 16..304.
    vi.spyOn(card, 'getBoundingClientRect').mockReturnValue(box(-200, 800, 16, 304));
    // A mark near the top of the view, 60px below its edge.
    vi.spyOn(anchor, 'getBoundingClientRect').mockReturnValue(box(60, 80, 290, 304));
    // Before the width cap the readout is one 40px line; after it wraps to the
    // card's 288px content box it is two lines, 96px tall.
    vi.spyOn(tip, 'offsetWidth', 'get').mockImplementation(() => (tip.style.maxWidth === '' ? 312 : 288));
    vi.spyOn(tip, 'offsetHeight', 'get').mockImplementation(() => (tip.style.maxWidth === '' ? 40 : 96));

    hover('income-0');
    expect(tip.classList.contains('is-below'), 'the wrapped readout moves below the mark instead of clipping above').toBe(true);
  } finally {
    layer.restore();
  }
});

it('opens a spark readout in the top layer over a scrolling table', () => {
  const layer = stubPopover();
  try {
    const { container } = render(
      <div className="ui-table-scroll">
        <table><tbody><tr><td><Chart variant="spark" title="Cash trend" periods={periods}
          series={[series[0]]} format={eur} /></td></tr></tbody></table>
      </div>,
    );
    hover('income-0');
    const tip = screen.getByRole('tooltip', { hidden: true });
    expect(layer.show, 'the table scroll frame cannot clip a top-layer readout').toHaveBeenCalledWith();
    expect(tip.matches(':popover-open'), 'the readout is in the browser top layer').toBe(true);
    expect(tip).toHaveAttribute('popover', 'manual');
  expect(container.querySelector('.ui-table-scroll')?.contains(tip)).toBe(true);
  fireEvent.scroll(container.querySelector('.ui-table-scroll')!);
  expect(tip.matches(':popover-open'), 'a scrolling table closes its fixed readout').toBe(false);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(layer.hide, 'Escape closes the top-layer readout').toHaveBeenCalledWith();
  } finally {
    layer.restore();
  }
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
  // The nearest focusable ancestor of a mark is the scroller; a pointer reader
  // parked there never hears what the arrows do.
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

// Sparse values must remain visible. These tests inspect SVG marks, not raster paint.
it.each([[42], [42, NaN, 44], [NaN, 42, NaN]])('draws isolated finite values in %j', (...values) => {
  const { container } = render(<Chart variant="spark" title="Sparse" format={String}
    periods={values.map((_, i) => ({ label: String(i) }))}
    series={[{ id: 's', name: 'Series', shape: 'line', values }]} />);
  expect(container.querySelectorAll('.ui-chart__isolated')).toHaveLength(values.filter(Number.isFinite).length);
  expect(container.querySelectorAll('line.ui-chart__line')).toHaveLength(0);
});

it('does not add isolated markers to connected points', () => {
  const { container } = months();
  expect(container.querySelectorAll('.ui-chart__isolated')).toHaveLength(0);
});

it('clears the readout and announces a missing period without a table', () => {
  render(<Chart variant="spark" title="Sparse" format={String} table={false}
    periods={[{ label: 'Jan' }, { label: 'Feb' }, { label: 'Mar' }]}
    series={[{ id: 's', name: 'Series', shape: 'line', values: [42, NaN, 44] }]} />);
  fireEvent.focus(frame());
  expect(screen.getByRole('tooltip')).toHaveTextContent('42');
  fireEvent.keyDown(frame(), { key: 'ArrowRight' });
  expect(screen.queryByRole('tooltip')).toBeNull();
  expect(screen.getByRole('status')).toHaveTextContent('Feb. No value.');
  fireEvent.keyDown(frame(), { key: 'ArrowRight' });
  expect(screen.getByRole('tooltip')).toHaveTextContent('44');
});

it('clears a readout when scrolling its mark outside the viewport', () => {
  const { container } = months();
  hover('income-0');
  const anchor = container.querySelector('[data-anchor="income-0"]')!;
  const scroll = container.querySelector('.ui-chart__scroll')!;
  vi.spyOn(anchor, 'getBoundingClientRect').mockReturnValue(
    { left: -30, right: -6, top: 0, bottom: 10, width: 24, height: 10, x: -30, y: 0, toJSON: () => ({}) } as DOMRect);
  vi.spyOn(scroll, 'getBoundingClientRect').mockReturnValue({ left: 0, right: 300 } as DOMRect);
  fireEvent.scroll(scroll);
  expect(screen.queryByRole('tooltip')).toBeNull();
  fireEvent.keyDown(frame(), { key: 'ArrowRight' });
  expect(screen.getByRole('tooltip')).toHaveTextContent('Feb');
});

it('keeps short floating bridge steps rectangular', () => {
  const { container } = render(<Chart variant="bridge" title="Cash" format={eur}
    steps={[{ label: 'Opening', value: 100000 }, { label: 'Fees', value: -4500, estimated: true }]} />);
  const bar = container.querySelector('.ui-chart__bar.is-estimated')!;
  const height = boxOf(bar).height;
  const radius = Number(/a([\d.]+)/.exec(bar.getAttribute('d')!)![1]);
  expect(radius).toBeLessThanOrEqual(height / 4 + 0.1);
});

/* -- the line, area, stacked and donut looks -------------------------------- */

it('gives each variant its default look when the caller names none', () => {
  const want = { line: 'thin', area: 'stacked', stacked: 'columns' } as const;
  for (const variant of ['line', 'area', 'stacked'] as const) {
    const { container } = lookChart(variant);
    expect(container.firstElementChild).toHaveClass(`ui-chart--${variant}`, `ui-chart--${variant}-${want[variant]}`);
    cleanup();
  }
  const { container } = render(<Chart variant="donut" title="Spend by cost" slices={slices} format={eur} />);
  expect(container.firstElementChild).toHaveClass('ui-chart--donut-table');
});

it('draws a line look as lines only, with points or end labels where the look asks', () => {
  const marks = (look: string) => {
    const { container } = lookChart('line', look);
    const got = {
      bars: container.querySelectorAll('.ui-chart__bar, .ui-chart__segment').length,
      lines: container.querySelectorAll('line.ui-chart__line').length,
      dots: container.querySelectorAll('.ui-chart__dot').length,
    };
    cleanup();
    return got;
  };
  expect(marks('thin')).toEqual({ bars: 0, lines: 6, dots: 0 });
  expect(marks('points'), 'a point on every value').toEqual({ bars: 0, lines: 6, dots: 8 });
  expect(marks('labels'), 'one end point a line').toEqual({ bars: 0, lines: 6, dots: 2 });
});

it('tables a stack with its total, and reads every layer of a column with that total', async () => {
  const user = userEvent.setup();
  lookChart('stacked');
  showTable();
  const table = screen.getByRole('table', { name: 'Spend by cost' });
  expect(within(table).getAllByRole('columnheader').map((c) => c.textContent))
    .toEqual(['Period', 'Payroll', 'Hosting', 'Total']);
  expect(within(within(table).getByRole('row', { name: /Feb 2026/ })).getAllByRole('cell').map((c) => c.textContent))
    .toEqual(['€600', '€300', '€900']);
  fireEvent.click(screen.getByRole('button', { name: 'Chart' }));
  await tabToFrame(user);
  expect(frame()).toHaveFocus();
  await user.keyboard('{ArrowRight}');
  expect(screen.getByRole('status')).toHaveTextContent('Feb 2026. Hosting €300. Payroll €600. Total €900.');
  hover('column-1');
  expect(screen.getByRole('tooltip')).toHaveTextContent('Feb 2026Hosting€300Payroll€600Total€900');
});

it('reads a share look in parts of the column, and keeps the money in the table', () => {
  lookChart('area', 'share');
  hover('column-1');
  expect(screen.getByRole('tooltip')).toHaveTextContent('Hosting33%Payroll67%Total€900');
  showTable();
  const table = screen.getByRole('table', { name: 'Spend by cost' });
  expect(within(within(table).getByRole('row', { name: /Feb 2026/ })).getAllByRole('cell').map((c) => c.textContent))
    .toEqual(['€600', '€300', '€900']);
  expect([...document.querySelectorAll('.ui-chart__axis .ui-chart__tick')].map((t) => t.textContent), 'an axis of shares')
    .toEqual(['100%', '75%', '50%', '25%', '0%']);
});

it('keeps a line\'s end label inside the plot when its value is the scale\'s top', () => {
  const { container } = render(<Chart variant="line" look="labels" title="Spend" periods={periods.slice(0, 2)}
    series={[{ id: 'payroll', name: 'Payroll', values: [50, 100] }]} format={eur} />);
  const label = container.querySelector('.ui-chart__text--strong')!;
  const height = Number(container.querySelector('.ui-chart__svg')!.getAttribute('height'));
  const baseline = Number(label.getAttribute('y'));
  // 10px is the ascent of the 12px label type over its baseline.
  expect(baseline - 10, 'the label\'s top is inside the plot').toBeGreaterThanOrEqual(0);
  expect(baseline, 'and its baseline too').toBeLessThanOrEqual(height);
  // The label ends left of its point, where the rising line is under the baseline.
  const edge = container.querySelector('line.ui-chart__line')!;
  const [x1, y1, x2, y2] = ['x1', 'y1', 'x2', 'y2'].map((a) => Number(edge.getAttribute(a)));
  const right = Number(label.getAttribute('x'));
  expect(right, 'the label ends left of the point').toBeLessThan(x2);
  expect(y2 + (x2 - right) * (y1 - y2) / (x2 - x1), 'the line passes under the label').toBeGreaterThan(baseline);
});

it('throws on a negative value in an area, a stacked or a donut chart, before drawing', () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  const signed = [{ id: 'net', name: 'Net', values: [100, -90] }];
  for (const variant of ['area', 'stacked'] as const) {
    expect(() => render(<Chart variant={variant} title="Net" periods={periods.slice(0, 2)} series={signed} format={eur} />))
      .toThrow(RangeError);
  }
  expect(() => render(<Chart variant="donut" title="Net" format={eur}
    slices={[{ id: 'a', name: 'A', value: 100 }, { id: 'b', name: 'B', value: -90 }]} />)).toThrow(RangeError);
  cleanup();
  expect(() => render(<Chart variant="line" title="Net" periods={periods.slice(0, 2)} series={signed} format={eur} />),
    'a line is not a part of a whole').not.toThrow();
});

it('steps the rows of a rows look, and calls them rows', () => {
  lookChart('stacked', 'rows');
  expect(frame()).toHaveAccessibleName('Spend by cost. Arrow keys step through the 4 rows.');
  expect(plot().querySelectorAll('[data-mark^="row-"]')).toHaveLength(4);
});

it('steps a donut by slice, says each slice\'s share of the whole, and tables the shares', async () => {
  const user = userEvent.setup();
  render(<Chart variant="donut" title="Spend by cost" slices={slices} totalLabel="Spend" format={eur} />);
  expect(frame()).toHaveAccessibleName('Spend by cost. Arrow keys step through the 2 slices.');
  await tabToFrame(user);
  await user.keyboard('{ArrowRight}');
  expect(screen.getByRole('status')).toHaveTextContent('Hosting. €200, 25% of €800');
  expect(document.querySelector('.ui-chart__shares'), 'the table look lists the shares beside the ring')
    .toHaveTextContent('Payroll€60075%Hosting€20025%Spend€800100%');
  showTable();
  const table = screen.getByRole('table', { name: 'Spend by cost' });
  expect(within(table).getAllByRole('columnheader').map((c) => c.textContent)).toEqual(['Slice', 'Value', 'Share']);
  expect(document.querySelector('.ui-chart__legend'), 'the list is the key').toBeNull();
});

it('draws one positive slice beside zero slices as the whole ring', () => {
  const { container } = render(<Chart variant="donut" look="thin" title="Spend" format={eur}
    slices={[{ id: 'a', name: 'A', value: 0 }, { id: 'b', name: 'B', value: 500 }, { id: 'c', name: 'C', value: 0 }]} />);
  const paths = [...container.querySelectorAll('path.ui-chart__segment, path.ui-chart__hit')];
  expect(paths, 'the slice and its pointer target, and nothing for the zero slices').toHaveLength(2);
  for (const path of paths) {
    // An arc that ends where it starts draws nothing, so every arc must move.
    let at = '';
    for (const [, cmd, args] of path.getAttribute('d')!.matchAll(/([MA])([^A-Za-z]*)/g)) {
      const n = args.trim().split(/[\s,]+/);
      const end = n.slice(-2).join(' ');
      if (cmd === 'A') expect(end, 'an arc with two different ends').not.toBe(at);
      at = end;
    }
  }
});

it('prints a donut\'s whole in its centre only on the thin look', () => {
  const centre = (look: 'thin' | 'table' | 'labels') => {
    const { container } = render(<Chart variant="donut" look={look} title="Spend by cost" slices={slices} totalLabel="Spend" format={eur} />);
    const got = [...container.querySelectorAll('.ui-chart__total')].map((t) => t.textContent);
    cleanup();
    return got;
  };
  expect(centre('thin')).toEqual(['€800']);
  expect(centre('table'), 'the list beside the ring carries the whole').toEqual([]);
  expect(centre('labels'), 'the labels say the parts').toEqual([]);
});

it('shrinks the labels ring\'s box with its ring on a narrow plot', () => {
  const box = (width: number) => {
    measuredAt(width);
    const { container } = render(<Chart variant="donut" look="labels" title="Spend by cost" slices={slices} format={eur} />);
    const svg = container.querySelector('.ui-chart__svg')!;
    // The first slice's outer arc carries the ring's radius.
    const arc = container.querySelector('.ui-chart__segment')!.getAttribute('d')!.match(/A(\d+(?:\.\d+)?)/)!;
    const got = { h: Number(svg.getAttribute('height')), r: Number(arc[1]) };
    cleanup();
    vi.restoreAllMocks();
    return got;
  };
  const wide = box(600);
  const narrow = box(300);
  expect(narrow.h, 'the narrow box is shorter').toBeLessThan(wide.h);
  expect(wide.h - narrow.h, 'by what the ring lost across').toBeCloseTo(2 * (wide.r - narrow.r), 0);
});

// #842 design review: a two-line story named its lines only in the readout.
// The labels look names them by their final values; the others need a key.
it('names the lines of a two-line story in a key while no readout is open', () => {
  for (const story of [LineThin, LinePoints]) {
    const { container } = render(<>{story.render!({} as never, {} as never)}</>);
    const key = container.querySelector('.ui-chart__legend');
    expect(key, 'a key').not.toBeNull();
    expect(key).toHaveTextContent('Income');
    expect(key).toHaveTextContent('Spend');
    cleanup();
  }
});
