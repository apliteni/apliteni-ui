// DOM behavior, the period arithmetic, the ring coverage and the ink of every
// cell state. What it does not reach: real browser paint and layout, the phone
// sheet's geometry, and screen-reader speech.
import { useState } from 'react';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  AA_TEXT, composite, desugar, effectiveBackground, kitCssFor, parseColour, ratio, substitute, tokensFor,
  // stories/lib/contrast.js is plain JS outside this workspace's tsconfig, and is
  // imported here for the same arithmetic react/src/contrast.test.tsx uses.
  // @ts-expect-error -- untyped JS module, deliberately shared across the gates.
} from '../../stories/lib/contrast.js';
import { DatePicker, type DatePickerRange } from './DatePicker';

const TODAY = '2026-09-15';
const read = (rel: string) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');

// The panel is mounted whether it is open or not, so these read the element
// rather than asking whether a dialog exists; `isOpen` asks the trigger.
const panel = () => document.querySelector<HTMLElement>('.ui-datepicker__panel')!;
const isOpen = () => document.querySelector('.ui-datepicker')!.classList.contains('open');
const cell = (name: RegExp | string) => within(panel()).getByRole('button', { name });
const trigger = () => document.querySelector<HTMLButtonElement>('.ui-dropdown__trigger')!;

describe('the trigger', () => {
  it('wears the dropdown shell and says what is chosen', () => {
    const { container } = render(<DatePicker today={TODAY} label="Month:" defaultValue="2026-08" />);
    expect(container.firstChild).toHaveClass('ui-dropdown');
    expect(container.firstChild).toHaveClass('ui-datepicker');
    expect(trigger()).toHaveAttribute('aria-haspopup', 'dialog');
    expect(trigger()).toHaveAttribute('aria-expanded', 'false');
    expect(trigger()).toHaveTextContent('August 2026');
    expect(panel()).toHaveAttribute('inert');
  });

  it('shows the placeholder and names itself when nothing is chosen', () => {
    render(<DatePicker today={TODAY} />);
    expect(trigger()).toHaveAccessibleName('Select a month');
    expect(trigger()).toHaveTextContent('Select a month');
  });

  it('opens and closes, and gives focus back on Escape', async () => {
    const user = userEvent.setup();
    render(<DatePicker today={TODAY} label="Month:" />);
    await user.click(trigger());
    expect(isOpen()).toBe(true);
    expect(panel()).not.toHaveAttribute('inert');
    await user.keyboard('{Escape}');
    expect(isOpen()).toBe(false);
    expect(trigger()).toHaveFocus();
  });

  it('closes on a click outside it', async () => {
    const user = userEvent.setup();
    render(<><DatePicker today={TODAY} label="Month:" defaultOpen /><button type="button">Elsewhere</button></>);
    await user.click(screen.getByText('Elsewhere'));
    expect(isOpen()).toBe(false);
  });

  it('cannot be opened while disabled', async () => {
    const user = userEvent.setup();
    render(<DatePicker today={TODAY} label="Month:" disabled />);
    await user.click(trigger());
    expect(isOpen()).toBe(false);
  });
});

describe('the month grid', () => {
  it('shows the chosen year as a grid of twelve months', () => {
    render(<DatePicker today={TODAY} defaultValue="2026-08" defaultOpen />);
    const grid = within(panel()).getByRole('grid');
    expect(grid).toHaveAccessibleName('2026');
    expect(within(grid).getAllByRole('gridcell')).toHaveLength(12);
    expect(cell(/^August 2026/)).toHaveClass('is-selected');
  });

  it('steps the year from the head without moving the reader', async () => {
    const user = userEvent.setup();
    render(<DatePicker today={TODAY} defaultValue="2026-08" defaultOpen />);
    const next = screen.getByRole('button', { name: /^Next year/ });
    await user.click(next);
    expect(within(panel()).getByRole('grid')).toHaveAccessibleName('2027');
    expect(next).toHaveFocus();
    await user.click(screen.getByRole('button', { name: /^Previous year/ }));
    expect(within(panel()).getByRole('grid')).toHaveAccessibleName('2026');
  });

  it('reports the pick and closes', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DatePicker today={TODAY} defaultValue="2026-08" defaultOpen onChange={onChange} />);
    await user.click(cell(/^March 2026/));
    expect(onChange).toHaveBeenCalledWith('2026-03');
    expect(isOpen()).toBe(false);
    expect(trigger()).toHaveTextContent('March 2026');
  });

  it('leaves the shown value to the host when it is controlled', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DatePicker today={TODAY} value="2026-08" defaultOpen onChange={onChange} />);
    await user.click(cell(/^March 2026/));
    expect(onChange).toHaveBeenCalledWith('2026-03');
    expect(trigger()).toHaveTextContent('August 2026');
  });
});

