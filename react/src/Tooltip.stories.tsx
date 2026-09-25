import { useEffect, useRef } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Tooltip } from './Tooltip';

function Example({ state = 'closed', clipped = false }: { state?: 'closed' | 'hover' | 'focus' | 'dismissed'; clipped?: boolean }) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const trigger = root.current!.querySelector<HTMLElement>('.ui-focusable')!;
    if (state === 'hover') trigger.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    if (state === 'focus' || state === 'dismissed') trigger.focus();
    if (state === 'dismissed') trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  }, [state]);
  return (
    <div ref={root} style={{ padding: clipped ? '4px 48px 64px' : '64px 48px', overflow: clipped ? 'hidden' : undefined }}>
      <Tooltip text="Updated daily">Balance</Tooltip>
      <p>Balances are updated daily.</p>
    </div>
  );
}

const meta: Meta<typeof Tooltip> = { title: 'React/Tooltip', component: Tooltip };
export default meta;
type Story = StoryObj<typeof Tooltip>;
export const Closed: Story = { render: () => <Example /> };
export const Hover: Story = { render: () => <Example state="hover" /> };
export const Focus: Story = { render: () => <Example state="focus" /> };
export const Dismissed: Story = { render: () => <Example state="dismissed" /> };
export const Below: Story = { render: () => <Example state="hover" clipped /> };
export const Touch: Story = { render: () => <Example /> };
export const ReducedMotion: Story = {
  parameters: { docs: { description: { story: 'Enable reduced motion in your browser, then hover or focus the label.' } } },
  render: () => <Example />,
};
