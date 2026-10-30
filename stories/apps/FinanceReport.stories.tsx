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
import { payoutRowId } from './_finance-nav.js';

const meta: Meta = { title: 'Showcases/Finance report', id: 'apps-finance-report', parameters: { layout: 'fullscreen' } };
export default meta;

// What a reader narrows the ledger by. Both chips start unset: the ledger is every
// payout, and a chip reading a value the rows do not honour teaches a dead filter.
const FILTERS = [
  { id: 'status', label: 'Status', items: [{ label: 'Any status', value: '' }, { label: 'Paid', value: 'Paid' }, { label: 'In transit', value: 'In transit' }, { label: 'Failed', value: 'Failed' }] },
  { id: 'currency', label: 'Currency', items: [{ label: 'Any currency', value: '' }, { label: 'EUR', value: 'EUR' }, { label: 'USD', value: 'USD' }] },
];
const INITIAL_PERIOD = '1Y';

// Net is gross less fees in every row. The references are the ones the Finance
// dashboard and the Dashboards and reports guideline print, and every row carries
// payoutRowId()'s id, the name the dashboard's link uses for it.
type Tone = 'success' | 'pending' | 'danger';
const PAYOUTS: [string, string, string, string, string, string, Tone, string][] = [
  ['PO-1162', 'po_1TnpIsGmSZjqJIroiJNJ2tRz', '2026-06-30', '14,942.27', '489.44', '14,452.83', 'success', 'Paid'],
  ['PO-1163', 'po_1TnSuaGmSZjqJIroOzd7Mc6L', '2026-05-15', '14,490.70', '574.19', '13,916.51', 'success', 'Paid'],
  ['PO-1164', 'po_1TmNmjGmSZjqJIro7lHBO3ix', '2026-02-20', '14,566.66', '483.97', '14,082.69', 'pending', 'In transit'],
  ['PO-1165', 'po_1Tm1FeGmSZjqJIroa1D9MjbO', '2025-11-10', '39,054.98', '1,369.76', '37,685.22', 'success', 'Paid'],
  ['PO-1166', 'po_1TleVSGmSZjqJIrobtld2b8X', '2025-08-05', '14,969.33', '472.71', '14,496.62', 'danger', 'Failed'],
  ['PO-1167', 'po_1TlISNGmSZjqJIrodu8TdOXP', '2025-03-12', '18,554.27', '626.34', '17,927.93', 'success', 'Paid'],
  ['PO-1159', 'po_1TjyHpGmSZjqJIro5cQb9nKW', '2025-07-15', '2,251.40', '71.40', '2,180.00', 'danger', 'Unmatched'],
];
type Row = typeof PAYOUTS[number];

// What the period, the search and the filters together leave on the ledger, for the
// figures and the rows alike. The search reads the reference and the payout ID.
const filterPayouts = (period: string, values: Record<string, string | undefined> = {}, query = '') =>
  PAYOUTS.filter(row => row[2] >= periodStart(period) && (!values.status || row[7] === values.status)
    && (!values.currency || values.currency === 'EUR')
    && `${row[0]} ${row[1]}`.toLowerCase().includes(query.trim().toLowerCase()));

