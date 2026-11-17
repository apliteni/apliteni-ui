import { useState } from 'react';
import { Button } from './primitives/Button';
import type { Meta, StoryObj } from '@storybook/react';
import { KeyValueList, DrawerSection } from './KeyValueList';
import { Drawer } from './Drawer';
import { DataTable, type Column } from './DataTable';
import { Modal } from './Modal';
import { Badge } from './primitives/Badge';
import { Card } from './primitives/Card';
import { Dropdown } from './Dropdown';
import { SelectField, TextField } from './Field';

const meta: Meta<typeof KeyValueList> = { title: 'React/KeyValueList', component: KeyValueList };
export default meta;

const rows = [
  { label: 'Reference', value: 'INV-1001' },
  { label: 'Status', value: <Badge variant="success">Posted</Badge> },
  { label: 'Invoice', value: <a href="#invoice">View invoice</a> },
  { label: 'Amount', value: '€ 1,240.00' },
];

export const OneColumn: StoryObj = {
  render: () => <div style={{ maxWidth: 480 }}><KeyValueList rows={rows} /></div>,
};
export const TwoColumns: StoryObj = {
  render: () => <KeyValueList rows={rows} columns={2} />,
};
export const Missing: StoryObj = {
  render: () => <KeyValueList rows={[{ label: 'Reference', value: 'INV-1001' }, { label: 'Due date' }, { label: 'Balance', value: 0 }]} />,
};
export const Redacted: StoryObj = {
  render: () => <KeyValueList rows={[{ label: 'Account', redacted: true }, { label: 'Reference', value: 'INV-1001' }]} />,
};
export const LongValue: StoryObj = {
  render: () => <div style={{ maxWidth: 480 }}><KeyValueList rows={[
    { label: 'Description', value: 'Annual subscription, including additional storage and support for the operations team.' },
    { label: 'Reference', value: 'INV-1001-ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ' },
  ]} /></div>,
};
const controlRows = [
  { label: 'Reference', value: 'INV-1001' },
  { label: 'Status', value: <Dropdown ariaLabel="Status" value="Open" items={[{ label: 'Open', value: 'open' }, { label: 'Paid', value: 'paid' }]} /> },
  { label: 'Currency', value: <SelectField label="Currency"><option>EUR</option><option>USD</option></SelectField> },
  { label: 'Note', value: <TextField label="Note" defaultValue="Paid by wire" /> },
];
export const ControlValues: StoryObj = {
  render: () => <div style={{ maxWidth: 480 }}><Card><KeyValueList rows={controlRows} /></Card></div>,
};
export const Sections: StoryObj = {
  render: () => <div style={{ maxWidth: 480 }}>
    <DrawerSection title="Transaction"><KeyValueList rows={rows} /></DrawerSection>
    <DrawerSection title="Account"><KeyValueList rows={[{ label: 'Number', redacted: true }, { label: 'Note' }]} /></DrawerSection>
  </div>,
};

const facts = <>
  <KeyValueList rows={[
    { label: 'Reference', value: 'INV-1001' },
    { label: 'Amount', value: '€ 1,240.00' },
  ]} />
  <div>Amounts include tax.</div>
  <div>Payment is due within 30 days.</div>
</>;

export const InDrawer: StoryObj = {
  render: () => {
    const [open, setOpen] = useState(true);
    return <>
      <Button onClick={() => setOpen(true)}>Open drawer</Button>
      <Drawer open={open} title="Invoice details" onClose={() => setOpen(false)}>
        <DrawerSection title="Invoice">{facts}</DrawerSection>
      </Drawer>
    </>;
  },
};
type Line = { name: string; amount: string };
const lines: Line[] = [{ name: 'Annual subscription', amount: '€ 1,000.00' }, { name: 'Tax', amount: '€ 240.00' }];
const lineColumns: Column<Line>[] = [{ key: 'name', label: 'Item' }, { key: 'amount', label: 'Amount', num: true }];

// A drawer 560px wide stands each heading beside its rows. The group that holds a table
// keeps its heading over the table. Below 560px every heading stands over its rows.
export const WideDrawer: StoryObj = {
  render: () => {
    const [open, setOpen] = useState(true);
    return <>
      <Button onClick={() => setOpen(true)}>Open drawer</Button>
      <Drawer open={open} size="lg" title="Invoice details" onClose={() => setOpen(false)}>
        <DrawerSection title="Invoice"><KeyValueList rows={rows} /></DrawerSection>
        <DrawerSection title="Account"><KeyValueList rows={[{ label: 'Number', redacted: true }, { label: 'Note' }]} /></DrawerSection>
        {/* No filter bar: the invoice holds two lines, and no more than 10. why: guidelines/dense-tables.md#give-a-long-table-its-filter-bar */}
        <DrawerSection title="Lines"><DataTable columns={lineColumns} rows={lines} pager={false} selectable={false} scrollLabel="Lines" /></DrawerSection>
      </Drawer>
    </>;
  },
};
export const InModal: StoryObj = {
  render: () => {
    const [open, setOpen] = useState(true);
    return <>
      <Button onClick={() => setOpen(true)}>Open modal</Button>
      <Modal open={open} title="Invoice details" onClose={() => setOpen(false)}>{facts}</Modal>
    </>;
  },
};
