import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { composeStories } from '@storybook/react';
import * as stories from './FeedbackShowcase.stories';

const { Playground } = composeStories(stories);
afterEach(cleanup);

// Exercises the local demo flow; it does not test capture, delivery or browser layout.
describe('feedback showcase', () => {
  it('opens the context, rejects a blank note and completes a local send', async () => {
    render(<Playground />);
    fireEvent.click(screen.getByRole('button', { name: 'Feedback' }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('packed and ready to ship')).toBeInTheDocument();
    const note = screen.getByRole('textbox');
    fireEvent.change(note, { target: { value: '   ' } });
    expect(screen.getByRole('button', { name: 'Send feedback' })).toBeDisabled();
    fireEvent.change(note, { target: { value: 'Please add a delivery date.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send feedback' }));
    expect(screen.getByRole('button', { name: 'Send feedback' })).toHaveAttribute('aria-busy', 'true');
    expect(await screen.findByText('Feedback sent. Thank you.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('shows dark context without an excerpt and cancels without sending', async () => {
    render(<Playground theme="dark" withExcerpt={false} />);
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    fireEvent.click(screen.getByRole('button', { name: 'Feedback' }));
    await screen.findByRole('dialog');
    expect(screen.queryByText('Selected text')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.queryByText('Feedback sent. Thank you.')).not.toBeInTheDocument();
  });
});
