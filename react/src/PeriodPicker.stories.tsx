import { useState, type CSSProperties, type ReactNode } from 'react';
import { AppShell } from './AppShell';
import { StatBand, type StatFigure } from './primitives/StatBand';
import { Card } from './primitives/Card';
import { DataTable, type Column } from './DataTable';
import { NumericValue, DeltaValue } from './TableValues';
import { BusyRegion, Skeleton, SkeletonTable } from './Loading';
import { Segmented } from './Segmented';
import { Badge } from './primitives/Badge';

export default {
  title: 'Showcases/Period picker',
  id: 'showcases-period-picker',
  parameters: { layout: 'fullscreen' },
};

type Month = { value: string; short: string; name: string; status: string; tone: string; note?: string };

// Demo data. "As of September 2026" is what makes September the open month.
// One status axis — Open, then Complete, then Closed — with Restated as its own
// marker, so a reader can tell a step from a fact about the books.
const months: Month[] = [
  { value: '2026-04', short: 'Apr', name: 'April', status: 'Closed', tone: 'neutral' },
  { value: '2026-05', short: 'May', name: 'May', status: 'Closed', tone: 'neutral' },
  { value: '2026-06', short: 'Jun', name: 'June', status: 'Closed', tone: 'neutral', note: 'Restated' },
  { value: '2026-07', short: 'Jul', name: 'July', status: 'Closed', tone: 'neutral' },
  { value: '2026-08', short: 'Aug', name: 'August', status: 'Complete', tone: 'success' },
  { value: '2026-09', short: 'Sep', name: 'September', status: 'Open', tone: 'warn' },
];
// The visible pill is three letters; the accessible name is the month. The
// status is on the badge and in the live region, so it is not said a third time.
const options = months.map(month => ({
  value: month.value, label: month.short, ariaLabel: `${month.name} 2026`,
}));

const grouped = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 0 });
// The finance showcase's typesetting: digits, a space, then the symbol, and
// U+2212 for a negative so the minus lines up over tabular digits.
const money = (amount: number) => `${amount < 0 ? '−' : ''}${grouped.format(Math.abs(amount))} €`;
const change = (amount: number) => `${amount < 0 ? '−' : '+'}${grouped.format(Math.abs(amount))} €`;
// Good news is the caller's verdict, not the arrow's. Every ledger row is a
// signed contribution to net cashflow, so a rise helps whichever row it is on —
// earning more and spending less are the same plus here. The band above states
// money out as a positive figure, where a rise is the opposite verdict.
const rowTone = (delta: number) => (delta >= 0 ? 'success' : 'danger');

type Entry = { name: string; amount: number; earlier: number | null; delta: number | null };
const categories = [
  { name: 'Subscriptions', base: 24000, step: 1800 },
  { name: 'Services', base: 6000, step: 400 },
  { name: 'Payroll', base: -14000, step: -600 },
  { name: 'Software', base: -2200, step: -100 },
];
const amountsIn = (index: number) => categories.map(category => category.base + category.step * index);
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

