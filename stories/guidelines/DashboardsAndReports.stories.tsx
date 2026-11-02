// The shape of a rule and the gates that walk this page: docs/components.md
import type { Meta, StoryObj } from '@storybook/react';
import { useEffect, useRef, type ReactNode } from 'react';
import { GuidelinePage, noop } from '../_guideline';
import { Badge } from '../../react/src/primitives/Badge';
import { Button } from '../../react/src/primitives/Button';
import { Card } from '../../react/src/primitives/Card';
import { StatBand } from '../../react/src/primitives/StatBand';
import { FilterBar } from '../../react/src/FilterBar';
import { Segmented } from '../../react/src/Segmented';
import { RestingFilters } from '../_table-filters';
import { Chart, type ChartLookSeries } from '../../react/src/Chart';
// @ts-expect-error -- plain JS story modules, read by the Node gates as well
import { loadGuideline } from './_markdown.js';
// @ts-expect-error -- plain JS story modules, read by the Node gates as well
import { ESTIMATED, LEDGER, SPEC_CSS, SPEND } from './_dashboards-and-reports.js';
// @ts-expect-error -- plain JS story modules, read by the Node gates as well
import { payoutHref } from '../apps/_finance-nav.js';
// @ts-expect-error -- plain JS story modules, read by the Node gates as well
import { cashflowStats, PERIODS as SPANS } from '../apps/_finance-data.js';
import { CashflowTrend, type Trend } from '../apps/_cashflow-trend';

const content = await loadGuideline('dashboards-and-reports.md', new URL('../../guidelines/dashboards-and-reports.md', import.meta.url));

// One made-up portal supplies every specimen, and the Finance report showcase
// prints the same payouts with the same nets: the ledger is the one
// LEDGER export that stories/dashboard-report-refs.test.js holds in step.
const Stage = ({ children }: { children: ReactNode }) => <div className="gd-stage">{children}</div>;
type Tone = 'success' | 'pending' | 'danger';

// Cashflow for the year, from the dashboard's own call, so a specimen cannot drift
// from the showcase it draws. Two figures, because a specimen cell is under 28rem.
type Figure = { label: string; value: string; delta: { value: string; tone?: 'good' | 'bad' }; trend: Trend };
const Cashflow = ({ id }: { id: string }) => <StatBand id={id} stats={(cashflowStats('1Y', true) as Figure[]).slice(0, 2)
  .map(figure => ({ ...figure, delta: { ...figure.delta, basis: 'vs prior year' }, trend: <CashflowTrend trend={figure.trend} /> }))} />;

const LedgerTable = () => <table className="ui-table ui-table--dense ui-table--zebra">
  <thead><tr><th>Reference</th><th className="ui-table__num">Net (EUR)</th><th>Status</th></tr></thead>
  <tbody>{(LEDGER as string[][]).map(([ref, , , net, tone, label]) => <tr key={ref}>
    <td>{ref}</td><td className="ui-table__num ui-table__num--strong">{net}</td>
    <td><Badge variant={tone}>{label}</Badge></td>
  </tr>)}</tbody>
</table>;

// The rows that need a decision, which is all a dashboard carries of a ledger.
// `onward={false}` removes the row links, so the Don't offers no way in. Its filter
// bar sits directly above it, as on the dashboard.
const EXCEPTIONS: [string, string, Tone, string][] = [
  ['PO-1166', '14,496.62', 'danger', 'Failed'],
  ['PO-1164', '14,082.69', 'pending', 'In transit'],
  ['PO-1159', '2,180.00', 'danger', 'Unmatched'],
];
const Attention = ({ onward = true }: { onward?: boolean }) => <><RestingFilters search="Search exceptions" placeholder="Reference"
  label="Exception filters" chips={[{ id: 'status', label: 'Status', any: 'Any status', values: ['Failed', 'In transit', 'Unmatched'] }]} />
<Card title="Needs a decision">
  <table className="ui-table ui-table--dense">
    <thead><tr><th>Reference</th><th className="ui-table__num">Net (EUR)</th></tr></thead>
    <tbody>{EXCEPTIONS.map(([ref, net, tone, label]) => <tr key={ref}>
      <td><span className="ui-table__pair">{onward ? <a href={payoutHref(ref)}>{ref}</a> : ref}<Badge variant={tone}>{label}</Badge></span></td>
      <td className="ui-table__num ui-table__num--strong">{net}</td>
    </tr>)}</tbody>
  </table>
</Card></>;
// The whole ledger, under the bar every table has.
const LedgerFilters = () => <RestingFilters search="Search payouts" placeholder="Reference" label="Payout filters"
  chips={[{ id: 'status', label: 'Status', any: 'Any status', values: ['Paid', 'In transit', 'Failed'] }]} />;

