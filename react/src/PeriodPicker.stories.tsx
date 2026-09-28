import { useState } from 'react';
import { AppShell } from './AppShell';
import { StatBand } from './primitives/StatBand';
import { DataTable, type Column } from './DataTable';
import { Segmented } from './Segmented';
import { Button } from './primitives/Button';
import { Badge } from './primitives/Badge';

export default {
  title: 'Showcases/Period picker',
  id: 'showcases-period-picker',
  parameters: { layout: 'fullscreen' },
};

// Fictional reporting states supplied by the application, as of September 2026.
const months = [
  { value: '2026-04', short: 'Apr', name: 'April', status: 'Closed', tone: 'neutral' },
  { value: '2026-05', short: 'May', name: 'May', status: 'Closed', tone: 'neutral' },
  { value: '2026-06', short: 'Jun', name: 'June', status: 'Restated', tone: 'info' },
  { value: '2026-07', short: 'Jul', name: 'July', status: 'Closed', tone: 'neutral' },
  { value: '2026-08', short: 'Aug', name: 'August', status: 'Complete but not closed', tone: 'success' },
  { value: '2026-09', short: 'Sep', name: 'September', status: 'Incomplete', tone: 'warn' },
];
const options = months.map(month => ({
  value: month.value, label: month.short,
  ariaLabel: `${month.name} 2026, ${month.status}`,
}));
type Entry = { name: string; amount: number };
const money = (amount: number) => new Intl.NumberFormat('en-GB', {
  style: 'currency', currency: 'EUR', maximumFractionDigits: 0,
}).format(amount);
const columns: Column<Entry>[] = [
  { key: 'name', label: 'Category' },
  { key: 'amount', label: 'Amount', num: true, render: row => money(row.amount) },
];
const reports: Entry[][] = months.map((_, index) => [
  { name: 'Subscriptions', amount: 24000 + index * 1800 },
  { name: 'Services', amount: 6000 + index * 400 },
  { name: 'Payroll', amount: -14000 - index * 600 },
  { name: 'Software', amount: -2200 - index * 100 },
]);

function Example() {
  const [value, setValue] = useState(() => {
    const query = new URLSearchParams(window.location.search).get('period');
    return months.some(month => month.value === query) ? query! : '2026-09';
  });
  const index = months.findIndex(month => month.value === value);
  const selected = months[index];
  const choose = (next: string) => {
    setValue(next);
    const url = new URL(window.location.href);
    url.searchParams.set('period', next);
    window.history.replaceState(null, '', url);
  };
  const rows = reports[index];
  const income = rows.reduce((total, row) => total + Math.max(0, row.amount), 0);
  const expenses = rows.reduce((total, row) => total - Math.min(0, row.amount), 0);

  return <AppShell sections={[{ href: '#report', label: 'Finance report', icon: 'chart' }]}
    pathname="#report" title="Finance report" word="Demo"
    account={{ name: 'Demo User', email: 'demo@example.com' }} onSignOut={() => {}}>
    <div id="report" style={{ display: 'grid', gap: 'var(--space-4)', paddingTop: 'var(--space-2)' }}>
      <div style={{ display: 'grid', justifyItems: 'start', gap: 'var(--space-4)' }}>
        <div className="ui-seg--sm">
          <Segmented label="Period" options={options} value={value} onChange={choose} />
        </div>
        <p role="status">{selected.name} 2026 <Badge variant={selected.tone}>{selected.status}</Badge></p>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <Button variant="ghost" size="sm" icon="chevronLeft" disabled={index === 0}
            aria-label={index === 0 ? 'Previous month: none earlier' : `Previous month: ${months[index - 1].name} 2026`}
            onClick={() => choose(months[index - 1].value)}>Previous</Button>
          <Button variant="ghost" size="sm" iconRight="chevronRight" disabled={index === months.length - 1}
            aria-label={index === months.length - 1 ? 'Next month: none later' : `Next month: ${months[index + 1].name} 2026`}
            onClick={() => choose(months[index + 1].value)}>Next</Button>
        </div>
      </div>
      <StatBand variant="band" stats={[
        { label: 'Income', value: money(income) },
        { label: 'Expenses', value: money(expenses) },
        { label: 'Net cashflow', value: money(income - expenses) },
      ]} />
      <DataTable columns={columns} rows={rows} selectable={false} pager={false}
        scrollLabel={`${selected.name} transactions`} />
    </div>
  </AppShell>;
}

export const Default = { render: () => <Example /> };
