// The finance report showcase in React, under the vanilla page's title and id.
// A report, not a dashboard: it answers why and exactly how much, so it carries the
// ledger in full, a filter row and one export. why: guidelines/dashboards-and-reports.md
import type { Meta, StoryObj } from '@storybook/react';
import { useRef, useState } from 'react';
import { FinanceShell } from './_finance-shell';
import { FilterBar } from '../../react/src/FilterBar';
import { SearchField } from '../../react/src/SearchField';
import { Segmented } from '../../react/src/Segmented';
import { EmptyState } from '../../react/src/EmptyState';
import { BusyRegion, Skeleton, SkeletonTable } from '../../react/src/Loading';
import { StatBand } from '../../react/src/primitives/StatBand';
import { Badge } from '../../react/src/primitives/Badge';
import { Button } from '../../react/src/primitives/Button';
import { Card } from '../../react/src/primitives/Card';
// @ts-expect-error -- plain JS story module
import { PERIODS, periodStart } from './_finance-data.js';
// @ts-expect-error -- plain JS story module
import { salesRowId } from './_finance-nav.js';

const meta: Meta = { title: 'Showcases/Finance report', id: 'apps-finance-report', parameters: { layout: 'fullscreen' } };
export default meta;

// What a reader narrows the ledger by. Both chips start unset: the ledger is every
// sale, and a chip reading a value the rows do not honour teaches a dead filter.
const FILTERS = [
  { id: 'status', label: 'Status', items: [{ label: 'Any status', value: '' }, { label: 'Paid', value: 'Paid' }, { label: 'Pending', value: 'Pending' }, { label: 'Failed', value: 'Failed' }, { label: 'Refunded', value: 'Refunded' }] },
  { id: 'currency', label: 'Currency', items: [{ label: 'Any currency', value: '' }, { label: 'EUR', value: 'EUR' }, { label: 'USD', value: 'USD' }] },
];
const INITIAL_PERIOD = '1Y';

// Net is gross less fees in every row. The references are the ones the Finance
// dashboard and the Dashboards and reports guideline print, and every row carries
// salesRowId()'s id, the name the dashboard's link uses for it.
type Tone = 'success' | 'pending' | 'danger';
const SALES: [string, string, string, string, string, string, Tone, string][] = [
  ['SAL-1042', 'sr-8f3a2b', '2026-06-30', '14,942.27', '489.44', '14,452.83', 'success', 'Paid'],
  ['SAL-1043', 'sr-9d4c1e', '2026-05-15', '14,490.70', '574.19', '13,916.51', 'success', 'Paid'],
  ['SAL-1044', 'sr-b7e5f6', '2026-02-20', '14,566.66', '483.97', '14,082.69', 'pending', 'Pending'],
  ['SAL-1045', 'sr-c2a8d9', '2025-11-10', '39,054.98', '1,369.76', '37,685.22', 'success', 'Paid'],
  ['SAL-1046', 'sr-e1f0a3', '2025-08-05', '14,969.33', '472.71', '14,496.62', 'danger', 'Failed'],
  ['SAL-1047', 'sr-f6b4c8', '2025-03-12', '18,554.27', '626.34', '17,927.93', 'success', 'Paid'],
  ['SAL-1039', 'sr-d9a1e7', '2025-07-15', '2,251.40', '71.40', '2,180.00', 'danger', 'Refunded'],
];
type Row = typeof SALES[number];

// What the period, the search and the filters together leave on the ledger, for the
// figures and the rows alike. The search reads the reference and the sale ID.
const filterSales = (period: string, values: Record<string, string | undefined> = {}, query = '') =>
  SALES.filter(row => row[2] >= periodStart(period) && (!values.status || row[7] === values.status)
    && (!values.currency || values.currency === 'EUR')
    && `${row[0]} ${row[1]}`.toLowerCase().includes(query.trim().toLowerCase()));

