// The shape of a rule and the gates that walk this page: docs/components.md
import type { Meta, StoryObj } from '@storybook/react';
import { useId, useState, type ReactNode } from 'react';
import { segmentedNextIndex } from '@apliteni/apliteni-ui';
import { GuidelinePage, Raw, noop } from '../_guideline';
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
import { salesHref } from '../apps/_finance-nav.js';
// @ts-expect-error -- plain JS story modules, read by the Node gates as well
import { cashflowStats } from '../apps/_finance-data.js';

const content = await loadGuideline('dashboards-and-reports.md', new URL('../../guidelines/dashboards-and-reports.md', import.meta.url));

// One made-up portal supplies every specimen, and the Report showcase
// prints the same sales with the same fees and nets: the ledger is the one
// LEDGER export that stories/dashboard-report-refs.test.js holds in step.
const Stage = ({ children }: { children: ReactNode }) => <div className="gd-stage">{children}</div>;
type Tone = 'success' | 'pending' | 'danger';

// Cashflow for the year, from the dashboard's own call, so a specimen cannot drift
// from the showcase it draws. Two figures, because a specimen cell is under 28rem.
type Figure = { label: string; value: string; delta: { value: string; tone?: 'good' | 'bad' }; trend: string };
const Cashflow = ({ id }: { id: string }) => <StatBand id={id} stats={(cashflowStats('1Y', true) as Figure[]).slice(0, 2)
  .map(figure => ({ ...figure, delta: { ...figure.delta, basis: 'vs prior year' }, trend: <Raw html={figure.trend} /> }))} />;

const LedgerTable = ({ label = 'Sales' }: { label?: string }) => <div className="ui-table-scroll" role="region" aria-label={label} tabIndex={0}>
  <table className="ui-table ui-table--dense ui-table--zebra">
    <thead><tr><th>Reference</th><th className="ui-table__num">Fees</th><th className="ui-table__num">Net (EUR)</th><th>Status</th></tr></thead>
    <tbody>{(LEDGER as string[][]).map(([ref, , fees, net, tone, label]) => <tr key={ref}>
      <td>{ref}</td><td className="ui-table__num">{fees}</td><td className="ui-table__num ui-table__num--strong">{net}</td>
      <td><Badge variant={tone}>{label}</Badge></td>
    </tr>)}</tbody>
  </table>
</div>;

// The rows that need a decision, which is all a dashboard carries of a ledger.
// `onward={false}` removes the row links, so the Don't offers no way in. Its filter
// bar sits directly above it, as on the dashboard.
const EXCEPTIONS: [string, string, Tone, string][] = [
  ['SAL-1046', '14,496.62', 'danger', 'Failed'],
  ['SAL-1044', '14,082.69', 'pending', 'Pending'],
  ['SAL-1039', '2,180.00', 'danger', 'Refunded'],
];
const Attention = ({ onward = true }: { onward?: boolean }) => <div className="ui-card-stack"><RestingFilters search="Search exceptions" placeholder="Reference"
  label="Exception filters" chips={[{ id: 'status', label: 'Status', any: 'Any status', values: ['Failed', 'Pending', 'Refunded'] }]} />
<Card title="Needs a decision">
  <table className="ui-table ui-table--dense">
    <thead><tr><th>Reference</th><th className="ui-table__num">Net (EUR)</th></tr></thead>
    <tbody>{EXCEPTIONS.map(([ref, net, tone, label]) => <tr key={ref}>
      <td><span className="ui-table__pair">{onward ? <a href={salesHref(ref)}>{ref}</a> : ref}<Badge variant={tone}>{label}</Badge></span></td>
      <td className="ui-table__num ui-table__num--strong">{net}</td>
    </tr>)}</tbody>
  </table>
</Card></div>;
// The whole ledger, under the bar every long table has.
const LedgerFilters = () => <RestingFilters search="Search sales" placeholder="Reference" label="Sale filters"
  chips={[{ id: 'status', label: 'Status', any: 'Any status', values: ['Paid', 'Pending', 'Failed'] }]} />;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