// The three figures are the rows' own sums, fixed at two decimals beside the Net (EUR) column.
const amount = (value: string) => Number.parseFloat(value.replace(/,/g, ''));
const twoDecimals = (value: number) => `${value < 0 ? '−' : ''}${Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
const payoutStats = (rows: Row[]) => ([['Money in', 3], ['Money out', 4], ['Net result', 5]] as const)
  .map(([label, column]) => ({ label, value: twoDecimals(rows.reduce((sum, row) => sum + amount(row[column]), 0)) }));

const noop = () => {};
const periods = (PERIODS as string[]).map(p => ({ label: p, value: p }));

// The export sits at the far end of the row because it acts on the ledger rather than narrowing it. #505
// The row is the ledger's filter bar, so it sits on a card directly above the ledger. why: guidelines/dense-tables.md
const Controls = ({ query, onQuery, period, onPeriod, filters, onChange, onRemove, onClear }: {
  query?: string; onQuery: (q: string) => void;
  period: string; onPeriod: (p: string) => void; filters: typeof FILTERS & { value?: string }[];
  onChange: (id: string, value: string | undefined) => void; onRemove: (id: string) => void; onClear: () => void;
}) => <Card pad="sm"><div className="ui-toolbar ui-toolbar--split">
  <SearchField ariaLabel="Search payouts" placeholder="Reference or payout ID" value={query} onChange={e => onQuery(e.currentTarget.value)} />
  <Segmented label="Period" options={periods} value={period} onChange={onPeriod} />
  <div><FilterBar filters={filters} label="Payout filters" clearLabel="Clear all" onChange={onChange} onRemove={onRemove} onClear={onClear} /></div>
  <Button icon="download" iconOnly>Export rows</Button>
</div></Card>;

// The table stays a direct child of the card: `.ui-card:has(> .ui-table)` is what
// scrolls seven columns of ledger on a phone.
const Payouts = ({ rows, onReset }: { rows: Row[]; onReset: () => void }) => <Card title="Payouts">
  {rows.length ? <table className="ui-table ui-table--dense ui-table--zebra ui-table--hover">
    <thead><tr><th>Reference</th><th>Payout ID</th><th>Arrival</th>
      <th className="ui-table__num">Gross</th><th className="ui-table__num">Fees</th>
      <th className="ui-table__num">Net (EUR)</th><th>Status</th></tr></thead>
    <tbody>{rows.map(([ref, pid, arr, gross, fees, net, tone, label]) => <tr key={ref} id={payoutRowId(ref)}>
      <td className="ui-table__linked"><a href="#">{ref}</a></td><td className="ui-table__code">{pid}</td><td>{arr}</td>
      <td className="ui-table__num">{gross}</td><td className="ui-table__num">{fees}</td>
      <td className="ui-table__num ui-table__num--strong">{net}</td><td><Badge variant={tone}>{label}</Badge></td>
    </tr>)}</tbody>
  </table> : <EmptyState title="No payouts match" sub="" icon="" actions={<Button size="sm" onClick={onReset}>Clear all</Button>} />}
</Card>;

const Report = () => {
  const [period, setPeriod] = useState(INITIAL_PERIOD);
  const [values, setValues] = useState<Record<string, string | undefined>>({});
  const [query, setQuery] = useState('');
  // The toolbar's card is a sibling of the ledger card, so the reset finds the first
  // filter from the page body around them.
  const ledger = useRef<HTMLDivElement>(null);
  const filters = FILTERS.map(filter => ({ ...filter, value: values[filter.id] ?? '' }));
  const rows = filterPayouts(period, values, query);
  const clear = () => setValues({});
  // The empty result's reset clears the search too, or a typed term keeps the ledger empty.
  const reset = () => { setQuery(''); clear(); };
  return <FinanceShell active="payouts" title="Payouts">
    {/* No caption over the figures: they are totals, not changes. why: Artur, round r32 */}
    <StatBand id="fr-cashflow" stats={payoutStats(rows)} />
    <Controls query={query} onQuery={setQuery} period={period} onPeriod={setPeriod} filters={filters}
      onChange={(id, value) => setValues(v => ({ ...v, [id]: value }))} onRemove={id => setValues(v => ({ ...v, [id]: '' }))} onClear={clear} />
    <div ref={ledger} style={{ display: 'contents' }}>
      <Payouts rows={rows} onReset={() => { reset(); ledger.current?.closest('.ui-app__body')?.querySelector<HTMLElement>('.ui-filter-bar [data-dropdown-trigger]')?.focus(); }} />
    </div>
  </FinanceShell>;
};

export const Default: StoryObj = { render: () => <Report /> };

// The same screen while the ledger is in flight. Two regions, because the numbers
// and the rows arrive from different queries. The skeleton sits in the band's own
// classes, so it folds as the figures will. The period control stays live.
export const Loading: StoryObj = {
  render: () => <FinanceShell active="payouts" title="Payouts">
    <div className="ui-stats ui-stats--tiles">
      <BusyRegion busy label="Loading cashflow for the last year…" placeholder={<div className="ui-stats__list">{[0, 1, 2].map(i =>
        <div key={i} className="ui-stat ui-card ui-card--pad-sm"><Skeleton lines={['40%']} /><Skeleton lines={['72%']} height="36px" /></div>)}</div>} />
    </div>
    <Controls onQuery={noop} period={INITIAL_PERIOD} onPeriod={noop} filters={FILTERS.map(f => ({ ...f, value: '' }))} onChange={noop} onRemove={noop} onClear={noop} />
    <Card title="Payouts"><BusyRegion busy label="Loading payouts…" placeholder={<SkeletonTable rows={PAYOUTS.length} cols={7} />} /></Card>
  </FinanceShell>,
};
