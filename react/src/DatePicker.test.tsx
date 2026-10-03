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
  AA_LARGE, AA_TEXT, composite, desugar, effectiveBackground, kitCssFor, parseColour, ratio, substitute, tokensFor,
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
    const { container } = render(<DatePicker today={TODAY} defaultValue="2026-08" />);
    expect(container.firstChild).toHaveClass('ui-dropdown');
    expect(container.firstChild).toHaveClass('ui-datepicker');
    expect(trigger()).toHaveAttribute('aria-haspopup', 'dialog');
    expect(trigger()).toHaveAttribute('aria-expanded', 'false');
    expect(trigger()).toHaveTextContent('August 2026');
    expect(panel()).toHaveAttribute('inert');
  });

  /* The field name in front of the value — "Period: Apr 2026 – Aug 2026" — says
   * "period" twice and leaves the reader the one word they could already read
   * off the trigger. The kit's own prefix slot is what it would be drawn in, so
   * this holds the slot empty rather than the string.
   * why: guidelines/density-and-accents.md */
  it('puts no field name in front of the value', () => {
    render(<DatePicker today={TODAY} mode="range" defaultRange={{ start: '2026-04', end: '2026-08' }} />);
    expect(trigger().querySelector('.ui-dropdown__pre')).toBeNull();
    expect(trigger()).toHaveTextContent(/^Apr 2026 \u2013 Aug 2026$/);
  });

  it('shows the placeholder and names itself when nothing is chosen', () => {
    render(<DatePicker today={TODAY} />);
    expect(trigger()).toHaveAccessibleName('Select a month');
    expect(trigger()).toHaveTextContent('Select a month');
  });

<<<<<<< HEAD
=======
  /* The trigger's own text is the only name it has, so an aria-label would
   * speak over it: the reader heard "Select a date" from a control reading
   * 17 September 2026. All four modes, because the placeholder differs in each
   * and the bug was in the fallback, not in one mode. */
  it.each([
    ['month', { defaultValue: '2026-08' }, 'August 2026'],
    ['day', { defaultValue: '2026-09-17' }, '17 September 2026'],
    ['range', { defaultRange: { start: '2026-04', end: '2026-08' } }, 'Apr 2026 \u2013 Aug 2026'],
    ['day-range', { defaultRange: { start: '2026-09-07', end: '2026-09-18' } },
      '7 Sept 2026 \u2013 18 Sept 2026'],
  ] as const)('names itself with the value in %s mode', (mode, props, expected) => {
    render(<DatePicker today={TODAY} mode={mode} {...props} />);
    expect(trigger()).toHaveTextContent(expected);
    expect(trigger()).toHaveAccessibleName(expected);
    expect(trigger()).not.toHaveAttribute('aria-label');
  });

  it('still takes an explicit ariaLabel over its own text', () => {
    render(<DatePicker today={TODAY} ariaLabel="Reporting month" defaultValue="2026-08" />);
    expect(trigger()).toHaveAccessibleName('Reporting month');
  });

