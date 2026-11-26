// The rail the reader folds (#277), in React, under the vanilla page's title and id.
// Both states pass the fold, so each story shows the same thing on a first visit;
// the toggle still works and remembers the choice in the shared rail cookie.
import type { Meta, StoryObj } from '@storybook/react';
import { ACCOUNT_NAV } from '@apliteni/apliteni-ui';
import { DemoShell, type DemoNavItem } from './_demo-shell';
import { Card } from '../../react/src/primitives/Card';

const meta: Meta = { title: 'Showcases/Collapsible rail', id: 'apps-collapsible-rail', parameters: { layout: 'fullscreen' } };
export default meta;

const NAV: DemoNavItem[] = [
  { id: 'overview', icon: 'chart', label: 'Overview' },
  { id: 'reports', icon: 'table', label: 'Reports' },
  ...(ACCOUNT_NAV as DemoNavItem[]),
];

const Screen = ({ collapsed }: { collapsed: boolean }) =>
  <DemoShell layout="rail" nav={NAV} active="reports" defaultCollapsed={collapsed} title="Reports"
    lede="Each report runs again every night at 02:00 UTC.">
    <Card title="Reports"><p>Choose a report to see its details.</p></Card>
  </DemoShell>;

export const Expanded: StoryObj = { render: () => <Screen collapsed={false} /> };
export const Collapsed: StoryObj = { render: () => <Screen collapsed /> };
