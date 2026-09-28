import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import axe from 'axe-core';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { Timeline, type TimelineEvent } from './Timeline';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

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

// JSDOM verifies glyph markup and entrance lifecycle; browser evidence checks paint and timing.
it('renders decorative kit glyphs for kinds and keeps a dot for an untyped event', () => {
  const { container } = render(<Timeline events={[
    events[0], ...(['person', 'rule', 'reversal'] as const).map(kind => ({ ...events[1], id: kind, kind })),
  ]} />);
  const markers = container.querySelectorAll('.ui-timeline__marker');
  expect(markers).toHaveLength(4);
  expect(markers[0].querySelector('svg')).toBeNull();
  for (const marker of markers) expect(marker).toHaveAttribute('aria-hidden', 'true');
  for (const marker of [...markers].slice(1)) expect(marker.querySelector('svg')).not.toBeNull();
  expect(new Set([...markers].slice(1).map(marker => marker.innerHTML)).size).toBe(3);
  expect(container.querySelector('.ui-timeline')).toHaveClass('ui-timeline--kinds');
});

it('keeps initial, edited and reordered events still, entering only newly added IDs', () => {
  const initial = events.map(event => ({ ...event, kind: 'person' as const }));
  const { container, rerender } = render(<Timeline events={initial} />);
  expect(container.querySelector('.is-entering')).toBeNull();
  rerender(<Timeline events={[{ ...initial[1], description: 'Updated text.' }, initial[0]]} />);
  expect(container.querySelector('.is-entering')).toBeNull();
  rerender(<Timeline events={[...initial, { ...initial[0], id: 'new' }]} />);
  const row = screen.getAllByRole('listitem')[2];
  const marker = row.querySelector('.ui-timeline__marker')!;
  expect(row).toHaveClass('is-entering');
  expect(marker).toHaveClass('is-entering');
  expect(container.querySelectorAll('.is-entering')).toHaveLength(2);
  fireEvent.animationEnd(marker);
  expect(marker).not.toHaveClass('is-entering');
  expect(row).toHaveClass('is-entering');
  fireEvent.animationEnd(row);
  expect(row).not.toHaveClass('is-entering');
});

it('adds events without any entrance under reduced motion', () => {
  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true }));
  const { container, rerender } = render(<Timeline events={[]} />);
  rerender(<Timeline events={[{ ...events[0], kind: 'rule' }]} />);
  expect(screen.getByRole('listitem')).toBeVisible();
  expect(container.querySelector('.is-entering')).toBeNull();
  expect(matchMedia).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)');
});

// JSDOM uses stand-in colours to resolve selectors; browser evidence checks the actual tokens.
it('fills only the newest kind marker and moves that treatment when an event arrives', () => {
  const timelineCss = readFileSync(join(dirname(expect.getState().testPath!), 'Timeline.css'), 'utf8');
  const style = document.createElement('style');
  const palette = { surface: 'rgb(1, 2, 3)', 'accent-strong': 'rgb(4, 5, 6)', pink: 'rgb(7, 8, 9)', accent: 'rgb(10, 11, 12)' };
  style.textContent = Object.entries(palette).reduce((css, [token, colour]) => css.replaceAll(`var(--${token})`, colour), timelineCss);
  document.head.append(style);
  try {
    const initial = events.map(event => ({ ...event, kind: 'person' as const }));
    const { container, rerender } = render(<Timeline events={initial} />);
    const backgrounds = () => [...container.querySelectorAll('.ui-timeline__marker')]
      .map(marker => getComputedStyle(marker).backgroundColor);
    expect(backgrounds()).toEqual([palette.surface, palette['accent-strong']]);
    rerender(<Timeline events={[...initial, { ...events[0], id: 'reversed', kind: 'reversal' }]} />);
    expect(backgrounds()).toEqual([palette.surface, palette.surface, palette.pink]);
    rerender(<Timeline events={[...initial, { ...events[0], id: 'untyped' }]} />);
    expect(backgrounds()).toEqual([palette.surface, palette.surface, palette.accent]);
  } finally { style.remove(); }
});
