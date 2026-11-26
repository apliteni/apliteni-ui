import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import axe from 'axe-core';
import { Tasks } from './Tasks';
import { SEARCH_STATES, type SearchState } from './tasks-data';

// jsdom lays nothing out, so the drag, the sideways scroll and the slots are measured in
// Chromium and WebKit by stories/task-page.test.js. These tests cover the page's state.
beforeEach(() => window.history.replaceState(null, '', '/'));
afterEach(cleanup);

const search = () => screen.getByRole('combobox', { name: 'Search tasks' });
const rows = () => within(screen.getByRole('table', { name: 'Tasks' })).getAllByRole('rowheader').map((r) => r.textContent);
const column = (name: RegExp) => screen.getByRole('region', { name: name });

describe('the Tasks page', () => {
  it('stands New task in the title row, and the search, Group by and View in one toolbar', () => {
    render(<Tasks view="board" />);
    const row = document.querySelector('.ui-app__title-row--compact')!;
    expect(within(row as HTMLElement).getByRole('button', { name: 'New task' })).toBeInTheDocument();
    const bar = document.querySelector('.ui-toolbar')!;
    expect(bar.contains(search())).toBe(true);
    expect(within(bar as HTMLElement).getByRole('button', { name: 'Group by: Status' })).toBeInTheDocument();
    expect(within(bar as HTMLElement).getByRole('toolbar', { name: 'View' })).toBeInTheDocument();
  });
  it('keeps the search chips when the view changes, and writes them to the URL', async () => {
    const user = userEvent.setup();
    render(<Tasks view="table" />);
    await user.click(search());
    await user.keyboard('state:done{Enter}');
    expect(rows()).toEqual(['Approve the office lease invoice', 'File the VAT return', 'Set the 2027 budget draft']);
    await user.click(screen.getByRole('button', { name: 'Board' }));
    expect(screen.getByRole('button', { name: 'Done: edit state:done' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /^Task board/ }).querySelectorAll('[data-task]')).toHaveLength(3);
    expect(new URLSearchParams(window.location.hash.slice(1)).getAll('q')).toEqual(['state:done']);
  });
  it('restores the view, the grouping and the query from the URL', () => {
    window.history.replaceState(null, '', '#view=board&group=assignee&q=state%3Aopen&draft=report');
    render(<Tasks />);
    expect(screen.getByRole('button', { name: 'Open: edit state:open' })).toBeInTheDocument();
    expect(search()).toHaveValue('report');
    expect(screen.getByRole('button', { name: 'Group by: Assignee' })).toBeInTheDocument();
  });
  it('groups the board by Status, Assignee and Due date, with a count in each column', async () => {
    const user = userEvent.setup();
    render(<Tasks view="board" />);
    expect(screen.getAllByRole('region', { name: /, \d+ tasks$/ }).map((c) => c.getAttribute('aria-label'))).toEqual(['To do, 4 tasks', 'In progress, 5 tasks', 'Done, 3 tasks']);
    await user.click(screen.getByRole('button', { name: 'Group by: Status' }));
    await user.click(screen.getByRole('option', { name: 'Assignee' }));
    expect(column(/^Ada Lovelace, 5 tasks$/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Group by: Assignee' }));
    await user.click(screen.getByRole('option', { name: 'Due date' }));
    expect(column(/^9 Dec, 1 tasks$/)).toBeInTheDocument();
  });
  it('moves a card with the keyboard by Move to in its menu, and Undo puts it back', async () => {
    const user = userEvent.setup();
    render(<Tasks view="board" />);
    const card = screen.getByRole('group', { name: 'Match the October bank statement' });
    await user.click(within(card).getByRole('button', { name: 'Actions for Match the October bank statement' }));
    const menu = within(card).getByRole('menu');
    expect(within(menu).getAllByRole('menuitem').map((i) => i.textContent)).toEqual(['Open', 'Reassign', 'Copy link', 'Due date', 'In progress', 'Done']);
    await user.click(within(menu).getByRole('menuitem', { name: 'Done' }));
    expect(column(/^Done, 4 tasks$/)).toContainElement(screen.getByRole('group', { name: 'Match the October bank statement' }));
    await user.click(screen.getByRole('button', { name: 'Undo' }));
    expect(column(/^To do, 4 tasks$/)).toContainElement(screen.getByRole('group', { name: 'Match the October bank statement' }));
  });
  it('gives a table row the menu Open, Reassign and Copy link', async () => {
    const user = userEvent.setup();
    render(<Tasks view="table" />);
    const trigger = screen.getAllByRole('button', { name: /^Actions for / })[0];
    await user.click(trigger);
    expect(within(trigger.parentElement!).getByRole('menu')).toBeVisible();
    expect(within(trigger.parentElement!).getAllByRole('menuitem').map((i) => i.textContent)).toEqual(['Open', 'Reassign', 'Copy link']);
  });
  it('says no task yet, no match with Clear, loading, and the load error with Retry', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<Tasks load="empty" />);
    expect(screen.getByRole('heading', { name: 'No tasks yet' })).toBeInTheDocument();
    unmount();
    const second = render(<Tasks search="no-results" />);
    expect(screen.getByRole('heading', { name: 'No matching tasks' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Clear' }));
    expect(rows()).toHaveLength(12);
    second.unmount();
    const third = render(<Tasks load="loading" />);
    expect(document.querySelector('[aria-busy="true"]')).not.toBeNull();
    third.unmount();
    // The loading board scrolls sideways too, so it is a keyboard stop.
    window.history.replaceState(null, '', '/');
    const board = render(<Tasks view="board" load="loading" />);
    expect(screen.getByRole('region', { name: 'Task board loading' })).toHaveAttribute('tabindex', '0');
    board.unmount();
    window.history.replaceState(null, '', '/');
    render(<Tasks load="error" />);
    expect(screen.getByText('The tasks did not load.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(rows()).toHaveLength(12);
  });
  it.each(Object.keys(SEARCH_STATES) as SearchState[])('draws the %s search state with no axe violation', async (state) => {
    const { container } = render(<Tasks search={state} view={state === 'board-results' ? 'board' : 'table'} />);
    expect(search()).toBeInTheDocument();
    const results = await axe.run(container, { rules: { 'color-contrast': { enabled: false } } });
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});
