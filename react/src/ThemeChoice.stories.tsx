import type { Meta, StoryObj } from '@storybook/react';
import { expect, userEvent, within } from 'storybook/test';
import { ThemeChoice } from './ThemeChoice';
import { Card } from './primitives/Card';

// The choice sets the frame's theme, as it sets the page's in a product.
const meta: Meta<typeof ThemeChoice> = {
  title: 'React/ThemeChoice',
  component: ThemeChoice,
  render: args => <Card title="Theme"><ThemeChoice {...args} /></Card>,
};
export default meta;
type Story = StoryObj<typeof ThemeChoice>;

export const Default: Story = {};
export const Keyboard: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const chosen = canvas.getAllByRole('radio').find(radio => (radio as HTMLInputElement).checked)!;
    chosen.focus();
    await userEvent.keyboard('{ArrowRight}');
    await expect(canvas.getAllByRole('radio').find(radio => (radio as HTMLInputElement).checked)).toHaveFocus();
  },
};
