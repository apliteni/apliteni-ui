import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { AppShell, type AppShellProps } from './AppShell';
import { Card } from './primitives/Card';
import { KeyValueList } from './KeyValueList';
import { Badge } from './primitives/Badge';
import { Button } from './primitives/Button';
import { Dropdown } from './Dropdown';

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
    account={{ name: 'Demo User', email: 'demo@example.com' }} onSignOut={() => {}}
    renderLink={(section, props) => <a {...props} onClick={(event) => {
      props.onClick?.(event);
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault(); setPathname(section.href);
    }} />}
    {...args}>
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
// A band with a control on it beside the reader's mark — the crowding that left the
// trigger a few characters and truncated its sentence mid-word. It draws `Search`
// here, and the button's name is the same as at every other width. AppShell.test.tsx
// asserts that name; do not quote it back here, because an ungated copy is what three
// edits in a row corrupted. (#486)
export const Phone: Story = { render, globals: { viewport: { value: 'phone', isRotated: false } },
  args: { bandControl: <Button variant="ghost" size="sm">Workspace</Button> } };

export const PhoneDropdown: Story = { render, globals: { viewport: { value: 'phone', isRotated: false } },
  args: { bandControl: <Dropdown variant="menu" ariaLabel="Workspace" triggerContent="Workspace"
    items={[{ label: 'Demo workspace', value: 'demo' }, { label: 'Sample workspace', value: 'sample' }]} /> } };

export const RailCentered: Story = { render, args: { layout: 'rail' } };
export const RailWide: Story = { render, args: { layout: 'rail', width: 'wide' } };
export const RailFolded: Story = { render, args: { layout: 'rail', defaultCollapsed: true } };
export const RailPhone: Story = { render, args: { layout: 'rail' },
  globals: { viewport: { value: 'phone', isRotated: false } } };
