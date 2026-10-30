import type { ReactNode } from 'react';
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
// Every table has its filter bar directly above it, on its own card. why: guidelines/dense-tables.md
const filtered = (bar: ReactNode, table: ReactNode) => <div className="ui-card-stack"><Card>{bar}</Card>{table}</div>;
const titled = (name: string, text: string) => <><span className="ui-card__icon"><Icon name={name} /></span> {text}</>;

type Payout = { name: string; id: string; arrival: string; gross: string; fees: string; net: string; tone: string; status: string };
const PAYOUTS: Payout[] = [
  ['1162', 'po_1TnpIsGmSZjqJIroiJNJ2tRz', '2026-06-30', '14,942.27', '489.44', '11,871.49', 'success', 'Paid'],
  ['1163', 'po_1TnSuaGmSZjqJIroOzd7Mc6L', '2026-06-29', '14,490.70', '574.19', '27,834.31', 'success', 'Paid'],
  ['1164', 'po_1TmNmjGmSZjqJIro7lHBO3ix', '2026-06-26', '14,566.66', '483.97', '15,201.57', 'pending', 'In transit'],
  ['41', 'po_1Tm1FeGmSZjqJIroa1D9MjbO', '2026-06-25', '39,054.98', '1,369.76', '32,156.22', 'success', 'Paid'],
  ['42', 'po_1TleVSGmSZjqJIrobtld2b8X', '2026-06-24', '14,969.33', '472.71', '18,774.34', 'danger', 'Failed'],
  ['43', 'po_1TlISNGmSZjqJIrodu8TdOXP', '2026-06-23', '18,554.27', '626.34', '13,705.55', 'success', 'Paid'],
].map(([name, id, arrival, gross, fees, net, tone, status]) => ({ name, id, arrival, gross, fees, net, tone, status }));

// The net head carries the currency once. On a phone the table scrolls in its frame,
// with the payout ID pinned.
const payoutColumns: Column<Payout>[] = [
  { key: 'name', label: 'ID', linked: true, render: (r) => <a href="#payout">{r.name}</a> },
  { key: 'id', label: 'Payout ID', cell: 'code' },
  { key: 'arrival', label: 'Arrival' },
  { key: 'gross', label: 'Gross', num: true, render: (r) => <NumericValue value={r.gross} /> },
  { key: 'fees', label: 'Fees', num: true, render: (r) => <NumericValue value={r.fees} /> },
  { key: 'net', label: 'Net (EUR)', num: true, cell: 'strong', render: (r) => <NumericValue value={r.net} /> },
  { key: 'status', label: 'Status', render: (r) => <Badge variant={r.tone}>{r.status}</Badge> },
];

export const FinanceData = {
  render: function Render() {
    const { bar, shown } = useTableFilters(PAYOUTS, {
      search: 'Search payouts', placeholder: 'ID or payout ID', label: 'Payout filters', text: (r) => `${r.name} ${r.id}`,
      facets: [{ id: 'status', label: 'Status', any: 'Any status', of: (r) => r.status }],
    });
    return page(filtered(bar,
      <Card title={titled('key', 'Payouts')}>
        <DataTable columns={payoutColumns} rows={shown} selectable={false} pager={false} empty="No payouts match"
          density="dense" zebra pinnedIdentity scrollLabel="Payouts, scroll for more columns" rowState={(r) => (r.name === '1164' ? 'target' : undefined)} />
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
