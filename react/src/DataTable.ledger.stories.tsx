import { useState, type ReactNode } from 'react';
import { DataTable, type Column } from './DataTable';
import { Badge } from './primitives/Badge';
import { Button } from './primitives/Button';
import { Card } from './primitives/Card';
import { Icon } from './primitives/Icon';
import { EmptyState } from './EmptyState';
import { NumericValue } from './TableValues';
import { useTableFilters } from '../../stories/_table-filters';

export default { title: 'React/DataTable ledgers' };

const page = (children: ReactNode, width: number | string = 720) => <div style={{ maxWidth: width }}>{children}</div>;
// Each long table has its filter bar directly above it, on the page with no card of its own.
// why: guidelines/dense-tables.md
const filtered = (bar: ReactNode, table: ReactNode) => <div className="ui-card-stack">{bar}{table}</div>;
const titled = (name: string, text: string) => <><span className="ui-card__icon"><Icon name={name} /></span> {text}</>;

type Order = { name: string; id: string; placed: string; items: string; total: string; tone: string; status: string };
const ORDERS: Order[] = [
  ['1162', 'OR-1042', '2026-06-30', '3', '1,240.00', 'success', 'Paid'],
  ['1163', 'OR-1041', '2026-06-29', '1', '860.00', 'pending', 'In transit'],
  ['1164', 'OR-1040', '2026-06-28', '2', '2,100.00', 'danger', 'Failed'],
].map(([name, id, placed, items, total, tone, status]) => ({ name, id, placed, items, total, tone, status }));

// The total head carries the currency once. On a phone the table scrolls in its frame,
// with the order ID pinned.
const orderColumns: Column<Order>[] = [
  { key: 'name', label: 'ID', linked: true, render: (r) => <a href="#order">{r.name}</a> },
  { key: 'id', label: 'Order ID', cell: 'code' },
  { key: 'placed', label: 'Placed' },
  { key: 'items', label: 'Items', num: true, render: (r) => <NumericValue value={r.items} /> },
  { key: 'total', label: 'Total (EUR)', num: true, cell: 'strong', render: (r) => <NumericValue value={r.total} /> },
  { key: 'status', label: 'Status', render: (r) => <Badge variant={r.tone}>{r.status}</Badge> },
];

export const FinanceData = {
  render: function Render() {
    const { bar, shown } = useTableFilters(ORDERS, {
      search: 'Search orders', placeholder: 'ID or order ID', label: 'Order filters', text: (r) => `${r.name} ${r.id}`,
      facets: [{ id: 'status', label: 'Status', any: 'Any status', of: (r) => r.status }],
    });
    return page(filtered(bar,
      <Card title={titled('key', 'Orders')}>
        <DataTable columns={orderColumns} rows={shown} selectable={false} pager={false} empty="No orders match"
          density="dense" zebra pinnedIdentity scrollLabel="Orders, scroll for more columns" rowState={(r) => (r.name === '1164' ? 'target' : undefined)} />
      </Card>), 1040,
    );
  },
};

// A badge gives the status of the record, and an ink word gives a second status in the same
// row (#814). Two rows are selected, so the words also stand on the selected wash.
type Transfer = { name: string; date: string; amount: string; tone: string; status: string; matchTone: string; match: string };
const TRANSFERS: Transfer[] = [
  ['Kestrel Print Co.', '2026-10-02', '4,800.00', 'success', 'Paid', 'success', 'Matched'],
  ['Orchard Lane Café', '2026-10-04', '612.40', 'pending', 'Scheduled', 'warn', 'Review'],
  ['Harbor Freight Lines', '2026-10-07', '1,240.00', 'danger', 'Failed', 'danger', 'Unmatched'],
  ['Juniper Studio', '2026-10-09', '960.00', 'neutral', 'Draft', 'neutral', 'Not sent'],
  ['Meridian Coastal Logistics', '2026-10-12', '2,305.75', 'info', 'Imported', 'info', 'Imported'],
].map(([name, date, amount, tone, status, matchTone, match]) => ({ name, date, amount, tone, status, matchTone, match }));
const transferColumns: Column<Transfer>[] = [
  { key: 'name', label: 'Payee', linked: true, render: (r) => <a href="#payee">{r.name}</a> },
  { key: 'date', label: 'Date' },
  { key: 'amount', label: 'Amount (EUR)', num: true, render: (r) => <NumericValue value={r.amount} /> },
  { key: 'status', label: 'Status', render: (r) => <Badge variant={r.tone}>{r.status}</Badge> },
  { key: 'match', label: 'Bank match', render: (r) => <span className={`ui-status--${r.matchTone}`}>{r.match}</span> },
];

