import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { ProposedValue } from './ProposedValue';
import { DataTable } from './DataTable';
import { Field } from './Field';
import { Card } from './primitives/Card';

// Full width, so the centred canvas does not move the card when a field changes its width.
const meta: Meta<typeof ProposedValue> = {
  title: 'React/Proposed value', component: ProposedValue, id: 'react-proposed-value', parameters: { layout: 'padded' },
};
export default meta;

// Fabricated demo data. A field has a value, a proposed value, or neither.
const CATEGORIES = ['Groceries', 'Transport', 'Utilities', 'Health', 'Dining', 'Repairs']
  .map((label) => ({ label, value: label.toLowerCase() }));
const ACCOUNTS = ['Main account', 'Savings account', 'Travel card'].map((label) => ({ label, value: label.toLowerCase() }));
const PROJECTS = ['Kitchen refit', 'Office move'].map((label) => ({ label, value: label.toLowerCase() }));

type Row = { name: string; amount: string; value?: string; proposed?: string };
const ROWS: Row[] = [
  { name: 'Tranvía Norte', amount: '−€18.40', value: 'transport' },
  { name: 'Luz del Sur', amount: '−€96.75', proposed: 'utilities' },
  { name: 'Farmacia Sol', amount: '−€12.30' },
  { name: 'Café Nilo', amount: '−€7.80', proposed: 'dining' },
  { name: 'Ferretería Industrial del Mediterráneo', amount: '−€231.00', proposed: 'repairs' },
  { name: 'Panadería Alba', amount: '−€5.60', value: 'groceries' },
];

// One field that keeps its own value. The proposal stays as given, so a dismissed one stays None.
function Pick({ items, start, proposed, label }: { items: typeof CATEGORIES; start?: string; proposed?: string; label: string }) {
  const [value, setValue] = useState<string | number | undefined>(start);
  return (
    <Field label={label}>{(control) => (
      <ProposedValue {...control} items={items} value={value} proposed={proposed} onChange={setValue} />
    )}</Field>
  );
}

// The three states in a form row: set, proposed and empty. Each field keeps its grid column, so
// an act on one field moves no other field.
export const FormRow: StoryObj = {
  render: () => (
    <Card title="Mercado Verde">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(12rem, 1fr))', gap: 'var(--space-5)' }}>
        <Pick label="Account" items={ACCOUNTS} start="main account" />
        <Pick label="Category" items={CATEGORIES} proposed="groceries" />
        <Pick label="Project" items={PROJECTS} />
      </div>
    </Card>
  ),
};

// The three states in a table cell. The column is set to its widest state, a value with its check
// and dismiss mark, so the rows keep their height and the columns hold still after each act.
export const TableCell: StoryObj = {
  render: () => {
    const [rows, setRows] = useState(ROWS);
    const set = (name: string, value?: string | number) =>
      setRows((all) => all.map((r) => (r.name === name ? { ...r, value: value == null ? undefined : String(value) } : r)));
    return (
      <Card>
        {/* No filter bar: the story shows a cell's three states, and its six rows are all on view. why: guidelines/dense-tables.md#give-a-long-table-its-filter-bar */}
        <DataTable<Row>
          rows={rows}
          selectable={false}
          pager={false}
          columns={[
            { key: 'name', label: 'Payee', cell: 'title' },
            { key: 'amount', label: 'Amount', num: true },
            {
              key: 'value', label: 'Category', width: '11rem', render: (r) => (
                <ProposedValue items={CATEGORIES} value={r.value} proposed={r.proposed}
                  ariaLabel={`Category for ${r.name}`} onChange={(v) => set(r.name, v)} />
              ),
            },
          ]}
        />
      </Card>
    );
  },
};
