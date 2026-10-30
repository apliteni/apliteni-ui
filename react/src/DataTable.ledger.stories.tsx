import type { ReactNode } from 'react';
import { DataTable, type Column } from './DataTable';
import { Badge } from './primitives/Badge';
import { Button } from './primitives/Button';
import { Card } from './primitives/Card';
import { Icon } from './primitives/Icon';
import { EmptyState } from './EmptyState';
import { NumericValue } from './TableValues';

export default { title: 'React/DataTable ledgers' };

const page = (children: ReactNode, width: number | string = 720) => <div style={{ maxWidth: width }}>{children}</div>;
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
  render: () => page(
    <Card title={titled('key', 'Payouts')}>
      <DataTable columns={payoutColumns} rows={PAYOUTS} selectable={false} pager={false}
        density="dense" zebra pinnedIdentity scrollLabel="Payouts, scroll for more columns" rowState={(r) => (r.name === '1164' ? 'target' : undefined)} />
    </Card>, 1040,
  ),
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
  render: () => page(
    <Card title={titled('key', 'Access & agents')}>
      <DataTable columns={agentColumns} rows={AGENTS} selectable={false} pager={false}
        rowState={(r) => (r.dead ? 'dead' : undefined)} />
    </Card>,
  ),
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
export const WithTotals = {
  render: () => page(
    <Card title="Sample invoice">
      <DataTable caption="Sample services and totals in EUR" selectable={false} pager={false} density="dense" hover={false}
        rows={LINES}
        columns={[{ key: 'name', label: 'Service', cell: 'title' }, { key: 'amount', label: 'Amount (EUR)', num: true }]}
        footer={<>
          <tr><th scope="row">Subtotal</th><td className="ui-table__num">750.00</td></tr>
          <tr><th scope="row">VAT (20%)</th><td className="ui-table__num">150.00</td></tr>
          <tr><th scope="row" className="ui-table__num--strong">Total</th><td className="ui-table__num ui-table__num--strong">900.00</td></tr>
        </>} />
    </Card>,
  ),
};

type Hours = { name: string; hours: number };
export const CompactRowHeaders = {
  render: () => page(
    <Card title="Sample services">
      <DataTable caption="Service hours with row headers" selectable={false} pager={false} density="compact" hover={false}
        rows={[{ name: 'Interface design', hours: 6 }, { name: 'Prototype review', hours: 4 }] as Hours[]}
        columns={[{ key: 'name', label: 'Service', rowHeader: true }, { key: 'hours', label: 'Hours', num: true }]} />
    </Card>, 'var(--panel-lg)',
  ),
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
  render: () => page(
    <Card title="October payments">
      <DataTable selectable={false} pager={false} pinnedIdentity
        scrollLabel="October payments, scroll for more columns" rows={PAYMENTS}
        columns={[
          { key: 'name', label: 'Counterparty', rowHeader: true },
          { key: 'date', label: 'Date' },
          { key: 'amount', label: 'Amount', num: true },
          { key: 'note', label: 'Notes', cell: 'long' },
        ]} />
    </Card>, 1040,
  ),
};