describe('the keyboard', () => {
  const open = () => render(<DatePicker today={TODAY} defaultValue="2026-08" defaultOpen />);

  it('gives the grid one tab stop, on the chosen month', () => {
    open();
    const stops = Array.from(panel().querySelectorAll<HTMLElement>('[data-dp-cell]'))
      .filter(b => b.tabIndex === 0);
    expect(stops).toHaveLength(1);
    expect(stops[0]).toHaveAccessibleName(expect.stringContaining('August 2026'));
  });

  it.each([
    ['{ArrowRight}', 'September 2026'],
    ['{ArrowLeft}', 'July 2026'],
    ['{ArrowUp}', 'May 2026'],
    ['{ArrowDown}', 'November 2026'],
    ['{Home}', 'July 2026'],
    ['{End}', 'September 2026'],
    ['{PageUp}', 'August 2025'],
    ['{PageDown}', 'August 2027'],
  ])('%s moves to %s', async (key, name) => {
    const user = userEvent.setup();
    open();
    cell(/^August 2026/).focus();
    await user.keyboard(key);
    expect(document.activeElement).toHaveAccessibleName(expect.stringContaining(name));
  });

  it('turns the page when a move leaves the year', async () => {
    const user = userEvent.setup();
    open();
    cell(/^August 2026/).focus();
    await user.keyboard('{ArrowDown}{ArrowDown}');
    expect(within(panel()).getByRole('grid')).toHaveAccessibleName('2027');
    expect(document.activeElement).toHaveAccessibleName(expect.stringContaining('February 2027'));
  });

  it('picks with Enter and with Space', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DatePicker today={TODAY} defaultValue="2026-08" defaultOpen onChange={onChange} />);
    cell(/^August 2026/).focus();
    await user.keyboard('{ArrowRight}{Enter}');
    expect(onChange).toHaveBeenCalledWith('2026-09');
    await user.keyboard('{Enter}');       // reopen from the trigger
    cell(/^September 2026/).focus();
    await user.keyboard('{ArrowLeft} ');
    expect(onChange).toHaveBeenLastCalledWith('2026-08');
  });
});

describe('what a cell says it is', () => {
  it('names the pick in month mode, where focus lands on the button', () => {
    render(<DatePicker today={TODAY} defaultValue="2026-08" defaultOpen />);
    expect(cell(/^August 2026/)).toHaveAccessibleName('August 2026, selected');
    expect(cell(/^September 2026/)).toHaveAccessibleName('September 2026, this month');
    expect(cell(/^March 2026/)).toHaveAccessibleName('March 2026');
  });

  it('names each step by where it goes, so a shortcut cannot share its name', () => {
    render(<DatePicker today={TODAY} defaultValue="2026-08" defaultOpen
      mode="range" presets={[{ label: 'Previous year', range: { start: '2025-01', end: '2025-12' } }]} />);
    const names = within(panel()).getAllByRole('button').map(b => b.getAttribute('aria-label') ?? b.textContent);
    expect(names).toContain('Previous year, 2025');
    expect(names).toContain('Previous year');
    expect(new Set(names).size, `two controls share a name: ${names.join(' | ')}`).toBe(names.length);
  });

  it('names the pick in day mode too', () => {
    render(<DatePicker today={TODAY} mode="day" defaultValue="2026-09-17" defaultOpen />);
    expect(cell(/\b17 September 2026/)).toHaveAccessibleName(expect.stringContaining('selected'));
    expect(cell(/\b18 September 2026/)).not.toHaveAccessibleName(expect.stringContaining('selected'));
  });

  it('keeps range mode\'s three words, which already worked', async () => {
    const user = userEvent.setup();
    function Example() {
      const [span, setSpan] = useState<DatePickerRange>({ start: null, end: null });
      return <DatePicker today={TODAY} mode="range" label="Period:" range={span}
        onRangeChange={setSpan} defaultOpen />;
    }
    render(<Example />);
    await user.click(cell(/^April 2026/));
    await user.click(cell(/^July 2026/));
    await user.click(trigger());
    expect(cell(/^April 2026/)).toHaveAccessibleName(expect.stringContaining('range start'));
    expect(cell(/^July 2026/)).toHaveAccessibleName(expect.stringContaining('range end'));
    expect(cell(/^May 2026/)).toHaveAccessibleName(expect.stringContaining('in range'));
  });
});

describe('bounds and blocked periods', () => {
  it('marks what cannot be picked and refuses the press', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <DatePicker
        today={TODAY} defaultValue="2026-08" min="2026-03" max="2026-09"
        disabledPeriods={['2026-07']} defaultOpen onChange={onChange}
      />,
    );
    expect(cell(/^February 2026/)).toHaveAttribute('aria-disabled', 'true');
    expect(cell(/^July 2026/)).toHaveAttribute('aria-disabled', 'true');
    expect(cell(/^March 2026/)).not.toHaveAttribute('aria-disabled');
    await user.click(cell(/^July 2026/));
    expect(onChange).not.toHaveBeenCalled();
    expect(isOpen()).toBe(true);
  });

  it('holds the keyboard inside the bounds', async () => {
    const user = userEvent.setup();
    render(<DatePicker today={TODAY} defaultValue="2026-03" min="2026-03" max="2026-09" defaultOpen />);
    cell(/^March 2026/).focus();
    await user.keyboard('{ArrowLeft}{ArrowLeft}');
    expect(document.activeElement).toHaveAccessibleName(expect.stringContaining('March 2026'));
    await user.keyboard('{PageDown}');
    expect(document.activeElement).toHaveAccessibleName(expect.stringContaining('September 2026'));
  });
});

