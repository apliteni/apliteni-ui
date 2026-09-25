import type { Meta, StoryObj } from '@storybook/react';
import { expect, userEvent, within } from 'storybook/test';
import { Snippet, type SnippetProps } from './Snippet';

const meta: Meta<typeof Snippet> = {
  title: 'React/Snippet',
  component: Snippet,
  args: { label: 'Terminal', code: 'npm install @apliteni/apliteni-ui' },
  render: (args: SnippetProps) => <div style={{ maxWidth: 620 }}><Snippet {...args} /></div>,
};
export default meta;
type Story = StoryObj<typeof Snippet>;

export const Plain: Story = {};

export const Reveal: Story = {
  render: () => <div style={{ maxWidth: 620 }}>
    <p>This secret is stored hashed and will not be shown again. Copy it now.</p>
    <Snippet label="Example secret — shown once" reveal
      code="example-only-not-a-real-secret-abcdefghijklmnopqrstuvwxyz-0123456789-abcdefghijklmnopqrstuvwxyz-0123456789" />
  </div>,
};

export const CopyHover: Story = {
  parameters: { docs: { description: { story: 'Hover over Copy to see its accent colour.' } } },
  play: async ({ canvasElement }) => {
    await userEvent.hover(within(canvasElement).getByRole('button', { name: 'Copy' }));
  },
};

export const Copied: Story = {
  play: async ({ canvasElement }) => {
    const descriptor = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true, value: { writeText: async () => {} },
    });
    try {
      const canvas = within(canvasElement);
      await userEvent.click(canvas.getByRole('button', { name: 'Copy' }));
      await expect(await canvas.findByRole('button', { name: 'Copied' })).toHaveAttribute('aria-live', 'polite');
    } finally {
      if (descriptor) Object.defineProperty(navigator, 'clipboard', descriptor);
      else Reflect.deleteProperty(navigator, 'clipboard');
    }
  },
};
