import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import axe from 'axe-core';
import { Timeline, type TimelineEvent } from './Timeline';

afterEach(cleanup);

const events: readonly TimelineEvent[] = [
  { id: 'created', actor: 'Demo operator', dateTime: '2026-09-01T09:00:00Z', timestamp: '1 Sep, 09:00 UTC', description: 'Created the record.' },
  { id: 'changed', actor: 'Category rule', dateTime: '2026-09-01T09:01:00Z', timestamp: '1 Sep, 09:01 UTC', description: 'Moved the record to Software.', meta: 'Batch DEMO-12' },
];

it('renders an ordered list in supplied order with machine-readable times', () => {
  render(<Timeline events={events} aria-label="Record history" />);
  const list = screen.getByRole('list', { name: 'Record history' });
  expect(list.tagName).toBe('OL');
  const rows = within(list).getAllByRole('listitem');
  expect(rows.map(row => row.querySelector('time')?.dateTime)).toEqual(events.map(event => event.dateTime));
  expect(rows.map(row => row.querySelector('time')?.textContent)).toEqual(events.map(event => event.timestamp));
  expect(rows[0]).toHaveTextContent('Demo operator');
  expect(rows[1]).toHaveTextContent('Moved the record to Software.');
  expect(rows[1]).toHaveTextContent('Batch DEMO-12');
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
});

it('does not sort, mutate, collapse or drop reversing events', () => {
  const reversed = Object.freeze([...events].reverse());
  const { rerender } = render(<Timeline events={reversed} />);
  expect(screen.getAllByRole('listitem')[0]).toHaveTextContent('Category rule');
  rerender(<Timeline events={[...events, { ...events[0], id: 'reversed', description: 'Reversed batch DEMO-12; moved the record back to Unassigned.' }]} />);
  expect(screen.getAllByRole('listitem')).toHaveLength(3);
  expect(screen.getAllByRole('listitem')[2]).toHaveTextContent('Reversed batch DEMO-12');
});

it('activates the named undo button by keyboard without submitting a form', async () => {
  const user = userEvent.setup();
  const onUndo = vi.fn();
  const onSubmit = vi.fn(event => event.preventDefault());
  render(<form onSubmit={onSubmit}><Timeline events={[{ ...events[1], undo: { label: 'Undo batch DEMO-12', onUndo } }]} /></form>);
  await user.tab();
  expect(screen.getByRole('button', { name: 'Undo batch DEMO-12' })).toHaveFocus();
  await user.keyboard('{Enter}');
  await user.keyboard(' ');
  expect(onUndo).toHaveBeenCalledTimes(2);
  expect(onSubmit).not.toHaveBeenCalled();
});

it('passes list attributes and preserves custom classes with no empty meta row', () => {
  const { container, rerender } = render(<Timeline events={[events[0]]} id="history" className="custom" aria-label="History" />);
  expect(screen.getByRole('list')).toHaveClass('ui-timeline', 'custom');
  expect(screen.getByRole('list')).toHaveAttribute('id', 'history');
  expect(container.querySelector('.ui-timeline__meta')).toBeNull();
  rerender(<Timeline events={[]} />);
  expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
});

// JSDOM checks semantics; the story contrast gate measures CSS separately.
it('has no axe violations in read-only and privileged histories', async () => {
  const { container } = render(<main><Timeline aria-label="Record history" events={[
    ...events, { ...events[1], id: 'undoable', undo: { label: 'Undo batch DEMO-13', onUndo() {} } },
  ]} /></main>);
  expect((await axe.run(container, { rules: { 'color-contrast': { enabled: false } } })).violations).toEqual([]);
});
