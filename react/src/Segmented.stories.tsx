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
  // A block strip takes its container's width, so without one the chosen option draws a
  // pill as wide as the canvas. The vanilla specimen and Examples below both cap it at
  // --panel-md. Examples is fullscreen and carries its own cap.
  decorators: [(Story, context) => context.parameters.layout === 'fullscreen' ? <Story />
    : <div style={{ maxWidth: 'var(--panel-md)' }}><Story /></div>],
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
// There is no whole-strip Disabled story. The one it replaced carried a caption
// saying the control was unavailable, which the guidelines refuse — a caption may
// not restate a control's state — and with the caption gone the story rendered
// nothing a contrast walk can judge, because every label in it is disabled ink and
// WCAG 1.4.3 exempts those. The caption was the only pair that cell ever measured.
// The disabled paint is shown by DisabledOption below, beside live labels, which is
// also the case a consumer reaches; `disabled` on the whole toolbar is held by
// Segmented.test.tsx.
export const DisabledOption: Story = { ...SmallBlock, args: { ...SmallBlock.args, options: [
  { label: 'Overview', value: 'Overview' }, { label: 'Agents', value: 'Agents' }, { label: 'Billing', value: 'Billing', disabled: true },
] } };

function Specimen({ label, children }: { label: string; children: ReactNode }) {
  return <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
    <div className="ui-eyebrow">{label}</div>{children}
  </div>;
}
export const Examples: Story = {
  parameters: { layout: 'fullscreen', docs: { description: { story: 'The vanilla Segmented examples as controlled choices. These specimens select values; they do not navigate or own panels.' } } },
  render: () => <div style={{ padding: 'var(--space-10)' }}>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', maxWidth: 'var(--measure)' }}>
      <Specimen label="Two options"><Choice label="View" options={options(['Deck', 'Text'])} value="Deck" onChange={() => {}} /></Specimen>
      <Specimen label="Theme"><Choice label="Theme" options={options(['Dark', 'Light', 'System'])} value="Dark" onChange={() => {}} /></Specimen>
      <Specimen label="Small"><Choice label="Language" options={options(['EN', 'RU'])} value="EN" size="sm" onChange={() => {}} /></Specimen>
      <Specimen label="Full width (block)"><div style={{ maxWidth: 'var(--panel-md)' }}><Choice label="Section" options={options(['Overview', 'Agents', 'Billing'])} value="Agents" block onChange={() => {}} /></div></Specimen>
    </div>
  </div>,
};
