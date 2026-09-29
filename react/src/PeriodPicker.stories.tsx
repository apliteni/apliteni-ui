import { useState, type CSSProperties, type ReactNode } from 'react';
import { AppShell } from './AppShell';
import { StatBand, type StatFigure } from './primitives/StatBand';
import { Card } from './primitives/Card';
import { DataTable, type Column } from './DataTable';
import { NumericValue, DeltaValue } from './TableValues';
import { BusyRegion, Skeleton, SkeletonTable } from './Loading';
import { Segmented } from './Segmented';
import { Badge } from './primitives/Badge';
import { Icon } from './primitives/Icon';

export default {
  title: 'Showcases/Period picker',
  id: 'showcases-period-picker',
  parameters: { layout: 'fullscreen' },
};

type Month = { value: string; short: string; name: string; status: string; icon: string; note?: string };

// Demo data as of September 2026; Restated is separate from closing status.
const months: Month[] = [
  { value: '2026-04', short: 'Apr', name: 'April', status: 'Closed', icon: 'lock' },
  { value: '2026-05', short: 'May', name: 'May', status: 'Closed', icon: 'lock' },
  { value: '2026-06', short: 'Jun', name: 'June', status: 'Closed', icon: 'lock', note: 'Restated' },
  { value: '2026-07', short: 'Jul', name: 'July', status: 'Closed', icon: 'lock' },
  { value: '2026-08', short: 'Aug', name: 'August', status: 'Complete', icon: 'circleCheck' },
  { value: '2026-09', short: 'Sep', name: 'September', status: 'Open', icon: 'clock' },
];
// Announce the status once, in the live region.
const options = months.map(month => ({
  value: month.value, label: month.short, ariaLabel: `${month.name} 2026`,
}));

const grouped = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 0 });
// The finance showcase's typesetting: digits, a space, then the symbol, and
// U+2212 for a negative so the minus lines up over tabular digits.
const amountText = (amount: number) => `${amount < 0 ? '−' : ''}${grouped.format(Math.abs(amount))}`;
const money = (amount: number) => `${amountText(amount)} €`;
const change = (amount: number) => `${amount < 0 ? '−' : '+'}${grouped.format(Math.abs(amount))} €`;
// Good news is the caller's verdict, not the arrow's. Every ledger row is a
// signed contribution to net cashflow, so a rise helps whichever row it is on —
// earning more and spending less are the same plus here. The band above states
// money out as a positive figure, where a rise is the opposite verdict.
const rowTone = (delta: number) => (delta >= 0 ? 'success' : 'danger');

type Entry = { name: string; amount: number; earlier: number | null; delta: number | null };
const categories = [
  { name: 'Subscriptions', amounts: [24000, 25900, 25400, 28900, 31200, 33000] },
  { name: 'Services', amounts: [6000, 7200, 5400, 8100, 6900, 8000] },
  { name: 'Payroll', amounts: [-14000, -14000, -15200, -15200, -16900, -17000] },
  { name: 'Software', amounts: [-2200, -2650, -2300, -2450, -2850, -2700] },
];
const amountsIn = (index: number) => categories.map(category => category.amounts[index]);
const rowsIn = (index: number): Entry[] => {
  const now = amountsIn(index);
  const before = index > 0 ? amountsIn(index - 1) : null;
  return categories.map((category, i) => ({
    name: category.name, amount: now[i],
    earlier: before ? before[i] : null,
    delta: before ? now[i] - before[i] : null,
  }));
};
const totalsIn = (index: number) => {
  const amounts = amountsIn(index);
  const income = amounts.reduce((sum, amount) => sum + Math.max(0, amount), 0);
  const spend = amounts.reduce((sum, amount) => sum - Math.min(0, amount), 0);
  return { income, spend, net: income - spend };
};

