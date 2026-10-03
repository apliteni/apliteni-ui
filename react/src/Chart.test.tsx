// What the chart owes a reader who cannot see it, and a reader who can only
// point at it.
//
// Limits. JSDOM has no layout: every rect is zero, so the readout's PLACEMENT is
// not measured here (its arithmetic is react/src/tip.ts, exercised through
// Tooltip.test.tsx's mocked geometry), the plot falls back to its unmeasured
// column width, and the scroll fade is checked as the class the scroll handler
// writes rather than as a painted gradient. Nothing here measures contrast
// (react/src/contrast.test.tsx), the hatch, the fade gradient or the focus ring
// as painted; the browser captures on the pull request carry those. What colour
// each series is drawn in, and whether it clears the graphic bar, is measured in
// react/src/Chart.contrast.test.tsx. Screen-reader speech is not run — the live
// region's text is read from the DOM.
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
  { id: 'income', name: 'Income', values: INCOME, shape: 'bars', tone: 'good', fade: true },
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
/** The pattern or gradient a bar is painted with, as the component names it. */
const paintOf = (el: Element) => (el as SVGElement).style.getPropertyValue('--ui-chart-paint');
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

/* -- the one tab stop ------------------------------------------------------- */

it('puts one element in the tab order, and it is the frame', async () => {
  const user = userEvent.setup();
  const { container } = months();
  // Read from the rendered DOM rather than from the stylesheet. A browser makes
  // an overflowing box keyboard-focusable on its own, and the ring it draws
  // there is its own, not the kit's — which is what #543's review found on
  // `.ui-chart__scroll`. Anything the chart leaves in the tab order has to
  // carry `.ui-focusable`.
  const tabbable = [...container.querySelectorAll<HTMLElement>('*')]
    .filter((el) => el.tabIndex >= 0 || el.tagName === 'SUMMARY');
  expect(tabbable.map(classOf))
    .toEqual(['ui-chart__frame ui-tip-host ui-focusable', 'ui-focusable']);

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

it('draws an unfinished period with a hatch and a dashed outline, and the others plain', () => {
  const { container } = months();
  const bars = [...container.querySelectorAll('rect.ui-chart__bar')];
  const april = bars.filter((b) => b.classList.contains('is-estimated'));
  expect(april, 'one hatched bar per bar series in the unfinished column').toHaveLength(2);
  // The paint is a custom property and not a fill attribute: chart.css's own
  // rule outranks a presentation attribute, so an attribute would never land.
  for (const bar of april) expect(paintOf(bar)).toMatch(/^url\(#.*-hatch-(good|bad)\)$/);
  expect(bars.filter((b) => !b.classList.contains('is-estimated'))
    .every((b) => !/hatch/.test(paintOf(b))), 'a closed month is not hatched').toBe(true);
  const segments = [...container.querySelectorAll('line.ui-chart__line')];
  expect(segments).toHaveLength(3);
  expect(segments.filter((s) => s.classList.contains('is-estimated')),
    'the segment into the unfinished month is dashed').toHaveLength(1);
});

it('fades a bar towards the zero line only where the series asks for it', () => {
  const { container } = months();
  const fill = (id: string) => paintOf(container.querySelector(`rect.ui-chart__bar.ui-chart__tone--${id}`)!);
  expect(fill('good')).toMatch(/-fade-good-up\)$/);
  expect(fill('bad'), 'spend asked for no fade').toBe('');
  expect(container.querySelector('linearGradient')!.id).toMatch(/-fade-good-(up|down)$/);
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
    expect([...container.querySelectorAll('rect.ui-chart__bar')].map(toneOf))
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
    expect([...container.querySelectorAll('rect.ui-chart__bar')].map(toneOf))
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
  expect(container.querySelectorAll('rect.ui-chart__bar'), 'two values, two bars').toHaveLength(2);
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
  const up = svg.querySelector('rect.ui-chart__bar.ui-chart__tone--good')!;
  const down = svg.querySelector('rect.ui-chart__bar.ui-chart__tone--bad')!;
  const upBottom = Number(up.getAttribute('y')) + Number(up.getAttribute('height'));
  const downTop = Number(down.getAttribute('y'));
  expect(zeroY - upBottom, 'the bar above gives up its inset').toBeCloseTo(1.5, 1);
  expect(downTop - zeroY, 'the bar below gives up the same').toBeCloseTo(1.5, 1);
  for (const bar of svg.querySelectorAll('rect.ui-chart__bar')) {
    const top = Number(bar.getAttribute('y'));
    const bottom = top + Number(bar.getAttribute('height'));
    expect(Math.min(Math.abs(top - zeroY), Math.abs(bottom - zeroY)),
      `${bar.getAttribute('class')} reaches the zero line`).toBeGreaterThanOrEqual(1.4);
  }

  // So the line, its dots and every bar's own stroke are painted after it and
  // nothing of the chart's crosses them back.
  const kinds = [...svg.querySelectorAll('.ui-chart__zero, .ui-chart__bar, .ui-chart__line, .ui-chart__dot')]
    .map((el) => (el.classList.contains('ui-chart__zero') ? 'zero'
      : el.classList.contains('ui-chart__bar') ? 'bar'
        : el.classList.contains('ui-chart__line') ? 'line' : 'dot'));
  expect(kinds.indexOf('zero'), 'the zero line is a gridline again, under the marks').toBe(0);
  expect(kinds.lastIndexOf('zero')).toBe(0);
});

it('keeps a line series and its dot whole where they sit on zero', () => {
  // The case the review measured: a net series at break-even. Its segments and
  // its dot are the last things painted across that row.
  const flat = [0, 0, 0, 0];
  const { container } = render(
    <Chart title="Net" periods={periods}
      series={[{ id: 'income', name: 'Income', values: INCOME, tone: 'good' },
        { id: 'net', name: 'Net', values: flat, shape: 'line' }]} format={eur} />,
  );
  const svg = container.querySelector('.ui-chart__svg')!;
  const zeroY = Number(svg.querySelector('.ui-chart__zero')!.getAttribute('y1'));
  const dots = [...svg.querySelectorAll('circle.ui-chart__dot')];
  expect(dots).toHaveLength(4);
  for (const dot of dots) expect(Number(dot.getAttribute('cy'))).toBeCloseTo(zeroY, 1);
  const painted = [...svg.querySelectorAll('.ui-chart__zero, .ui-chart__line, .ui-chart__dot')]
    .map((el) => (el.classList.contains('ui-chart__zero') ? 'zero' : 'mark'));
  expect(painted[0], 'the zero line first').toBe('zero');
  expect(painted.slice(1).every((k) => k === 'mark'),
    'every segment and dot on the line is painted after it').toBe(true);
});

// The accent is a series now, so it cannot also mean "this one". The picked
// column is marked where no series is drawn — on its own label — with the shape
// the kit already gives a chosen thing: a rule the width of the column and the
// strong ink. Nothing is painted over a mark, which is what keeps every series
// measuring against the chart's own ground and nothing else.
it('marks the picked column on its label, and puts no hue on any mark', () => {
  const { container } = months({ selectable: true, selected: 3 });
  const svg = container.querySelector('.ui-chart__svg')!;
  expect(svg.querySelectorAll('.is-selected'), 'no mark carries the picked state').toHaveLength(0);
  const labels = [...container.querySelectorAll('.ui-chart__period')];
  expect(labels).toHaveLength(MONTHS.length);
  expect(labels.filter((el) => el.classList.contains('is-selected')).map((el) => el.textContent))
    .toEqual(['Apr']);

  const css = readRepo('../../src/styles/chart.css');
  const rule = /\.ui-chart__period\.is-selected\s*\{([^}]*)\}/.exec(css)![1];
  expect(rule, 'a rule the width of the column').toContain('border-top-color: var(--text)');
  expect(rule, 'and a weight, which is the half a reader gets without colour')
    .toMatch(/font-weight:\s*600/);
  expect(rule, 'the accent stays with the series').not.toContain('--accent');
  expect(/\.ui-chart__period\s*\{([^}]*)\}/.exec(css)![1],
    'every label reserves the rule, so picking one moves no row')
    .toContain('border-top: 2px solid transparent');
});

// Restyle 01 (#543): the axis keeps every label and the plot keeps one line.
it('draws one rule, on zero, and keeps every axis label beside it', () => {
  const { container } = months();
  const svg = container.querySelector('.ui-chart__svg')!;
  expect(svg.querySelectorAll('line.ui-chart__zero')).toHaveLength(1);
  expect(container.querySelectorAll('.ui-chart__tick').length,
    'the scale is still readable without its gridlines').toBeGreaterThan(1);
  const stroked = [...svg.querySelectorAll('line, rect, circle')]
    .map((el) => el.getAttribute('class') ?? '');
  expect(stroked.filter((c) => /ui-chart__grid\b/.test(c)), 'no gridline survives').toHaveLength(0);
  expect(readRepo('../../src/styles/chart.css'), 'and none is left to style')
    .not.toMatch(/\.ui-chart__grid\b/);
});

// A line now crosses bars of its own hue, where luminance alone does not separate
// them. The casing is the ground, the way the dots' rim already is.
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

it('a faded bar keeps its own tone at the zero line', () => {
  const { container } = months();
  const stops = [...container.querySelectorAll('linearGradient[id$="-up"] stop')];
  expect(stops.map((s) => s.getAttribute('offset'))).toEqual(['0', '0.8', '1']);
  expect(stops.map((s) => classOf(s)), 'solid at both ends, palest short of zero')
    .toEqual(['ui-chart__fade-far', 'ui-chart__fade-near', 'ui-chart__fade-far']);
  const css = readRepo('../../src/styles/chart.css');
  const near = /\.ui-chart__fade-near\s*\{([^}]*)\}/.exec(css)![1];
  expect(Number(/stop-opacity:\s*([\d.]+)/.exec(near)![1]),
    'the palest point still reads as the series, not as the card').toBeGreaterThanOrEqual(0.5);
});

it('draws the Estimated key in the tone of the series it describes, not in body ink', () => {
  const { container } = months();
  const key = [...container.querySelectorAll('.ui-chart__key')]
    .find((k) => k.textContent?.startsWith('Estimated'))!;
  expect(classOf(key), 'the key takes the tone of the unfinished bar it stands for')
    .toContain('ui-chart__tone--good');
  const css = readRepo('../../src/styles/chart.css');
  for (const name of ['key-estimated', 'key-hatch']) {
    const rule = new RegExp(`\\.ui-chart__${name}\\s*\\{([^}]*)\\}`).exec(css)![1];
    expect(rule, `${name} strokes the tone`).toContain('stroke: var(--ui-chart-tone)');
    expect(rule, `${name} draws no maximum-contrast outline`).not.toMatch(/var\(--(text|strong)\)/);
  }
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