/* `min?: string` is all the type can say, so a bound written in the other grain
 * used to parse as null and mean "no bound" — a quiet wrong answer in a
 * published component. A month read in day grain is now its whole span. */
describe('bounds written in the other grain', () => {
  it('reads a month bound in day mode as the whole month, both ends', () => {
    render(
      <DatePicker today={TODAY} mode="day" defaultValue="2026-09-17" min="2026-09" max="2026-10" defaultOpen />,
    );
    expect(cell(/\b1 September 2026/)).not.toHaveAttribute('aria-disabled');
    expect(cell(/\b30 September 2026/)).not.toHaveAttribute('aria-disabled');
  });

  it('ends the grid where that span ends', async () => {
    const user = userEvent.setup();
    render(
      <DatePicker today={TODAY} mode="day" defaultValue="2026-09-17" min="2026-09" max="2026-10" defaultOpen />,
    );
    // September is the first allowed page and October the last, so one step
    // button is off at each end — which is how the bound is now visible.
    expect(screen.getByRole('button', { name: /^Previous month/ })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: /^Next month/ }));
    expect(within(panel()).getByRole('grid')).toHaveAccessibleName('October 2026');
    expect(cell(/\b31 October 2026/)).not.toHaveAttribute('aria-disabled');
    expect(screen.getByRole('button', { name: /^Next month/ })).toBeDisabled();
  });

  it('holds the keyboard inside a bound written as a month', async () => {
    const user = userEvent.setup();
    render(
      <DatePicker today={TODAY} mode="day" defaultValue="2026-09-01" min="2026-09" max="2026-10" defaultOpen />,
    );
    cell(/\b1 September 2026/).focus();
    await user.keyboard('{ArrowLeft}');
    expect(document.activeElement).toHaveAccessibleName(expect.stringContaining('1 September 2026'));
    await user.keyboard('{PageDown}{PageDown}');
    expect(document.activeElement).toHaveAccessibleName(expect.stringContaining('1 October 2026'));
  });

  it('blocks every day of a month listed in day grain', () => {
    render(
      <DatePicker today={TODAY} mode="day" defaultValue="2026-09-17"
        disabledPeriods={['2026-09']} defaultOpen />,
    );
    const days = Array.from(panel().querySelectorAll('[data-dp-cell]'));
    expect(days).toHaveLength(30);
    expect(days.filter(d => d.getAttribute('aria-disabled') === 'true')).toHaveLength(30);
  });

  it('reads a date bound in month mode as the month it falls in', () => {
    render(<DatePicker today={TODAY} defaultValue="2026-08" min="2026-03-15" max="2026-09-02" defaultOpen />);
    expect(cell(/^March 2026/)).not.toHaveAttribute('aria-disabled');
    expect(cell(/^February 2026/)).toHaveAttribute('aria-disabled', 'true');
    expect(cell(/^September 2026/)).not.toHaveAttribute('aria-disabled');
    expect(cell(/^October 2026/)).toHaveAttribute('aria-disabled', 'true');
  });

  it('still refuses a period that is no date in either grain', () => {
    render(<DatePicker today={TODAY} defaultValue="2026-08" min="last March" defaultOpen />);
    expect(cell(/^January 2026/)).not.toHaveAttribute('aria-disabled');
  });
});

describe('the page steps', () => {
  it('go off at the bounds rather than doing nothing', async () => {
    const user = userEvent.setup();
    render(<DatePicker today={TODAY} defaultValue="2026-08" min="2026-03" max="2026-09" defaultOpen />);
    expect(screen.getByRole('button', { name: /^Previous year/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /^Next year/ })).toBeDisabled();
    await user.click(trigger());
    await user.click(trigger());
    expect(within(panel()).getByRole('grid')).toHaveAccessibleName('2026');
  });

  it('stay on when there is a page to reach', () => {
    render(<DatePicker today={TODAY} defaultValue="2026-08" min="2025-03" max="2027-09" defaultOpen />);
    expect(screen.getByRole('button', { name: /^Previous year/ })).toBeEnabled();
    expect(screen.getByRole('button', { name: /^Next year/ })).toBeEnabled();
  });
});

