// The two shell layouts, each at both content widths (#308), in React, under the
// vanilla page's title and id. One composition: what differs between any two
// screens is the layout or the width and nothing else.
import type { Meta, StoryObj } from '@storybook/react';
import { DemoShell, type DemoNavItem } from './_demo-shell';
import { Dropdown } from '../../react/src/Dropdown';
import { Badge } from '../../react/src/primitives/Badge';
import { Icon } from '../../react/src/primitives/Icon';
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
  { id: 'reports', icon: 'table', label: 'Reports' },
  { id: 'settings', icon: 'gear', label: 'Settings' },
];

// The topbar layout's search field is the way into this palette.
const PALETTE = { groups: [{ label: 'Go to', items: [
  { id: 'overview', label: 'Overview', description: 'Traffic and revenue', icon: 'chart', href: '#overview' },
  { id: 'reports', label: 'Reports', description: 'All reports', icon: 'table', href: '#reports' },
  { id: 'settings', label: 'Settings', description: 'Preferences', icon: 'gear', href: '#settings' },
] }] };

// The topbar layout's bell at the band's right end (#847). The count is its name too.
const BELL = <Dropdown variant="menu" align="end" chevron={false} title="Notifications" ariaLabel="Notifications, 2 unread"
  triggerContent={<><Icon name="bell" /><span aria-hidden="true"><Badge>2</Badge></span></>}
  header={<div className="ui-dropdown__head"><b>Notifications</b></div>}
  items={[{ label: 'Report run PR-204 failed', value: 'report', href: '#report' },
    { label: 'Jon Avery commented', value: 'comment', href: '#comment' }]} />;

const Screen = ({ layout, width }: { layout: 'topbar' | 'rail'; width: 'wide' | 'centered' }) => (
  <DemoShell word="Finance" layout={layout} width={width} nav={NAV} active="reports" title="Reports"
    lede="Everything the team needs, in one place."
    palette={layout === 'topbar' ? PALETTE : undefined} bandActions={layout === 'topbar' ? BELL : undefined}>
    <Card title="Reports"><p>Choose a report to see its details.</p></Card>
  </DemoShell>
);

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
