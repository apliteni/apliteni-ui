import type { Meta, StoryObj } from '@storybook/react';
import { useEffect, useId, useRef, useState } from 'react';
import { AppShell } from './AppShell';
import { Card } from './primitives/Card';
import { Callout } from './primitives/Callout';
import { DataTable, type Column } from './DataTable';
import { DeltaValue, NumericValue } from './TableValues';
import { Button } from './primitives/Button';
import { EmptyState } from './EmptyState';

type Row = { name: string; period: string; from: string | null; to: string; amount: string };
// Fabricated server response: the app owns classification, period routing and signed totals.
const rows: Row[] = [
  { name: 'Hosting', period: 'Sep 2026', from: 'General', to: 'Software', amount: '+240.00' },
  { name: 'Design seats', period: 'Sep 2026', from: null, to: 'Software', amount: '+180.00' },
  { name: 'Seat refund', period: 'Sep 2026', from: 'General', to: 'Software', amount: '−30.00' },
  { name: 'Monitoring', period: 'Oct 2026', from: 'General', to: 'Software', amount: '+120.00' },
];
const CLOSED = 'Sep 2026';
const OPEN = 'Oct 2026';
const money = (value: number) => `${value.toFixed(2)} €`;
const total = (period: string) => rows
  .filter(row => row.period === period)
  .reduce((sum, row) => sum + Number(row.amount.replace('−', '-')), 0);
// September is shut, so applying reroutes its rows into October.
const rerouted = total(CLOSED);

type Args = { change: 'category' | 'ownership'; empty: boolean };

function Preview({ change, empty }: Args) {
  const [applied, setApplied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);
  const [showExample, setShowExample] = useState(false);
  const rowBasis = useId();
  const action = useRef<HTMLButtonElement>(null);
  const block = useRef<HTMLElement>(null);
  useEffect(() => {
    if (applied) action.current?.scrollIntoView({ block: 'nearest', behavior: 'instant' });
  }, [applied]);
  useEffect(() => {
    if (showExample) block.current?.querySelector<HTMLElement>('.ui-table-scroll')?.focus();
  }, [showExample]);
  const write = useRef<ReturnType<typeof setTimeout>>(null);
  useEffect(() => () => clearTimeout(write.current ?? undefined), []);
  useEffect(() => { setApplied(false); setBusy(false); setHasApplied(false); setShowExample(false); }, [change, empty]);
  const noChanges = empty && !showExample;
  const target = change === 'category' ? 'Software' : 'Platform';
  const previewRows = noChanges ? [] : rows.map(row => ({
    ...row,
    from: row.from && change === 'ownership' ? 'Operations' : row.from,
    to: target,
    period: applied ? OPEN : row.period,
  }));
  const heading = applied ? 'Changes applied' : 'Proposed changes';
  const undo = () => { clearTimeout(write.current ?? undefined); setBusy(false); setApplied(false); };
  const apply = () => {
    setBusy(true);
    write.current = setTimeout(() => {
      setBusy(false);
      setApplied(true);
      setHasApplied(true);
    }, 700);
  };

  // The one effect Apply has is the reroute, and the callout below the table says it.
  const shift = money(rerouted);

  // The header names the comparison on screen; the basis repeats it for each cell.
  const columns: Column<Row>[] = [
    { key: 'name', label: 'Item' },
    {
      key: 'from', label: 'From',
      render: row => row.from ?? <NumericValue missing={change === 'category' ? 'No category yet' : 'No owner yet'} />,
    },
    { key: 'to', label: 'To' },
    {
      key: 'amount', label: `Change to ${target}`, num: true,
      render: row => <span className="ui-value">
        <DeltaValue basisId={rowBasis} value={row.amount} tone={row.amount.startsWith('−') ? 'success' : 'danger'} />
        <span className="ui-value__unit">€</span>
      </span>,
    },
    {
      key: 'period', label: 'Booked month',
      render: row => <NumericValue value={row.period === CLOSED ? '2026-09' : '2026-10'} />,
    },
  ];

  return <AppShell width="wide" title="Review changes" word="Demo" pathname="/changes"
    sections={[{ href: '/changes', label: 'Changes', icon: 'doc' }]}
    palette={{
      groups: [{ label: 'Actions', items: [{ id: 'change',
        label: noChanges ? 'Load samples' : applied ? 'Undo' : 'Apply',
        disabled: busy,
      }] }],
      onSelect: () => { if (noChanges) setShowExample(true); else if (applied) undo(); else apply(); },
    }}
    account={{ name: 'Demo User', email: 'demo@example.com' }} onSignOut={() => {}}
    lede={applied || noChanges ? undefined : change === 'category' ? 'Move these costs to Software.' : 'Assign these costs to Platform.'}>
    <div ref={block} className={`ui-stack${showExample ? ' m-fade-in' : ''}`}>
      {previewRows.length > 0 && <>
        <p id={rowBasis} className="ui-sr">Each change is measured against the {target} total.</p>
        <p role="status" className="ui-sr">{applied ? 'Changes applied.' : 'Changes not applied.'}</p>
      </>}
      {/* The card carries its own title, so the title and the first column share the
          card's text edge. The table region keeps a stable name of its own. */}
      <Card title={noChanges ? undefined : heading}>
        {previewRows.length > 0
          /* Column navigation comes from the kit; this showcase keeps no copy of it. */
          ? <DataTable columns={columns} rows={previewRows} selectable={false} pager={false}
            density="dense" stickyHeader pinnedIdentity scrollLabel="Cost changes" loading={busy} />
          : <EmptyState
            icon="doc"
            title="No costs would move"
            sub="Nothing matches this change."
            actions={<Button variant="primary" onClick={() => setShowExample(true)}>Load samples</Button>}
          />}
      </Card>
      {previewRows.length > 0 && <>
        <div className={hasApplied ? 'm-fade-in' : undefined} key={applied ? 'applied' : 'proposed'}>
          {applied
            ? <Callout variant="warn"><b>September is closed.</b> Its {shift} was booked in October.</Callout>
            : <Callout variant="warn"><b>September is closed.</b> Its {shift} will be booked in October.</Callout>}
        </div>
        <div>{applied
          ? <Button ref={action} onClick={undo}>Undo</Button>
          : <Button ref={action} variant="primary" busy={busy} completionMessage="" onClick={apply}>Apply</Button>}</div>
      </>}
    </div>
  </AppShell>;
}

const meta: Meta<Args> = {
  title: 'Showcases/Diff preview',
  id: 'showcases-diff-preview',
  parameters: { layout: 'fullscreen' },
  args: { change: 'category', empty: false },
  argTypes: {
    change: { control: 'inline-radio', options: ['category', 'ownership'] },
    empty: { control: 'boolean' },
  },
  render: args => <Preview key={`${args.change}-${args.empty}`} {...args} />,
};
export default meta;
export const Playground: StoryObj<Args> = {};
export const Ownership: StoryObj<Args> = { args: { change: 'ownership' } };
export const Empty: StoryObj<Args> = { args: { empty: true } };
