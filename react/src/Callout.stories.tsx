import type { Meta, StoryObj } from '@storybook/react';
import { Callout } from './primitives/Callout';
import { Button } from './primitives/Button';

const meta: Meta<typeof Callout> = {
  title: 'React/Callout',
  component: Callout,
  render: args => <Callout {...args} />,
};
export default meta;
type Story = StoryObj<typeof Callout>;

export const Neutral: Story = {
  args: { variant: 'neutral', children: <><b>Reporting period.</b> This table covers September.</> },
};
export const Info: Story = {
  args: { variant: 'info', children: <><b>Adjusted.</b> Amounts use the exchange rate at the close of each day.</> },
};
export const Success: Story = {
  args: { variant: 'success', children: <><b>Complete.</b> All rows have been reconciled.</> },
};
export const Warn: Story = {
  args: { variant: 'warn', children: <><b>Incomplete.</b> This period is still open.</> },
};
export const Danger: Story = {
  args: { variant: 'danger', children: <><b>Conversion failed.</b> The original amounts remain in the table.</> },
};
export const IconOverride: Story = {
  args: { variant: 'success', icon: 'check', children: <><b>Complete.</b> All rows have been reconciled.</> },
};
export const WithActions: Story = {
  args: {
    variant: 'warn', icon: 'alert',
    children: <><b>Incomplete.</b> Review the <a href="#period">period notes</a> before closing this period.</>,
    actions: <><Button size="sm">Review period</Button><Button size="sm">View unconverted rows</Button></>,
  },
};
export const Narrow: Story = {
  ...WithActions,
  render: args => <div style={{ maxWidth: 280 }}><Callout {...args} /></div>,
};
export const LongText: Story = {
  args: {
    variant: 'info',
    children: <><b>Adjusted.</b> The table shows converted amounts for completed days and original amounts for days whose exchange rates are still missing, so the totals may change when those rates become available.</>,
  },
  render: args => <div style={{ maxWidth: 360 }}><Callout {...args} /></div>,
};
