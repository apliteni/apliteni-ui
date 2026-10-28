// The two shell layouts, each at both content widths (#308), in React, under the
// vanilla page's title and id. One composition: what differs between any two
// screens is the layout or the width and nothing else.
import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { DemoShell, type DemoNavItem } from './_demo-shell';
import { FilterBar } from '../../react/src/FilterBar';
import { SearchField } from '../../react/src/SearchField';
import { EmptyState } from '../../react/src/EmptyState';
import { Button } from '../../react/src/primitives/Button';
import { Badge } from '../../react/src/primitives/Badge';
import { Card } from '../../react/src/primitives/Card';

const meta: Meta = {
  title: 'Showcases/Shell layouts',
  id: 'apps-shell-layouts',
  parameters: {
    layout: 'fullscreen',
    viewport: { options: { phone: { name: 'Phone', styles: { width: '390px', height: '844px' }, type: 'mobile' } } },
  },
};
export default meta;

const NAV: DemoNavItem[] = [
  { id: 'overview', icon: 'chart', label: 'Overview' },
  { id: 'campaigns', icon: 'card', label: 'Campaigns' },
  // The rail layout draws no counts (#717); the top bar layout shows this one.
  { id: 'reports', icon: 'table', label: 'Reports', count: 4 },
  { id: 'agents', icon: 'user', label: 'Access & agents' },
  { id: 'prefs', icon: 'gear', label: 'Preferences' },
];

// The topbar layout's search field is the way into this palette.
const PALETTE = { groups: [{ label: 'Go to', items: [
  { id: 'overview', label: 'Overview', description: 'Traffic and revenue', icon: 'chart', href: '#overview' },
  { id: 'reports', label: 'Reports', description: 'Four waiting for approval', icon: 'table', href: '#reports' },
  { id: 'prefs', label: 'Preferences', description: 'Locale, currency, notifications', icon: 'gear', href: '#prefs' },
] }] };

const ROWS = [
  ['Northwind Traders', '2026-09-11', '4,200.00', 'Paid'],
  ['Globex', '2026-09-10', '860.00', 'Pending'],
  ['Initech', '2026-09-09', '1,975.50', 'Pending'],
  ['Umbrella', '2026-09-08', '312.40', 'Paid'],
];

// The status chip starts unset, so the table opens on every payout.
const STATUS = { id: 'status', label: 'Status', items: [{ label: 'Any status', value: '' }, { label: 'Paid', value: 'Paid' }, { label: 'Pending', value: 'Pending' }] };

const Screen = ({ layout, width }: { layout: 'topbar' | 'rail'; width: 'wide' | 'centered' }) => {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const term = query.trim().toLowerCase();
  const rows = ROWS.filter(([client, , , state]) => (!status || state === status) && client.toLowerCase().includes(term));
  const clear = () => { setQuery(''); setStatus(''); };
  return <DemoShell word="Finance" layout={layout} width={width} nav={NAV} active="reports" title="Payouts"
    lede="Two of the four that arrived this week are waiting for a second approval."
    palette={layout === 'topbar' ? PALETTE : undefined}>
    {/* Every table has its filter bar directly above it, on a card because a field
        never stands on the page ground. why: guidelines/dense-tables.md */}
    <Card><div className="ui-toolbar">
      <SearchField ariaLabel="Search payouts" placeholder="Client" value={query} onChange={(e) => setQuery(e.currentTarget.value)} />
      <FilterBar filters={[{ ...STATUS, value: status }]} label="Payout filters"
        onChange={(_, value) => setStatus(value ?? '')} onRemove={() => setStatus('')} onClear={() => setStatus('')} />
    </div></Card>
    {/* The table stays a direct child of the card, as the finance screens' does. */}
    <Card title="Payouts this week">
      {rows.length ? <table className="ui-table ui-table--dense ui-table--zebra">
        <thead><tr><th>Client</th><th>Arrival</th><th className="ui-table__num">Net (EUR)</th><th>Status</th></tr></thead>
        <tbody>{rows.map(([client, day, net, state]) => <tr key={client}><td>{client}</td><td>{day}</td>
          <td className="ui-table__num">{net}</td><td><Badge variant={state === 'Paid' ? 'success' : 'warning'}>{state}</Badge></td></tr>)}</tbody>
      </table> : <EmptyState title="No payouts match" sub="" icon="" actions={<Button size="sm" onClick={clear}>Clear all</Button>} />}
    </Card>
    <Card title="What the width does">
      <p>This screen is the <b>{width}</b> column. The wide column fills the well; the centred one is capped and sits in the middle of it.</p>
    </Card>
  </DemoShell>;
};

export const TopbarWide: StoryObj = { render: () => <Screen layout="topbar" width="wide" /> };
export const TopbarCentered: StoryObj = { render: () => <Screen layout="topbar" width="centered" /> };
export const RailWide: StoryObj = { render: () => <Screen layout="rail" width="wide" /> };
export const RailCentered: StoryObj = { render: () => <Screen layout="rail" width="centered" /> };

// The same band at 390px: the trigger draws its short word, and the sentence is
// still the button's name. (#486)
export const TopbarPhone: StoryObj = {
  name: 'Topbar — phone',
  globals: { viewport: { value: 'phone', isRotated: false } },
  render: () => <Screen layout="topbar" width="centered" />,
};
