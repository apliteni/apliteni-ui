import { useState, type ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Segmented, type SegmentedProps } from './Segmented';
import './Segmented.variants.css';

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

// Selected-segment alternatives for #475, scoped to these stories so the shipped
// control keeps today's outline until Artur picks one. Each replaces the accent
// outline with a single signal. Trade-offs and measurements: PR #473.
// Raised keeps body ink deliberately — stories/accent-contrast.test.js records
// --accent at 4.23:1 on --seg-active-bg in dark Nebula, under the 4.5:1 floor.
const PROTOTYPE_CSS = `
/* Every alternative drops the outline it replaces, disabled included. */
[data-seg-proto] .ui-seg button.is-active,
[data-seg-proto] .ui-seg button[aria-pressed="true"] { outline: 0; }
/* ...but not the transparent one the kit ring keeps for forced colours, which
   the rule above outranks. Without this the selected segment is the one button
   that loses its focus indicator when forced colours drops box-shadow. */
[data-seg-proto] .ui-seg button.is-active:focus-visible,
[data-seg-proto] .ui-seg button[aria-pressed="true"]:focus-visible { outline: 2px solid transparent; }

/* Raised — re-point the track's own token rather than painting over it, so
   .ui-seg keeps painting its background and its --ring-gap follows the sunken
   colour without a second declaration. */
[data-seg-proto="raised"] .ui-seg:not(.ui-seg--underline) { --surface: var(--surface-2); }
[data-seg-proto="raised"] .ui-seg:not(.ui-seg--underline) button.is-active { background: var(--seg-active-bg); }
[data-seg-proto="raised"] .ui-seg--underline button.is-active { border-bottom-color: var(--accent); }

/* Tinted — a soft accent wash behind the label. Body ink is the kit's already. */
[data-seg-proto="tinted"] .ui-seg button.is-active { background: var(--glow-purple); }
[data-seg-proto="tinted"] .ui-seg--underline button.is-active { border-bottom-color: transparent; }

/* Inked — accent ink on a flat track; the ink itself is in Segmented.variants.css. */
[data-seg-proto="inked"] .ui-seg--underline button.is-active { border-bottom-color: transparent; }
`;

const PROTOTYPES = ['outlined', 'raised', 'tinted', 'inked'] as const;
type Prototype = (typeof PROTOTYPES)[number];

/** Wraps a specimen in one prototype's scope. `outlined` scopes nothing, so it
 *  renders the shipped control exactly as it is today. */
function Proto({ proto, children }: { proto: Prototype; children: ReactNode }) {
  return <>
    <style>{PROTOTYPE_CSS}</style>
    <div {...(proto === 'outlined' ? {} : { 'data-seg-proto': proto })}
      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)', maxWidth: 'var(--panel-md)' }}>
      {children}
    </div>
  </>;
}

/** The four shapes a selected segment has to survive, in one capture. */
function Sample({ proto }: { proto: Prototype }) {
  return <Proto proto={proto}>
    <Specimen label="Pill"><Choice label="Theme" options={options(['Dark', 'Light', 'System'])} value="Light" onChange={() => {}} /></Specimen>
    <Specimen label="Pill, small"><Choice label="Language" options={options(['EN', 'RU'])} value="EN" size="sm" onChange={() => {}} /></Specimen>
    <Specimen label="Pill, full width"><Choice label="Section" options={options(['Overview', 'Agents', 'Billing'])} value="Agents" block onChange={() => {}} /></Specimen>
    <Specimen label="Underline"><Choice label="View" options={options(['Deck', 'Text'])} value="Deck" appearance="underline" onChange={() => {}} /></Specimen>
    <Specimen label="Pill, with one option unavailable"><Choice label="Section" options={[
      { label: 'Overview', value: 'Overview' }, { label: 'Agents', value: 'Agents' }, { label: 'Billing', value: 'Billing', disabled: true },
    ]} value="Agents" size="sm" onChange={() => {}} /></Specimen>
  </Proto>;
}

const sample = (proto: Prototype, story: string): Story => ({
  parameters: { layout: 'fullscreen', docs: { description: { story } } },
  render: () => <div style={{ padding: 'var(--space-8)' }}><Sample proto={proto} /></div>,
});

export const SelectedOutlined: Story = sample('outlined',
  'Today’s selected segment, for comparison: a 1px accent outline, and in the underline appearance an accent rule as well.');
export const SelectedRaised: Story = sample('raised',
  'The track sinks to the sunken step and the selected segment sits on it in body ink. No accent on the pill; the underline appearance keeps the accent rule as its one signal.');
export const SelectedTinted: Story = sample('tinted',
  'A soft accent wash behind the selected label, in both appearances, with body ink on top.');
export const SelectedInked: Story = sample('inked',
  'Accent ink on the selected label and nothing painted or ruled, so the track stays flat.');
