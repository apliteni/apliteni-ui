import { useState, type ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Segmented, type SegmentedProps } from './Segmented';

const options = (labels: string[]) => labels.map(label => ({ label, value: label }));
const meta: Meta<typeof Segmented> = {
  title: 'React/Segmented', component: Segmented,
  args: { label: 'View', options: options(['Deck', 'Text']), value: 'Deck' },
  argTypes: {
    size: { control: 'inline-radio', options: [undefined, 'sm'] },
    block: { control: 'boolean' },
    appearance: { control: 'inline-radio', options: ['pill', 'underline'] },
  },
};
export default meta;
type Story = StoryObj<typeof Segmented>;

function Choice(args: SegmentedProps) {
  const [value, setValue] = useState(args.value);
  return <Segmented {...args} value={value} onChange={next => { setValue(next); args.onChange?.(next); }} />;
}
export const Playground: Story = { render: args => <Choice key={args.value} {...args} /> };
export const Small: Story = { ...Playground, args: { label: 'Language', options: options(['EN', 'RU']), value: 'EN', size: 'sm' } };
export const Block: Story = { ...Playground, args: { label: 'Section', options: options(['Overview', 'Agents', 'Billing']), value: 'Agents', block: true } };
export const SmallBlock: Story = { ...Block, args: { ...Block.args, size: 'sm' } };
export const Underline: Story = { ...Playground, args: { appearance: 'underline' } };
export const UnderlineBlock: Story = { ...Block, args: { ...Block.args, appearance: 'underline' } };
export const Disabled: Story = { ...SmallBlock, args: { ...SmallBlock.args, disabled: true },
  render: args => <Specimen label="Section selection is unavailable"><Choice {...args} /></Specimen>,
};
export const DisabledOption: Story = { ...SmallBlock, args: { ...SmallBlock.args, options: [
  { label: 'Overview', value: 'Overview' }, { label: 'Agents', value: 'Agents' }, { label: 'Billing', value: 'Billing', disabled: true },
] } };

function Specimen({ label, children }: { label: string; children: ReactNode }) {
  return <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
    <div style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-semibold)' }}>{label}</div>{children}
  </div>;
}
export const Examples: Story = {
  parameters: { layout: 'fullscreen', docs: { description: { story: 'The vanilla Segmented examples as controlled choices. These specimens select values; they do not navigate or own panels.' } } },
  render: () => <div style={{ padding: 'var(--space-10)' }}>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', maxWidth: 'var(--measure)' }}>
      <Specimen label="Two options — Deck / Text"><Choice label="View" options={options(['Deck', 'Text'])} value="Deck" onChange={() => {}} /></Specimen>
      <Specimen label="Theme"><Choice label="Theme" options={options(['Dark', 'Light', 'System'])} value="Dark" onChange={() => {}} /></Specimen>
      <Specimen label="Small"><Choice label="Language" options={options(['EN', 'RU'])} value="EN" size="sm" onChange={() => {}} /></Specimen>
      <Specimen label="Full width (block)"><div style={{ maxWidth: 'var(--panel-md)' }}><Choice label="Section" options={options(['Overview', 'Agents', 'Billing'])} value="Agents" block onChange={() => {}} /></div></Specimen>
    </div>
  </div>,
};
