import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { AppShell, type AppShellGroup, type AppShellProps, type AppShellSection } from './AppShell';
import { Card } from './primitives/Card';
import { Badge } from './primitives/Badge';
import { Icon } from './primitives/Icon';
import { DataTable } from './DataTable';
import { Button } from './primitives/Button';
import { DatePicker } from './DatePicker';
import { Dropdown } from './Dropdown';
import { FilterBar } from './FilterBar';
import { SearchField } from './SearchField';
import { icon } from '@apliteni/apliteni-ui';
import { expect, userEvent, within } from 'storybook/test';

const sections = [
  { href: '/overview', label: 'Overview', icon: 'chart' },
  { href: '/campaigns', label: 'Campaigns', icon: 'card' },
  { href: '/reports', label: 'Reports', icon: 'table' },
  { href: '/agents', label: 'Access & agents', icon: 'user' },
  { href: '/prefs', label: 'Preferences', icon: 'gear' },
];

// The sidebar's two forms (#843): sub-items under no group label, or group labels over
// sections with no sub-items. Never both.
const nested: AppShellSection[] = [
  { href: '/overview', label: 'Overview', icon: 'chart' },
  { href: '/payouts', label: 'Payouts', icon: 'card', items: [
    { href: '/payouts/pending', label: 'Pending', count: 3 },
    { href: '/payouts/history', label: 'History' },
    { href: '/payouts/methods', label: 'Methods' },
  ] },
  { href: '/reports', label: 'Reports', icon: 'table' },
  { href: '/prefs', label: 'Preferences', icon: 'gear' },
];
const groups: AppShellGroup[] = [
  { label: 'Money', sections: [
    { href: '/overview', label: 'Overview', icon: 'chart' },
    { href: '/payouts', label: 'Payouts', icon: 'card', count: 3 },
    { href: '/reports', label: 'Reports', icon: 'table' },
  ] },
  { label: 'Workspace', sections: [
    { href: '/agents', label: 'Access & agents', icon: 'user' },
    { href: '/prefs', label: 'Preferences', icon: 'gear' },
  ] },
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
// The status chip starts unset, so the table opens on every payout.
const status = { id: 'status', label: 'Status', items: [{ label: 'Any status', value: '' }, { label: 'Paid', value: 'Paid' }, { label: 'Pending', value: 'Pending' }] };

function Example({ sections: own, groups: grouped, ...args }: Partial<AppShellProps>) {
  const [pathname, setPathname] = useState(args.pathname ?? '/reports');
  const nav = grouped ? { groups: grouped } : { sections: own ?? sections };
  const width = args.width === 'wide' ? 'wide' : 'centered';
  const [query, setQuery] = useState('');
  const [state, setState] = useState('');
  const term = query.trim().toLowerCase();
  const shown = rows.filter(row => (!state || row.status === state) && row.name.toLowerCase().includes(term));
  return <AppShell {...nav} title="Payouts" word="Finance"
    lede="Two of the four that arrived this week are waiting for a second approval."
    account={{ name: 'Ada Lovelace', email: 'ada@apliteni.com' }} onSignOut={() => {}}
    renderLink={(section, props) => <a {...props} onClick={(event) => {
      props.onClick?.(event);
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault(); setPathname(section.href);
    }} />}
    {...args} pathname={pathname}>
      {/* Each long table has its filter bar directly above it, on the page with no card
          of its own. why: docs/components.md#fields */}
      <div className="ui-toolbar">
        <SearchField ariaLabel="Search payouts" placeholder="Client" value={query} onChange={(e) => setQuery(e.currentTarget.value)} />
        <FilterBar filters={[{ ...status, value: state }]} label="Payout filters"
          onChange={(_, value) => setState(value ?? '')} onRemove={() => setState('')} onClear={() => setState('')} />
      </div>
      <Card title="Payouts this week">
        <DataTable columns={columns} rows={shown} selectable={false} pager={false} dense zebra hover={false} />
      </Card>
      <Card title="What the width does">
        <p>This screen is the <b>{width}</b> column. The wide column fills the well; the centered one is capped and sits in the middle of it.</p>
      </Card>
  </AppShell>;
}
const render = (args: AppShellProps) => <Example {...args} />;
const meta: Meta<typeof AppShell> = {
  title: 'React/AppShell', component: AppShell, parameters: { layout: 'fullscreen', viewport: { options: {
    tablet: { name: 'Tablet', styles: { width: '700px', height: '800px' }, type: 'tablet' },
    phone: { name: 'Phone', styles: { width: '390px', height: '844px' }, type: 'mobile' },
    desktop: { name: 'Desktop', styles: { width: '1280px', height: '800px' }, type: 'desktop' },
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

// The menu drawer opens from the band's end, the side of its menu button (#790).
export const PhoneMenu: Story = { render, globals: { viewport: { value: 'phone', isRotated: false } },
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Menu' }));
    await expect(within(document.body).getByRole('dialog')).toBeVisible();
  } };

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
// A period picker and a view action in the title row. On a phone they go under the title. #832
const periodTools = <><DatePicker mode="range" ariaLabel="Period" today="2026-09-15" align="end"
  defaultRange={{ start: '2026-07', end: '2026-09' }} /><Button size="sm" icon="layout">Customize</Button></>;
export const PeriodTools: Story = { render, args: { lede: undefined, tools: periodTools, accountItems } };
export const PeriodToolsPhone: Story = { render, globals: { viewport: { value: 'phone', isRotated: false } },
  args: { lede: undefined, tools: periodTools, accountItems } };

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

// The sidebar's two forms, at 1280px and in the phone menu at 390px (#843). The current
// sub-item shows, and its parent row is current too.
const openMenu: Story['play'] = async ({ canvasElement }) => {
  await userEvent.click(within(canvasElement).getByRole('button', { name: 'Menu' }));
  await expect(within(document.body).getByRole('dialog')).toBeVisible();
};
export const SubItems: Story = { render, args: { sections: nested, pathname: '/payouts/pending' } };
export const SubItemsPhone: Story = { render, globals: { viewport: { value: 'phone', isRotated: false } },
  args: { sections: nested, pathname: '/payouts/pending' }, play: openMenu };
export const Groups: Story = { render, args: { groups, pathname: '/payouts' } };
export const GroupsPhone: Story = { render, globals: { viewport: { value: 'phone', isRotated: false } },
  args: { groups, pathname: '/payouts' }, play: openMenu };
export const RailGroups: Story = { render, args: { layout: 'rail', groups, pathname: '/payouts' } };
export const RailGroupsPhone: Story = { render, globals: { viewport: { value: 'phone', isRotated: false } },
  args: { layout: 'rail', groups, pathname: '/payouts' }, play: openMenu };

// A notifications bell at the band's right end, at 1280px and 390px, dark and light, in
// each sidebar structure and with no sidebar (#847). The count stands on the glyph's
// corner, and a read bell shows none. A second action is a ghost Button.
const endBell = (unread: number) => <Dropdown variant="menu" align="end" chevron={false} title="Notifications"
  ariaLabel={unread ? `Notifications, ${unread} unread` : 'Notifications'}
  triggerContent={<><Icon name="bell" />{unread > 0 && <span aria-hidden="true"><Badge>{unread}</Badge></span>}</>}
  header={<div className="ui-dropdown__head"><b>Notifications</b></div>}
  items={[{ label: 'Payout run PR-204 failed', value: 'payout', href: '#payout' },
    { label: 'CMP-88 assigned to you', value: 'assign', href: '#assign' },
    { label: 'Jon Avery commented', value: 'comment', href: '#comment' }]} />;
const bandBell = endBell(3);
const bandPair = <>{bandBell}<Button variant="ghost" icon="moreHorizontal" iconOnly aria-label="More actions" title="More actions" /></>;
const desktop = { viewport: { value: 'desktop', isRotated: false } };
const phone = { viewport: { value: 'phone', isRotated: false } };
const alone = { sections: [{ href: '/overview', label: 'Overview', icon: 'chart' }], pathname: '/overview' } satisfies Partial<AppShellProps>;
export const BandActions: Story = { render, globals: desktop, args: { bandActions: bandBell } };
export const BandActionsLight: Story = { render, globals: { ...desktop, theme: 'light' }, args: { bandActions: bandBell } };
export const BandActionsPhone: Story = { render, globals: phone, args: { bandActions: bandBell } };
export const BandActionsPhoneLight: Story = { render, globals: { ...phone, theme: 'light' }, args: { bandActions: bandBell } };
export const BandActionsGroups: Story = { render, globals: desktop, args: { groups, pathname: '/payouts', bandActions: bandBell } };
export const BandActionsSubItems: Story = { render, globals: desktop, args: { sections: nested, pathname: '/payouts/pending', bandActions: bandBell } };
export const BandActionsAlone: Story = { render, globals: desktop, args: { ...alone, bandActions: bandBell } };
export const BandActionsAlonePhone: Story = { render, globals: phone, args: { ...alone, bandActions: bandBell } };
export const BandActionsPair: Story = { render, globals: desktop, args: { bandActions: bandPair } };
export const BandActionsPairPhone: Story = { render, globals: phone, args: { bandActions: bandPair } };
export const BandActionsReadPhone: Story = { render, globals: phone, args: { bandActions: endBell(0) } };