const MONTHS = ['Jan', 'Feb', 'Mar'];
const NET_BY_MONTH = [412, 455, 430];
const MONTH_PERIODS = MONTHS.map(label => ({ label }));
const MONTH_TITLE = 'Net settled by month, first quarter of the year, thousands of euros';
const MONTH_SERIES = [{ id: 'net', name: 'Net settled', values: NET_BY_MONTH }];
const thousands = (n: number) => `${n}k €`;
// The kit's month chart. In a titled card its Chart and Table switch joins the
// card's title row. `view="table"` presses the Table button once, as a reader would.
const MonthBlock = ({ view = 'chart' }: { view?: 'chart' | 'table' }) => {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (view === 'table') root.current?.querySelector<HTMLButtonElement>('button[aria-label="Table"]')?.click();
  }, [view]);
  return <div ref={root}><Card title="Net settled by month">
    <Chart title={MONTH_TITLE} periods={MONTH_PERIODS} series={MONTH_SERIES} format={thousands} />
  </Card></div>;
};
const MonthTable = () => (
  // No filter bar: the chart's Table view holds only the chart's own points. why: guidelines/dense-tables.md#give-every-table-its-filter-bar
  <table className="ui-table ui-table--dense">
    <thead><tr><th>Month</th><th className="ui-table__num">Net settled (k €)</th></tr></thead>
    <tbody>{MONTHS.map((month, i) => <tr key={month}><td>{month}</td><td className="ui-table__num ui-table__num--strong">{NET_BY_MONTH[i]}</td></tr>)}</tbody>
  </table>
);

// The kit's line chart. `legend` draws the key that names the lines. The labels
// look adds each line's last value at its end, and the thin look writes no value.
const SPEND_SERIES: ChartLookSeries[] = [
  { id: 'spend', name: 'Spend', tone: 'accent', values: SPEND }, { id: 'estimated', name: 'Estimated', tone: 'accent-soft', values: ESTIMATED }];
const INCOME_SERIES: ChartLookSeries[] = [
  { id: 'revenue', name: 'Revenue', tone: 'accent', values: [46.2, 45.1, 47.9] },
  { id: 'expenses', name: 'Expenses', tone: 'accent-soft', values: [32.9, 33.4, 32.8] },
];
const ALL_SERIES: ChartLookSeries[] = [...SPEND_SERIES, { ...INCOME_SERIES[0], tone: 'warn' }, { ...INCOME_SERIES[1], tone: 'info' }];
const PERIODS = MONTHS.map(month => ({ label: `${month} 2026`, short: month }));
const kEur = (n: number) => `${n.toFixed(1)}k €`;
// Two past years over one quarter: the shape is the point, and no one value is.
const SEASON_SERIES: ChartLookSeries[] = [
  { id: 'y2024', name: '2024', tone: 'accent-soft', values: [15.1, 15.8, 17.2] },
  { id: 'y2025', name: '2025', tone: 'accent', values: [16.4, 17.0, 18.8] },
];
const QUARTER = MONTHS.map(month => ({ label: month, short: month }));
const LineCard = ({ title, sub, series, look = 'labels', legend = false, span = 'first quarter of 2026', periods = PERIODS }:
  { title: string; sub?: string; series: ChartLookSeries[]; look?: 'thin' | 'labels'; legend?: boolean; span?: string; periods?: typeof PERIODS }) =>
  <Card title={title} sub={sub}>
    <Chart variant="line" look={look} legend={legend} title={`${title}, ${span}, thousands of euros`}
      periods={periods} series={series} format={kEur} />
  </Card>;

// Offered, not applied: the rows below are every payout, so no chip may read as
// a value a reader would then look for in the table.
const FILTERS = [
  { id: 'status', label: 'Status', items: [{ label: 'Any status', value: '' }, { label: 'Paid', value: 'Paid' }, { label: 'In transit', value: 'In transit' }, { label: 'Failed', value: 'Failed' }] },
  { id: 'currency', label: 'Currency', items: [{ label: 'Any currency', value: '' }, { label: 'EUR', value: 'EUR' }, { label: 'USD', value: 'USD' }] },
];

// A laptop screen, scaled to a cell: the frame's bottom edge is the fold, and a
// block past it is cut where a reader stops reading.
const Screen = ({ fold = false, children }: { fold?: boolean; children: ReactNode }) => <div className={`gd-screen${fold ? ' gd-screen--fold' : ''}`}>
  <Segmented label="Period" options={(SPANS as string[]).map(p => ({ label: p, value: p }))} value="1Y" onChange={noop} />
  {children}
