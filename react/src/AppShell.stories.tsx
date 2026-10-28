import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { AppShell, type AppShellProps } from './AppShell';
import { Card } from './primitives/Card';
import { Badge } from './primitives/Badge';
import { DataTable } from './DataTable';
import { Button } from './primitives/Button';
import { Dropdown } from './Dropdown';
import { icon } from '@apliteni/apliteni-ui';
import { expect, userEvent, within } from 'storybook/test';

const sections = [
  { href: '/overview', label: 'Overview', icon: 'chart' },
  { href: '/campaigns', label: 'Campaigns', icon: 'card' },
  { href: '/reports', label: 'Reports', icon: 'table' },
  { href: '/agents', label: 'Access & agents', icon: 'user' },
  { href: '/prefs', label: 'Preferences', icon: 'gear' },
];

const rows = [
  { name: 'Northwind Traders', day: '2026-09-11', net: '4,200.00', status: 'Paid' },
  { name: 'Globex', day: '2026-09-10', net: '860.00', status: 'Pending' },
  { name: 'Initech', day: '2026-09-09', net: '1,975.50', status: 'Pending' },
  { name: 'Umbrella', day: '2026-09-08', net: '312.40', status: 'Paid' },
];
const columns = [
  { key: 'name', label: 'Client' },
  { key: 'day', label: 'Arrival' },
  { key: 'net', label: 'Net (EUR)', num: true },
  { key: 'status', label: 'Status', render: (row: typeof rows[number]) =>
    <Badge variant={row.status === 'Paid' ? 'success' : 'warning'}>{row.status}</Badge> },
] satisfies import('./DataTable').Column<typeof rows[number]>[];

function Example(args: Partial<AppShellProps>) {
  const [pathname, setPathname] = useState('/reports');
  const width = args.width === 'wide' ? 'wide' : 'centered';
  return <AppShell sections={sections} pathname={pathname} title="Payouts" word="Finance"
    lede="Two of the four that arrived this week are waiting for a second approval."
    account={{ name: 'Ada Lovelace', email: 'ada@apliteni.com' }} onSignOut={() => {}}
    renderLink={(section, props) => <a {...props} onClick={(event) => {
      props.onClick?.(event);
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault(); setPathname(section.href);
    }} />}
    {...args}>
      <Card title="Payouts this week">
        <DataTable columns={columns} rows={rows} selectable={false} pager={false} dense zebra hover={false} />
      </Card>
      <Card title="What the width does">
        <p>This screen is the <b>{width}</b> column. The wide column fills the well; the centred one is capped and sits in the middle of it.</p>
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

// A product band: the company name under the sidebar head, and a notifications bell in
// the head, before the fold. On a phone the bell stands in the menu panel's head. (#729, #732)
const company = <span style={{ whiteSpace: 'nowrap' }}>Apliteni OÜ</span>;
const bell = <Dropdown variant="menu" ariaLabel="Notifications" chevron={false}
  triggerContent={<span className="ic" aria-hidden="true" dangerouslySetInnerHTML={{ __html: icon('bell') }} />} items={[{ label: 'No new notifications', value: 'none' }]} />;
export const PhoneCompany: Story = { render, globals: { viewport: { value: 'phone', isRotated: false } },
  args: { bandControl: company, headControl: bell } };

// Small page tools at the end of the title row, and the product's own rows in the account
// menu, above the Theme row and Sign out. The page opens on its title alone. (#736)
const tools = <><Badge>v3</Badge><Button size="sm" icon="layout">Customize</Button></>;
const accountItems = [{ label: 'Account settings', icon: 'gear' }, { label: 'Support', icon: 'chat', href: '#support' }];
export const PageTools: Story = { render, args: { lede: undefined, tools, accountItems } };
export const PageToolsPhone: Story = { render, globals: { viewport: { value: 'phone', isRotated: false } },
  args: { lede: undefined, tools, accountItems } };

// The Theme row opens its submenu: beside the menu in the sidebar, in place of the
// menu's rows in the phone drawer. Enter opens it on the first choice (#736).
const openTheme = async (where: HTMLElement) => {
  const scope = within(where);
  await userEvent.click(scope.getByRole('button', { name: /^Signed in as/ }));
  scope.getByRole('menuitem', { name: /^Theme/ }).focus();
  await userEvent.keyboard('{Enter}');
  await expect(within(document.body).getByRole('menu', { name: 'Theme' })).toBeVisible();
};
export const ThemeSubmenu: Story = { render, args: { lede: undefined, accountItems },
  play: async ({ canvasElement }) => openTheme(within(canvasElement).getByRole('region', { name: 'Sidebar' })) };
export const ThemeSubmenuPhone: Story = { render, globals: { viewport: { value: 'phone', isRotated: false } },
  args: { lede: undefined, accountItems },
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Menu' }));
    await openTheme(within(document.body).getByRole('dialog').querySelector('.ui-app__drawer') as HTMLElement);
  } };
