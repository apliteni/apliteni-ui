import type { Meta, StoryObj } from '@storybook/react';
import { fireEvent, userEvent, within } from 'storybook/test';
import { FeedbackWidget } from './FeedbackWidget';

const meta: Meta<typeof FeedbackWidget> = {
  title: 'React/FeedbackWidget', component: FeedbackWidget,
  render: args => <main><h2>Activity</h2><p>Select this sentence to include it with your feedback.</p><FeedbackWidget {...args} /></main>,
  args: { onSend: async () => {} },
};
export default meta;
type Story = StoryObj<typeof FeedbackWidget>;

export const Playground: Story = {};
export const Focus: Story = { play: async ({ canvasElement }) => { within(canvasElement).getByRole('button', { name: 'Feedback' }).focus(); } };
export const Hover: Story = { play: async ({ canvasElement }) => { await userEvent.hover(within(canvasElement).getByRole('button', { name: 'Feedback' })); } };
export const WithoutExcerpt: Story = {
  play: async ({ canvasElement }) => { await userEvent.click(within(canvasElement).getByRole('button', { name: 'Feedback' })); },
};
export const WithExcerpt: Story = {
  play: async ({ canvasElement }) => {
    const range = document.createRange();
    range.selectNodeContents(canvasElement.querySelector('p')!);
    window.getSelection()?.removeAllRanges();
    window.getSelection()?.addRange(range);
    fireEvent.click(within(canvasElement).getByRole('button', { name: 'Feedback' }));
  },
};
export const Sending: Story = {
  args: { onSend: () => new Promise<void>(() => {}) },
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Feedback' }));
    await userEvent.type(within(document.body).getByLabelText('Your note'), 'Please explain the activity totals.');
    await userEvent.click(within(document.body).getByRole('button', { name: 'Send feedback' }));
  },
};
export const Sent: Story = { play: Sending.play };