</div>;

const specimens = [
  { id: 'fast-glance',
    do: () => <Screen><Cashflow id="gd-fold-do" /><Attention /></Screen>,
    dont: () => <Screen fold><Cashflow id="gd-fold-dont" /><MonthBlock /><LineCard title="Spend against estimate" series={SPEND_SERIES} legend /><Attention /></Screen> },
  { id: 'figures-and-exceptions',
    do: () => <Stage><Cashflow id="gd-glance-do" /><Attention /></Stage>,
    dont: () => <Stage><LedgerFilters /><Card title="Payouts"><LedgerTable /><p className="ui-card__sub">{'Fees rose with volume this quarter, and the one\n        unmatched transfer from June is still with the bank.'}</p></Card></Stage> },
  { id: 'link-to-the-report', do: () => <Stage><Attention /></Stage>, dont: () => <Stage><Attention onward={false} /></Stage> },
  { id: 'report-depth',
    do: () => <Stage><LedgerFilters /><Card title="Payouts"><LedgerTable /></Card></Stage>,
    dont: () => <Stage><StatBand id="gd-depth-dont" stats={[
      { label: 'Payouts', value: '214' }, { label: 'Fees', value: '68,412.00 €' }, { label: 'Net', value: '3,118,904.00 €' }]} /></Stage> },
  // The export is at the far end of the row, where the report puts it: it acts on
  // the ledger, and the filters narrow it. The Don't carries the period in its
  // title, which is what "fixed by whoever built the page" looks like on a screen.
  { id: 'report-offers',
    do: () => <Stage><div className="ui-toolbar ui-toolbar--split">
      <FilterBar filters={FILTERS} label="Payout filters" clearLabel="Clear all" onRemove={noop} onClear={noop} onChange={noop} />
      <Button icon="download" iconOnly>Export rows</Button>
    </div><Card title="Payouts"><LedgerTable /></Card></Stage>,
    dont: () => <Stage><Card title="Payouts, 2026"><LedgerTable /></Card></Stage> },
  // "Download PDF" does not start with "Export", so export-at-the-row-end does not count this row.
  { id: 'export-icon',
    do: () => <Stage><div className="ui-toolbar ui-toolbar--split">
      <FilterBar filters={FILTERS} label="Report filters" clearLabel="Clear all" onRemove={noop} onClear={noop} onChange={noop} />
      <Button icon="download" iconOnly>Download PDF</Button>
    </div></Stage>,
    dont: () => <Stage><div className="ui-toolbar ui-toolbar--split">
      <FilterBar filters={FILTERS} label="Report filters" clearLabel="Clear all" onRemove={noop} onClear={noop} onChange={noop} />
      <Button icon="download">Download PDF</Button>
    </div></Stage> },
  { id: 'chart-table-switch',
    do: () => <Stage><MonthBlock /><MonthBlock view="table" /></Stage>,
    dont: () => <Stage><Card title="Net settled by month"><Chart title={MONTH_TITLE} periods={MONTH_PERIODS} series={MONTH_SERIES} format={thousands} table={false} /><MonthTable /></Card></Stage> },
  // The chart's own title still names the span: it is read aloud, never drawn.
  { id: 'no-range-on-chart',
    do: () => <Stage><LineCard title="Spend against estimate" series={SPEND_SERIES} legend /></Stage>,
    dont: () => <Stage><LineCard title="Spend against estimate" sub="First quarter of 2026" series={SPEND_SERIES} legend /></Stage> },
  { id: 'value-not-legend',
    do: () => <Stage><LineCard title="Spend against estimate" series={SPEND_SERIES} legend />
      <LineCard title="Seasonal spend" series={SEASON_SERIES} look="thin" legend span="first quarter of each year" periods={QUARTER} /></Stage>,
    dont: () => <Stage><LineCard title="Spend against estimate" series={SPEND_SERIES} look="thin" legend /></Stage> },
  { id: 'two-lines-at-most',
    do: () => <Stage><LineCard title="Spend against estimate" series={SPEND_SERIES} legend />
      <LineCard title="Revenue against expenses" series={INCOME_SERIES} legend /></Stage>,
    dont: () => <Stage><LineCard title="Spend and income" series={ALL_SERIES} look="thin" legend /></Stage> },
];

const meta: Meta = { title: 'Guidelines/Dashboards and reports', parameters: { layout: 'fullscreen' } };
export default meta;

export const DashboardsAndReports: StoryObj = {
  name: 'Dashboards and reports',
  render: () => <GuidelinePage content={content} specimens={specimens} css={SPEC_CSS} />,
};
