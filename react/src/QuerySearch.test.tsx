import { useState } from 'react';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import axe from 'axe-core';
import { QuerySearch, type QuerySearchProps } from './QuerySearch';
import { matchQuery, readQuery, type QueryKey, type QueryState } from './query';

afterEach(cleanup);

// Fabricated keys and people.
const KEYS: QueryKey[] = [
  { key: 'state', label: 'State', hint: 'Open or done', values: [{ value: 'open', label: 'Open' }, { value: 'done', label: 'Done' }] },
  { key: 'assignee', label: 'Assignee', kind: 'person', self: { value: 'me', label: 'Me' },
    values: [{ value: 'p1', label: 'Ada Lovelace' }, { value: 'p2', label: 'Mara Lindqvist' }] },
];

function Harness({ start = { chips: [], draft: '' }, spy, ...rest }: Partial<QuerySearchProps> & { start?: QueryState; spy?: (s: QueryState) => void }) {
  const [value, setValue] = useState(start);
  return <><QuerySearch keys={KEYS} value={value} onChange={(next) => { setValue(next); spy?.(next); }} ariaLabel="Search tasks" {...rest} />
    <button type="button">Next control</button></>;
}
const field = () => screen.getByRole('combobox', { name: 'Search tasks' });
const options = () => screen.queryAllByRole('option');
const chips = () => screen.queryAllByRole('button', { name: /(^|: )edit /i }).map((b) => b.textContent);