export const StatusWords = {
  // A centred canvas sizes the story to its widest row. Padded gives the bar and table the view's width.
  parameters: { layout: 'padded' },
  render: function Render() {
    const [sel, setSel] = useState(new Set(['Orchard Lane Café', 'Harbor Freight Lines']));
    const { bar, shown } = useTableFilters(TRANSFERS, {
      search: 'Search transfers', placeholder: 'Payee', label: 'Transfer filters', text: (r) => r.name,
      facets: [{ id: 'match', label: 'Bank match', any: 'Any match', of: (r) => r.match }],
    });
    const toggle = (names: string[]) => setSel((s) => {
      const x = new Set(s); const all = names.every((n) => x.has(n));
      names.forEach((n) => (all ? x.delete(n) : x.add(n))); return x;
    });
    return page(filtered(bar,
      <Card title={titled('wallet', 'Transfers')}>
        <DataTable columns={transferColumns} rows={shown} pager={false} empty="No transfers match" scrollLabel="Transfers"
          selected={sel} onToggle={(n) => toggle([n])} onTogglePage={toggle} />
      </Card>), 1040,
    );
  },
};

type Agent = { name: string; scope: string; used: string; dead: boolean };
const AGENTS: Agent[] = [
  { name: 'Research bot', scope: 'Read only', used: '2 hours ago', dead: false },
  { name: 'Deck summariser', scope: 'Read only', used: 'Yesterday', dead: false },
  { name: 'Old integration', scope: 'Read only', used: '3 weeks ago', dead: true },
];
const agentColumns: Column<Agent>[] = [
  { key: 'name', label: 'Agent', cell: 'title' },
  { key: 'scope', label: 'Scope' },
  { key: 'used', label: 'Last used' },
  { key: 'dead', label: '', cell: 'act', render: (r) => (r.dead
    ? 'Revoked'
    : <Button variant="danger" size="sm">Revoke</Button>) },
];

export const AgentTokens = {
  // A centred canvas sizes the story to its widest row. Padded gives the bar and table the view's width.
  parameters: { layout: 'padded' },
  render: function Render() {
    const { bar, shown } = useTableFilters(AGENTS, {
      search: 'Search agents', placeholder: 'Agent', label: 'Agent filters', text: (r) => r.name,
      facets: [{ id: 'state', label: 'State', any: 'Any state', of: (r) => (r.dead ? 'Revoked' : 'Active') }],
    });
    return page(filtered(bar,
      <Card title={titled('key', 'Access & agents')}>
        <DataTable columns={agentColumns} rows={shown} selectable={false} pager={false} empty="No agents match"
          rowState={(r) => (r.dead ? 'dead' : undefined)} />
      </Card>),
    );
  },
};

export const Empty = {
  render: () => page(
    <Card title={titled('key', 'Access & agents')}>
      <EmptyState title="No agents connected yet" icon="plug"
        sub="Create a token and paste the MCP connect command into your agent to get started."
        actions={<Button variant="primary" icon="key">Create token</Button>} />
    </Card>,
  ),
};

type Line = { name: string; amount: string };
const LINES: Line[] = [{ name: 'Interface design', amount: '450.00' }, { name: 'Prototype review', amount: '300.00' }];
const eur = (value: number) => value.toLocaleString('en-GB', { minimumFractionDigits: 2 });
export const WithTotals = {
  render: function Render() {
    const { bar, shown } = useTableFilters(LINES, { search: 'Search services', placeholder: 'Service', label: 'Service filters', text: (r) => r.name, facets: [] });
    // The totals add up the lines the filter leaves, so the footer never sums rows it hides.
    const subtotal = shown.reduce((sum, line) => sum + Number(line.amount), 0);
    return page(filtered(bar,
      <Card title="Sample invoice">
        <DataTable caption="Sample services and totals in EUR" selectable={false} pager={false} density="dense" hover={false}
          rows={shown} empty="No services match"
          columns={[{ key: 'name', label: 'Service', cell: 'title' }, { key: 'amount', label: 'Amount (EUR)', num: true }]}
          footer={<>
            <tr><th scope="row">Subtotal</th><td className="ui-table__num">{eur(subtotal)}</td></tr>
            <tr><th scope="row">VAT (20%)</th><td className="ui-table__num">{eur(subtotal * 0.2)}</td></tr>
            <tr><th scope="row" className="ui-table__num--strong">Total</th><td className="ui-table__num ui-table__num--strong">{eur(subtotal * 1.2)}</td></tr>
          </>} />
      </Card>),
    );
  },
};

