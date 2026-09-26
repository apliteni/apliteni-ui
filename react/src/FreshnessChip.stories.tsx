import type { Meta, StoryObj } from '@storybook/react';
import { useEffect, useRef } from 'react';
import { FreshnessChip, FreshnessRow } from './FreshnessChip';

const delivery = { source: 'Ledger', date: '26 Sep 2026', dateTime: '2026-09-26', detail: 'Daily delivery. Last run: 26 Sep at 06:00 UTC. No action needed.' };
const meta: Meta<typeof FreshnessChip> = {
  title: 'React/FreshnessChip', component: FreshnessChip,
  render: args => <FreshnessChip {...args} />,
  args: { ...delivery, tone: 'fresh' },
};
export default meta;
type Story = StoryObj<typeof FreshnessChip>;
export const Fresh: Story = {};
export const Late: Story = { args: { tone: 'late', detail: 'Daily delivery. Last run missed its expected time. Check the source schedule.' } };
export const Failing: Story = { args: { tone: 'failing', detail: 'Three runs failed. Renew the source credential.' } };
export const Linked: Story = { args: { href: '#source-details' } };
export const Focus: Story = {
  render: args => {
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => { ref.current?.querySelector<HTMLElement>('[tabindex]')?.focus(); }, []);
    return <div ref={ref}><FreshnessChip {...args} /></div>;
  },
};
export const Hover: Story = {
  render: args => {
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => { ref.current?.querySelector('.ui-freshness')?.dispatchEvent(new MouseEvent('mouseover', { bubbles: true })); }, []);
    return <div ref={ref}><FreshnessChip {...args} /></div>;
  },
};
export const Row: Story = {
  render: () => <FreshnessRow label="Report sources" sources={[
    { ...delivery, id: 'ledger', tone: 'fresh' },
    { ...delivery, id: 'bank', source: 'Bank feed', tone: 'late', detail: 'Hourly delivery. Last run is two hours overdue.' },
    { ...delivery, id: 'billing', source: 'Billing', tone: 'failing', detail: 'Three runs failed. Renew the source credential.' },
  ]} />,
};
