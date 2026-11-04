// The shape of a rule: AGENTS.md#the-guidelines-collection
import type { Meta, StoryObj } from '@storybook/react';
import type { ReactNode } from 'react';
import { FrameStrip, GuidelinePage, OpenReadout } from '../_guideline';
import { Card } from '../../react/src/primitives/Card';
import { Chart, type ChartLookSeries, type ChartPeriod } from '../../react/src/Chart';
import { KpiBand } from '../_kpi';
// @ts-expect-error -- plain JS story modules, read by the Node gates as well
import { loadGuideline } from './_markdown.js';
// @ts-expect-error -- plain JS story modules, read by the Node gates as well
import { ESTIMATED, SPEC_CSS, SPEND } from './_charts.js';

const content = await loadGuideline('charts.md', new URL('../../guidelines/charts.md', import.meta.url));

// Four months of made-up revenue for a made-up company. Four columns fit a phone
// picture at 390, so no plot scrolls.
const MONTHS = ['Aug 2025', 'Sep 2025', 'Oct 2025', 'Nov 2025'];
const REVENUE = [47930, 46820, 49300, 48210];
const EXPENSES = [32780, 33950, 34120, 31870];
const eur = (n: number) => `${n < 0 ? '−' : ''}€${Math.abs(n).toLocaleString('en-US')}`;
const PERIODS: ChartPeriod[] = MONTHS.map(label => ({ label }));
const TALL = [47930, 46820, 59400, 48210];
const SERIES = [{ id: 'revenue', name: 'Revenue', values: REVENUE }];

// Every readout below is the Chart's own, opened on October, the tallest bar.
// The page moves no readout: the Chart places each one itself.
const HOT = 'revenue-2';
const Months = ({ values = REVENUE, height }: { values?: number[]; height?: number }) =>
  <Chart title="Revenue by month, last 4 months" periods={PERIODS} series={[{ ...SERIES[0], values }]} format={eur}
    height={height} table={false} />;
const trend = (name: string, values: number[]) => ({ title: `${name}, last 4 months`, name, labels: MONTHS, values });

// The KPI band from the finance portal's overview, and the card under it: the
// one that moves when a readout is written into the page.
const Kpis = ({ id, line }: { id: string; line?: ReactNode }) => <div className="gh-stack">
  <KpiBand id={id} format={eur} basis="Change against October" stats={[
    { label: 'Revenue', value: eur(REVENUE[REVENUE.length - 1]), delta: { value: '−2.2%' }, trend: trend('Revenue', REVENUE) },
    { label: 'Expenses', value: eur(EXPENSES[EXPENSES.length - 1]), delta: { value: '−6.6%' }, trend: trend('Expenses', EXPENSES) }]} />
  {line}
  <Card title="Payouts"><p className="gh-figure">214</p></Card>
</div>;

// Eight weeks of made-up revenue in a sparkline: no point reachable but by pointing.
const WEEKLY = Array.from({ length: 8 }, (_, w) => Math.round(9100 + 1500 * Math.sin(w / 2) + w * 120));
const WEEKS: ChartPeriod[] = WEEKLY.map((_, w) => ({ label: `Week ${w + 1}` }));

// A tap opens the readout: two frames, a tap on September and then on November.
const Tapped = ({ mark }: { mark: string }) => <OpenReadout mark={mark}><Months height={120} /></OpenReadout>;

// Three months of made-up spend and income for the same portal, drawn as the
// kit's line chart and its month chart.
const Stage = ({ children }: { children: ReactNode }) => <div className="gh-stack">{children}</div>;
const QUARTER_MONTHS = ['Jan', 'Feb', 'Mar'];
const NET_BY_MONTH = [412, 455, 430];
const MONTH_PERIODS = QUARTER_MONTHS.map(label => ({ label }));
const MONTH_TITLE = 'Net settled by month, first quarter of the year, thousands of euros';
const MONTH_SERIES = [{ id: 'net', name: 'Net settled', values: NET_BY_MONTH }];
const thousands = (n: number) => `${n}k €`;
// The kit's month chart. In a titled card its Chart and Table switch joins the
// card's title row.
const MonthBlock = () => <Card title="Net settled by month">
  <Chart title={MONTH_TITLE} periods={MONTH_PERIODS} series={MONTH_SERIES} format={thousands} />
</Card>;

// The kit's line chart. `legend` draws the key that names the lines. The labels
// look adds each line's last value at its end, and the thin look writes no value.
const SPEND_SERIES: ChartLookSeries[] = [
  { id: 'spend', name: 'Spend', tone: 'accent', values: SPEND }, { id: 'estimated', name: 'Estimated', tone: 'accent-soft', values: ESTIMATED }];
