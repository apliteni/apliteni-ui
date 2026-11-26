import type { Meta, StoryObj } from '@storybook/react';
import { NavTabs } from './NavTabs';

const meta: Meta<typeof NavTabs> = {
  title: 'React/NavTabs', component: NavTabs,
  parameters: { layout: 'fullscreen' },
  render: args => <div style={{ padding: 40, minHeight: '100vh' }}><NavTabs {...args} /></div>,
  args: {
    'aria-label': 'Finance views', active: 'orders',
    items: [
      { id: 'summary', label: 'Summary' },
      { id: 'orders', label: 'Orders', badge: 3 },
      { id: 'transactions', label: 'Transactions' },
      { id: 'disputes', label: 'Disputes', badge: { text: 2, tone: 'danger' } },
      { id: 'exports', label: 'Exports', disabled: true },
    ],
  },
};
export default meta;
export const Underline: StoryObj<typeof NavTabs> = {};
export const Pill: StoryObj<typeof NavTabs> = { args: { variant: 'pill' } };
