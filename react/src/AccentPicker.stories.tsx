import { useState } from 'react';
import { accentPicker, ACCENTS } from '@apliteni/apliteni-ui';
import type { Meta, StoryObj } from '@storybook/react';
import { expect, userEvent, within } from 'storybook/test';
import { AccentPicker, type Accent } from './AccentPicker';

function Preview({ initial = 'default', options }: { initial?: Accent; options?: readonly Accent[] }) {
  const [value, setValue] = useState<Accent>(initial);
  return <div style={{ background: 'var(--surface)', padding: 'var(--space-4)' }}>
    <p>Accent</p><AccentPicker value={value} onChange={setValue} options={options} />
  </div>;
}

const meta: Meta<typeof AccentPicker> = {
  title: 'React/AccentPicker',
  component: AccentPicker,
  render: () => <Preview />,
};
export default meta;
type Story = StoryObj<typeof AccentPicker>;

export const Default: Story = {};
export const Phoenix: Story = { render: () => <Preview initial="phoenix" /> };
export const Ocean: Story = { render: () => <Preview initial="ocean" /> };
export const Emerald: Story = { render: () => <Preview initial="emerald" /> };
export const Subset: Story = { render: () => <Preview initial="ocean" options={['ocean', 'emerald']} /> };
// The ring is the SELECTED swatch's own colour, so the four rings differ here.
// Switch the toolbar's accent and they stay put: before this they all followed
// the page accent, which told you nothing about which swatch was on.
export const Rings: Story = {
  render: () => <div style={{ background: 'var(--surface)', padding: 'var(--space-4)', display: 'grid', gap: 'var(--space-4)' }}>
    {ACCENTS.map(accent => <Preview key={accent} initial={accent} />)}
  </div>,
};

export const Keyboard: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const phoenix = canvas.getByRole('button', { name: 'Phoenix accent' });
    phoenix.focus();
    await userEvent.keyboard('{Enter}');
    await expect(phoenix).toHaveAttribute('aria-pressed', 'true');
    await expect(phoenix).toHaveFocus();
  },
};

// Temporary migration reference; removed with the vanilla stories in #429 PR 5.
export const Comparison: Story = {
  render: () => <ComparisonPreview />,
};

function ComparisonPreview() {
  const [value, setValue] = useState<Accent>('default');
  return <div style={{ background: 'var(--surface)', padding: 'var(--space-4)', display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 'var(--space-6)', maxWidth: 'var(--measure)' }}>
    <div><p>Vanilla</p><div dangerouslySetInnerHTML={{ __html: accentPicker({ active: value }) }}
      onClick={event => {
        const picked = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-accent-pick]');
        if (picked) setValue(picked.dataset.accentPick as Accent);
      }} /></div>
    <div><p>React</p><AccentPicker value={value} onChange={setValue} /></div>
  </div>;
}
