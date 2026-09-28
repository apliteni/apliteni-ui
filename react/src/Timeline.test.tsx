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
  const { container, rerender } = render(<Timeline events={[events[0]]} />);
  rerender(<Timeline events={[events[0], { ...events[1], kind: 'rule' }]} />);
  expect(screen.getAllByRole('listitem')[1]).toBeVisible();
  expect(container.querySelector('.is-entering')).toBeNull();
  expect(matchMedia).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)');
});

it('keeps history loaded into an empty list still, then animates appended events', () => {
  const { container, rerender } = render(<Timeline events={[]} />);
  rerender(<Timeline events={events} />);
  expect(container.querySelector('.is-entering')).toBeNull();
  rerender(<Timeline events={[...events, { ...events[0], id: 'appended' }]} />);
  expect(screen.getAllByRole('listitem')[2]).toHaveClass('is-entering');
  rerender(<Timeline events={[]} />);
  rerender(<Timeline events={events} />);
  expect(container.querySelector('.is-entering')).toBeNull();
});

it('shows caller-supplied relative text only beside the newest absolute stamp', () => {
  const initial = events.map(event => ({ ...event, relativeTimestamp: 'just now' }));
  const { container, rerender } = render(<Timeline events={initial} />);
  expect(screen.getAllByText('just now')).toHaveLength(1);
  expect(screen.getAllByRole('listitem')[0].querySelector('.ui-timeline__relative')).toBeNull();
  expect(screen.getByText('just now').previousElementSibling?.tagName).toBe('TIME');
  expect(screen.getByText('just now').previousElementSibling).toHaveTextContent(events[1].timestamp);
  rerender(<Timeline events={[...initial, { ...events[0], id: 'new', relativeTimestamp: '1 minute ago' }]} />);
  expect(screen.queryByText('just now')).not.toBeInTheDocument();
  expect(screen.getByText('1 minute ago')).toHaveClass('ui-timeline__relative');
  rerender(<Timeline events={[...initial, { ...events[0], id: 'new' }]} />);
  expect(container.querySelector('.ui-timeline__relative')).toBeNull();
});

// JSDOM uses stand-in colours to resolve selectors; browser evidence checks actual tokens and contrast.
it('reserves accent or danger fill for the newest marker across every mix of kinds', () => {
  const timelineCss = readFileSync(join(dirname(expect.getState().testPath!), 'Timeline.css'), 'utf8');
  const style = document.createElement('style');
  const palette = {
    surface: 'rgb(1, 2, 3)', 'accent-strong': 'rgb(4, 5, 6)', pink: 'rgb(7, 8, 9)',
    accent: 'rgb(10, 11, 12)', muted: 'rgb(13, 14, 15)',
    'accent-contrast': 'rgb(16, 17, 18)', 'danger-contrast': 'rgb(19, 20, 21)',
  };
  style.textContent = Object.entries(palette).reduce((css, [token, colour]) =>
    css.replaceAll(`var(--${token})`, colour), timelineCss).replaceAll('var(--text-xs)', '12px');
  document.head.append(style);
  try {
    const { container, rerender } = render(<Timeline events={[]} />);
    const kinds = [undefined, 'person', 'rule', 'reversal'] as const;
    for (const first of kinds) for (const middle of kinds) for (const last of kinds) {
      const mix = [first, middle, last];
      rerender(<Timeline events={mix.map((kind, index) => ({
        ...events[0], id: String(index), kind, relativeTimestamp: 'just now',
      }))} />);
      const markers = [...container.querySelectorAll('.ui-timeline__marker')];
      for (const [index, marker] of markers.entries()) {
        const kind = mix[index];
        const latest = index === mix.length - 1;
        const mixed = mix.some(Boolean);
        const css = getComputedStyle(marker);
        const fill = kind ? (latest ? (kind === 'reversal' ? palette.pink : palette['accent-strong']) : palette.surface)
          : (mixed && !latest ? palette.muted : palette.accent);
        expect(css.backgroundColor, `${mix.join('/')} row ${index}`).toBe(fill);
        if (kind) {
          const ink = latest ? (kind === 'reversal' ? palette['danger-contrast'] : palette['accent-contrast'])
            : (kind === 'reversal' ? palette.pink : palette.muted);
          expect(css.color, `${mix.join('/')} row ${index}`).toBe(ink);
          if (!latest) expect(css.borderTopColor).toBe(palette.muted);
        }
      }
      const relative = container.querySelector('.ui-timeline__relative')!;
      expect(getComputedStyle(relative).color).toBe(palette.accent);
      expect(getComputedStyle(relative).fontSize).toBe('12px');
    }
  } finally { style.remove(); }
});