const NET_BY_MONTH = [412, 455, 430, 498, 520, 505];
// The kit's months chart draws the bar and its month under it, so the page keeps
// one bar style across the switch and the label specimens.
const netK = (n: number) => `${n}k €`;
// The chart's title is never drawn, so each specimen names itself distinctly for
// a reader listing the landmarks, without changing what the page shows. The
// months, their net and the span are the caller's, so the chart-table-switch Do
// can name the first four months and keep every bar labelled on the narrowest phone.
const periodsOf = (months: string[]) => months.map(month => ({ label: `${month} 2026`, short: month }));
const MonthChart = ({ months = MONTHS, net = NET_BY_MONTH, span = 'first half of the year', chartLabel }:
  { months?: string[]; net?: number[]; span?: string; chartLabel?: string }) => <Chart variant="months"
  title={`Net settled by month, ${span}${chartLabel ? `, ${chartLabel}` : ''}`}
  periods={periodsOf(months)} series={[{ id: 'net', name: 'Net settled', values: net, tone: 'accent' }]}
  format={netK} table={false} />;
const MonthTable = ({ months = MONTHS, net = NET_BY_MONTH }: { months?: string[]; net?: number[] }) => (
  // No filter bar: the chart's Table view holds only the chart's own points. why: guidelines/dense-tables.md#give-a-long-table-its-filter-bar
  <table className="ui-table ui-table--dense">
    <thead><tr><th>Month</th><th className="ui-table__num">Net settled (k €)</th></tr></thead>
    <tbody>{months.map((month, i) => <tr key={month}><td>{month}</td><td className="ui-table__num ui-table__num--strong">{net[i]}</td></tr>)}</tbody>
  </table>
);

// One block, one view at a time: the switch shares the title's row and opens on Chart.
// Small underline tabs, not pills — the neutral form is the default, the way the Chart
// component's own switch draws: a view switch keeps off the page's accent.
// Table replaces the chart, so each view is a panel: the kit's underline strip with
// tab roles, because the kit's Tabs cannot sit in a block's title row.
// The wrapper keeps the row's baseline, which the strip's own stretch would drop.
// The table's panel is the kit's scroll box, which keeps the dense table's bleed to the card edge.
const VIEWS = [{ label: 'Chart', value: 'chart', box: 'ui-tabs__panel' },
  { label: 'Table', value: 'table', box: 'ui-table-scroll ui-tabs__panel' }];
const MonthBlock = ({ view: initial, chartLabel, months, net, span }:
  { view: string; chartLabel?: string; months?: string[]; net?: number[]; span?: string }) => {
  const [view, setView] = useState(initial);
  const id = useId();
  // The panel closes over this block's chart label, so each specimen names itself.
  const panels = [<MonthChart chartLabel={chartLabel} months={months} net={net} span={span} />,
    <MonthTable months={months} net={net} />];
  return <Card><div className="gd-block-head">
    <h3 className="ui-card__title">Net settled by month</h3>
    <div><div className="ui-seg ui-seg--sm ui-seg--underline" role="tablist" aria-label="Net settled by month view">
      {VIEWS.map((option, i) => <button key={option.value} type="button" role="tab" id={`${id}-tab-${i}`} aria-controls={`${id}-panel-${i}`}
        className={option.value === view ? 'is-active' : undefined} aria-selected={option.value === view} tabIndex={option.value === view ? 0 : -1}
        onClick={() => setView(option.value)} onKeyDown={e => {
          const next = segmentedNextIndex(e.key, i, VIEWS.length);
          if (next == null) return;
          e.preventDefault();
          (e.currentTarget.parentElement!.children[next] as HTMLButtonElement).focus(); setView(VIEWS[next].value);
        }}>{option.label}</button>)}
    </div></div>
  </div>{VIEWS.map((option, i) => <div key={option.value} className={option.box} role="tabpanel" id={`${id}-panel-${i}`}
    aria-labelledby={`${id}-tab-${i}`} tabIndex={0} hidden={option.value !== view}>{option.value === view ? panels[i] : null}</div>)}</Card>;
};

// The kit's line chart. `legend` draws the key that names the lines. The labels
// look adds each line's last value at its end, and the thin look writes no value.
const SPEND_SERIES: ChartLookSeries[] = [
  { id: 'spend', name: 'Spend', tone: 'accent', values: SPEND }, { id: 'estimated', name: 'Estimated', tone: 'accent-soft', values: ESTIMATED }];