describe('marks', () => {
  const marks = { '2026-06': { label: 'Restated', tone: 'warn' as const } };

  it('names the mark in the cell and repeats it as a word in the legend', () => {
    render(<DatePicker today={TODAY} defaultValue="2026-08" marks={marks} defaultOpen />);
    const june = cell(/^June 2026/);
    expect(june).toHaveAccessibleName(expect.stringContaining('Restated'));
    expect(june.querySelector('.ui-datepicker__mark')).toHaveClass('is-warn');
    const legend = panel().querySelector('.ui-datepicker__legend');
    expect(legend).toHaveTextContent('Restated');
  });

  it('lists each mark once, and only while its page is shown', async () => {
    const user = userEvent.setup();
    render(
      <DatePicker
        today={TODAY} defaultValue="2026-08" defaultOpen
        marks={{ '2026-06': { label: 'Restated' }, '2026-07': { label: 'Restated' } }}
      />,
    );
    expect(panel().querySelectorAll('.ui-datepicker__legend-item')).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: /^Next year/ }));
    expect(panel().querySelector('.ui-datepicker__legend')).toBeNull();
  });
});

describe('range mode', () => {
  function RangeExample({ presets }: { presets?: { label: string; range: DatePickerRange }[] }) {
    const [span, setSpan] = useState<DatePickerRange>({ start: null, end: null });
    return (
      <DatePicker
        today={TODAY} mode="range" label="Period:" range={span}
        onRangeChange={setSpan} presets={presets} defaultOpen
      />
    );
  }

  it('takes a start, then an end, and stays open in between', async () => {
    const user = userEvent.setup();
    render(<RangeExample />);
    await user.click(cell(/^April 2026/));
    expect(isOpen()).toBe(true);
    expect(trigger()).toHaveTextContent('From Apr 2026');
    await user.click(cell(/^August 2026/));
    expect(isOpen()).toBe(false);
    expect(trigger()).toHaveTextContent('Apr 2026 – Aug 2026');
  });

  it('reads a backwards pair as the same range', async () => {
    const user = userEvent.setup();
    render(<RangeExample />);
    await user.click(cell(/^August 2026/));
    await user.click(cell(/^April 2026/));
    expect(trigger()).toHaveTextContent('Apr 2026 – Aug 2026');
  });

  it('paints the ends and the span between them', async () => {
    const user = userEvent.setup();
    render(<RangeExample />);
    await user.click(cell(/^April 2026/));
    await user.click(cell(/^July 2026/));
    await user.click(trigger());
    expect(cell(/^April 2026/)).toHaveClass('is-selected');
    expect(cell(/^July 2026/)).toHaveClass('is-selected');
    expect(cell(/^May 2026/)).toHaveClass('is-inside');
    expect(cell(/^May 2026/)).toHaveAccessibleName(expect.stringContaining('in range'));
    expect(cell(/^August 2026/)).not.toHaveClass('is-inside');
  });

  it('takes a whole range from a shortcut', async () => {
    const user = userEvent.setup();
    render(<RangeExample presets={[{ label: 'This year', range: { start: '2026-01', end: '2026-12' } }]} />);
    await user.click(within(panel()).getByRole('button', { name: 'This year' }));
    expect(trigger()).toHaveTextContent('Jan 2026 – Dec 2026');
  });

  /* A shortcut sets both ends at once, from beside the grid that would refuse
   * them one by one. It is held to the same bounds the cells are. */
  it('clamps a shortcut that runs past the bounds', async () => {
    const user = userEvent.setup();
    function Bounded() {
      const [span, setSpan] = useState<DatePickerRange>({ start: null, end: null });
      return (
        <DatePicker today={TODAY} mode="range" label="Period:" range={span} onRangeChange={setSpan}
          min="2026-04" max="2026-09" defaultOpen
          presets={[{ label: 'This year', range: { start: '2026-01', end: '2026-12' } }]} />
      );
    }
    render(<Bounded />);
    await user.click(within(panel()).getByRole('button', { name: 'This year' }));
    expect(trigger()).toHaveTextContent('Apr 2026 – Sept 2026');
  });

  it('switches off a shortcut the bounds leave nothing of', async () => {
    const user = userEvent.setup();
    const onRangeChange = vi.fn();
    render(
      <DatePicker today={TODAY} mode="range" label="Period:" min="2026-04" max="2026-09" defaultOpen
        onRangeChange={onRangeChange}
        presets={[{ label: 'Last season', range: { start: '2025-01', end: '2025-12' } }]} />,
    );
    const shortcut = within(panel()).getByRole('button', { name: 'Last season' });
    expect(shortcut).toBeDisabled();
    await user.click(shortcut);
    expect(onRangeChange).not.toHaveBeenCalled();
  });

  it('switches off a shortcut whose end lands on a blocked period', async () => {
    const user = userEvent.setup();
    const onRangeChange = vi.fn();
    render(
      <DatePicker today={TODAY} mode="range" label="Period:" defaultOpen
        onRangeChange={onRangeChange} disabledPeriods={['2026-12']}
        presets={[
          { label: 'This year', range: { start: '2026-01', end: '2026-12' } },
          { label: 'First half', range: { start: '2026-01', end: '2026-06' } },
        ]} />,
    );
    // The end is a cell the grid refuses, so the shortcut is refused with it
    // rather than walked inwards to a range nobody asked for.
    expect(within(panel()).getByRole('button', { name: 'This year' })).toBeDisabled();
    expect(within(panel()).getByRole('button', { name: 'First half' })).toBeEnabled();
    await user.click(within(panel()).getByRole('button', { name: 'This year' }));
    expect(onRangeChange).not.toHaveBeenCalled();
  });

  it('reads a shortcut written in the other grain', async () => {
    const user = userEvent.setup();
    render(<RangeExample presets={[{ label: 'This year', range: { start: '2026-01-05', end: '2026-12-20' } }]} />);
    await user.click(within(panel()).getByRole('button', { name: 'This year' }));
    expect(trigger()).toHaveTextContent('Jan 2026 – Dec 2026');
  });
});