// One object for the page's three boxes, so the showcase states its rhythm once.
// `minmax(0, 1fr)`: a grid track sizes to its widest child by default, so the
// ledger would widen the column instead of scrolling inside its card.
const layout = {
  page: { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 'var(--space-6)' },
  control: { display: 'grid', gap: 'var(--space-2)' },
  now: { margin: 0, display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' },
} satisfies Record<string, CSSProperties>;

function Example({ busy = false }: { busy?: boolean }) {
  const [value, setValue] = useState(() => {
    const query = new URLSearchParams(window.location.search).get('period');
    return months.some(month => month.value === query) ? query! : '2026-09';
  });
  const index = months.findIndex(month => month.value === value);
  const selected = months[index];
  const earlier = index > 0 ? months[index - 1] : null;
  const choose = (next: string) => {
    setValue(next);
    const url = new URL(window.location.href);
    url.searchParams.set('period', next);
    window.history.replaceState(null, '', url);
  };
  const rows = rowsIn(index);
  const here = totalsIn(index);
  const before = earlier ? totalsIn(index - 1) : null;
  // Every change in the table points at the card's caption for its comparison.
  const basisId = `period-ledger-basis-${value}`;

  const columns: Column<Entry>[] = [
    { key: 'name', label: 'Category' },
    {
      key: 'earlier', label: earlier ? `${earlier.short} 2026` : 'Earlier month', num: true,
      render: row => (row.earlier == null
        ? <NumericValue value={null} missing="No earlier month" />
        : <>{money(row.earlier)}</>),
    },
    {
      key: 'delta', label: 'Change', num: true,
      render: row => <DeltaValue basisId={basisId} missing="No earlier month"
        value={row.delta == null ? null : change(row.delta)}
        tone={row.delta == null ? 'neutral' : rowTone(row.delta)} />,
    },
    { key: 'amount', label: `${selected.short} 2026 (EUR)`, num: true, render: row => <>{money(row.amount)}</> },
  ];

  // A figure with no earlier month says so in words rather than printing +0 €.
  // Net cashflow takes no tone: income less cost already says which way it ran.
  const none = { value: null, none: 'No earlier month' };
  const figures: StatFigure[] = [
    { label: 'Money in', value: money(here.income), delta: before ? { value: change(here.income - before.income), tone: here.income >= before.income ? 'good' : 'bad' } : none },
    { label: 'Money out', value: money(here.spend), delta: before ? { value: change(here.spend - before.spend), tone: here.spend > before.spend ? 'bad' : 'good' } : none },
    { label: 'Net cashflow', value: money(here.net), delta: before ? { value: change(here.net - before.net) } : none },
  ];

  // A live region only while one is needed: a loaded page already has the period
  // line announcing changes, and three status regions on it would talk over it.
  const pending = (label: string, placeholder: ReactNode, loaded: ReactNode) =>
    (busy ? <BusyRegion busy label={label} placeholder={placeholder} /> : loaded);

  return <AppShell sections={[{ href: '#report', label: 'Finance report', icon: 'chart' }]}
    pathname="#report" title="Finance report" word="Demo"
    lede="Pick a month to see its cashflow, then the ledger the figures come from."
    account={{ name: 'Demo User', email: 'demo@example.com' }} onSignOut={() => {}}>
    <div id="report" style={layout.page}>
      <div style={layout.control}>
        <Segmented label="Period" options={options} value={value} onChange={choose} />
        <p role="status" style={layout.now}>
          {selected.name} 2026 <Badge variant={selected.tone}>{selected.status}</Badge>
          {selected.note && <Badge variant="info">{selected.note}</Badge>}
        </p>
      </div>
      {/* Keyed on the period, so the replaced report arrives rather than cuts. */}
      <div key={value} className="m-fade-in" style={layout.page}>
        <div className="ui-stats ui-stats--tiles">
          {pending(`Loading ${selected.name} cashflow…`, <>
            {/* The skeleton wears the band's own classes, so the tiles fold the
                way the figures will and nothing snaps shape when they land. */}
            <Skeleton lines={['24%']} className="ui-stats__basis" />
            <div className="ui-stats__list">{figures.map(figure => (
              <div className="ui-stat ui-card ui-card--pad-sm" key={figure.label}>
                {/* Label, figure and change, at their own heights, so the tile
                    keeps roughly its loaded size while the numbers are in flight. */}
                <Skeleton lines={['46%']} height="18px" />
                <Skeleton lines={['76%']} height="38px" />
                <Skeleton lines={['34%']} height="18px" />
              </div>
            ))}</div>
          </>,
            <StatBand label="Cashflow" stats={figures}
              basis={earlier ? `Change against ${earlier.name} 2026` : 'April 2026 is the first month in this demo'} />)}
        </div>
        <Card title={`${selected.name} 2026 ledger`}
          sub={<span id={basisId}>Every amount is in EUR. Money out is negative here and counted positive in the figures above.</span>}>
          {/* pinnedIdentity gives the table the kit's named scroll region: a
              phone scrolls the money columns with the category held beside
              them, and the region is reachable from the keyboard. */}
          {pending(`Loading the ${selected.name} ledger…`, <SkeletonTable rows={4} cols={4} />,
            <DataTable columns={columns} rows={rows} selectable={false} pager={false} dense
              pinnedIdentity scrollLabel={`${selected.name} 2026 ledger`} />)}
        </Card>
      </div>
    </div>
  </AppShell>;
}

export const Default = { render: () => <Example /> };

// Changing the period fetches: two regions, because the figures and the rows
// arrive from different queries and finish at different times. The period
// control stays live, since it is the one useful thing to do while waiting.
export const Loading = { render: () => <Example busy /> };