>>>>>>> dec40476 (fix(react): the picker's trigger and grid drop the words that restate them (#506))
  it('opens and closes, and gives focus back on Escape', async () => {
    const user = userEvent.setup();
    render(<DatePicker today={TODAY} />);
    await user.click(trigger());
    expect(isOpen()).toBe(true);
    expect(panel()).not.toHaveAttribute('inert');
    await user.keyboard('{Escape}');
    expect(isOpen()).toBe(false);
    expect(trigger()).toHaveFocus();
  });

  it('closes on a click outside it', async () => {
    const user = userEvent.setup();
    render(<><DatePicker today={TODAY} defaultOpen /><button type="button">Elsewhere</button></>);
    await user.click(screen.getByText('Elsewhere'));
    expect(isOpen()).toBe(false);
  });

  it('cannot be opened while disabled', async () => {
    const user = userEvent.setup();
    render(<DatePicker today={TODAY} disabled />);
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
      return <DatePicker today={TODAY} mode="range" range={span}
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

/* The panel draws no key under its grid. A legend is a second place to read,
 * and every word it held — "This month", and the consumer's own notes beside
 * their dots — either repeats what the cell already says or stands for a dot
 * that says nothing on its own. The dots went with it; a host's note about a
 * period belongs on the surface that shows the period's numbers.
 * why: guidelines/density-and-accents.md */
describe('the grid carries no key under it', () => {
  /** Whatever a panel draws after its grid, and whatever a cell draws beside
   *  its numeral — the two shapes a key and its swatches would take. */
  const keyParts = (root: HTMLElement) => [
    ...[...(root.querySelector('.ui-datepicker__grid')!.parentElement!.children)]
      .filter(el => !el.classList.contains('ui-datepicker__grid')
        && !el.classList.contains('ui-datepicker__head')),
    ...root.querySelectorAll('.ui-datepicker__opt > :not(.ui-datepicker__num)'),
  ].map(el => `${el.tagName.toLowerCase()}.${el.className}`);

  it.each(['month', 'day'] as const)('draws nothing under the %s grid', mode => {
    render(
      <DatePicker
        today={TODAY} mode={mode} defaultOpen
        defaultValue={mode === 'day' ? '2026-09-17' : '2026-08'}
      />,
    );
    expect(keyParts(panel())).toEqual([]);
    expect(panel()).not.toHaveTextContent(/This month|Today|Restated|Estimate/);
  });

  /* Every cell state at once, because a swatch that only the pick or only a
   * blocked cell drew would pass the two above. */
  it('paints no swatch in any cell state', () => {
    render(
      <DatePicker
        today={TODAY} mode="range" defaultOpen
        defaultRange={{ start: '2026-04', end: '2026-08' }}
        disabledPeriods={['2026-06']}
      />,
    );
    expect(keyParts(panel())).toEqual([]);
  });

  /* Prove rejection by putting back the two the change took out: the list under
   * the grid, and a dot inside a cell. */
  it('catches a key under the grid and a dot in a cell', () => {
    render(<DatePicker today={TODAY} defaultValue="2026-08" defaultOpen />);
    const calendar = panel().querySelector('.ui-datepicker__calendar')!;
    calendar.insertAdjacentHTML('beforeend',
      '<ul class="ui-datepicker__legend"><li>This month</li></ul>');
    panel().querySelector('.ui-datepicker__opt')!
      .insertAdjacentHTML('beforeend', '<span class="ui-datepicker__mark"></span>');
    expect(keyParts(panel())).toEqual(['ul.ui-datepicker__legend', 'span.ui-datepicker__mark']);
  });
});

/* The two things a reader had to be told before: which month is this one, and
 * which months they cannot have. Each is held here as the DOM says it; the
 * paint behind them is the cell-state gate at the end of this file and the
 * browser captures on the pull request. */
describe('every signal reads without a key beside it', () => {
  /** The twelve labels the month grid draws, in grid order. */
  const monthLabels = () => [...panel().querySelectorAll('.ui-datepicker__opt .ui-datepicker__num')]
    .map(el => el.textContent ?? '');

  it('draws the twelve months at one length', () => {
    render(<DatePicker today={TODAY} defaultValue="2026-08" defaultOpen />);
    const labels = monthLabels();
    expect(labels).toHaveLength(12);
    // en-GB is the component's own default and the locale that breaks: ICU
    // abbreviates September to four letters and the other eleven to three.
    expect(new Set(labels.map(l => [...l].length)), labels.join(' ')).toEqual(new Set([3]));
    expect(labels[8]).toBe('Sep');
    expect(new Set(labels).size, 'two months share a label').toBe(12);
  });

  /* The cut is not a blanket one: a locale that counts its months writes a
   * numeral and a counter, and taking the counter off would say something
   * else. Without that guard this case comes back as 1, 2, ... 12. */
  it('leaves a locale that numbers its months as it writes them', () => {
    render(<DatePicker today={TODAY} locale="ja-JP" defaultValue="2026-08" defaultOpen />);
    expect(monthLabels()).toEqual(
      Array.from({ length: 12 }, (_, m) => new Intl.DateTimeFormat('ja-JP', { month: 'short', timeZone: 'UTC' })
        .format(new Date(Date.UTC(2026, m, 1)))),
    );
    expect(monthLabels()[9]).toMatch(/10/);
  });

  /* Hollow for the period you are in, filled for the one you chose, is the
   * pair a calendar has always drawn, so the ring needs no words under the
   * grid. The words it would have spent them on are in the cell's own name. */
  it('rings the current period, alone, and names it in the cell', () => {
    render(<DatePicker today={TODAY} defaultValue="2026-08" defaultOpen />);
    const ringed = [...panel().querySelectorAll('.ui-datepicker__opt.is-today')];
    expect(ringed.map(el => el.getAttribute('aria-label'))).toEqual(['September 2026, this month']);
    // Weight was the old device and is now the blocked pick's alone, so no
    // cell may wear both meanings at once.
    expect(ringed[0]).not.toHaveClass('is-selected');
  });

  it('calls it today in day grain, and rings nothing on a page without it', async () => {
    const user = userEvent.setup();
    render(<DatePicker today={TODAY} mode="day" defaultValue="2026-09-17" defaultOpen />);
    expect(cell(/^Tuesday 15 September 2026/)).toHaveAccessibleName(/today$/);
    await user.click(screen.getByRole('button', { name: /^Next month/ }));
    expect(panel().querySelectorAll('.ui-datepicker__opt.is-today')).toHaveLength(0);
  });
});

describe('range mode', () => {
  function RangeExample({ presets }: { presets?: { label: string; range: DatePickerRange }[] }) {
    const [span, setSpan] = useState<DatePickerRange>({ start: null, end: null });
    return (
      <DatePicker
        today={TODAY} mode="range" range={span}
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
        <DatePicker today={TODAY} mode="range" range={span} onRangeChange={setSpan}
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
      <DatePicker today={TODAY} mode="range" min="2026-04" max="2026-09" defaultOpen
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
      <DatePicker today={TODAY} mode="range" defaultOpen
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

/* The same two presses as the month range, one grain down. Everything the month
 * range already holds — the swap, the span, the words, the shortcuts, the
 * bounds — is asked again here rather than assumed to carry over, because the
 * grain is what changed. */
describe('day-range mode', () => {
  function Example({ presets, ...rest }: {
    presets?: { label: string; range: DatePickerRange }[];
    min?: string; max?: string; disabledPeriods?: string[];
  }) {
    const [span, setSpan] = useState<DatePickerRange>({ start: null, end: null });
    return (
      <DatePicker today={TODAY} mode="day-range" range={span}
        onRangeChange={setSpan} presets={presets} defaultOpen {...rest} />
    );
  }

  it('shows a day grid and asks for two dates', async () => {
    const user = userEvent.setup();
    render(<Example />);
    expect(within(panel()).getByRole('grid')).toHaveAccessibleName('September 2026');
    expect(within(panel()).getAllByRole('columnheader')).toHaveLength(7);
    expect(trigger()).toHaveTextContent('Select dates');
    await user.click(cell(/\b7 September 2026/));
    expect(isOpen()).toBe(true);
    expect(trigger()).toHaveTextContent('From 7 Sept 2026');
    await user.click(cell(/\b18 September 2026/));
    expect(isOpen()).toBe(false);
    expect(trigger()).toHaveTextContent('7 Sept 2026 \u2013 18 Sept 2026');
  });

  it('reads a backwards pair as the same range', async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.click(cell(/\b18 September 2026/));
    await user.click(cell(/\b7 September 2026/));
    expect(trigger()).toHaveTextContent('7 Sept 2026 \u2013 18 Sept 2026');
  });

  it('paints and names the days between the two ends', async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.click(cell(/\b7 September 2026/));
    await user.click(cell(/\b10 September 2026/));
    await user.click(trigger());
    expect(cell(/\b7 September 2026/)).toHaveAccessibleName(expect.stringContaining('range start'));
    expect(cell(/\b10 September 2026/)).toHaveAccessibleName(expect.stringContaining('range end'));
    expect(cell(/\b8 September 2026/)).toHaveClass('is-inside');
    expect(cell(/\b9 September 2026/)).toHaveAccessibleName(expect.stringContaining('in range'));
    expect(cell(/\b11 September 2026/)).not.toHaveClass('is-inside');
  });

  it('runs a range across a month boundary', async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.click(cell(/\b28 September 2026/));
    await user.click(screen.getByRole('button', { name: /^Next month/ }));
    await user.click(cell(/\b3 October 2026/));
    expect(trigger()).toHaveTextContent('28 Sept 2026 \u2013 3 Oct 2026');
    // Reopening starts from the range's own start, so the span is read on
    // September's page first and on October's after one step.
    await user.click(trigger());
    expect(within(panel()).getByRole('grid')).toHaveAccessibleName('September 2026');
    expect(cell(/\b29 September 2026/)).toHaveClass('is-inside');
    await user.click(screen.getByRole('button', { name: /^Next month/ }));
    expect(cell(/\b1 October 2026/)).toHaveClass('is-inside');
    expect(cell(/\b3 October 2026/)).toHaveAccessibleName(expect.stringContaining('range end'));
  });

  it('walks the grid with the same keys', async () => {
    const user = userEvent.setup();
    render(<Example />);
    cell(/\b15 September 2026/).focus();
    await user.keyboard('{ArrowDown}');
    expect(document.activeElement).toHaveAccessibleName(expect.stringContaining('22 September 2026'));
    await user.keyboard('{Home}');
    expect(document.activeElement).toHaveAccessibleName(expect.stringContaining('21 September 2026'));
    await user.keyboard('{PageUp}');
    expect(document.activeElement).toHaveAccessibleName(expect.stringContaining('21 August 2026'));
    await user.keyboard('{Enter}');
    expect(trigger()).toHaveTextContent('From 21 Aug 2026');
  });

  it('refuses a blocked day as an end, and spans it bare in between', async () => {
    const user = userEvent.setup();
    const onRangeChange = vi.fn();
    render(
      <DatePicker today={TODAY} mode="day-range" defaultOpen
        onRangeChange={onRangeChange} min="2026-09-03" max="2026-09-25"
        disabledPeriods={['2026-09-12']} defaultRange={{ start: null, end: null }} />,
    );
    expect(cell(/\b2 September 2026/)).toHaveAttribute('aria-disabled', 'true');
    expect(cell(/\b26 September 2026/)).toHaveAttribute('aria-disabled', 'true');
    await user.click(cell(/\b12 September 2026/));
    expect(onRangeChange).not.toHaveBeenCalled();
    await user.click(cell(/\b7 September 2026/));
    await user.click(cell(/\b18 September 2026/));
    await user.click(trigger());
    const blocked = cell(/\b12 September 2026/);
    expect(blocked).not.toHaveClass('is-inside');
    expect(blocked).not.toHaveAccessibleName(expect.stringContaining('in range'));
    expect(cell(/\b11 September 2026/)).toHaveClass('is-inside');
  });

  it('takes a shortcut, and refuses one the bounds or a blocked day spoil', async () => {
    const user = userEvent.setup();
    render(
      <Example
        min="2026-09-03" max="2026-09-25" disabledPeriods={['2026-09-13']}
        presets={[
          { label: 'This week', range: { start: '2026-09-14', end: '2026-09-20' } },
          { label: 'Last week', range: { start: '2026-09-07', end: '2026-09-13' } },
          { label: 'Last month', range: { start: '2026-08-01', end: '2026-08-31' } },
        ]}
      />,
    );
    expect(within(panel()).getByRole('button', { name: 'Last week' })).toBeDisabled();
    expect(within(panel()).getByRole('button', { name: 'Last month' })).toBeDisabled();
    await user.click(within(panel()).getByRole('button', { name: 'This week' }));
    expect(trigger()).toHaveTextContent('14 Sept 2026 \u2013 20 Sept 2026');
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
      <DatePicker today={TODAY} mode="range" defaultOpen
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
<<<<<<< HEAD
        today={TODAY} mode={mode} label="Period:" defaultOpen
        defaultValue={mode === 'day' ? '2026-09-17' : '2026-08'}
=======
        today={TODAY} mode={mode} defaultOpen
        defaultValue={grainOf(mode) === 'day' ? '2026-09-17' : '2026-08'}
>>>>>>> dec40476 (fix(react): the picker's trigger and grid drop the words that restate them (#506))
        presets={[{ label: 'This year', range: { start: '2026-01', end: '2026-12' } }]}
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
    render(<DatePicker today={TODAY} sheet defaultValue="2026-08" defaultOpen />);
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
        <DatePicker today={TODAY} sheet defaultValue="2026-08" defaultOpen />
      </div>,
    );
    // dialog.ts marks every sibling of the dialog's root, up to <body>.
    expect(container.querySelector('button')!.closest('[inert]')).not.toBeNull();
  });

  it('closes on its close control and on Escape', async () => {
    const user = userEvent.setup();
    function Example() {
      const [open, setOpen] = useState(true);
      return <DatePicker today={TODAY} sheet open={open} onOpenChange={setOpen} />;
    }
    render(<Example />);
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('closes on Escape and hands focus back to the trigger', async () => {
    const user = userEvent.setup();
    function Example() {
      const [open, setOpen] = useState(false);
      return <DatePicker today={TODAY} sheet open={open} onOpenChange={setOpen} />;
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
        <DatePicker today={TODAY} sheet defaultValue="2026-08"
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
      render(<DatePicker today={TODAY} defaultValue="2026-08" defaultOpen />);
      expect(document.querySelector('.ui-drawer')).toBeInTheDocument();
    } finally {
      if (had) Object.defineProperty(window, 'matchMedia', had);
      else delete (window as { matchMedia?: unknown }).matchMedia;
    }
  });

  it('is the popover when nothing says the viewport is narrow', () => {
    render(<DatePicker today={TODAY} defaultValue="2026-08" defaultOpen />);
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

/* The one signal that is not ink: the ring that says which period the reader is
 * in. It is paint the cell-state gate above cannot see, because that one
 * measures `color` against ground and this is a border.
 *
 * Every theme and every shipped accent, as above, and the grounds a cell
 * really sits on. What it does not reach: the browser's own rendering, which
 * the captures on the pull request own.
 * why: guidelines/accessibility-floor.md */
describe('the current period\'s ring is readable on every ground', () => {
  const THEMES = ['dark', 'light'] as const;
  const ACCENTS = ['default', 'phoenix', 'ocean', 'emerald'] as const;
  const css = read('./DatePicker.css');

  /** The cell states the ring has to survive, discovered rather than listed. */
  const STATES = ['', 'is-today', 'is-selected', 'is-selected is-today',
    'is-inside', 'is-inside is-today', 'is-disabled', 'is-disabled is-today'] as const;
  const at = (state: string) => `[data-at="${state}"]`;

  /** A panel holding one grid cell per state. */
  function harness(theme: string, accent: string, sheet = css) {
    const style = document.createElement('style');
    style.textContent = `${kitCssFor(theme, accent).css}\n${desugar(substitute(sheet, tokensFor(theme, accent)))}`;
    document.head.appendChild(style);
    document.documentElement.setAttribute('data-theme', theme);
    if (accent !== 'default') document.documentElement.setAttribute('data-accent', accent);

    const host = document.createElement('div');
    const opt = (state: string) =>
      `<span class="ui-datepicker__cell"><button class="ui-datepicker__opt ui-focusable ${state}" type="button"`
      + ` data-at="${state}"><span class="ui-datepicker__num">17</span></button></span>`;
    host.innerHTML = '<div class="ui-dropdown__panel ui-datepicker__panel"><div class="ui-datepicker__grid">'
      + STATES.map(opt).join('')
      + '</div></div>';
    document.body.appendChild(host);

    const pick = (sel: string) => host.querySelector<HTMLElement>(sel)!;
    const done = () => {
      host.remove();
      style.remove();
      document.documentElement.removeAttribute('data-accent');
    };
    return { pick, done };
  }

  const inkOf = (el: HTMLElement, prop: 'backgroundColor' | 'borderTopColor') =>
    parseColour(getComputedStyle(el)[prop]);

  it('discovers the ring states the sheet paints', () => {
    const painted = [...new Set(
      [...css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/\.ui-datepicker__opt((?:\.is-[\w-]+)+)/g)]
        .flatMap(m => m[1].split('.').filter(Boolean)),
    )];
    // Every state the sheet knows about is one this harness mounts, so a new
    // one cannot slip past the measurement below.
    const mounted = new Set(STATES.flatMap(state => state.split(' ')).filter(Boolean));
    expect(painted.filter(x => !mounted.has(x)), 'cell states the harness does not mount').toEqual([]);
  });

  it.each(THEMES)('%s: the current-period ring clears 3:1 on every ground it lands on', theme => {
    const failures: string[] = [];
    let judged = 0;
    for (const accent of ACCENTS) {
      const { pick, done } = harness(theme, accent);
      try {
        for (const state of STATES.filter(x => x.includes('is-today'))) {
          const el = pick(`.ui-datepicker__opt${at(state)}`);
          const ring = inkOf(el, 'borderTopColor');
          const ground = effectiveBackground(el, window);
          judged += 1;
          if (!ring || !Array.isArray(ground)) { failures.push(`${theme}/${accent} ${state}: unresolved`); continue; }
          const got = ratio(composite(ring, ground), ground);
          if (got < AA_LARGE) failures.push(`${theme}/${accent} ${state}: ${got.toFixed(2)}:1`);
        }
      } finally { done(); }
    }
    expect(judged, 'rings judged').toBe(STATES.filter(x => x.includes('is-today')).length * ACCENTS.length);
    expect(failures, `rings below ${AA_LARGE}:1`).toEqual([]);
  });

  /* Prove rejection by taking the ring off the pick's fill: the accent on
   * accent-strong is the pair this rule exists for. */
  it('catches the ring left in the accent on the pick\'s own fill', () => {
    const without = css.replace(/\.ui-datepicker__opt\.is-selected\.is-today \{[^}]*\}/, '');
    expect(without, 'the rule this gate mutates was renamed or moved').not.toBe(css);
    const { pick, done } = harness('light', 'default', without);
    try {
      const el = pick(`.ui-datepicker__opt${at('is-selected is-today')}`);
      const ring = inkOf(el, 'borderTopColor');
      const ground = effectiveBackground(el, window);
      expect(ratio(composite(ring, ground), ground)).toBeLessThan(AA_LARGE);
    } finally { done(); }
  });

  /* The struck label, held as text: JSDOM resolves `text-decoration` but the
   * point of the rule is which element carries it — the label, so the dot
   * beside it is not struck with it. */
  it('strikes the label of a blocked cell, and only the label', () => {
    const bare = css.replace(/\/\*[\s\S]*?\*\//g, '');
    expect(bare).toMatch(/\.ui-datepicker__opt\.is-disabled \.ui-datepicker__num \{[^}]*line-through/);
    expect(bare, 'the strike is on the button, so the dot is struck with it')
      .not.toMatch(/\.ui-datepicker__opt\.is-disabled \{[^}]*text-decoration/);
  });
});

/* The two rules the hover change broke, held as text because JSDOM resolves no
 * outline and the cell-state gate above measures ink against ground. The paint
 * itself is measured in a browser and reported on the pull request. */
describe('the hover edge', () => {
  // Comments out: an inline `ring-gap:` annotation inside a rule body would
  // otherwise read as a declaration and hide the one after it.
  const css = read('./DatePicker.css').replace(/\/\*[\s\S]*?\*\//g, '');
  const ruleFor = (selector: string) =>
    new RegExp(`\\${selector}\\s*\\{([^}]*)\\}`).exec(css)?.[1] ?? null;

  it('never transitions the outline, so focus is the ring at once', () => {
    const rest = ruleFor('.ui-datepicker__opt');
    expect(rest, 'the cell rule').not.toBeNull();
    const transition = /transition:([^;]*);/.exec(rest!)?.[1] ?? '';
    expect(transition, 'the cell transitions something').not.toBe('');
    // The focus rule resets the outline to transparent; animating its colour
    // starts that reset from the resting currentColor and paints a band.
    expect(transition).not.toMatch(/outline/);
  });

  it('is undone in full on a cell that cannot be pressed', () => {
    const hover = ruleFor('.ui-datepicker__opt:hover');
    const off = ruleFor('.ui-datepicker__opt.is-disabled:hover');
    expect(hover, 'the hover rule').not.toBeNull();
    expect(off, 'the disabled hover reset').not.toBeNull();
    // Every property hover paints has to be answered, or the blocked cell keeps it.
    const propsOf = (body: string) => body.split(';')
      .map(d => d.split(':')[0].trim()).filter(d => /^[a-z-]+$/.test(d));
    const painted = propsOf(hover!).filter(prop => prop !== 'outline-offset');
    expect(painted.length, 'properties the hover rule sets').toBeGreaterThan(2);
    for (const prop of painted) {
      const family = prop === 'outline' ? /outline(-color)?\s*:/ : new RegExp(`${prop}\\s*:`);
      expect(off, `hover sets ${prop} and the disabled reset does not answer it`).toMatch(family);
    }
  });

  it('spends no second edge on the pick, which is already a filled chip', () => {
    expect(ruleFor('.ui-datepicker__opt.is-selected:hover')).toMatch(/outline-color:\s*transparent/);
  });
});

/* The tap zone, from this side.
 *
 * `src/styles/tap-zone.css` carries the kit's 44px floor below the phone step,
 * and its browser half sweeps `stories/*.stories.js` through a vanilla page —
 * it reports `.ui-datepicker__opt: 0 seen`, because this component is React
 * only and has no vanilla story to render. So the declarations are held here
 * instead, read out of that sheet rather than repeated.
 *
 * What it does not reach: the pixels. JSDOM lays nothing out, so the measured
 * zone is reported by hand in the pull request, as that gate's own comment
 * asks.
 * why: docs/specification.md#a-tap-reaches-the-floor-below-the-phone-step */
describe('the tap zone below the phone step', () => {
  const sheet = read('../../src/styles/tap-zone.css').replace(/\/\*[\s\S]*?\*\//g, '');

  /** The coarse-pointer block of a sheet, or null. Takes the sheet, so the
   *  mutation case below can run this same reading over its mutant. */
  const coarseOf = (css: string) =>
    /@media \(max-width: 560px\) and \(pointer: coarse\) \{([\s\S]*)\n\}/.exec(css);
  /** The selectors of one `:where(…)` list in that block, by what follows it. */
  const listIn = (css: string, after: string) => {
    const block = coarseOf(css);
    if (!block) return [];
    const m = new RegExp(`:where\\(([^)]+)\\)\\s*${after}`).exec(block[1]);
    return (m?.[1] ?? '').split(',').map(x => x.trim()).filter(Boolean);
  };
  const listBefore = (after: string) => listIn(sheet, after);
  /** The two containment checks, as a list of what failed. */
  const offences = (css: string) => [
    listIn(css, '::after').includes('.ui-datepicker__opt') ? null : 'no layer on the cell',
    listIn(css, '\\{ position: relative').includes('.ui-datepicker__opt') ? null : 'no containing block',
  ].filter(Boolean);

  it('reads the sheet it is holding', () => {
    expect(coarseOf(sheet), 'the coarse-pointer block').not.toBeNull();
    expect(listBefore('\\{ position: relative').length).toBeGreaterThan(5);
    expect(listBefore('::after').length).toBeGreaterThan(5);
  });

  it('hangs a layer on the cell, and gives it something to hang it on', () => {
    expect(offences(sheet)).toEqual([]);
  });

  it('opens the week gap and declares the clearance the cells inherit', () => {
    const rule = /\.ui-datepicker__grid \{([^}]*)\}/.exec(coarseOf(sheet)![1]);
    expect(rule, 'the grid opens no gap').not.toBeNull();
    expect(rule![1]).toMatch(/row-gap:\s*var\(--tap-gap\)\s*!important/);
    expect(rule![1]).toMatch(/--tap-clear-y:\s*var\(--tap-gap\)/);
    expect(rule![1]).toMatch(/--tap-clear-x:/);
  });

  /* Every control the sheet renders, not only the grid: the two page steps are
   * the only way to change month on a phone, and the shortcuts set a whole
   * range in one press. A container that declares nothing leaves its layer at
   * the control's own size. */
  it.each(['.ui-datepicker__head', '.ui-datepicker__presets'])(
    '%s declares the clearance its controls grow into', selector => {
      const rule = new RegExp(`\\${selector} \\{([^}]*)\\}`).exec(coarseOf(sheet)![1]);
      expect(rule, `${selector} declares no clearance`).not.toBeNull();
      // One of the sheet's own named clearances, not a literal of its own:
      // these two are bordered at the smallest mark, so they take the wider one.
      expect(rule![1]).toMatch(/--tap-clear-y:\s*var\(--tap-gap(-bordered)?\)/);
      expect(rule![1]).toMatch(/--tap-clear-x:/);
    });

  /* The shortcut row scrolls, so a layer reaching past the chip is clipped
   * rather than hit: its block padding has to cover half the clearance. */
  it('pads the scrolling shortcut row by at least half that clearance', () => {
    const own = read('./DatePicker.css');
    const rule = /\.ui-datepicker__body\.is-sheet \.ui-datepicker__presets \{([^}]*)\}/.exec(own);
    expect(rule, 'the sheet rule for the shortcut row').not.toBeNull();
    expect(rule![1]).toMatch(/overflow-x:\s*auto/);
    expect(rule![1]).toMatch(/padding:\s*var\(--space-3\)/);
  });

  /* Prove rejection by running the gate over the mutant, not by proving that
   * String.replace works: the same reading that passes above must come back
   * with both offences once the cell is off the two lists. */
  it('refuses the sheet with the cell taken back off it', () => {
    const without = sheet.replace(/\n\s*\.ui-datepicker__opt\n/g, '\n');
    expect(without, 'the carrier lines this gate mutates were renamed').not.toBe(sheet);
    expect(coarseOf(without), 'the mutant still parses').not.toBeNull();
    expect(listIn(without, '::after').length, 'the other carriers survive the mutation')
      .toBeGreaterThan(5);
    expect(offences(without)).toEqual(['no layer on the cell', 'no containing block']);
  });

  /** The cell's own sheet must not fight the layer. */
  it('leaves the cell a containing block and its drawn size alone', () => {
    const own = read('./DatePicker.css');
    expect(own).toMatch(/\.ui-datepicker__opt \{[^}]*position: relative/);
    expect(own, 'the cell must not size itself inside the coarse query')
      .not.toMatch(/@media[^{]*pointer: coarse/);
  });
});