/* A host can block the period its own value names. The cell stays the value —
 * it says so — and stops being pickable, and the paint follows the behaviour
 * rather than the value. The ink of that pair is held by the state gate below. */
describe('a pick the host then blocks', () => {
  it('keeps saying it is the pick and refuses the press', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <DatePicker today={TODAY} mode="day" defaultValue="2026-09-17" onChange={onChange}
        disabledPeriods={['2026-09-17']} defaultOpen />,
    );
    const picked = cell(/\b17 September 2026/);
    expect(picked).toHaveClass('is-selected');
    expect(picked).toHaveClass('is-disabled');
    expect(picked).toHaveAttribute('aria-disabled', 'true');
    expect(picked).toHaveAccessibleName(expect.stringContaining('selected'));
    expect(picked.closest('[role="gridcell"]')).toHaveAttribute('aria-selected', 'true');
    await user.click(picked);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('never carries the range tint and the block at once', async () => {
    const user = userEvent.setup();
    render(
      <DatePicker today={TODAY} mode="range" label="Period:" defaultOpen
        disabledPeriods={['2026-06']} defaultRange={{ start: null, end: null }} />,
    );
    await user.click(cell(/^April 2026/));
    await user.click(cell(/^August 2026/));
    await user.click(trigger());
    const blocked = panel().querySelectorAll('.ui-datepicker__opt.is-disabled.is-inside');
    expect(blocked, 'cells wearing both the tint and the block').toHaveLength(0);
  });
});

describe('day mode', () => {
  it('lays the month out under its weekdays and keeps the blanks empty', () => {
    render(<DatePicker today={TODAY} mode="day" defaultValue="2026-09-17" defaultOpen />);
    const grid = within(panel()).getByRole('grid');
    expect(grid).toHaveAccessibleName('September 2026');
    expect(within(grid).getAllByRole('columnheader')).toHaveLength(7);
    // September 2026 has 30 days and starts on a Tuesday, so a Monday-first grid
    // opens with one blank and fills five rows.
    expect(grid.querySelectorAll('[data-dp-cell]')).toHaveLength(30);
    expect(grid.querySelectorAll('.ui-datepicker__cell.is-empty')).toHaveLength(5);
    expect(within(grid).getAllByRole('row')).toHaveLength(6);   // the weekday head and five weeks
  });

  it('moves by day and by week, and steps the month at the edges', async () => {
    const user = userEvent.setup();
    render(<DatePicker today={TODAY} mode="day" defaultValue="2026-09-17" defaultOpen />);
    cell(/\b17 September 2026/).focus();
    await user.keyboard('{ArrowDown}');
    expect(document.activeElement).toHaveAccessibleName(expect.stringContaining('24 September 2026'));
    await user.keyboard('{ArrowDown}');
    expect(document.activeElement).toHaveAccessibleName(expect.stringContaining('1 October 2026'));
    expect(within(panel()).getByRole('grid')).toHaveAccessibleName('October 2026');
    await user.keyboard('{PageUp}');
    expect(document.activeElement).toHaveAccessibleName(expect.stringContaining('1 September 2026'));
  });

  it('reports a full date', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DatePicker today={TODAY} mode="day" defaultValue="2026-09-17" defaultOpen onChange={onChange} />);
    await user.click(cell(/\b3 September 2026/));
    expect(onChange).toHaveBeenCalledWith('2026-09-03');
  });

  /* September 2026 starts on a Tuesday, so a Monday-first grid opens with one
   * blank and its last row holds 28, 29 and 30. Both ends of both rows are
   * cells that exist: the row's ends are not the padded lattice's, and neither
   * key may repaginate the grid under a reader who asked to stay in it. */
  it('Home and End stay in the row and in the month', async () => {
    const user = userEvent.setup();
    render(<DatePicker today={TODAY} mode="day" defaultValue="2026-09-17" defaultOpen />);
    const caption = () => within(panel()).getByRole('grid');

    cell(/\b3 September 2026/).focus();
    await user.keyboard('{Home}');
    expect(document.activeElement).toHaveAccessibleName(expect.stringContaining('1 September 2026'));
    expect(caption()).toHaveAccessibleName('September 2026');
    await user.keyboard('{End}');
    expect(document.activeElement).toHaveAccessibleName(expect.stringContaining('6 September 2026'));
    expect(caption()).toHaveAccessibleName('September 2026');

    cell(/\b29 September 2026/).focus();
    await user.keyboard('{End}');
    expect(document.activeElement).toHaveAccessibleName(expect.stringContaining('30 September 2026'));
    expect(caption()).toHaveAccessibleName('September 2026');
    await user.keyboard('{Home}');
    expect(document.activeElement).toHaveAccessibleName(expect.stringContaining('28 September 2026'));
    expect(caption()).toHaveAccessibleName('September 2026');
  });

  it('still walks a full week from a row that needs no clamping', async () => {
    const user = userEvent.setup();
    render(<DatePicker today={TODAY} mode="day" defaultValue="2026-09-17" defaultOpen />);
    cell(/\b17 September 2026/).focus();
    await user.keyboard('{Home}');
    expect(document.activeElement).toHaveAccessibleName(expect.stringContaining('14 September 2026'));
    await user.keyboard('{End}');
    expect(document.activeElement).toHaveAccessibleName(expect.stringContaining('20 September 2026'));
  });

  it('keeps a page step inside the shorter month', async () => {
    const user = userEvent.setup();
    render(<DatePicker today={TODAY} mode="day" defaultValue="2026-03-31" defaultOpen />);
    cell(/\b31 March 2026/).focus();
    await user.keyboard('{PageUp}');
    expect(document.activeElement).toHaveAccessibleName(expect.stringContaining('28 February 2026'));
  });

  it('counts a leap February', async () => {
    const user = userEvent.setup();
    render(<DatePicker today={TODAY} mode="day" defaultValue="2028-02-01" defaultOpen />);
    expect(within(panel()).getAllByRole('button', { name: /\d February 2028/ })).toHaveLength(29);
    cell(/\b29 February 2028/).focus();
    await user.keyboard('{ArrowRight}');
    expect(document.activeElement).toHaveAccessibleName(expect.stringContaining('1 March 2028'));
  });
});