const INCOME_SERIES: ChartLookSeries[] = [
  { id: 'revenue', name: 'Revenue', tone: 'accent', values: [46.2, 45.1, 47.9, 46.8, 49.3, 48.2] },
  { id: 'expenses', name: 'Expenses', tone: 'accent-soft', values: [32.9, 33.4, 32.8, 34.0, 34.1, 31.9] },
];
const ALL_SERIES: ChartLookSeries[] = [...SPEND_SERIES, { ...INCOME_SERIES[0], tone: 'warn' }, { ...INCOME_SERIES[1], tone: 'info' }];
const PERIODS = periodsOf(MONTHS);
const kEur = (n: number) => `${n.toFixed(1)}k €`;
// Two past years over one half year: the shape is the point, and no one value is.
const SEASON_SERIES: ChartLookSeries[] = [
  { id: 'y2024', name: '2024', tone: 'accent-soft', values: [15.1, 15.8, 17.2, 16.6, 18.0, 18.9] },
  { id: 'y2025', name: '2025', tone: 'accent', values: [16.4, 17.0, 18.8, 18.1, 19.7, 20.6] },
];
const HALF_YEAR = MONTHS.map(month => ({ label: month, short: month }));
const LineCard = ({ title, sub, series, look = 'labels', legend = false, span = 'first half of 2026', periods = PERIODS, chartLabel }:
  { title: string; sub?: string; series: ChartLookSeries[]; look?: 'thin' | 'labels'; legend?: boolean; span?: string; periods?: typeof PERIODS; chartLabel?: string }) =>
  <Card title={title} sub={sub}>
    <Chart variant="line" look={look} legend={legend}
      title={`${title}, ${span}, thousands of euros${chartLabel ? `, ${chartLabel}` : ''}`}
      periods={periods} series={series} format={kEur} />
  </Card>;

// Offered, not applied: the rows below are every sale, so no chip may read as
// a value a reader would then look for in the table.
const FILTERS = [
  { id: 'status', label: 'Status', items: [{ label: 'Any status', value: '' }, { label: 'Paid', value: 'Paid' }, { label: 'Pending', value: 'Pending' }, { label: 'Failed', value: 'Failed' }] },
  { id: 'currency', label: 'Currency', items: [{ label: 'Any currency', value: '' }, { label: 'EUR', value: 'EUR' }, { label: 'USD', value: 'USD' }] },
];

// A wrapper, so the stage's column does not stretch the control across the cell.
const Period = () => <div><Segmented label="Period" size="sm" value="1Y" onChange={noop}
  options={['1M', '3M', '1Y'].map(label => ({ label, value: label }))} /></div>;

// The narrow-card months chart for the bar-labels rule: one fabricated net per
// region, with a distinct short name under each bar. The Don't gives no short
// name, so the 20-character labels step and leave bars unnamed. Both halves
// keep the same phone card width, so the one difference is the short name.
const REGION_LABELS = ['North region revenue', 'South region revenue', 'North region refunds',
  'South region refunds', 'North region balance', 'South region balance'];
const REGION_SHORT = ['N rev', 'S rev', 'N ref', 'S ref', 'N bal', 'S bal'];
const REGION_NET = [48.2, 39.1, -6.4, -7.1, 41.8, 32.0];
const RegionNetCard = ({ short = false }: { short?: boolean }) => (
  <div style={{ maxWidth: 'var(--panel-sm)' }}>
    <Card title="Net by region" level={3}>
      <Chart title={short ? 'Net by region, six bars, short names' : 'Net by region, six bars, full names'}
        periods={REGION_LABELS.map((label, i) => ({
        label, compare: false, ...(short ? { short: REGION_SHORT[i] } : {}),
      }))} series={[{ id: 'net', name: 'Net', values: REGION_NET, tone: 'info' }]} format={kEur} />
    </Card>
  </div>
);

