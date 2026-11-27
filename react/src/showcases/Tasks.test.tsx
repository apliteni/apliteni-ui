import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactElement } from 'react';
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
  it('keeps the URL state of a story on a reload, and clears it when the frame changes to another story', async () => {
    window.history.replaceState(null, '', '/iframe.html?id=showcases-tasks--table#view=board&group=status&q=state%3Aopen');
    vi.resetModules();
    const { default: meta, Table } = await import('./Tasks.stories');
    const story = (id: string) => render(meta.render!(Table.args as never, { id } as never) as ReactElement);
    const reload = story('showcases-tasks--table');
    expect(screen.getByRole('button', { name: 'Open: edit state:open' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Group by: Status' })).toBeInTheDocument();
    reload.unmount();
    story('showcases-tasks--board');
    expect(screen.queryByRole('button', { name: 'Open: edit state:open' })).toBeNull();
    expect(window.location.hash).toBe('#view=table&group=status');
  });
  it('groups the board by Status, Assignee and Due date, with a count in each column', async () => {
    const user = userEvent.setup();
    render(<Tasks view="board" />);
    expect(screen.getAllByRole('region', { name: /, \d+ tasks$/ }).map((c) => c.getAttribute('aria-label'))).toEqual(['To do, 4 tasks', 'In progress, 5 tasks', 'Done, 3 tasks']);
    // Each column head is the kit's title row, so it keeps the row's gap under it, as the approved board does.
    for (const c of screen.getAllByRole('region', { name: /, \d+ tasks$/ })) expect(c.querySelector('h2')!.parentElement).toHaveClass('ui-card__head');
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
  it('keeps the focus on the moved card after a move by keys, or on Search tasks when the search hides the card', async () => {
    const user = userEvent.setup();
    const name = 'Actions for Match the October bank statement';
    const moveByKeys = async () => {
      screen.getByRole('button', { name }).focus();
      await user.keyboard('{Enter}');
      const card = screen.getByRole('group', { name: 'Match the October bank statement' });
      const items = within(within(card).getByRole('menu')).getAllByRole('menuitem');
      while (document.activeElement !== items.find((i) => i.textContent === 'In progress')) await user.keyboard('{ArrowDown}');
      await user.keyboard('{Enter}');
    };
    const { unmount } = render(<Tasks view="board" />);
    await moveByKeys();
    const moved = screen.getByRole('group', { name: 'Match the October bank statement' });
    expect(column(/^In progress, /)).toContainElement(moved);
    expect(within(moved).getByRole('button', { name })).toHaveFocus();
    unmount();
    window.history.replaceState(null, '', '#view=board&group=status&q=state%3Atodo');
    render(<Tasks />);
    await moveByKeys();
    expect(screen.queryByRole('group', { name: 'Match the October bank statement' })).toBeNull();
    expect(search()).toHaveFocus();
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