/* A gate, not an example: it discovers the focusable elements the picker
 * renders in each mode and holds every one of them against the kit's own ring
 * rule, read out of the stylesheets rather than written here. Artur rejected a
 * control falling back to the browser's native outline on #457.
 * why: docs/specification.md#the-focus-ring
 *
 * What it does not reach: whether the ring is VISIBLE — that is paint, and the
 * browser captures own it. This holds the selector coverage only. */
describe('the focus ring', () => {
  /** Every selector the kit paints `box-shadow: var(--ring)` on, minus the state. */
  const ringSelectors = ['../../src/styles/base.css', '../../src/styles/dropdown.css']
    .flatMap(file => [...read(file).replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^{}]*)\}/g)]
      .filter(([, , body]) => /box-shadow\s*:[^;]*var\(--ring\)/.test(body))
      .flatMap(([, selector]) => selector.split(',')))
    .map(s => s.trim().replace(/:focus-visible/g, ''))
    .filter(Boolean);

  const FOCUSABLE = 'a[href], button, input, select, textarea, [tabindex]';
  const uncovered = (root: HTMLElement) => Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE))
    .filter(el => !el.hasAttribute('disabled') && el.tabIndex >= -1)
    .filter(el => !ringSelectors.some(selector => el.matches(selector)))
    .map(el => `${el.tagName.toLowerCase()}.${el.className || '(no class)'}`);

  it('reads a non-empty list of ring selectors out of the kit', () => {
    expect(ringSelectors.length).toBeGreaterThan(0);
    expect(ringSelectors).toContain('.ui-focusable');
  });

  it.each(['month', 'range', 'day'] as const)('covers every focusable part in %s mode', mode => {
    const { container } = render(
      <DatePicker
        today={TODAY} mode={mode} label="Period:" defaultOpen
        defaultValue={mode === 'day' ? '2026-09-17' : '2026-08'}
        presets={[{ label: 'This year', range: { start: '2026-01', end: '2026-12' } }]}
        marks={{ '2026-06': { label: 'Restated' } }}
      />,
    );
    expect(uncovered(container)).toEqual([]);
  });

  it('refuses a control that takes the native outline', () => {
    const { container } = render(<div><button type="button" className="rogue">Plain</button></div>);
    expect(uncovered(container)).toEqual(['button.rogue']);
  });
});

