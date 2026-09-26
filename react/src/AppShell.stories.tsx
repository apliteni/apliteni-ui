import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { AppShell, type AppShellProps } from './AppShell';
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
    account={{ name: 'Demo User', email: 'demo@example.com' }} onSignOut={() => {}}
    renderLink={(section, props) => <a {...props} onClick={(event) => {
      props.onClick?.(event);
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault(); setPathname(section.href);
    }} />}
    {...args}><p>No reports yet.</p></AppShell>;
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
export const Wide: Story = { render, args: { width: 'wide', lede: 'Reports from your workspace.',
  back: { href: '/overview', label: 'Overview' }, actions: <Button>New report</Button>,
  bandControl: <Button variant="ghost" size="sm">Workspace</Button> } };
export const Tablet: Story = { render, globals: { viewport: { value: 'tablet', isRotated: false } } };
export const Phone: Story = { render, globals: { viewport: { value: 'phone', isRotated: false } } };
