import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { Skeleton, SkeletonTable, BusyRegion, Denied } from './Loading';
import { Button } from './primitives/Button';
import { Card } from './primitives/Card';

const meta: Meta = { title: 'React/Loading & denied' };
export default meta;

const ROWS = [
  ['1162', '2026-06-30', '11,871.49'],
  ['1163', '2026-06-29', '27,834.31'],
  ['1164', '2026-06-26', '15,201.57'],
];

const Table = () => (
  <table className="ui-table ui-table--dense ui-table--hover">
    <thead><tr><th>ID</th><th>Arrival</th><th className="ui-table__num">Net (EUR)</th></tr></thead>
    <tbody>{ROWS.map(([id, arr, net]) => (
      <tr key={id}><td>{id}</td><td>{arr}</td><td className="ui-table__num">{net}</td></tr>
    ))}</tbody>
  </table>
);

export const Busy: StoryObj = {
  render: () => (
    <div style={{ maxWidth: 560 }}>
      <Card title="Payouts">
        <BusyRegion busy label="Loading 3 payouts…" placeholder={<SkeletonTable rows={3} cols={3} />} />
      </Card>
    </div>
  ),
};

export const Shapes: StoryObj = {
  render: () => (
    <div style={{ maxWidth: 560, display: 'grid', gap: 24 }}>
      <Card title="Three bars"><Skeleton lines={3} /></Card>
      <Card title="Measured widths"><Skeleton lines={['100%', '88%', '41%']} /></Card>
      <Card title="One block"><Skeleton lines={1} height="140px" /></Card>
    </div>
  ),
};

export const PermissionDenied: StoryObj = {
  render: () => (
    <div style={{ maxWidth: 560 }}>
      <Card>
        <Denied
          title="You don’t have access to this report"
          sub="Finance reports are visible to the finance and admin roles. Your token reads the account only."
          need="reports.read"
        >
          <Button variant="primary" icon="mail">Request access</Button>
          <Button variant="secondary">Back to overview</Button>
        </Denied>
      </Card>
    </div>
  ),
};

// The transition, live — and the reason BusyRegion wraps rather than replaces.
// The region element stays mounted across the press; only its sr-only line and
// its body change. Unmount it and mount the loaded view in its place and the
// screen reader hears nothing at all, which is the bug this component exists
// to make hard to write.
export const Transition: StoryObj = {
  render: () => {
    const [state, setState] = useState<'busy' | 'done' | 'denied'>('busy');
    return (
      <div style={{ maxWidth: 560 }}>
        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          <Button size="sm" onClick={() => setState('busy')}>Loading</Button>
          <Button size="sm" variant="primary" onClick={() => setState('done')}>Loaded</Button>
          <Button size="sm" variant="danger" onClick={() => setState('denied')}>Denied</Button>
        </div>
        <Card title="Payouts">
          <BusyRegion
            busy={state === 'busy'}
            label="Loading 3 payouts…"
            message={state === 'denied' ? 'You don’t have access to payouts.' : '3 payouts'}
            placeholder={<SkeletonTable rows={3} cols={3} />}
          >
            {state === 'denied'
              ? <Denied title="You don’t have access to payouts" sub="Your token reads the account only." need="reports.read" />
              : <Table />}
          </BusyRegion>
        </Card>
      </div>
    );
  },
};

// A busy button is one control saying it is working. Shipped since day one on
// the vanilla side, absent from this workspace until #128 — so a React screen
// could not even say it at control scale, let alone at screen scale.
export const BusyButton: StoryObj = {
  render: () => (
    <div style={{ display: 'flex', gap: 12 }}>
      <Button variant="primary" busy>Saving…</Button>
      <Button variant="secondary" busy>Saving…</Button>
      <Button variant="primary">Save</Button>
    </div>
  ),
};