describe('QuerySearch', () => {
  it('shows the key menu on focus, each key with its badge at the end', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(field());
    expect(field()).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('listbox', { name: 'Filters suggestions' })).toBeInTheDocument();
    expect(options().map((o) => o.querySelector('.ui-dropdown__badge')?.textContent)).toEqual(['state:', 'assignee:']);
  });
  it('moves the active suggestion with the arrows and wraps at either end', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(field());
    await user.keyboard('{ArrowUp}');
    expect(field()).toHaveAttribute('aria-activedescendant', options()[1].id);
    await user.keyboard('{ArrowDown}');
    expect(options()[0]).toHaveAttribute('aria-selected', 'true');
    expect(field()).toHaveFocus();
  });
  it('puts an active key in the field with Enter, then adds the value as a chip with Tab', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(field());
    await user.keyboard('{ArrowDown}{Enter}');
    expect(field()).toHaveValue('state:');
    expect(screen.getByRole('listbox', { name: 'State suggestions' })).toBeInTheDocument();
    await user.keyboard('{ArrowDown}{Tab}');
    expect(chips()).toEqual(['Open']);
    expect(field()).toHaveValue('');
    expect(field()).toHaveFocus();
    expect(field()).toHaveAttribute('aria-expanded', 'false');
  });
  it('offers people for @, keeps the title words before it, and Me only for assignee:', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.type(field(), 'report @ma');
    expect(options().map((o) => o.textContent)).toEqual(['Mara Lindqvist']);
    await user.keyboard('{ArrowDown}{Enter}');
    expect(chips()).toEqual(['Mara Lindqvist']);
    expect(field()).toHaveValue('report');
    await user.clear(field());
    await user.type(field(), 'assignee:');
    expect(options()[0]).toHaveTextContent('Me');
  });
  it('offers people for the last condition after a completed one, and keeps the completed one', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.type(field(), 'state:open @ma');
    expect(screen.getByRole('listbox', { name: 'Assignee suggestions' })).toBeInTheDocument();
    expect(options().map((o) => o.textContent)).toEqual(['Mara Lindqvist']);
    await user.keyboard('{ArrowDown}{Enter}');
    expect(chips()).toEqual(['Open', 'Mara Lindqvist']);
    // An open quote still reads as one value with its spaces.
    await user.type(field(), 'assignee:"Ada L');
    expect(options().map((o) => o.textContent)).toEqual(['Ada Lovelace']);
  });
  it('commits a grouped query as one chip with Enter', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.type(field(), '(state:open OR state:done) @ada');
    await user.keyboard('{Escape}{Enter}');
    expect(chips()).toEqual(['(Open or Done) and Ada Lovelace']);
  });
  it('makes a chip only for a known filter, and keeps free words in the field', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.type(field(), 'What if Me');
    await user.keyboard('{Escape}{Enter}');
    expect(chips()).toEqual([]);
    expect(field()).toHaveValue('What if Me');
    expect(screen.queryByRole('alert')).toBeNull();
    await user.clear(field());
    await user.type(field(), 'tax state:open');
    await user.keyboard('{Escape}{Enter}');
    expect(chips()).toEqual(['Open']);
    expect(field()).toHaveValue('tax');
    // An unknown person gives no chip. The field keeps the text and shows the error.
    await user.clear(field());
    await user.type(field(), '@zz');
    await user.keyboard('{Escape}{Enter}');
    expect(chips()).toEqual(['Open']);
    expect(field()).toHaveValue('@zz');
    expect(screen.getByRole('alert')).toHaveTextContent('No person matches this name.');
  });
  it('keeps a group with title words in the field, and makes a chip of a group of filters only', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.type(field(), 'report OR state:open');
    await user.keyboard('{Enter}');
    expect(chips()).toEqual([]);
    expect(field()).toHaveValue('report OR state:open');
    await user.clear(field());
    await user.type(field(), 'state:open OR @ada');
    await user.keyboard('{Enter}');
    expect(chips()).toEqual(['Open or Ada Lovelace']);
    expect(field()).toHaveValue('');
  });
  it('keeps the same matches when a chip goes back to the field beside an OR expression', async () => {
    // Fabricated tasks, read by the real parser and matcher.
    const tasks = [
      { state: 'open', who: 'p1', title: 'Send the report' },
      { state: 'done', who: 'p2', title: 'File the tax return' },
      { state: 'done', who: 'p1', title: 'Pay the invoice' },
      { state: 'open', who: 'p2', title: 'Check the invoice' },
      { state: 'done', who: 'p2', title: 'Close the books' },
    ];
    const matches = (query: QueryState) => tasks.filter((t) => matchQuery(readQuery(query, KEYS).nodes,
      (key, value) => key === 'state' ? t.state === value : t.who === (value === 'me' ? 'p1' : value),
      (words) => t.title.toLowerCase().includes(words.toLowerCase()))).map((t) => t.title);
    const user = userEvent.setup();
    for (const [chip, draft, label, edited] of [
      ['state:open OR state:done', 'report', 'Open or Done: edit state:open OR state:done', 'report (state:open OR state:done)'],
      ['state:open', 'invoice OR report', 'Open: edit state:open', '(invoice OR report) state:open'],
    ]) {
      const spy = vi.fn();
      const before = { chips: [chip], draft };
      render(<Harness start={before} spy={spy} />);
      await user.click(screen.getByRole('button', { name: label }));
      const after = spy.mock.lastCall![0] as QueryState;
      expect(after).toEqual({ chips: [], draft: edited });
      expect(matches(after)).toEqual(matches(before));
      cleanup();
    }
  });
  it('keeps the title words in the field when a chip goes back to the field to edit', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.type(field(), 'report state:open');
    await user.keyboard('{Enter}');
    expect(field()).toHaveValue('report');
    await user.click(screen.getByRole('button', { name: 'Open: edit state:open' }));
    expect(field()).toHaveValue('report state:open');
    expect(chips()).toEqual([]);
  });
  it('keeps an invalid draft, names the keys, and clears the error on the next edit', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.type(field(), 'priority:high');
    await user.keyboard('{Escape}{Enter}');
    expect(screen.getByRole('alert')).toHaveTextContent('Unknown filter “priority”. Use state: or assignee:.');
    expect(field()).toHaveAttribute('aria-invalid', 'true');
    expect(field()).toHaveValue('priority:high');
    await user.type(field(), 'x');
    expect(screen.queryByRole('alert')).toBeNull();
  });
  it('closes with Escape and keeps the focus and the draft', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.type(field(), 'sta');
    await user.keyboard('{Escape}');
    expect(field()).toHaveAttribute('aria-expanded', 'false');
    expect(field()).toHaveValue('sta');
    expect(field()).toHaveFocus();
  });
  it('opens again on a click in the field after Escape', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(field());
    await user.keyboard('{Escape}');
    expect(field()).toHaveAttribute('aria-expanded', 'false');
    await user.click(field());
    expect(field()).toHaveAttribute('aria-expanded', 'true');
    expect(options().length).toBeGreaterThan(0);
  });
  it('moves on with Tab when no suggestion is active, and closes on a click outside', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(field());
    await user.tab();
    expect(screen.getByRole('button', { name: 'Next control' })).toHaveFocus();
    expect(field()).toHaveAttribute('aria-expanded', 'false');
    await user.click(field());
    await user.click(document.body);
    expect(field()).toHaveAttribute('aria-expanded', 'false');
  });
  it('removes the last chip with Backspace in the empty field', async () => {
    const user = userEvent.setup();
    render(<Harness start={{ chips: ['state:open', 'assignee:me'], draft: '' }} />);
    await user.click(field());
    await user.keyboard('{Backspace}');
    expect(chips()).toEqual(['Open']);
  });
  it('makes its chips a small filter bar when the field is small', () => {
    const { rerender } = render(<QuerySearch keys={KEYS} value={{ chips: ['state:open'], draft: '' }} onChange={() => {}} ariaLabel="Search tasks" size="sm" />);
    expect(screen.getByRole('group', { name: 'Active filters' })).toHaveClass('ui-filter-bar', 'ui-filter-bar--sm');
    rerender(<QuerySearch keys={KEYS} value={{ chips: ['state:open'], draft: '' }} onChange={() => {}} ariaLabel="Search tasks" />);
    expect(screen.getByRole('group', { name: 'Active filters' })).not.toHaveClass('ui-filter-bar--sm');
  });
  it('edits a chip by its label, and removes a focused chip with Delete or by its mark', async () => {
    const user = userEvent.setup();
    render(<Harness start={{ chips: ['state:open', 'assignee:p2', 'report'], draft: '' }} />);
    await user.click(screen.getByRole('button', { name: 'Edit report' }));
    expect(field()).toHaveValue('report');
    expect(field()).toHaveFocus();
    screen.getByRole('button', { name: 'Mara Lindqvist: edit assignee:p2' }).focus();
    await user.keyboard('{Escape}');
    expect(field()).toHaveFocus();
    expect(chips()).toEqual(['Open', 'Mara Lindqvist']);
    // Each chip's name holds the label that it shows, so a voice command reaches it (WCAG 2.5.3).
    for (const chip of screen.getAllByRole('button', { name: /edit/i })) expect(chip.getAttribute('aria-label')).toContain(chip.textContent);
    screen.getByRole('button', { name: 'Mara Lindqvist: edit assignee:p2' }).focus();
    await user.keyboard('{Delete}');
    expect(chips()).toEqual(['Open']);
    expect(field()).toHaveFocus();
    await user.click(screen.getByRole('button', { name: 'Remove state:open filter' }));
    expect(chips()).toEqual([]);
  });
  it('clears every chip and the text with Clear all', async () => {
    const user = userEvent.setup();
    render(<Harness start={{ chips: ['state:open'], draft: 'tax' }} />);
    await user.click(screen.getByRole('button', { name: 'Clear all' }));
    expect(chips()).toEqual([]);
    expect(field()).toHaveValue('');
    expect(field()).toHaveFocus();
  });
  it('parses a pasted query into chips with its words in the field, and keeps a pasted query that does not read', () => {
    render(<Harness />);
    fireEvent.paste(field(), { clipboardData: { getData: () => 'state:open @ada report' } });
    expect(chips()).toEqual(['Open', 'Ada Lovelace']);
    expect(field()).toHaveValue('report');
    fireEvent.paste(field(), { clipboardData: { getData: () => '(state:open OR)' } });
    expect(field()).toHaveValue('(state:open OR)');
    expect(screen.getByRole('alert')).toHaveTextContent('Complete the condition after the operator.');
  });
  it('says Searching people, offers Retry when people do not load, and says when nothing matches', async () => {
    const retry = vi.fn();
    const user = userEvent.setup();
    const { rerender } = render(<QuerySearch keys={KEYS} value={{ chips: [], draft: '@ma' }} onChange={() => {}} ariaLabel="Search tasks" defaultOpen peopleStatus="loading" />);
    expect(screen.getByRole('status')).toHaveTextContent('Searching people…');
    expect(options()).toHaveLength(0);
    rerender(<QuerySearch keys={KEYS} value={{ chips: [], draft: '@ma' }} onChange={() => {}} ariaLabel="Search tasks" defaultOpen peopleStatus="error" onRetryPeople={retry} />);
    expect(screen.getByRole('alert')).toHaveTextContent('People did not load.');
    // Retry stands in the panel's pinned foot, which keeps room under its tap zone.
    expect(screen.getByRole('button', { name: 'Retry' }).parentElement).toHaveClass('ui-dropdown__foot');
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(retry).toHaveBeenCalledOnce();
    rerender(<QuerySearch keys={KEYS} value={{ chips: [], draft: '@zz' }} onChange={() => {}} ariaLabel="Search tasks" defaultOpen />);
    expect(screen.getByRole('status')).toHaveTextContent('No people found. Change the text.');
  });
  it('reaches Retry with Tab, retries with Enter, and closes the panel when the focus leaves it', async () => {
    const retry = vi.fn();
    const user = userEvent.setup();
    render(<Harness start={{ chips: [], draft: '@ma' }} defaultOpen peopleStatus="error" onRetryPeople={retry} />);
    field().focus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Retry' })).toHaveFocus();
    expect(field()).toHaveAttribute('aria-expanded', 'true');
    await user.keyboard('{Enter}');
    expect(retry).toHaveBeenCalledOnce();
    expect(field()).toHaveFocus();
    await user.tab();
    await user.keyboard('{Escape}');
    expect(field()).toHaveFocus();
    expect(field()).toHaveAttribute('aria-expanded', 'false');
    await user.click(field());
    await user.tab();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Next control' })).toHaveFocus();
    expect(field()).toHaveAttribute('aria-expanded', 'false');
  });
  it('names the chip group and has no axe violation with an open menu and chips', async () => {
    const { container } = render(<Harness start={{ chips: ['state:open'], draft: 'state:' }} defaultOpen chipsLabel="Active task filters" />);
    expect(within(container).getByRole('group', { name: 'Active task filters' })).toBeInTheDocument();
    expect((await axe.run(container)).violations).toEqual([]);
  });
});