// The three figures are the rows' own sums, fixed at two decimals beside the Net (EUR)
// column. #850 layout A: Net result leads, one display rank above Money in and Money out.
// A failed or refunded sale is not income, so Paid and Pending rows alone reach the figures. why: #850
const amount = (value: string) => Number.parseFloat(value.replace(/,/g, ''));
const twoDecimals = (value: number) => `${value < 0 ? '−' : ''}${Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
const salesStats = (rows: Row[]) => ([['Net result', 5], ['Money in', 3], ['Money out', 4]] as const)
  .map(([label, column], at) => ({ label, lead: at === 0, value: twoDecimals(rows.filter((row) => row[7] === 'Paid' || row[7] === 'Pending').reduce((sum, row) => sum + amount(row[column]), 0)) }));

const noop = () => {};
const periods = (PERIODS as string[]).map(p => ({ label: p, value: p }));

// The export sits at the far end of the row because it acts on the ledger rather than narrowing it. #505
// The period control moved to the title row (layout A), because it sets the time
// range for the figures and the ledger alike. The row is the ledger's filter bar, so
// it stands on the page directly above the ledger. why: guidelines/dense-tables.md
const Controls = ({ query, onQuery, filters, onChange, onRemove, onClear }: {
  query?: string; onQuery: (q: string) => void; filters: typeof FILTERS & { value?: string }[];
  onChange: (id: string, value: string | undefined) => void; onRemove: (id: string) => void; onClear: () => void;
}) => <div className="ui-toolbar ui-toolbar--split">
  <SearchField ariaLabel="Search sales" placeholder="Reference or sale ID" value={query} onChange={e => onQuery(e.currentTarget.value)} />
  <div><FilterBar filters={filters} label="Sale filters" clearLabel="Clear all" onChange={onChange} onRemove={onRemove} onClear={onClear} /></div>
  <Button icon="download" iconOnly>Export rows</Button>
</div>;

// The table stays a direct child of the card: `.ui-card:has(> .ui-table)` is what
// scrolls seven columns of ledger on a phone. The title is sr-only: the page title
// already says what the ledger is, and layout A removes the repeated card title. #850
const Sales = ({ rows, onReset }: { rows: Row[]; onReset: () => void }) => <Card title={<span className="ui-sr">Sales</span>}>
  {rows.length ? <table className="ui-table ui-table--dense ui-table--zebra ui-table--hover">
    <thead><tr><th>Reference</th><th>Sale ID</th><th>Date</th>
      <th className="ui-table__num">Gross</th><th className="ui-table__num">Fees</th>
      <th className="ui-table__num">Net (EUR)</th><th>Status</th></tr></thead>
    <tbody>{rows.map(([ref, sid, date, gross, fees, net, tone, label]) => <tr key={ref} id={salesRowId(ref)}>
      <td className="ui-table__linked"><a href="#">{ref}</a></td><td className="ui-table__code">{sid}</td><td>{date}</td>
      <td className="ui-table__num">{gross}</td><td className="ui-table__num">{fees}</td>
      <td className="ui-table__num ui-table__num--strong">{net}</td><td><Badge variant={tone}>{label}</Badge></td>
    </tr>)}</tbody>
  </table> : <EmptyState title="No sales match" sub="" icon="" actions={<Button size="sm" onClick={onReset}>Clear all</Button>} />}
</Card>;

const Report = () => {
  const [period, setPeriod] = useState(INITIAL_PERIOD);
  const [values, setValues] = useState<Record<string, string | undefined>>({});
  const [query, setQuery] = useState('');
  // The toolbar's card is a sibling of the ledger card, so the reset finds the first
  // filter from the page body around them.
  const ledger = useRef<HTMLDivElement>(null);
  const filters = FILTERS.map(filter => ({ ...filter, value: values[filter.id] ?? '' }));
  const rows = filterSales(period, values, query);
  const clear = () => setValues({});
  // The empty result's reset clears the search too, or a typed term keeps the ledger empty.
  const reset = () => { setQuery(''); clear(); };
  return <FinanceShell active="sales" title="Sales"
    tools={<Segmented label="Period" options={periods} value={period} onChange={setPeriod} />}>
    {/* No caption over the figures: they are totals, not changes. why: Artur, round r32 */}
    <StatBand id="fr-cashflow" stats={salesStats(rows)} />
    <Controls query={query} onQuery={setQuery} filters={filters}
      onChange={(id, value) => setValues(v => ({ ...v, [id]: value }))} onRemove={id => setValues(v => ({ ...v, [id]: '' }))} onClear={clear} />
    <div ref={ledger} style={{ display: 'contents' }}>
      <Sales rows={rows} onReset={() => { reset(); ledger.current?.closest('.ui-app__body')?.querySelector<HTMLElement>('.ui-filter-bar [data-dropdown-trigger]')?.focus(); }} />
    </div>
  </FinanceShell>;
};

export const Default: StoryObj = { render: () => <Report /> };

// The same screen while the ledger is in flight. Two regions, because the numbers
// and the rows arrive from different queries. The skeleton sits in the band's own
// classes, so it folds as the figures will. The period control stays live.
export const Loading: StoryObj = {
  render: () => <FinanceShell active="sales" title="Sales"
    tools={<Segmented label="Period" options={periods} value={INITIAL_PERIOD} onChange={noop} />}>
    <div className="ui-stats ui-stats--tiles">
      <BusyRegion busy label="Loading cashflow for the last year…" placeholder={<div className="ui-stats__list">{[0, 1, 2].map(i =>
        <div key={i} className="ui-stat ui-card ui-card--pad-sm"><Skeleton lines={['40%']} /><Skeleton lines={['72%']} height="36px" /></div>)}</div>} />
    </div>
    <Controls onQuery={noop} filters={FILTERS.map(f => ({ ...f, value: '' }))} onChange={noop} onRemove={noop} onClear={noop} />
    <Card title={<span className="ui-sr">Sales</span>}><BusyRegion busy label="Loading sales…" placeholder={<SkeletonTable rows={SALES.length} cols={7} />} /></Card>
  </FinanceShell>,
};
