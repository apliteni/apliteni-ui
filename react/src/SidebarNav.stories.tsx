import type { Meta, StoryObj } from '@storybook/react';
import { SidebarNav, type SidebarNavBlock, type SidebarNavGroup } from './SidebarNav';
import { Icon } from './primitives/Icon';

const meta: Meta<typeof SidebarNav> = { title: 'React/SidebarNav', component: SidebarNav, render: args => <SidebarNav {...args} /> };
export default meta;

// A sidebar takes group labels or sub-items, never both (#843). These are the two forms.
const groups: SidebarNavGroup[] = [
  {
    label: 'Overview',
    items: [
      { id: 'home', icon: 'chart', label: 'Dashboard' },
      { id: 'activity', icon: 'bolt', label: 'Activity', badge: 4 },
      { id: 'inbox', icon: 'mail', label: 'Inbox', badge: { text: 12, tone: 'accent' } },
    ],
  },
  {
    label: 'Finance',
    items: [
      { id: 'revenue', icon: 'chart', label: 'Revenue' },
      { id: 'orders', icon: 'card', label: 'Orders' },
      { id: 'invoices', icon: 'doc', label: 'Invoices', badge: { text: 'due', tone: 'danger' } },
    ],
  },
  {
    label: 'Workspace',
    items: [
      { id: 'members', icon: 'user', label: 'Members' },
      { id: 'keys', icon: 'key', label: 'API keys' },
      { id: 'settings', icon: 'gear', label: 'Settings', disabled: true },
    ],
  },
];
const nested: SidebarNavBlock[] = [{
  items: [
    { id: 'home', icon: 'chart', label: 'Dashboard' },
    { id: 'inbox', icon: 'mail', label: 'Inbox', badge: { text: 12, tone: 'accent' } },
    {
      id: 'orders', icon: 'card', label: 'Orders',
      items: [
        { id: 'orders-open', label: 'Open', badge: 3 },
        { id: 'orders-drafts', label: 'Drafts' },
        { id: 'orders-archive', label: 'Archive' },
      ],
    },
    { id: 'invoices', icon: 'doc', label: 'Invoices', badge: { text: 'due', tone: 'danger' } },
    { id: 'settings', icon: 'gear', label: 'Settings', disabled: true },
  ],
}];

const footer = <a className="ui-nav__item is-danger" href="#logout" aria-label="Sign out">
  <span className="ui-nav__ic"><Icon name="logout" /></span><span className="ui-nav__label">Sign out</span>
</a>;
// Sub-items under no group label. The current sub-item shows, and its parent is current.
export const Sidebar: StoryObj<typeof SidebarNav> = {
  args: { sections: nested, active: 'orders-open', 'aria-label': 'Primary', footer },
};
// Group labels over rows with no sub-items.
export const Groups: StoryObj<typeof SidebarNav> = {
  args: { sections: groups, active: 'orders', 'aria-label': 'Primary', footer },
};
// The folded rail holds its caps, labels and counts at opacity 0, so the rail alone
// renders no text a contrast walk can judge. The vanilla gallery's specimen caption
// is what gives its own collapsed story a pair; this is that caption, in the story
// rather than a decorator, because the contrast gate calls `render` and not the
// decorators around it. The rail itself is unchanged.
export const SidebarCollapsed: StoryObj<typeof SidebarNav> = {
  args: { ...Sidebar.args, collapsed: true },
  render: args => <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
    <div style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-semibold)' }}>
      Icon-only rail. Each icon keeps its label as a tooltip.
    </div>
    <SidebarNav {...args} />
  </div>,
};
export const ActiveBadge: StoryObj<typeof SidebarNav> = {
  args: { sections: [groups[0]], active: 'inbox', 'aria-label': 'Overview' },
};
export const RouterLink: StoryObj<typeof SidebarNav> = {
  args: { ...Sidebar.args, renderLink: (item, props) => <a {...props} data-route={item.id} /> },
};