type Hours = { name: string; hours: number };
const HOURS: Hours[] = [{ name: 'Interface design', hours: 6 }, { name: 'Prototype review', hours: 4 }];
export const CompactRowHeaders = {
  render: function Render() {
    const { bar, shown } = useTableFilters(HOURS, { search: 'Search services', placeholder: 'Service', label: 'Service filters', text: (r) => r.name, facets: [] });
    return page(filtered(bar,
      <Card title="Sample services">
        <DataTable caption="Service hours with row headers" selectable={false} pager={false} density="compact" hover={false}
          rows={shown} empty="No services match"
          columns={[{ key: 'name', label: 'Service', rowHeader: true }, { key: 'hours', label: 'Hours', num: true }]} />
      </Card>), 'var(--panel-lg)',
    );
  },
};

type Payment = { name: string; date: string; amount: string; note: string };
const PAYMENTS: Payment[] = [
  { name: 'Northwind Studio', date: '2 Oct', amount: '€4,800.00', note: 'Retainer for the brand refresh, first half paid after the kickoff in October. The second half is due after the review call, so hold the invoice until then.' },
  { name: 'Blue Fern Hosting', date: '4 Oct', amount: '−€612.40', note: 'Hosting for the three regions. The price rose by 4% this quarter, and the new rate holds until March.' },
  { name: 'Kestrel Print Co.', date: '7 Oct', amount: '−€1,240.00', note: 'Brochures for the autumn fair. Split the cost between the two product lines when you close the month.' },
  { name: 'Orchard Lane Café', date: '9 Oct', amount: '€960.00', note: 'Catering refund after the cancelled workshop. The client asked for a credit note instead of cash.' },
  { name: 'Harbor Freight Lines', date: '12 Oct', amount: '−€2,305.75', note: 'Two pallets to the north warehouse. One arrived late, and the carrier offered a 10% discount.' },
];
// A pinned title column in a table wider than its frame: the name keeps its words on one
// line and the frame scrolls. #832
export const PinnedTitle = {
  render: () => page(
    <Card title="October payments">
      {/* No filter bar: the story shows a pinned name, and every row is on view. why: guidelines/dense-tables.md#give-a-long-table-its-filter-bar */}
      <DataTable selectable={false} pager={false} pinnedIdentity="name"
        scrollLabel="October payments, scroll for more columns" rows={PAYMENTS}
        columns={[
          { key: 'name', label: 'Counterparty', cell: 'title' },
          { key: 'date', label: 'Date' },
          { key: 'amount', label: 'Amount', num: true },
          { key: 'note', label: 'Notes', cell: 'long' },
        ]} />
    </Card>, 560,
  ),
};

// On a phone the table keeps its columns and scrolls sideways in its frame. The pinned
// counterparty stays in view, and the note wraps at its floor width.
export const PinnedScroll = {
  render: function Render() {
    const { bar, shown } = useTableFilters(PAYMENTS, {
      search: 'Search payments', placeholder: 'Counterparty or note', label: 'Payment filters', text: (r) => `${r.name} ${r.note}`, facets: [],
    });
    return page(filtered(bar,
    <Card title="October payments">
      <DataTable selectable={false} pager={false} pinnedIdentity
        scrollLabel="October payments, scroll for more columns" rows={shown} empty="No payments match"
        columns={[
          { key: 'name', label: 'Counterparty', rowHeader: true },
          { key: 'date', label: 'Date' },
          { key: 'amount', label: 'Amount', num: true },
          { key: 'note', label: 'Notes', cell: 'long' },
        ]} />
    </Card>), 1040,
    );
  },
};
