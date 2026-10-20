import type { ReactNode } from 'react';
import { DataTable, type Column } from './DataTable';
import { Badge } from './primitives/Badge';
import { Button } from './primitives/Button';
import { Card } from './primitives/Card';
import { Icon } from './primitives/Icon';
import { EmptyState } from './EmptyState';
import { NumericValue, RowIdentity } from './TableValues';

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

// A stacked phone row clips the column heads, so each amount column names itself in front of
// its figure, and the net head carries the currency once.
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
        density="dense" zebra stack rowState={(r) => (r.name === '1164' ? 'target' : undefined)} />
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

type Entry = { name: string; area: string; time: string; change: string };
const AUDIT: Entry[] = [
  { name: 't.quill', area: 'Billing', time: '09:12', change: 'Raised the monthly spend cap on the Harbor Software workspace from 2,000 to 5,000 EUR, after the June reconciliation closed short.' },
  { name: 'm.arbor', area: 'Access', time: '08:40', change: 'Revoked the Old integration token. Read-only scope, unused for three weeks.' },
  { name: 'Review bot', area: 'Content', time: '08:02', change: 'Flagged four pages for a second read: the pricing table and the trial terms disagree on how long the trial runs.' },
];
export const StackedLog = {
  render: () => page(
    <Card title={titled('clock', 'Audit log')}>
      <DataTable selectable={false} pager={false} density="dense" stack rows={AUDIT}
        columns={[{ key: 'name', label: 'Who', cell: 'code' }, { key: 'area', label: 'Area' }, { key: 'time', label: 'Time' }, { key: 'change', label: 'Change', cell: 'long' }]} />
    </Card>,
  ),
};

type Desk = { name: string; symbol: string; weight: string; lots: string; note: string };
const DESKS: Desk[] = [
  { symbol: 'NORT', name: 'Northstar Analytics', weight: '128.40', lots: '3', note: 'Rebalanced into short-duration paper after the June print; the committee asked for the note to be kept on the position until September.' },
  { symbol: 'HARB', name: 'Harbor Software', weight: '96.12', lots: '12', note: 'Holding. The renewal cohort is the whole thesis and it does not settle until the next quarter closes.' },
  { symbol: 'CEDA', name: 'Cedar Infrastructure', weight: '71.85', lots: '2', note: 'Trimmed on the roll. Fabricated position, kept here because the note runs longer than the row.' },
  { symbol: '', name: 'Cedar Infrastructure Holdings International', weight: '18.40', lots: '4', note: 'Watchlist line. It keeps the direct link shape that consumers can write without marking the cell.' },
];
export const StackedPinned = {
  render: () => page(
    <Card title={titled('table', 'Desk notes')}>
      <DataTable selectable={false} pager={false} density="dense" stack stickyHeader pinnedIdentity
        scrollLabel="Desk notes, scroll for more rows" rows={DESKS}
        columns={[
          { key: 'name', label: 'Company', linked: true, render: (r) => r.symbol ? <RowIdentity symbol={r.symbol} name={r.name} href="#position" /> : r.name },
          { key: 'weight', label: <>Weight</>, num: true, render: (r) => <NumericValue value={r.weight} unit="bp" /> },
          { key: 'lots', label: <>Size</>, num: true, render: (r) => <NumericValue value={r.lots} unit="lots" /> },
          { key: 'note', label: 'Note', cell: 'long' },
        ]} />
    </Card>, 860,
  ),
};
