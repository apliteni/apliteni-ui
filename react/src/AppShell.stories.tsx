import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { AppShell, type AppShellProps } from './AppShell';
import { Card } from './primitives/Card';
import { KeyValueList } from './KeyValueList';
import { Badge } from './primitives/Badge';
import { Button } from './primitives/Button';

const sections = [
  { href: '/overview', label: 'Overview', icon: 'home' },
  { href: '/reports', label: 'Reports', icon: 'chart', count: 3 },
  { href: '/files', label: 'Files', icon: 'folder' },
  { href: '/settings', label: 'Settings', icon: 'gear' },
  { href: '/support', label: 'Support', icon: 'mail' },
];
function Example(args: Partial<AppShellProps>) {
  const [pathname, setPathname] = useState('/reports');
  return <AppShell sections={sections} pathname={pathname} title="Reports" word="Demo"
    lede="Review the latest reports for the demo workspace."
    account={{ name: 'Demo User', email: 'demo@example.com' }} onSignOut={() => {}}
    renderLink={(section, props) => <a {...props} onClick={(event) => {
      props.onClick?.(event);
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault(); setPathname(section.href);
    }} />}
    {...args}>
    <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
      <Card title="Weekly activity">
        <KeyValueList rows={[
          { label: 'Period', value: '21–27 September 2026' },
          { label: 'Status', value: <Badge variant="success">Ready</Badge> },
          { label: 'Files', value: '12 added' },
          { label: 'Updated', value: '26 September 2026' },
        ]} />
      </Card>
      <Card title="Report schedule">
        <KeyValueList rows={[
          { label: 'Frequency', value: 'Every Monday' },
          { label: 'Format', value: 'CSV' },
          { label: 'Includes', value: 'Files and activity' },
        ]} />
      </Card>
    </div>
  </AppShell>;
}
const render = (args: AppShellProps) => <Example {...args} />;
const meta: Meta<typeof AppShell> = {
  title: 'React/AppShell', component: AppShell, parameters: { layout: 'fullscreen', viewport: { options: {
    tablet: { name: 'Tablet', styles: { width: '700px', height: '800px' }, type: 'tablet' },
    phone: { name: 'Phone', styles: { width: '390px', height: '844px' }, type: 'mobile' },
  } } },
  render,
};
export default meta;
type Story = StoryObj<typeof AppShell>;
export const Centered: Story = { render };
export const Folded: Story = { render, args: { defaultCollapsed: true } };
export const Wide: Story = { render, args: { width: 'wide',
  back: { href: '/overview', label: 'Overview' }, actions: <Button>New report</Button>,
  bandControl: <Button variant="ghost" size="sm">Workspace</Button> } };
export const Tablet: Story = { render, globals: { viewport: { value: 'tablet', isRotated: false } } };
export const Phone: Story = { render, globals: { viewport: { value: 'phone', isRotated: false } } };
