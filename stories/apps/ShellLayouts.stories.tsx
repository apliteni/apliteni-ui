// The two shell layouts, each at both content widths (#308), in React, under the
// vanilla page's title and id. One composition: what differs between any two
// screens is the layout or the width and nothing else.
import type { Meta, StoryObj } from '@storybook/react';
import { DemoShell, type DemoNavItem } from './_demo-shell';
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

const Screen = ({ layout, width }: { layout: 'topbar' | 'rail'; width: 'wide' | 'centered' }) =>
  <DemoShell word="Finance" layout={layout} width={width} nav={NAV} active="reports" title="Payouts"
    lede="Two of the four that arrived this week are waiting for a second approval."
    crumbs={[{ label: 'Finance', href: '#' }, { label: 'Payouts' }]} palette={layout === 'topbar' ? PALETTE : undefined}>
    {/* The table stays a direct child of the card, as the finance screens' does. */}
    <Card title="Payouts this week">
      <table className="ui-table ui-table--dense ui-table--zebra">
        <thead><tr><th>Client</th><th>Arrival</th><th className="ui-table__num">Net (EUR)</th><th>Status</th></tr></thead>
        <tbody>{ROWS.map(([client, day, net, status]) => <tr key={client}><td>{client}</td><td>{day}</td>
          <td className="ui-table__num">{net}</td><td><Badge variant={status === 'Paid' ? 'success' : 'warning'}>{status}</Badge></td></tr>)}</tbody>
      </table>
    </Card>
    <Card title="What the width does">
      <p>This screen is the <b>{width}</b> column. The wide column fills the well; the centred one is capped and sits in the middle of it.</p>
    </Card>
  </DemoShell>;

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