const specimens = [
  // The figures are a year, so the period control stands on 1Y. The Don't puts
  // three blocks between the figures and the exceptions, and the note says where
  // the first screen ends, which a picture in a page cannot.
  { id: 'fast-glance',
    do: () => <Stage><Period /><Cashflow id="gd-fast-do" /><Attention /></Stage>,
    dont: () => <Stage><Period /><Cashflow id="gd-fast-dont" /><MonthBlock view="chart" chartLabel="below the fold" />
      <LineCard title="Spend against estimate" series={SPEND_SERIES} legend chartLabel="long page" />
      <LineCard title="Revenue against expenses" series={INCOME_SERIES} legend chartLabel="long page" />
      <div className="gl-cursor">The first screen has ended. The exceptions start here</div><Attention /></Stage> },
  { id: 'figures-and-exceptions',
    do: () => <Stage><Cashflow id="gd-glance-do" /><Attention /></Stage>,
    dont: () => <Stage><div className="ui-card-stack"><LedgerFilters /><Card title="Sales"><LedgerTable label="Sales ledger" /><p className="ui-card__sub">{'Fees rose with volume this quarter, and the one\n        refund from June is still with the bank.'}</p></Card></div></Stage> },
  { id: 'soft-lines-between-blocks',
    do: () => <Stage><Cashflow id="gd-soft-do" /></Stage>,
    dont: () => <Stage><div className="gd-no-lines"><Cashflow id="gd-soft-dont" /></div></Stage> },
  { id: 'link-to-the-report', do: () => <Stage><Attention /></Stage>, dont: () => <Stage><Attention onward={false} /></Stage> },
  { id: 'report-depth',
    do: () => <Stage><div className="ui-card-stack"><LedgerFilters /><Card title="Sales"><LedgerTable label="Sales report rows" /></Card></div></Stage>,
    dont: () => <Stage><StatBand id="gd-depth-dont" stats={[
      { label: 'Sales', value: '214' }, { label: 'Fees', value: '68,412.00 €' }, { label: 'Net', value: '3,118,904.00 €' }]} /></Stage> },
  // The export is at the far end of the row, where the report puts it: it acts on
  // the ledger, and the filters narrow it. The Don't carries the period in its
  // title, which is what "fixed by whoever built the page" looks like on a screen.
  { id: 'report-offers',
    do: () => <Stage><div className="ui-card-stack"><div className="ui-toolbar ui-toolbar--split">
      <FilterBar filters={FILTERS} label="Sale filters" clearLabel="Clear all" onRemove={noop} onClear={noop} onChange={noop} />
      <Button icon="download" iconOnly>Export rows</Button>
    </div><Card title="Sales"><LedgerTable label="Sales with filters" /></Card></div></Stage>,
    dont: () => <Stage><Card title="Sales, 2026"><LedgerTable label="Sales, 2026" /></Card></Stage> },
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
    do: () => <Stage>
      <MonthBlock view="chart" chartLabel="chart view" months={MONTHS.slice(0, 4)} net={NET_BY_MONTH.slice(0, 4)} span="first four months of the year" />
      <MonthBlock view="table" months={MONTHS.slice(0, 4)} net={NET_BY_MONTH.slice(0, 4)} span="first four months of the year" />
    </Stage>,
    dont: () => <Stage><Card title="Net settled by month" level={3}><div className="gd-chart"><MonthChart chartLabel="stacked, no switch" /></div><MonthTable /></Card></Stage> },
  // The chart's own title still names the span: it is read aloud, never drawn.
  { id: 'no-range-on-chart',
    do: () => <Stage><LineCard title="Spend against estimate" series={SPEND_SERIES} legend chartLabel="no range" /></Stage>,
    dont: () => <Stage><LineCard title="Spend against estimate" sub="First half of 2026" series={SPEND_SERIES} legend chartLabel="range in subtitle" /></Stage> },
  { id: 'value-not-legend',
    do: () => <Stage><LineCard title="Spend against estimate" series={SPEND_SERIES} legend chartLabel="with values" />
      <LineCard title="Seasonal spend" series={SEASON_SERIES} look="thin" legend span="first half of each year" periods={HALF_YEAR} /></Stage>,
    dont: () => <Stage><LineCard title="Spend against estimate" series={SPEND_SERIES} look="thin" legend chartLabel="key only" /></Stage> },
  { id: 'two-lines-at-most',
    do: () => <Stage><LineCard title="Spend against estimate" series={SPEND_SERIES} legend chartLabel="two lines" />
      <LineCard title="Revenue against expenses" series={INCOME_SERIES} legend chartLabel="two lines" /></Stage>,
    dont: () => <Stage><LineCard title="Spend and income" series={ALL_SERIES} look="thin" legend /></Stage> },
  { id: 'bar-labels-distinct',
    do: () => <Stage><RegionNetCard short /></Stage>,
    dont: () => <Stage><RegionNetCard /></Stage> },
];

const meta: Meta = { title: 'Guidelines/Dashboards and reports', parameters: { layout: 'fullscreen' } };
export default meta;

export const DashboardsAndReports: StoryObj = {
  name: 'Dashboards and reports',
  render: () => <GuidelinePage content={content} specimens={specimens} css={SPEC_CSS} />,
};
