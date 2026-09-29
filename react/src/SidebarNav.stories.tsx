import type { Meta, StoryObj } from '@storybook/react';
import { SidebarNav, type SidebarNavSection } from './SidebarNav';
import { Icon } from './primitives/Icon';

const meta: Meta<typeof SidebarNav> = { title: 'React/SidebarNav', component: SidebarNav, render: args => <SidebarNav {...args} /> };
export default meta;

const sections: SidebarNavSection[] = [
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
      {
        id: 'payouts', icon: 'card', label: 'Payouts',
        items: [
          { id: 'payouts-pending', label: 'Pending', badge: 3 },
          { id: 'payouts-history', label: 'History' },
          { id: 'payouts-methods', label: 'Methods' },
        ],
      },
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


const footer = <a className="ui-nav__item is-danger" href="#logout" aria-label="Sign out">
  <span className="ui-nav__ic"><Icon name="logout" /></span><span className="ui-nav__label">Sign out</span>
</a>;
export const Sidebar: StoryObj<typeof SidebarNav> = {
  args: { sections, active: 'payouts-pending', 'aria-label': 'Primary', footer },
};
export const SidebarCollapsed: StoryObj<typeof SidebarNav> = {
  args: { ...Sidebar.args, collapsed: true },
};
export const ActiveBadge: StoryObj<typeof SidebarNav> = {
  args: { sections: [sections[0]], active: 'inbox', 'aria-label': 'Overview' },
};
export const RouterLink: StoryObj<typeof SidebarNav> = {
  args: { ...Sidebar.args, renderLink: (item, props) => <a {...props} data-route={item.id} /> },
};
