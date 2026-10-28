// The rail the reader folds (#277), in React, under the vanilla page's title and id.
// Both states pass the fold, so each story shows the same thing on a first visit;
// the toggle still works and remembers the choice in the shared rail cookie.
import type { Meta, StoryObj } from '@storybook/react';
import type { ReactNode } from 'react';
import { ACCOUNT_NAV } from '@apliteni/apliteni-ui';
import { DemoShell, type DemoNavItem } from './_demo-shell';
import { Card } from '../../react/src/primitives/Card';

const meta: Meta = { title: 'Showcases/Collapsible rail', id: 'apps-collapsible-rail', parameters: { layout: 'fullscreen' } };
export default meta;

// The React rail draws sections flat and without counts (#717), so the vanilla
// demo's Payouts group gives its two rows to the rail directly.
const NAV: DemoNavItem[] = [
  { id: 'overview', icon: 'chart', label: 'Overview' },
  { id: 'pending', icon: 'clock', label: 'Pending' },
  { id: 'history', icon: 'doc', label: 'History' },
  ...(ACCOUNT_NAV as DemoNavItem[]),
];

const Row = ({ lab, hint, children }: { lab: string; hint: string; children: ReactNode }) =>
  <div className="ui-card__row"><div><div className="lab">{lab}</div><div className="hint">{hint}</div></div>{children}</div>;

const Screen = ({ collapsed }: { collapsed: boolean }) =>
  <DemoShell layout="rail" nav={NAV} active="pending" defaultCollapsed={collapsed} title="Pending payouts"
    lede="Three payouts are waiting for a second approval.">
    <Card title="Waiting for approval">
      <Row lab="Northwind Traders" hint="Requested by Ada Lovelace"><span>€4,200.00</span></Row>
      <Row lab="Globex" hint="Requested by Ada Lovelace"><span>€860.00</span></Row>
      <Row lab="Initech" hint="Requested by Ada Lovelace"><span>€1,975.50</span></Row>
    </Card>
  </DemoShell>;

export const Expanded: StoryObj = { render: () => <Screen collapsed={false} /> };
export const Collapsed: StoryObj = { render: () => <Screen collapsed /> };
