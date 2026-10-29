// The shape of a rule and the gates that walk this page: docs/components.md
import type { Meta, StoryObj } from '@storybook/react';
import type { ReactNode } from 'react';
import { GuidelinePage, Raw, noop } from '../_guideline';
import { Badge } from '../../react/src/primitives/Badge';
import { Button } from '../../react/src/primitives/Button';
import { Card } from '../../react/src/primitives/Card';
import { StatBand } from '../../react/src/primitives/StatBand';
import { FilterBar } from '../../react/src/FilterBar';
// @ts-expect-error -- plain JS story modules, read by the Node gates as well
import { loadGuideline } from './_markdown.js';
// @ts-expect-error -- plain JS story modules, read by the Node gates as well
import { ESTIMATED, LEDGER, SPEC_CSS, SPEND, lines } from './_dashboards-and-reports.js';
// @ts-expect-error -- plain JS story modules, read by the Node gates as well
import { bars } from '../_chart.js';
// @ts-expect-error -- plain JS story modules, read by the Node gates as well
import { payoutHref } from '../apps/_finance-nav.js';
// @ts-expect-error -- plain JS story modules, read by the Node gates as well
import { cashflowStats } from '../apps/_finance-data.js';

const content = await loadGuideline('dashboards-and-reports.md', new URL('../../guidelines/dashboards-and-reports.md', import.meta.url));

// One made-up portal supplies every specimen, and the Finance report showcase
// prints the same payouts with the same fees and nets: the ledger is the one
// LEDGER export that stories/dashboard-report-refs.test.js holds in step.
const Stage = ({ children }: { children: ReactNode }) => <div className="gd-stage">{children}</div>;
type Tone = 'success' | 'pending' | 'danger';

// Cashflow for the year, from the dashboard's own call, so a specimen cannot drift
// from the showcase it draws. Two figures, because a specimen cell is under 28rem.
type Figure = { label: string; value: string; delta: { value: string; tone?: 'good' | 'bad' }; trend: string };
const Cashflow = ({ id }: { id: string }) => <StatBand id={id} stats={(cashflowStats('1Y', true) as Figure[]).slice(0, 2)
  .map(figure => ({ ...figure, delta: { ...figure.delta, basis: 'vs prior year' }, trend: <Raw html={figure.trend} /> }))} />;

const LedgerTable = () => <table className="ui-table ui-table--dense ui-table--zebra">
  <thead><tr><th>Reference</th><th className="ui-table__num">Fees</th><th className="ui-table__num">Net (EUR)</th><th>Status</th></tr></thead>
  <tbody>{(LEDGER as string[][]).map(([ref, , fees, net, tone, label]) => <tr key={ref}>
    <td>{ref}</td><td className="ui-table__num">{fees}</td><td className="ui-table__num ui-table__num--strong">{net}</td>
    <td><Badge variant={tone}>{label}</Badge></td>
  </tr>)}</tbody>
</table>;

// The rows that need a decision, which is all a dashboard carries of a ledger.
// `onward={false}` removes the row links, so the Don't offers no way in.
const EXCEPTIONS: [string, string, Tone, string][] = [
  ['PO-1166', '14,496.62', 'danger', 'Failed'],
  ['PO-1164', '14,082.69', 'pending', 'In transit'],
  ['PO-1159', '2,180.00', 'danger', 'Unmatched'],
];
const Attention = ({ onward = true }: { onward?: boolean }) => <Card title="Needs a decision">
  <table className="ui-table ui-table--dense">
    <thead><tr><th>Reference</th><th className="ui-table__num">Net (EUR)</th></tr></thead>
    <tbody>{EXCEPTIONS.map(([ref, net, tone, label]) => <tr key={ref}>
      <td><span className="ui-table__pair">{onward ? <a href={payoutHref(ref)}>{ref}</a> : ref}<Badge variant={tone}>{label}</Badge></span></td>
      <td className="ui-table__num ui-table__num--strong">{net}</td>
    </tr>)}</tbody>
  </table>
</Card>;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
const NET_BY_MONTH = [412, 455, 430, 498, 520, 505];
// bars() lays one slot per value across the full width, so a flex row of equal
// cells puts each name under its own bar.
const MonthChart = () => <div className="gd-chart">
  <Raw html={bars({ values: NET_BY_MONTH, width: 320, height: 96, fluid: true, label: 'Net settled by month, first half of the year' }).svg} />
  <div className="gd-chart__months ui-stat__label" aria-hidden="true">{MONTHS.map(month => <span key={month}>{month}</span>)}</div>
</div>;
const MonthTable = () => <table className="ui-table ui-table--dense">
  <thead><tr><th>Month</th><th className="ui-table__num">Net settled (k €)</th></tr></thead>
  <tbody>{MONTHS.map((month, i) => <tr key={month}><td>{month}</td><td className="ui-table__num ui-table__num--strong">{NET_BY_MONTH[i]}</td></tr>)}</tbody>
</table>;

