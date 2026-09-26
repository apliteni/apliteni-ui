import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { DiffPreview, type DiffPreviewRow } from './DiffPreview';
import { Button } from './primitives/Button';

const meta: Meta<typeof DiffPreview> = { title: 'React/DiffPreview', component: DiffPreview };
export default meta;

const rows: DiffPreviewRow[] = [
  { id: '1', label: 'Invoice 1001', period: 'September 2026', from: 'Services', to: 'Software', amount: '€120.00' },
  { id: '2', label: 'Credit 1002', period: 'September 2026', from: 'Services', to: 'Software', amount: '−€20.00' },
  { id: '3', label: 'Invoice 1003', period: 'October 2026', from: 'Services', to: 'Software', amount: '€75.00' },
];
const totals = [{ period: 'September 2026', amount: '€100.00' }, { period: 'October 2026', amount: '€75.00' }];

export const Category: StoryObj = { render: () => <DiffPreview rows={rows} totals={totals} context="Category change: Services to Software" /> };
export const Ownership: StoryObj = { render: () => <DiffPreview rows={rows.map(row => ({ ...row, from: 'West team', to: 'Central team' }))} totals={totals} context="Assignment change: West team to Central team" /> };
export const Unclassified: StoryObj = { render: () => <DiffPreview rows={rows.map(row => ({ ...row, from: null }))} totals={totals} context="Classify rows as Software" /> };
export const Empty: StoryObj = { render: () => <DiffPreview rows={[]} totals={[]} /> };
export const ClosedPeriod: StoryObj = { render: () => <DiffPreview rows={rows.map(row => ({ ...row, period: 'October 2026' }))} totals={[{ period: 'October 2026', amount: '€175.00' }]} note="September is closed. Its rows will be booked as adjustments in October, the next open period." /> };
export const Narrow: StoryObj = { render: () => <div style={{ maxWidth: 320 }}><DiffPreview rows={rows} totals={totals} /></div> };

function ApplyExample() {
  const [applied, setApplied] = useState(false);
  return <>
    <DiffPreview rows={rows} totals={totals} context="Category change: Services to Software" />
    <Button variant="primary" disabled={applied} onClick={() => setApplied(true)}>Apply changes</Button>
    {applied && <div className="ui-toast ui-toast--success" role="status" style={{ marginTop: 'var(--space-4)' }}>
      <div className="ui-toast__text"><strong className="ui-toast__title">3 rows moved</strong></div>
      <Button size="sm" variant="ghost" onClick={() => setApplied(false)}>Undo</Button>
    </div>}
  </>;
}
export const ApplyAndUndo: StoryObj = { render: () => <ApplyExample /> };
