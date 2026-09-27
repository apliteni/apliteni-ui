import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { composeStories } from '@storybook/react';
import * as stories from './FeedbackShowcase.stories';

const { WithExcerpt, WithoutExcerpt, Failed } = composeStories(stories);
afterEach(cleanup);

// Exercises the local demo flow; it does not test capture, delivery or browser layout.
describe('feedback showcase', () => {
  it('opens the context, rejects a blank note and completes a local send', async () => {
    render(<WithExcerpt />);
    fireEvent.click(screen.getByRole('button', { name: 'Feedback' }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('packed and ready to ship')).toBeInTheDocument();
    const note = screen.getByRole('textbox');
    expect(note).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Send feedback' })).toBeDisabled();
    fireEvent.change(note, { target: { value: 'Please add a delivery date.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send feedback' }));
    expect(screen.getByRole('button', { name: 'Send feedback' })).toHaveAttribute('aria-busy', 'true');
    expect(await screen.findByText('Feedback sent')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('shows context without an excerpt and cancels without sending', async () => {
    render(<WithoutExcerpt />);
    fireEvent.click(screen.getByRole('button', { name: 'Feedback' }));
    await screen.findByRole('dialog');
    expect(screen.queryByText('Selected text')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.queryByText('Feedback sent')).not.toBeInTheDocument();
  });
  it('keeps a failed note and connects the error for retry', async () => {
    render(<Failed />);
    fireEvent.click(screen.getByRole('button', { name: 'Feedback' }));
    const note = await screen.findByRole('textbox');
    fireEvent.change(note, { target: { value: 'Please add a delivery date.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send feedback' }));
    await waitFor(() => expect(note).toHaveAttribute('aria-invalid', 'true'));
    expect(note).toHaveAccessibleDescription("Couldn't send your feedback. Your note is still here. Try again.");
    expect(note).toHaveValue('Please add a delivery date.');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Send feedback' }));
    expect(screen.getByRole('button', { name: 'Send feedback' })).toHaveAttribute('aria-busy', 'true');
  });
});
