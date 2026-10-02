import type { Meta, StoryObj } from '@storybook/react';
import { NavTabs } from './NavTabs';

const meta: Meta<typeof NavTabs> = {
  title: 'React/NavTabs', component: NavTabs,
  parameters: { layout: 'fullscreen' },
  render: args => <div style={{ padding: 40, minHeight: '100vh' }}>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ font: '600 11px/1 var(--font-sans)' }}>
        {args.variant === 'pill' ? 'The same tabs with a pill active affordance instead of an underline' : 'Top-level page tabs with an active underline, counters and a disabled tab'}
      </div>
      <NavTabs {...args} />
    </div>
  </div>,
  args: {
    'aria-label': 'Finance views', active: 'payouts',
    items: [
      { id: 'summary', label: 'Summary' },
      { id: 'payouts', label: 'Payouts', badge: 3 },
      { id: 'transactions', label: 'Transactions' },
      { id: 'disputes', label: 'Disputes', badge: { text: 2, tone: 'danger' } },
      { id: 'exports', label: 'Exports', disabled: true },
    ],
  },
};
export default meta;
export const Underline: StoryObj<typeof NavTabs> = {};
export const Pill: StoryObj<typeof NavTabs> = { args: { variant: 'pill' } };
