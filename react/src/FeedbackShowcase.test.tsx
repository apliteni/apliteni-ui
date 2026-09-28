import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { composeStories } from '@storybook/react';
import * as stories from './FeedbackShowcase.stories';

const { WithExcerpt, WithoutExcerpt, Failed } = composeStories(stories);
afterEach(cleanup);

const QUOTED = 'A tracking link appears here once the carrier scans the parcel.';

// Exercises the local demo flow; it does not test capture, delivery or browser
// layout. JSDOM lays nothing out, so the trigger's clearance over the toast stack
// is checked in a browser and recorded in the pull request, not here.
describe('feedback showcase', () => {
  it('opens the context, rejects a blank note and completes a local send', async () => {
    render(<WithExcerpt />);
    fireEvent.click(screen.getByRole('button', { name: 'Feedback' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Delivery, on order DEMO-1042')).toBeInTheDocument();
    expect(dialog.querySelector('blockquote')).toHaveTextContent(QUOTED);
    const note = screen.getByRole('textbox');
    expect(note).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Send feedback' })).toBeDisabled();
    fireEvent.change(note, { target: { value: 'Please add a delivery date.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send feedback' }));
    expect(screen.getByRole('button', { name: 'Send feedback' })).toHaveAttribute('aria-busy', 'true');
    expect(await screen.findByText('Feedback sent')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  // The page's only action carries the accent, so the showcase does not open on
  // a grey pill (the-page: one-primary).
  it('gives the page one filled action and clears the toast stack by measurement', () => {
    render(<WithExcerpt />);
    const pill = screen.getByRole('button', { name: 'Feedback' });
    expect(pill).toHaveClass('ui-btn--primary');
    expect(pill.parentElement).toHaveStyle({ bottom: 'calc(var(--rx-toast-stack, 0px) + var(--space-4))' });
    expect(pill.parentElement).toHaveStyle({ opacity: '1' });
    fireEvent.click(pill);
    // Its dialog is open, so the page's own filled action stands down.
    expect(pill.parentElement).toHaveStyle({ opacity: '0' });
  });

  it('shows context without an excerpt and cancels without sending', async () => {
    render(<WithoutExcerpt />);
    screen.getByRole('button', { name: 'Feedback' }).focus();
    fireEvent.click(screen.getByRole('button', { name: 'Feedback' }));
    const dialog = await screen.findByRole('dialog');
    expect(dialog.querySelector('blockquote')).toBeNull();
    expect(within(dialog).getByText('Delivery, on order DEMO-1042')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Feedback' })).toHaveFocus();
    expect(screen.queryByText('Feedback sent')).not.toBeInTheDocument();
  });

  it('keeps a failed note, the consent line and the error for retry', async () => {
    render(<Failed />);
    fireEvent.click(screen.getByRole('button', { name: 'Feedback' }));
    const note = await screen.findByRole('textbox');
    fireEvent.change(note, { target: { value: 'Please add a delivery date.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send feedback' }));
    await waitFor(() => expect(note).toHaveAttribute('aria-invalid', 'true'));
    // What the note is sent with is a consent detail, so the error joins it
    // rather than replacing it (text-length: useful-callouts).
    expect(note).toHaveAccessibleDescription("Couldn't send. Your note is saved. Only this section and your note are sent.");
    expect(screen.getByText('Only this section and your note are sent.')).toBeVisible();
    expect(screen.getByRole('alert')).toHaveTextContent("Couldn't send. Your note is saved.");
    await waitFor(() => expect(document.querySelector('.ui-btn__status')).toHaveTextContent(/^$/));
    expect(note).toHaveValue('Please add a delivery date.');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Send feedback' }));
    expect(screen.getByRole('button', { name: 'Send feedback' })).toHaveAttribute('aria-busy', 'true');
  });
});