describe('the sheet', () => {
  const sheet = () => document.querySelector<HTMLElement>('.ui-drawer');

  it('is the kit\'s drawer, with its scrim, its close control and its trap', () => {
    render(<DatePicker today={TODAY} sheet label="Month:" defaultValue="2026-08" defaultOpen />);
    expect(sheet()).toHaveClass('ui-drawer--bottom');
    expect(sheet()!.querySelector('.ui-drawer__scrim')).toBeInTheDocument();
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveClass('ui-drawer__panel');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(within(dialog).getByRole('button', { name: 'Close' })).toBeInTheDocument();
    // The popover is not rendered beside it, so there is one grid and one way out.
    expect(document.querySelector('.ui-datepicker__panel')).toBeNull();
    expect(dialog.querySelector('.ui-datepicker__body')).toHaveClass('is-sheet');
  });

  it('makes the page behind it inert, which the popover never did', () => {
    const { container } = render(
      <div><button type="button">Behind</button>
        <DatePicker today={TODAY} sheet label="Month:" defaultValue="2026-08" defaultOpen />
      </div>,
    );
    // dialog.ts marks every sibling of the dialog's root, up to <body>.
    expect(container.querySelector('button')!.closest('[inert]')).not.toBeNull();
  });

  it('closes on its close control and on Escape', async () => {
    const user = userEvent.setup();
    function Example() {
      const [open, setOpen] = useState(true);
      return <DatePicker today={TODAY} sheet label="Month:" open={open} onOpenChange={setOpen} />;
    }
    render(<Example />);
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('closes on Escape and hands focus back to the trigger', async () => {
    const user = userEvent.setup();
    function Example() {
      const [open, setOpen] = useState(false);
      return <DatePicker today={TODAY} sheet label="Month:" open={open} onOpenChange={setOpen} />;
    }
    render(<Example />);
    await user.click(trigger());
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(trigger()).toHaveFocus();
  });

  it('picks from the sheet and closes it', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    function Example() {
      const [open, setOpen] = useState(true);
      return (
        <DatePicker today={TODAY} sheet label="Month:" defaultValue="2026-08"
          open={open} onOpenChange={setOpen} onChange={onChange} />
      );
    }
    render(<Example />);
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: /^March 2026/ }));
    expect(onChange).toHaveBeenCalledWith('2026-03');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  /* The viewport, not only the prop. JSDOM ships no matchMedia, which is why
   * `usePhone` reaches for it optionally — without the guard every test here
   * would throw rather than fall back to the popover. */
  it('follows the kit\'s narrowest step when no prop says otherwise', () => {
    const had = Object.getOwnPropertyDescriptor(window, 'matchMedia');
    const narrow = (query: string) => ({
      matches: /max-width:\s*560px/.test(query), media: query, onchange: null,
      addEventListener() {}, removeEventListener() {}, dispatchEvent: () => false,
      addListener() {}, removeListener() {},
    }) as unknown as MediaQueryList;
    Object.defineProperty(window, 'matchMedia', { value: narrow, configurable: true, writable: true });
    try {
      render(<DatePicker today={TODAY} label="Month:" defaultValue="2026-08" defaultOpen />);
      expect(document.querySelector('.ui-drawer')).toBeInTheDocument();
    } finally {
      if (had) Object.defineProperty(window, 'matchMedia', had);
      else delete (window as { matchMedia?: unknown }).matchMedia;
    }
  });

  it('is the popover when nothing says the viewport is narrow', () => {
    render(<DatePicker today={TODAY} label="Month:" defaultValue="2026-08" defaultOpen />);
    expect(document.querySelector('.ui-drawer')).toBeNull();
    expect(document.querySelector('.ui-datepicker__panel')).toBeInTheDocument();
  });

  /* The step the component holds in TypeScript is one of the three the kit
   * documents, read from the table the CSS gate reads rather than repeated. */
  it('breaks at a step the specification lists', () => {
    const spec = read('../../docs/specification.md');
    const section = spec.slice(spec.indexOf('\n## Breakpoints\n'));
    const steps = [...section.slice(0, section.indexOf('\n## ', 1)).matchAll(/^\|\s*`?(\d+)px`?\s*\|/gm)]
      .map(m => Number(m[1]));
    expect(steps.length, 'steps read out of the specification').toBeGreaterThan(1);
    const written = /const PHONE_MAX = (\d+);/.exec(read('./DatePicker.tsx'));
    expect(written, 'the component names its step as a literal this gate can read').not.toBeNull();
    expect(steps).toContain(Number(written![1]));
    expect(Number(written![1])).toBe(Math.min(...steps));
  });
});

/* A contrast gate for the cells the workspace walk cannot see: it drops
 * anything inside `[disabled],[aria-disabled="true"],.is-disabled`, and a
 * blocked cell here can also be the host's own value. States are enumerated
 * rather than rendered — every combination of the modifiers the sheet paints,
 * at rest and hovered, in both themes under every accent — and the list is
 * held against the sheet, so an unmeasured modifier fails.
 *
 * What it does not reach: real browser paint, the focus ring (the ring gate
 * above owns it) and any state a consumer's own stylesheet adds.
 * why: docs/specification.md#react-date-and-month-picker */
