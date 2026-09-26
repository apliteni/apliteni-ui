import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { Confirm, type ConfirmProps } from './Confirm';
import { Button } from './primitives/Button';

function Example(args: ConfirmProps) {
  const [open, setOpen] = useState(args.open);
  return <>
    <Button onClick={() => setOpen(true)}>Review action</Button>
    <Confirm {...args} open={open} onConfirm={() => setOpen(false)} onCancel={() => setOpen(false)} />
  </>;
}

const meta: Meta<typeof Confirm> = {
  title: 'React/Confirm',
  id: 'react-confirm',
  component: Confirm,
  args: {
    open: true,
    title: 'Revoke demo token?',
    body: 'This token will stop working immediately. You cannot restore it.',
    confirmLabel: 'Revoke token',
    cancelLabel: 'Keep the token',
    danger: true,
  },
  render: args => <Example {...args} />,
};
export default meta;
type Story = StoryObj<typeof Confirm>;

export const Danger: Story = {};
export const Plain: Story = {
  args: {
    title: 'Make Alex a viewer?',
    body: 'Alex will be able to view records but cannot edit them. You can change this role later.',
    confirmLabel: 'Make viewer',
    cancelLabel: 'Keep editor role',
    danger: false,
  },
};
export const Busy: Story = { args: { busy: true } };
export const Closed: Story = { args: { open: false } };