// `minmax(0, 1fr)`: a grid track sizes to its widest child by default, so the
// ledger would widen the column instead of scrolling inside its card.
const layout = {
  report: { marginTop: 'var(--space-6)' },
  page: { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 'var(--space-6)' },
  control: { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 'var(--space-2)' },
  now: { margin: 0, display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' },
} satisfies Record<string, CSSProperties>;

function Example({ busy = false }: { busy?: boolean }) {
  const [value, setValue] = useState(() => {
    const query = new URLSearchParams(window.location.search).get('period');
    return months.some(month => month.value === query) ? query! : '2026-09';
  });
  const [changed, setChanged] = useState(false);
  const index = months.findIndex(month => month.value === value);
  const selected = months[index];
  const earlier = index > 0 ? months[index - 1] : null;
  const choose = (next: string) => {
    setChanged(true);
    setValue(next);
    const url = new URL(window.location.href);
    url.searchParams.set('period', next);
    window.history.replaceState(null, '', url);
  };
  const rows = rowsIn(index);
  const here = totalsIn(index);
  const before = earlier ? totalsIn(index - 1) : null;
  // Stat and ledger changes reference one comparison caption.
  const basisId = `period-basis-${value}`;
  const basis = earlier ? `Compared with ${earlier.name} 2026` : 'No earlier month to compare.';

  const columns: Column<Entry>[] = [
    { key: 'name', label: 'Category' },
    { key: 'amount', label: `${selected.short} 2026`, num: true, render: row => <NumericValue value={amountText(row.amount)} unit=" €" /> },
    {
      key: 'delta', label: 'Change', num: true,
      render: row => row.delta == null
        ? <NumericValue value={null} />
        : <span className="ui-value"><DeltaValue basisId={basisId} value={change(row.delta).replace(' €', '')} tone={rowTone(row.delta)} /><span className="ui-value__unit"> €</span></span>,
    },
    {
      key: 'earlier', label: earlier ? `${earlier.short} 2026` : 'Previous', num: true,
      render: row => row.earlier == null ? <NumericValue value={null} /> : <NumericValue value={amountText(row.earlier)} unit=" €" />,
    },
  ];

  // The basis explains missing comparisons once for the whole report.
  // Net cashflow takes no tone: income less cost already says which way it ran.
  const figures: StatFigure[] = [
    { label: 'Money in', value: money(here.income), delta: before ? { value: change(here.income - before.income), tone: here.income >= before.income ? 'good' : 'bad' } : undefined },
    { label: 'Money out', value: money(here.spend), delta: before ? { value: change(here.spend - before.spend), tone: here.spend > before.spend ? 'bad' : 'good' } : undefined },
    { label: 'Net cashflow', value: money(here.net), delta: before ? { value: change(here.net - before.net) } : undefined },
  ];

  // A live region only while one is needed: a loaded page already has the period
  // line announcing changes, and three status regions on it would talk over it.
  const pending = (label: string, placeholder: ReactNode, loaded: ReactNode) =>
    (busy ? <BusyRegion busy label={label} placeholder={placeholder} /> : loaded);

  return <AppShell sections={[{ href: '#report', label: 'Finance report', icon: 'chart' }]}
    pathname="#report" title="Finance report" word="Demo" width="wide"
    palette={{
      groups: [{ label: 'Reports', items: months.filter(month => month.value !== value).map(month => ({
        id: month.value, label: `${month.name} 2026 report`, icon: 'chart',
      })) }],
      onSelect: item => choose(item.id),
    }}
    account={{ name: 'Demo User', email: 'demo@example.com' }} onSignOut={() => {}}>
    <div id="report" style={layout.report}>
      <div style={layout.control}>
        <div style={layout.now}>
          <Segmented label="Period" options={options} value={value} onChange={choose} />
          <p role="status" style={layout.now}>
            <Badge><Icon name={selected.icon} />{selected.status}</Badge>
            {selected.note && <Badge><Icon name="info" />{selected.note}</Badge>}
          </p>
          <p id={basisId} className="ui-sr">{basis}</p>
        </div>
        <div key={value} className={changed ? 'm-fade-in' : undefined} style={layout.page}>
          <div className="ui-stats ui-stats--tiles">
            {pending(`Loading ${selected.name} cash flow…`, <>
              {/* One line box at each stat rank keeps pending and loaded geometry equal. */}
              <div className="ui-stats__list">{figures.map(figure => (
                <div className="ui-stat ui-card ui-card--pad-sm" key={figure.label}>
                  <Skeleton lines={['46%']} className="ui-stat__label" height="1lh" />
                  <Skeleton lines={['76%']} className="ui-stat__value" height="1lh" />
                  {figure.delta && <div className="ui-stat__delta" aria-hidden="true">
                    <span className="ui-skel__bar m-skeleton" style={{ width: '34%', height: '1lh' }} />
                  </div>}
                </div>
              ))}</div>
            </>,
              <StatBand label="Cashflow" stats={figures} basisId={basisId} />)}
          </div>
          <section aria-labelledby="ledger-heading" style={layout.control}>
            <h2 id="ledger-heading" className="ui-card__title" style={{ margin: 0 }}>Ledger</h2>
            <Card>
              {/* The kit keeps categories pinned and offers column controls on overflow. */}
              {pending(`Loading ${selected.name} ledger…`, <SkeletonTable rows={4} cols={4} />,
                <DataTable columns={columns} rows={rows} selectable={false} pager={false} dense
                  stickyHeader pinnedIdentity scrollLabel={`${selected.name} 2026 ledger`} />)}
            </Card>
          </section>
        </div>
      </div>
    </div>
  </AppShell>;
}

export const Default = { render: () => <Example /> };

// Initial loading leaves the period control usable.
export const Loading = { render: () => <Example busy /> };