describe('every cell state is readable', () => {
  const THEMES = ['dark', 'light'] as const;
  const ACCENTS = ['default', 'phoenix', 'ocean', 'emerald'] as const;
  /** The modifiers this gate enumerates. Held against the sheet below. */
  const MODIFIERS = ['is-selected', 'is-inside', 'is-today', 'is-disabled'] as const;

  const css = read('./DatePicker.css');

  /** Every `.is-*` the sheet paints onto a cell, discovered rather than listed. */
  const painted = new Set(
    [...css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/\.ui-datepicker__opt((?:[.:][\w-]+)*)/g)]
      .flatMap(m => [...m[1].matchAll(/\.(is-[\w-]+)/g)].map(c => c[1])),
  );

  /** Every subset of MODIFIERS, so a pair the component cannot reach today is still held. */
  const combinations = Array.from({ length: 1 << MODIFIERS.length }, (_, mask) =>
    MODIFIERS.filter((_m, i) => mask & (1 << i)));

  it('enumerates every modifier the sheet paints', () => {
    expect(painted.size, 'modifiers discovered in the sheet').toBeGreaterThan(0);
    expect([...painted].sort()).toEqual([...MODIFIERS].sort());
  });

  /** Mount a sheet for one theme + accent and return a measuring function. */
  function measurer(theme: string, accent: string, sheet = css) {
    const vars = tokensFor(theme, accent);
    const style = document.createElement('style');
    style.textContent = `${kitCssFor(theme, accent).css}\n${desugar(substitute(sheet, vars))}`;
    document.head.appendChild(style);
    document.documentElement.setAttribute('data-theme', theme);
    if (accent !== 'default') document.documentElement.setAttribute('data-accent', accent);

    const host = document.createElement('div');
    // The ground chain a cell really sits on: the dropdown panel's own surface.
    host.innerHTML = '<div class="ui-dropdown__panel ui-datepicker__panel">'
      + '<div class="ui-datepicker__grid"><span class="ui-datepicker__cell">'
      + '<button class="ui-datepicker__opt ui-focusable" type="button">17</button>'
      + '</span></div></div>';
    document.body.appendChild(host);
    const cell = host.querySelector<HTMLElement>('.ui-datepicker__opt')!;

    const measure = (classes: readonly string[], hovered: boolean) => {
      cell.className = ['ui-datepicker__opt', 'ui-focusable', ...classes].join(' ');
      if (hovered) cell.setAttribute('data-ui-state', 'hover');
      else cell.removeAttribute('data-ui-state');
      const fg = parseColour(getComputedStyle(cell).color);
      const bg = effectiveBackground(cell, window);
      return { fg, bg };
    };
    const done = () => {
      host.remove();
      style.remove();
      document.documentElement.removeAttribute('data-accent');
    };
    return { measure, done };
  }

  it.each(THEMES)('%s: every combination of states clears AA, under every accent', theme => {
    const failures: string[] = [];
    let judged = 0;
    for (const accent of ACCENTS) {
      const { measure, done } = measurer(theme, accent);
      try {
        for (const classes of combinations) {
          for (const hovered of [false, true]) {
            const { fg, bg } = measure(classes, hovered);
            const where = `${theme}/${accent} ${classes.join('.') || '(rest)'}${hovered ? ':hover' : ''}`;
            // A pair that will not resolve is a failure, never a skip: a gate
            // that shrugs at an unreadable colour reports the same green as one
            // that measured it.
            if (!fg || !Array.isArray(bg)) { failures.push(`${where}: unresolved ${String(fg)} on ${String(bg)}`); continue; }
            judged += 1;
            const got = ratio(composite(fg, bg), bg);
            if (got < AA_TEXT) failures.push(`${where}: ${got.toFixed(2)}:1`);
          }
        }
      } finally { done(); }
    }
    expect(judged, 'pairs judged').toBe(combinations.length * 2 * ACCENTS.length);
    expect(failures, `cell states below ${AA_TEXT}:1`).toEqual([]);
  });

  /* Prove rejection by taking the fix out: without the rule that sends a
   * blocked cell bare, the two collisions this gate was written for come back —
   * the pick's accent fill in light and the range tint under green on dark. */
  it.each([
    ['light', 'default', ['is-selected', 'is-disabled']],
    ['dark', 'emerald', ['is-inside', 'is-disabled']],
  ] as const)('%s/%s: catches %s with the fix removed', (theme, accent, classes) => {
    const without = css.replace(/\.ui-datepicker__opt\.is-disabled\.is-selected,[\s\S]*?\n\}\n/, '');
    expect(without, 'the rule this gate mutates was renamed or moved').not.toBe(css);
    const { measure, done } = measurer(theme, accent, without);
    try {
      const { fg, bg } = measure(classes, false);
      expect(fg && Array.isArray(bg), 'the mutation resolved').toBe(true);
      expect(ratio(composite(fg, bg), bg)).toBeLessThan(AA_TEXT);
    } finally { done(); }
  });
});
