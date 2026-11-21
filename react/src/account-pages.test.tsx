import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, onTestFinished } from 'vitest';
import { composeStories } from '@storybook/react';
import { SELECT_STORY } from 'storybook/internal/core-events';
import * as preferences from '../../stories/apps/Preferences.stories';
import * as profile from '../../stories/apps/Profile.stories';
import { PREFERENCES_STORY, PROFILE_STORY } from '../../stories/apps/_account-pages';
import { previewHref, wireStoryLinks } from '../../stories/lib/story-link.js';

const { Default: Preferences, NoConnections } = composeStories(preferences);
const { Default: Profile } = composeStories(profile);
afterEach(() => { cleanup(); document.documentElement.removeAttribute('data-theme-choice'); });

// The preview decorator wires the links once per frame, so this file wires its one
// document once. `framed` says whether a Storybook manager sits over the frame.
const frame = { framed: true, emitted: [] as { type: string; payload: unknown }[], assigned: '' };
const win = {
  document,
  location: { hash: '', assign: (url: string) => { frame.assigned = url; } },
  addEventListener: () => {},
  scrollTo: () => {},
  get parent() { return frame.framed ? { location: { hash: '' } } : win; },
};
wireStoryLinks({ win, channel: { emit: (type: string, payload: unknown) => frame.emitted.push({ type, payload }), on: () => {} } });

const follow = (label: string) => {
  frame.emitted = [];
  frame.assigned = '';
  fireEvent.click(screen.getByRole('button', { name: /^Signed in as/ }));
  fireEvent.click(screen.getByRole('menuitem', { name: label }));
};

// Reads the story markup and the link wiring in JSDOM. It lays nothing out, so the
// scroll frame's width, the pinned column and the toast's place are measured in a
// browser and recorded in the pull request.
describe('account pages', () => {
  it('opens each page from the other through the account menu', () => {
    render(<Preferences />);
    follow('Profile');
    expect(frame.emitted).toEqual([{ type: SELECT_STORY, payload: { storyId: PROFILE_STORY, scrollTo: undefined } }]);
    cleanup();
    render(<Profile />);
    // The owner's choice: Sign out is in the account menu only, not on the Profile page.
    expect(screen.queryByRole('button', { name: 'Sign out' })).toBeNull();
    follow('Preferences');
    expect(frame.emitted).toEqual([{ type: SELECT_STORY, payload: { storyId: PREFERENCES_STORY, scrollTo: undefined } }]);
  });

  it('keeps the theme when a bare preview opens the other page', () => {
    frame.framed = false;
    try {
      document.documentElement.setAttribute('data-theme-choice', 'light');
      render(<Profile />);
      follow('Preferences');
      expect(frame.assigned).toBe(previewHref(PREFERENCES_STORY, '', 'theme:light'));
    } finally { frame.framed = true; }
  });

  it('names the connections table, its scroll frame and its action column', () => {
    render(<Preferences />);
    const region = screen.getByRole('region', { name: 'Connections' });
    // JSDOM lays nothing out, so the frame overflows nothing and is no tab stop.
    expect(region).not.toHaveAttribute('tabindex');
    const table = within(region).getByRole('table', { name: 'Connections' });
    const heads = within(table).getAllByRole('columnheader');
    expect(heads.map((th) => th.textContent)).toEqual(['App', 'Access', 'Connected', 'Last used', 'Actions']);
    expect(heads[0]).toHaveClass('ui-table__identity');
  });

  // The scroll frame brings the next Revoke fully into view. JSDOM has no scrolling, so this
  // checks the call. A browser measured the scroll in the pull request.
  it('moves the keyboard to the next Revoke and reports each revoke', async () => {
    const revealed: Element[] = [];
    const own = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = function (this: Element) { revealed.push(this); };
    onTestFinished(() => { Element.prototype.scrollIntoView = own; });
    render(<Preferences />);
    const revoke = async (app: string) => {
      fireEvent.click(screen.getByRole('button', { name: `Revoke ${app}` }));
      const dialog = await screen.findByRole('alertdialog');
      await act(async () => { fireEvent.click(within(dialog).getByRole('button', { name: 'Revoke access' })); });
      await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
      expect(await screen.findByText(`${app} revoked`)).toBeInTheDocument();
    };
    await revoke('Deck summariser');
    expect(screen.getByRole('button', { name: 'Revoke Spreadsheet sync' })).toHaveFocus();
    expect(revealed.at(-1)).toBe(screen.getByRole('button', { name: 'Revoke Spreadsheet sync' }));
    await revoke('Spreadsheet sync');
    expect(screen.getByRole('button', { name: 'Revoke Research bot' })).toHaveFocus();
    expect(revealed.at(-1)).toBe(screen.getByRole('button', { name: 'Revoke Research bot' }));
    await revoke('Research bot');
    expect(screen.getByRole('button', { name: 'Browse apps' })).toHaveFocus();
  });

  it('says how an app connects when none is connected, and offers the next step', () => {
    render(<NoConnections />);
    expect(screen.queryByRole('table')).toBeNull();
    expect(screen.getByText('No apps connected')).toBeInTheDocument();
    expect(screen.getByText('Apps that you allow to use your account show here.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Browse apps' })).toBeInTheDocument();
  });
});