// A line chart named by its figures: each line's name over its last value, in its tone.
type Series = { name: string; tone: string; values: number[] };
const SPEND_SERIES: Series[] = [{ name: 'Spend', tone: 'accent', values: SPEND }, { name: 'Estimated', tone: 'accent-soft', values: ESTIMATED }];
const INCOME_SERIES: Series[] = [
  { name: 'Revenue', tone: 'accent', values: [46.2, 45.1, 47.9, 46.8, 49.3, 48.2] },
  { name: 'Expenses', tone: 'accent-soft', values: [32.9, 33.4, 32.8, 34.0, 34.1, 31.9] },
];
const ALL_SERIES: Series[] = [...SPEND_SERIES, { ...INCOME_SERIES[0], tone: 'warn' }, { ...INCOME_SERIES[1], tone: 'info' }];
const kEur = (n: number) => `${n.toFixed(1)}k €`;
const Figures = ({ series }: { series: Series[] }) => <div className="gd-series">{series.map(line =>
  <div key={line.name} className={`gd-series__item ui-chart__tone--${line.tone}`}>
    <span className="ui-stat__label">{line.name}</span>
    <span className="ui-stat__value gd-series__value">{kEur(line.values[line.values.length - 1])}</span>
  </div>)}</div>;
const Lines = ({ series, label }: { series: Series[]; label: string }) => <div className="gd-chart">
  <Raw html={lines({ series, label })} />
  <div className="gd-chart__months ui-stat__label" aria-hidden="true">{MONTHS.map(month => <span key={month}>{month}</span>)}</div>
</div>;
// The kit Chart's own legend markup, so the Don't shows the key the kit draws.
const Legend = ({ series }: { series: Series[] }) => <ul className="ui-chart__legend">{series.map(line =>
  <li key={line.name} className={`ui-chart__key ui-chart__tone--${line.tone}`}>
    <svg className="ui-chart__key-mark" width="18" height="12" viewBox="0 0 18 12" aria-hidden="true"><path className="ui-chart__key-line" d="M1 9 L6 5 L12 7 L17 3" /></svg>
    {line.name}
  </li>)}</ul>;
const LineCard = ({ title, series, legend = false }: { title: string; series: Series[]; legend?: boolean }) => <Card title={title}>
  {legend ? <Legend series={series} /> : <Figures series={series} />}
  <Lines series={series} label={`${title}, first half of the year, thousands of euros`} />
</Card>;

// Offered, not applied: the rows below are every payout, so no chip may read as
// a value a reader would then look for in the table.
const FILTERS = [
  { id: 'status', label: 'Status', items: [{ label: 'Any status', value: '' }, { label: 'Paid', value: 'Paid' }, { label: 'In transit', value: 'In transit' }, { label: 'Failed', value: 'Failed' }] },
  { id: 'currency', label: 'Currency', items: [{ label: 'Any currency', value: '' }, { label: 'EUR', value: 'EUR' }, { label: 'USD', value: 'USD' }] },
];

const specimens = [
  { id: 'fast-glance' },
  { id: 'figures-and-exceptions',
    do: () => <Stage><Cashflow id="gd-glance-do" /><Attention /></Stage>,
    dont: () => <Stage><Card title="Payouts"><LedgerTable /><p className="ui-card__sub">{'Fees rose with volume this quarter, and the one\n        unmatched transfer from June is still with the bank.'}</p></Card></Stage> },
  { id: 'link-to-the-report', do: () => <Stage><Attention /></Stage>, dont: () => <Stage><Attention onward={false} /></Stage> },
  { id: 'report-depth',
    do: () => <Stage><Card title="Payouts"><LedgerTable /></Card></Stage>,
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
  { id: 'chart-or-table',
    do: () => <Stage><LineCard title="Spend against estimate" series={SPEND_SERIES} /><Attention /></Stage>,
    dont: () => <Stage><Card title="Spend against estimate"><Figures series={SPEND_SERIES} />
      <Lines series={SPEND_SERIES} label="Spend against estimate, first half of the year, thousands of euros" />
      <table className="ui-table ui-table--dense">
        <thead><tr><th>Reference</th><th className="ui-table__num">Net (EUR)</th></tr></thead>
        <tbody>{EXCEPTIONS.map(([ref, net]) => <tr key={ref}><td>{ref}</td><td className="ui-table__num ui-table__num--strong">{net}</td></tr>)}</tbody>
      </table></Card></Stage> },
  { id: 'table-behind-the-chart',
    do: () => <Stage><Card title="Net settled by month"><MonthChart /></Card><Card title="Net settled by month, as rows"><MonthTable /></Card></Stage>,
    dont: () => <Stage><Card title="Net settled by month"><MonthChart /></Card></Stage> },
  { id: 'value-not-legend',
    do: () => <Stage><LineCard title="Spend against estimate" series={SPEND_SERIES} /></Stage>,
    dont: () => <Stage><LineCard title="Spend against estimate" series={SPEND_SERIES} legend /></Stage> },
  { id: 'two-lines-at-most',
    do: () => <Stage><LineCard title="Spend against estimate" series={SPEND_SERIES} /><LineCard title="Revenue against expenses" series={INCOME_SERIES} /></Stage>,
    dont: () => <Stage><LineCard title="Spend and income" series={ALL_SERIES} /></Stage> },
];

const meta: Meta = { title: 'Guidelines/Dashboards and reports', parameters: { layout: 'fullscreen' } };
export default meta;

export const DashboardsAndReports: StoryObj = {
  name: 'Dashboards and reports',
  render: () => <GuidelinePage content={content} specimens={specimens} css={SPEC_CSS} />,
};
