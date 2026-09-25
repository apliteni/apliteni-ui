import type { Meta, StoryObj } from '@storybook/react';
import { KeyValueList, DrawerSection } from './KeyValueList';
import { Badge } from './primitives/Badge';

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
export const Sections: StoryObj = {
  render: () => <div style={{ maxWidth: 480 }}>
    <DrawerSection title="Transaction"><KeyValueList rows={rows} /></DrawerSection>
    <DrawerSection title="Account"><KeyValueList rows={[{ label: 'Number', redacted: true }, { label: 'Note' }]} /></DrawerSection>
  </div>,
};
