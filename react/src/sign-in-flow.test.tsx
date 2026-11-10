import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { composeStories } from '@storybook/react';
import * as stories from '../../stories/apps/SignIn.stories';

const { Default, ProviderError, Error: WithError, InUse, SignedOut } = composeStories(stories);
afterEach(cleanup);

// The provider's answer is a 1200ms timer in the story, so each wait outlasts it.
const ANSWER = { timeout: 4000 };

// Exercises the local demonstration flow of the sign-in showcase (#799). It does not test a
// real provider, layout or paint. JSDOM runs no transition, so the modal's exit and the focus
// return are the fallback path, and the captures in the pull request show the browser.
describe('sign-in flow', () => {
  it('walks a session from in use to ended, error, retry and back, and keeps the search text', async () => {
    const { rerender } = render(<InUse />);
    const search = screen.getByRole('searchbox', { name: 'Search payouts' });
    fireEvent.change(search, { target: { value: 'PO-1170' } });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    rerender(<InUse session="ended" />);
    const dialog = await screen.findByRole('dialog', { name: 'Sign in again' });
    const google = within(dialog).getByRole('button', { name: 'Continue with Google' });
    fireEvent.click(google);
    expect(google).toHaveAttribute('aria-busy', 'true');

    const retry = await within(dialog).findByRole('button', { name: 'Try Google again' }, ANSWER);
    expect(within(dialog).getByRole('alert')).toHaveTextContent('Google did not finish the sign-in.');
    expect(google).not.toHaveAttribute('aria-busy');
    fireEvent.click(retry);
    expect(retry).toHaveAttribute('aria-busy', 'true');

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument(), ANSWER);
    expect(screen.queryByText(/You are signed out/)).not.toBeInTheDocument();
    expect(screen.getByRole('searchbox', { name: 'Search payouts' })).toHaveValue('PO-1170');
  });

  it('recovers from the page error and completes the sign-in', async () => {
    render(<ProviderError />);
    fireEvent.click(screen.getByRole('button', { name: 'Try Google again' }));
    expect(await screen.findByText(/You are signed in/, {}, ANSWER)).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('offers Google as the one provider, and fills Sign in only when Google is not offered', () => {
    render(<Default />);
    expect(screen.getAllByRole('button', { name: /^Continue with / })).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Continue with Google' })).toHaveClass('ui-btn--primary');
    expect(screen.getByRole('button', { name: 'Sign in' })).not.toHaveClass('ui-btn--primary');
    cleanup();
    render(<WithError />);
    expect(screen.queryByRole('button', { name: /^Continue with / })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign in' })).toHaveClass('ui-btn--primary');
  });

  it('names the email and the password for a password manager, and shows one text for a failure', () => {
    render(<WithError />);
    expect(screen.getByLabelText(/^Work email/)).toHaveAttribute('autocomplete', 'username');
    expect(screen.getByLabelText(/^Password/)).toHaveAttribute('autocomplete', 'current-password');
    expect(screen.getByText('Incorrect email or password.')).toBeInTheDocument();
  });

  it('returns focus to Sign in after Escape closes the reopened modal', async () => {
    render(<SignedOut />);
    const signIn = screen.getByRole('button', { name: 'Sign in' });
    signIn.focus();
    await userEvent.keyboard('{Enter}');
    await screen.findByRole('dialog', { name: 'Sign in again' });
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Sign in' })));
    expect(screen.getByRole('button', { name: 'Sign in' })).toBe(signIn);
  });
});
