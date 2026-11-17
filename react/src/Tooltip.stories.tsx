import { useEffect, useRef } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Tooltip } from './Tooltip';
import { DataTable } from './DataTable';
import { Card } from './primitives/Card';
import { useTableFilters } from '../../stories/_table-filters';

function Example({
  state = 'closed',
  clipped = false,
  structured = false,
  placement = 'top',
}: {
  state?: 'closed' | 'hover' | 'focus' | 'dismissed';
  clipped?: boolean;
  structured?: boolean;
  placement?: 'top' | 'bottom';
}) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const trigger = root.current!.querySelector<HTMLElement>('.ui-focusable')!;
    if (state === 'hover') trigger.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    if (state === 'focus' || state === 'dismissed') trigger.focus();
    if (state === 'dismissed') trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  }, [state]);
  return (
    <div ref={root} style={{ padding: clipped ? '4px 48px 64px' : '64px 48px', overflow: clipped ? 'hidden' : undefined }}>
      {structured
        ? <>
          <Tooltip label="March" value="€48,210" detail="+4.2% on February" placement={placement}>March revenue</Tooltip>
          <p>March revenue €48,210</p>
        </>
        : <>
          <Tooltip text="Updated daily" placement={placement}>Balance</Tooltip>
          <p>Balances are updated daily.</p>
        </>}
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
export const PreferredBottom: Story = { render: () => <Example state="hover" placement="bottom" /> };
export const Touch: Story = { render: () => <Example /> };
export const ReducedMotion: Story = {
  parameters: { docs: { description: { story: 'Enable reduced motion in your browser, then hover or focus the label.' } } },
  render: () => <Example />,
};

export const Structured: Story = {
  render: () => <Example state="hover" structured />,
};

// The full name of a payee whose list shows a short name: a table cell is one line, and the
// readout wraps inside its box (#814). Keyboard focus opens it at once.
const PAYEES = [
  { name: 'Kestrel Print Co.', full: '', date: '2026-10-07' },
  { name: 'Meridian Coastal Logistics', full: 'Meridian Coastal Logistics and Cold Storage Cooperative of the Northern Ports', date: '2026-10-12' },
  { name: 'Orchard Lane Café', full: '', date: '2026-10-13' },
];
function InTable() {
  const root = useRef<HTMLDivElement>(null);
  const { bar, shown } = useTableFilters(PAYEES, { search: 'Search payees', placeholder: 'Payee', label: 'Payee filters', text: (r) => r.name, facets: [] });
  useEffect(() => { root.current!.querySelector<HTMLElement>('table .ui-focusable')!.focus(); }, []);
  return <div ref={root} style={{ maxWidth: 720 }}><div className="ui-card-stack">
    <Card>{bar}</Card>
    <Card title="Payees">
      <DataTable selectable={false} pager={false} density="dense" rows={shown} scrollLabel="Payees"
        columns={[
          { key: 'name', label: 'Payee', render: (r) => (r.full ? <Tooltip text={r.full}>{r.name}</Tooltip> : r.name) },
          { key: 'date', label: 'Date' },
        ]} />
    </Card>
  </div></div>;
}
export const InTableCell: Story = { render: () => <InTable /> };
