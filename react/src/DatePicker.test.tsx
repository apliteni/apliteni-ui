// DOM behavior, the period arithmetic and the ring coverage. What it does not
// reach: browser paint, the phone sheet's layout (the media query is read as
// text, not rendered), screen-reader speech, and pointer hover.
import { useState } from 'react';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
    const next = screen.getByRole('button', { name: 'Next year' });
    await user.click(next);
    expect(within(panel()).getByRole('grid')).toHaveAccessibleName('2027');
    expect(next).toHaveFocus();
    await user.click(screen.getByRole('button', { name: 'Previous year' }));
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
    await user.click(screen.getByRole('button', { name: 'Next year' }));
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

describe('the phone sheet', () => {
  const css = read('./DatePicker.css');

  it('turns the panel into a bottom sheet at the kit\'s narrowest step', () => {
    const phone = /@media \(max-width: 560px\) \{([\s\S]*)\}/.exec(css);
    expect(phone, 'the phone block').not.toBeNull();
    expect(phone![1]).toMatch(/position:\s*fixed/);
    expect(phone![1]).toMatch(/inset-inline:\s*0/);
  });

  it('writes no breakpoint the kit does not have', () => {
    const steps = [...css.matchAll(/@media[^{]*?(\d+)px/g)].map(m => m[1]);
    expect(steps.length).toBeGreaterThan(0);
    expect([...new Set(steps)]).toEqual(['560']);
  });
});
