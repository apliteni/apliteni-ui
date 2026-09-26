import type { Meta, StoryObj } from '@storybook/react';
import { Callout } from './primitives/Callout';
import { Button } from './primitives/Button';

const meta: Meta<typeof Callout> = {
  title: 'React/Callout',
  component: Callout,
  decorators: [Story => <div style={{ maxWidth: 560 }}><Story /></div>],
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
  args: { variant: 'success', children: <><b>Complete.</b> All rows have been reconciled. Read the <a href="#period">period notes</a>.</> },
};
export const Warn: Story = {
  args: { variant: 'warn', children: <><b>Incomplete.</b> This period is still open.</> },
};
export const Danger: Story = {
  args: { variant: 'danger', children: <><b>Conversion failed.</b> The original amounts remain in the table.</> },
};
export const WithActions: Story = {
  args: {
    variant: 'warn',
    children: <><b>Incomplete.</b> Review the <a href="#period">period notes</a> before closing this period.</>,
    actions: <><Button size="sm">Review period</Button><Button size="sm">View unconverted rows</Button></>,
  },
};
