// What the chart owes a reader who cannot see it, and a reader who can only
// point at it.
//
// Limits. JSDOM has no layout: every rect is zero, so the readout's PLACEMENT is
// not measured here (its arithmetic is react/src/tip.ts, exercised through
// Tooltip.test.tsx's mocked geometry), the plot falls back to its unmeasured
// column width, and the scroll fade is checked as the class the scroll handler
// writes rather than as a painted gradient. Nothing here measures contrast
// (react/src/contrast.test.tsx), the hatch, the fade gradient or the focus ring
// as painted; the browser captures on the pull request carry those. Screen-reader
// speech is not run — the live region's text is read from the DOM.
import { describe, expect, it, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Chart, type ChartPeriod, type ChartSeries } from './Chart';

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

it('is one tab stop, and every focusable part takes the kit ring', () => {
  const { container } = months();
  const stops = [...container.querySelectorAll('[tabindex], summary, a, button, input')];
  expect(stops.map(classOf)).toEqual(['ui-chart__frame ui-tip-host ui-focusable', 'ui-focusable']);
  const base = readRepo('../../src/styles/base.css');
  const ring = /\.ui-focusable:focus-visible[^{]*\{([^}]*)\}/.exec(base)![1];
  expect(ring, 'the kit ring, not the browser outline').toMatch(/box-shadow:\s*var\(--ring\)/);
  expect(ring, 'a real outline survives forced colours').toMatch(/outline:\s*2px solid transparent/);
  expect(readRepo('../../src/styles/chart.css'), 'the chart declares no outline of its own, so nothing reverts to the browser\'s')
    .not.toMatch(/outline\s*:/);
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