const INCOME_SERIES: ChartLookSeries[] = [
  { id: 'revenue', name: 'Revenue', tone: 'accent', values: [46.2, 45.1, 47.9] },
  { id: 'expenses', name: 'Expenses', tone: 'accent-soft', values: [32.9, 33.4, 32.8] },
];
const ALL_SERIES: ChartLookSeries[] = [...SPEND_SERIES, { ...INCOME_SERIES[0], tone: 'warn' }, { ...INCOME_SERIES[1], tone: 'info' }];
const LINE_PERIODS = QUARTER_MONTHS.map(month => ({ label: `${month} 2026`, short: month }));
const kEur = (n: number) => `${n.toFixed(1)}k €`;
// Two past years over one quarter: the shape is the point, and no one value is.
const SEASON_SERIES: ChartLookSeries[] = [
  { id: 'y2024', name: '2024', tone: 'accent-soft', values: [15.1, 15.8, 17.2] },
  { id: 'y2025', name: '2025', tone: 'accent', values: [16.4, 17.0, 18.8] },
];
const QUARTER = QUARTER_MONTHS.map(month => ({ label: month, short: month }));
const LineCard = ({ title, sub, series, look = 'labels', legend = false, span = 'first quarter of 2026', periods = LINE_PERIODS }:
  { title: string; sub?: string; series: ChartLookSeries[]; look?: 'thin' | 'labels'; legend?: boolean; span?: string; periods?: typeof LINE_PERIODS }) =>
  <Card title={title} sub={sub}>
    <Chart variant="line" look={look} legend={legend} title={`${title}, ${span}, thousands of euros`}
      periods={periods} series={series} format={kEur} />
  </Card>;

const specimens = [
  { id: 'two-lines-at-most',
    do: () => <Stage><LineCard title="Spend against estimate" series={SPEND_SERIES} legend />
      <LineCard title="Revenue against expenses" series={INCOME_SERIES} legend /></Stage>,
    dont: () => <Stage><LineCard title="Spend and income" series={ALL_SERIES} look="thin" legend /></Stage> },
  { id: 'value-not-legend',
    do: () => <Stage><LineCard title="Spend against estimate" series={SPEND_SERIES} legend />
      <LineCard title="Seasonal spend" series={SEASON_SERIES} look="thin" legend span="first quarter of each year" periods={QUARTER} /></Stage> },
  // The chart's own title still names the span: it is read aloud, never drawn.
  { id: 'no-range-on-chart',
    do: () => <Stage><LineCard title="Spend against estimate" series={SPEND_SERIES} legend /></Stage>,
    dont: () => <Stage><LineCard title="Spend against estimate" sub="First quarter of 2026" series={SPEND_SERIES} legend /></Stage> },
  { id: 'overlay',
    // The pointed month replaces the Revenue figure, in the room the figure had.
    do: () => <OpenReadout mark="trend-2"><Kpis id="gh-overlay-do" /></OpenReadout>,
    dont: () => <Kpis id="gh-overlay-dont" line={<p className="gh-inline">{`Oct 2025: ${eur(REVENUE[2])}, +5.3% on Sep`}</p>} /> },
  // A region that hides its overflow. October nearly reaches the top line, so the room
  // above it is shorter than the readout's first two lines.
  { id: 'above-the-mark',
    do: () => <div className="gh-clip"><OpenReadout mark={HOT}><Months values={TALL} /></OpenReadout></div> },
  { id: 'contents',
    do: () => <OpenReadout mark={HOT}><Months /></OpenReadout> },
  { id: 'on-touch',
    do: () => <FrameStrip frames={[{ step: 'Tap a bar', picture: <Tapped mark="revenue-1" /> },
      { step: 'Tap another bar', picture: <Tapped mark="revenue-3" /> }]} /> },
  { id: 'chart-table-switch',
    do: () => <Stage><MonthBlock /></Stage> },
  // The ring is on the chart, not on a bar: the Chart is one tab stop, and its
  // table switch sits in the card's title row.
  { id: 'not-only-hover',
    do: () => <Card title="Revenue"><p className="gh-figure">{eur(REVENUE[REVENUE.length - 1])}</p>
      <div className="gl-focus"><OpenReadout mark={HOT}>
        <Chart title="Revenue by month, last 4 months" periods={PERIODS} series={SERIES} format={eur} />
      </OpenReadout></div></Card>,
    dont: () => <Card title="Revenue">
      <Chart variant="spark" title="Revenue by week, last 8 weeks" periods={WEEKS}
        series={[{ ...SERIES[0], values: WEEKLY, shape: 'line' }]} format={eur} />
    </Card> },
];

const meta: Meta = { title: 'Guidelines/Charts', parameters: { layout: 'fullscreen' } };
export default meta;

export const Charts: StoryObj = {
  name: 'Charts',
  render: () => <GuidelinePage content={content} specimens={specimens} css={SPEC_CSS} />,
};
