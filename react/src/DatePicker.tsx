import {
  useCallback, useEffect, useMemo, useRef, useState,
  type KeyboardEvent as ReactKeyboardEvent, type MouseEvent as ReactMouseEvent,
} from 'react';
import { Icon } from './primitives/Icon';
import { Drawer } from './Drawer';
import { useIsoLayoutEffect } from './dialog';
import './DatePicker.css';

// The kit's date and month picker. It wears the dropdown's shell — the same
// `.ui-dropdown` trigger and `.ui-dropdown__panel` surface the rest of the kit
// opens — and adds only the grid inside it, so a picker and a select beside it
// are the same control at rest. The panel is a dialog rather than a listbox
// because a calendar is a grid, and a listbox may own only options.
// why: docs/specification.md#the-dropdown-panel
// why: docs/specification.md#react-date-and-month-picker

/**
 * `'month'` and `'range'` work in whole months, `'day'` and `'day-range'` in
 * whole dates. The two range modes behave alike: a start, then an end, with the
 * days or months between them shown as the span.
 */
export type DatePickerMode = 'month' | 'range' | 'day' | 'day-range';

/** Either end may be null while the reader is still picking. */
export type DatePickerRange = { start: string | null; end: string | null };

export type DatePickerPreset = { label: string; range: DatePickerRange };

export type DatePickerProps = {
  mode?: DatePickerMode;
  /** `'YYYY-MM'` in month mode, `'YYYY-MM-DD'` in day mode. Controlled. */
  value?: string | null;
  /** Where an uncontrolled picker starts. */
  defaultValue?: string | null;
  onChange?: (value: string | null) => void;
  /** Range mode, controlled. */
  range?: DatePickerRange;
  defaultRange?: DatePickerRange;
  /** Fires on each end, so a half-picked range is visible to the host too. */
  onRangeChange?: (range: DatePickerRange) => void;
  /** Bounds, inclusive, in the mode's own grain. */
  min?: string;
  max?: string;
  /** Periods that cannot be picked, in the mode's own grain. */
  disabledPeriods?: readonly string[];
  /** Range mode: the shortcuts beside the grid. */
  presets?: readonly DatePickerPreset[];
  placeholder?: string;
  /**
   * Names the trigger and the panel where the screen around them does not.
   * With a value, the trigger's own text is already its name.
   */
  ariaLabel?: string;
  id?: string;
  disabled?: boolean;
  /** The edge the panel hugs. */
  align?: 'start' | 'end';
  /** Month and weekday names come from here. */
  locale?: string;
  /** 0 is Sunday. Day mode only. */
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  /** `'YYYY-MM-DD'`. Given one, the grid marks it; stories and tests pass it to stay fixed. */
  today?: string;
  /**
   * Render the sheet rather than the popover whatever the viewport is. Left
   * out, the picker follows the kit's narrowest step. A host that already knows
   * it is on a phone — or renders on a server, where no viewport is readable —
   * says so here.
   */
  sheet?: boolean;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
};

type Grain = 'month' | 'day';

const cx = (...a: (string | false | undefined)[]) => a.filter(Boolean).join(' ');
const pad = (n: number) => String(n).padStart(2, '0');
const DAY_MS = 86400000;
const EN_DASH = '–';

const MONTH_RE = /^(\d{4})-(\d{2})$/;
const DAY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * The kit's narrowest step, where a floating panel goes edge to edge. A literal
 * for the reason every breakpoint in the kit is one — a media query cannot read
 * a custom property — and DatePicker.test.tsx holds it against the table in the
 * specification so this copy cannot drift from the other three.
 * why: docs/specification.md#breakpoints
 */
const PHONE_MAX = 560;

/**
 * True while the viewport is at that step. False until the component has
 * mounted, so a server render and the first client render agree on the popover
 * and the sheet arrives on the pass after.
 */
function usePhone() {
  const [phone, setPhone] = useState(false);
  useEffect(() => {
    const query = typeof window === 'undefined' ? null : window.matchMedia?.(`(max-width: ${PHONE_MAX}px)`);
    if (!query) return;
    const read = () => setPhone(query.matches);
    read();
    query.addEventListener('change', read);
    return () => query.removeEventListener('change', read);
  }, []);
  return phone;
}

/** Which end of a period's span a single index should take. */
type Edge = 'start' | 'end';

/** A month period as a month index, or null when it is not one. */
function monthIndexOf(period: string): number | null {
  const m = MONTH_RE.exec(period);
  if (!m) return null;
  const month = +m[2];
  return month >= 1 && month <= 12 ? +m[1] * 12 + month - 1 : null;
}

/** A date period as a day index, or null when it is not one. */
function dayIndexOf(period: string): number | null {
  const m = DAY_RE.exec(period);
  if (!m) return null;
  const [y, mo, d] = [+m[1], +m[2], +m[3]];
  const at = Date.UTC(y, mo - 1, d);
  // Date.UTC rolls 2026-02-30 forward into March; a period that does not survive
  // the round trip was never a date.
  const back = new Date(at);
  if (back.getUTCFullYear() !== y || back.getUTCMonth() !== mo - 1 || back.getUTCDate() !== d) return null;
  return Math.round(at / DAY_MS);
}

/**
 * A period as one integer: months since year 0, or days since the epoch. Every
 * step, bound and comparison below is arithmetic on that integer, so no part of
 * this component walks a Date across a daylight-saving boundary.
 *
 * A period written in the other grain still counts, because `min?: string` is
 * all the type can say and a bound that silently means "no bound" is the worst
 * of the three answers. A month read in day grain is its whole span — `edge`
 * picks the first or the last day of it — and a date read in month grain is the
 * month it falls in.
 */
function toIndex(period: string | null | undefined, grain: Grain, edge: Edge = 'start'): number | null {
  if (!period) return null;
  if (grain === 'month') {
    const month = monthIndexOf(period);
    if (month != null) return month;
    const day = dayIndexOf(period);
    return day == null ? null : monthOf(day);
  }
  const day = dayIndexOf(period);
  if (day != null) return day;
  const month = monthIndexOf(period);
  if (month == null) return null;
  return edge === 'start' ? firstDayOf(month) : firstDayOf(month + 1) - 1;
}

function fromIndex(index: number, grain: Grain): string {
  if (grain === 'month') return `${pad4(Math.floor(index / 12))}-${pad(index % 12 + 1)}`;
  const at = new Date(index * DAY_MS);
  return `${pad4(at.getUTCFullYear())}-${pad(at.getUTCMonth() + 1)}-${pad(at.getUTCDate())}`;
}

const pad4 = (n: number) => String(n).padStart(4, '0');

/** The first of the month a day period sits in, as a month index. */
const monthOf = (dayIndex: number) => {
  const at = new Date(dayIndex * DAY_MS);
  return at.getUTCFullYear() * 12 + at.getUTCMonth();
};
const firstDayOf = (monthIndex: number) =>
  Math.round(Date.UTC(Math.floor(monthIndex / 12), monthIndex % 12, 1) / DAY_MS);
const daysInMonth = (monthIndex: number) => firstDayOf(monthIndex + 1) - firstDayOf(monthIndex);

/** Step a day index by whole months, keeping the day of the month where it fits. */
function stepMonths(dayIndex: number, by: number) {
  const at = new Date(dayIndex * DAY_MS);
  const target = monthOf(dayIndex) + by;
  const day = Math.min(at.getUTCDate(), daysInMonth(target));
  return firstDayOf(target) + day - 1;
}

/**
 * The twelve short month names at one length. ICU gives en-GB "Sept" among
 * eleven three-letter names, and in a three-column grid the long one reads as
 * emphasis. Every name is cut to the shortest when they are letters alone and
 * the cut keeps them apart; a locale that numbers its months — ja "10月" —
 * is left as it writes them, because cutting the counter off a numeral leaves
 * a different word.
 */
function evenMonthLabels(format: Intl.DateTimeFormat): string[] {
  const raw = Array.from({ length: 12 }, (_, m) => format.format(new Date(Date.UTC(2000, m, 1))));
  const bare = raw.map((n) => n.replace(/\.$/, ''));
  // Code points rather than UTF-16 units, so a cut never lands inside a letter.
  const chars = bare.map((n) => Array.from(n));
  const cut = chars.map((c) => c.slice(0, Math.min(...chars.map((o) => o.length))).join(''));
  const even = bare.every((n) => /^\p{L}+$/u.test(n)) && new Set(cut).size === 12;
  return even ? cut : raw;
}

const clamp = (index: number, lo: number | null, hi: number | null) =>
  Math.min(hi ?? index, Math.max(lo ?? index, index));

type Cell = {
  period: string;
  index: number;
  label: string;
  name: string;
  disabled: boolean;
};

export function DatePicker({
  mode = 'month',
  value, defaultValue = null, onChange,
  range, defaultRange, onRangeChange,
  min, max, disabledPeriods, presets,
  placeholder, ariaLabel, id, disabled = false,
  align = 'start', locale = 'en-GB', weekStartsOn = 1, today, sheet,
  open: openProp, defaultOpen = false, onOpenChange,
}: DatePickerProps) {
  const grain: Grain = mode === 'day' || mode === 'day-range' ? 'day' : 'month';
  // Which of the two questions the grid is asking. The grain and the span are
  // separate: either grain can be picked as one period or as a range, and every
  // rule below reads this rather than naming a mode.
  const picksRange = mode === 'range' || mode === 'day-range';
  // Below the kit's narrowest step the panel is a sheet, and a sheet is the
  // kit's drawer rather than a wide popover.
  const phone = usePhone();
  const asSheet = sheet ?? phone;
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const grid = useRef<HTMLDivElement>(null);

  const [selfOpen, setSelfOpen] = useState(defaultOpen);
  const open = openProp ?? selfOpen;
  const [selfValue, setSelfValue] = useState<string | null>(defaultValue);
  const picked = value !== undefined ? value : selfValue;
  const [selfRange, setSelfRange] = useState<DatePickerRange>(defaultRange ?? { start: null, end: null });
  const span = range !== undefined ? range : selfRange;

  const names = useMemo(() => ({
    month: new Intl.DateTimeFormat(locale, { month: 'long', timeZone: 'UTC' }),
    monthShort: new Intl.DateTimeFormat(locale, { month: 'short', timeZone: 'UTC' }),
    monthYear: new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric', timeZone: 'UTC' }),
    monthYearShort: new Intl.DateTimeFormat(locale, { month: 'short', year: 'numeric', timeZone: 'UTC' }),
    day: new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }),
    dayShort: new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }),
    weekday: new Intl.DateTimeFormat(locale, { weekday: 'long', timeZone: 'UTC' }),
    weekdayShort: new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' }),
  }), [locale]);

  const monthLabels = useMemo(() => evenMonthLabels(names.monthShort), [names]);

  const at = useCallback((index: number) => new Date(
    grain === 'month'
      ? Date.UTC(Math.floor(index / 12), index % 12, 1)
      : index * DAY_MS,
  ), [grain]);

  // A bound takes the far end of its own span, so `max="2026-09"` in day grain
  // means the 30th rather than the 1st and the month it names is included whole.
  const lo = toIndex(min, grain, 'start');
  const hi = toIndex(max, grain, 'end');
  // Each blocked period as the span it covers, for the same reason: a month
  // listed in day grain blocks all of its days, not none of them.
  const blocked = useMemo(() => (disabledPeriods ?? []).flatMap((period) => {
    const from = toIndex(period, grain, 'start');
    const to = toIndex(period, grain, 'end');
    return from == null || to == null ? [] : [[from, to] as const];
  }), [disabledPeriods, grain]);
  const outOfBounds = (index: number) => (lo != null && index < lo) || (hi != null && index > hi);
  const isBlocked = (index: number) =>
    outOfBounds(index) || blocked.some(([from, to]) => index >= from && index <= to);

  const todayIndex = useMemo(() => {
    const given = toIndex(today, 'day');
    const now = given ?? Math.floor(Date.now() / DAY_MS);
    return grain === 'month' ? monthOf(now) : now;
  }, [today, grain]);

  // Where the arrows are, and therefore which year or month the grid shows: one
  // piece of state, the way the APG grid pattern keeps it. A page cannot drift
  // from the cell the keyboard is on, because the page is derived from it.
  const anchor = toIndex(picked, grain)
    ?? toIndex(picksRange ? (span.start ?? span.end) : null, grain)
    ?? todayIndex;
  const [cursor, setCursor] = useState(() => clamp(anchor, lo, hi));
  // Where DOM focus should land once the grid has rendered. A page step from the
  // header leaves it null, so the reader's focus stays on the button they pressed.
  const land = useRef(false);

  const setOpen = useCallback((next: boolean) => {
    if (openProp === undefined) setSelfOpen(next);
    onOpenChange?.(next);
  }, [openProp, onOpenChange]);
  const close = useRef(setOpen);
  useIsoLayoutEffect(() => { close.current = setOpen; });

  // Every open starts from the current pick, not from wherever the reader left
  // the grid last time. The open edge is the whole dependency on purpose: a
  // caller that moves its value while the panel is up has not asked for the
  // reader's place in the grid back.
  useEffect(() => {
    if (open) setCursor(clamp(anchor, lo, hi));
  }, [open]);

  // Click-outside and Escape, while it is open as a popover. A sheet gets both
  // from <Drawer>, along with the scrim that makes the outside click visible.
  useEffect(() => {
    if (!open || asSheet) return;
    const doc = root.current?.ownerDocument ?? document;
    const onClick = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) close.current(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      close.current(false);
      trigger.current?.focus();
    };
    doc.addEventListener('click', onClick);
    doc.addEventListener('keydown', onKey);
    return () => {
      doc.removeEventListener('click', onClick);
      doc.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // The cell the keyboard is on takes DOM focus after the grid has rendered it.
  useIsoLayoutEffect(() => {
    if (!open || !land.current) return;
    land.current = false;
    grid.current?.querySelector<HTMLElement>('[data-dp-cell][tabindex="0"]')?.focus();
  });

  const columns = grain === 'month' ? 3 : 7;
  const page = grain === 'month' ? Math.floor(cursor / 12) : monthOf(cursor);
  const caption = grain === 'month' ? String(page) : names.monthYear.format(at(firstDayOf(page)));

  const periodName = useCallback((index: number) => (grain === 'month'
    ? names.monthYear.format(at(index))
    : `${names.weekday.format(at(index))} ${names.day.format(at(index))}`), [grain, names, at]);

  // The first and last period the page actually shows. Every move that must not
  // leave the page is held to these two numbers.
  const count = grain === 'month' ? 12 : daysInMonth(page);
  const first = grain === 'month' ? page * 12 : firstDayOf(page);
  const last = first + count - 1;

  const cells: Cell[] = useMemo(() => Array.from({ length: count }, (_, i) => {
    const index = first + i;
    const period = fromIndex(index, grain);
    return {
      period,
      index,
      label: grain === 'month'
        ? monthLabels[index % 12]
        : String(new Date(index * DAY_MS).getUTCDate()),
      name: periodName(index),
      disabled: isBlocked(index),
    };
  // `isBlocked` is read here and closes over lo, hi and blocked; all three are
  // in the list below.
  }), [grain, first, count, monthLabels, at, periodName, lo, hi, blocked]);

  // Day grids start the first of the month under its own weekday, so the blanks
  // before it are cells with nothing in them rather than a neighbouring month's
  // dates: an adjacent month's numbers in the same grid read as pickable.
  const lead = grain === 'day'
    ? (new Date(firstDayOf(page) * DAY_MS).getUTCDay() - weekStartsOn + 7) % 7
    : 0;
  const rows: (Cell | null)[][] = [];
  const slots: (Cell | null)[] = [...Array<null>(lead).fill(null), ...cells];
  while (slots.length % columns !== 0) slots.push(null);
  for (let i = 0; i < slots.length; i += columns) rows.push(slots.slice(i, i + columns));

  const weekdays = grain === 'day'
    ? Array.from({ length: 7 }, (_, i) => {
      // 1970-01-04 was a Sunday, so the epoch day of weekday w is 3 + w.
      const sample = at(3 + ((weekStartsOn + i) % 7));
      return { short: names.weekdayShort.format(sample), long: names.weekday.format(sample) };
    })
    : [];

  const startIndex = toIndex(span.start, grain);
  const endIndex = toIndex(span.end, grain);
  const edges = startIndex != null && endIndex != null
    ? [Math.min(startIndex, endIndex), Math.max(startIndex, endIndex)]
    : [startIndex ?? endIndex, startIndex ?? endIndex];

  const isEdge = (index: number) => index === edges[0] || index === edges[1];
  // Inside the span, as the value means it: `{ start, end }` is a pair, so the
  // range it names runs over every period between them, blocked ones included.
  // The accessible name says so.
  const inSpan = (index: number) =>
    edges[0] != null && edges[1] != null && index > edges[0] && index < edges[1];
  // Whether the cell WEARS the span. A blocked one does not: the disabled ink
  // over the span's tint cannot be read — it measured 4.43:1 under the green
  // accent on dark — so that cell stays bare, and what it loses in paint it
  // keeps in its name. The one place the two deliberately differ.
  const showsSpan = (cell: Cell) => inSpan(cell.index) && !cell.disabled;
  const isPicked = (index: number) => (picksRange
    ? isEdge(index)
    : index === toIndex(picked, grain));

  function pick(cell: Cell) {
    if (cell.disabled) return;
    setCursor(cell.index);
    if (picksRange) {
      // First press opens a new range, second closes it; a second press below the
      // first is the same range read backwards, so the ends swap rather than
      // asking the reader to start again.
      const half = startIndex != null && endIndex == null;
      const next: DatePickerRange = half
        ? (cell.index < startIndex
          ? { start: cell.period, end: span.start }
          : { start: span.start, end: cell.period })
        : { start: cell.period, end: null };
      if (range === undefined) setSelfRange(next);
      onRangeChange?.(next);
      if (next.end == null) return;
    } else {
      if (value === undefined) setSelfValue(cell.period);
      onChange?.(cell.period);
    }
    dismiss();
  }

  // The sheet returns focus to whatever opened it, so only the popover moves it
  // back by hand; doing both would have two owners of the same answer.
  function dismiss() {
    setOpen(false);
    if (!asSheet) trigger.current?.focus();
  }

  /**
   * A shortcut's range as the bounds allow it: clamped where the two overlap,
   * and null where they do not — a shortcut the grid would refuse cell by cell
   * must not be applied whole from beside it.
   *
   * An end that lands on a blocked period is a refusal and not a clamp. Walking
   * inwards to the nearest free period would hand back a range nobody asked
   * for, and the cell itself cannot be pressed, so the shortcut is off for the
   * same reason the cell is.
   */
  function allowed(preset: DatePickerPreset): DatePickerRange | null {
    const a = toIndex(preset.range.start, grain, 'start');
    const b = toIndex(preset.range.end, grain, 'end');
    if (a == null || b == null) return null;
    const [from, to] = a <= b ? [a, b] : [b, a];
    if ((hi != null && from > hi) || (lo != null && to < lo)) return null;
    const ends = [clamp(from, lo, hi), clamp(to, lo, hi)];
    if (ends.some(isBlocked)) return null;
    return { start: fromIndex(ends[0], grain), end: fromIndex(ends[1], grain) };
  }

  function applyPreset(next: DatePickerRange) {
    if (range === undefined) setSelfRange(next);
    onRangeChange?.(next);
    const start = toIndex(next.start, grain, 'start');
    if (start != null) setCursor(start);
    dismiss();
  }

  function step(by: number) {
    setCursor((now) => clamp(now + by, lo, hi));
  }

  // A page step keeps the cursor's place in the year or month where it fits.
  function stepPage(by: number) {
    setCursor((now) => clamp(grain === 'month' ? now + 12 * by : stepMonths(now, by), lo, hi));
  }

  function onGridKeyDown(e: ReactKeyboardEvent) {
    // The row's own ends, not the lattice's. A day grid pads its first row with
    // blanks, so the slot at column 0 of week one belongs to the month before —
    // and Home, which was asked for the end of THIS row, would have repaginated
    // the grid under the reader. Both ends are held to the cells on the page.
    const rowStart = cursor - ((cursor - (first - lead)) % columns);
    const moves: Record<string, () => void> = {
      ArrowLeft: () => step(-1),
      ArrowRight: () => step(1),
      ArrowUp: () => step(-columns),
      ArrowDown: () => step(columns),
      Home: () => setCursor(clamp(Math.max(rowStart, first), lo, hi)),
      End: () => setCursor(clamp(Math.min(rowStart + columns - 1, last), lo, hi)),
      PageUp: () => stepPage(-1),
      PageDown: () => stepPage(1),
    };
    const move = moves[e.key];
    if (move) {
      e.preventDefault();
      land.current = true;
      move();
      return;
    }
    // A sheet's Escape belongs to the dialog stack, which is a document
    // listener; stopping the event here would take it from the drawer.
    if (e.key === 'Escape' && !asSheet) {
      e.preventDefault();
      e.stopPropagation();
      dismiss();
    }
  }

  const shown = useMemo(() => {
    if (picksRange) {
      // A range names both ends in the short form, so the trigger holds a pair
      // of dates in the width one long date would take.
      const text = (period: string | null) => {
        const index = toIndex(period, grain);
        if (index == null) return null;
        return grain === 'month' ? names.monthYearShort.format(at(index)) : names.dayShort.format(at(index));
      };
      const from = text(span.start);
      const to = text(span.end);
      if (from && to) return `${from} ${EN_DASH} ${to}`;
      if (from) return `From ${from}`;
      if (to) return `Until ${to}`;
      return null;
    }
    const index = toIndex(picked, grain);
    if (index == null) return null;
    return grain === 'month' ? names.monthYear.format(at(index)) : names.day.format(at(index));
  }, [picksRange, grain, span.start, span.end, picked, names, at]);

  const empty = placeholder ?? (picksRange
    ? (grain === 'month' ? 'Select a period' : 'Select dates')
    : (grain === 'month' ? 'Select a month' : 'Select a date'));
  const name = ariaLabel || empty;

  /** What a page is called: the year, or the month and year. */
  const pageName = (which: number) => (grain === 'month'
    ? String(which) : names.monthYear.format(at(firstDayOf(which))));
  // Each step names where it goes, not only which way: the shortcuts a host
  // supplies are "This year" and "Previous year", and two buttons reading
  // "Previous year" in one dialog is one name for two different moves.
  // why: guidelines/going-back.md
  const stepBack = `${grain === 'month' ? 'Previous year' : 'Previous month'}, ${pageName(page - 1)}`;
  const stepOn = `${grain === 'month' ? 'Next year' : 'Next month'}, ${pageName(page + 1)}`;

  function state(cell: Cell) {
    const parts = [cell.name];
    if (cell.index === todayIndex) parts.push(grain === 'month' ? 'this month' : 'today');
    if (picksRange) {
      if (cell.index === edges[0] && cell.index === edges[1]) parts.push('selected');
      else if (cell.index === edges[0]) parts.push('range start');
      else if (cell.index === edges[1]) parts.push('range end');
      else if (inSpan(cell.index)) parts.push('in range');
    } else if (isPicked(cell.index)) {
      // The pick lives on the gridcell's aria-selected, which is the wrapper and
      // not the element focus lands on, so without this the reader arrowing onto
      // the month they chose hears exactly what they hear on every other month.
      parts.push('selected');
    }
    return parts.join(', ');
  }


  // A step that cannot move the page is off rather than silent: the page the
  // press would turn to lies entirely outside the bounds.
  const noneBefore = lo != null && first <= lo;
  const noneAfter = hi != null && last >= hi;

  const calendar = (
    <div className={cx('ui-datepicker__body', asSheet && 'is-sheet')}>
      {picksRange && presets?.length ? (
        <div className="ui-datepicker__presets" role="group" aria-label="Period shortcuts">
          {presets.map((preset) => {
            // A shortcut the bounds leave nothing of is off rather than absent:
            // the reader sees which periods the host offers either way.
            const within = allowed(preset);
            return (
              <button
                key={preset.label}
                type="button"
                className="ui-btn ui-btn--ghost ui-btn--xs ui-datepicker__preset"
                disabled={within == null}
                onClick={() => within && applyPreset(within)}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      ) : null}

      <div className="ui-datepicker__calendar">
        <div className="ui-datepicker__head">
          <button
            type="button"
            className="ui-btn ui-btn--ghost ui-btn--xs ui-btn--icon ui-datepicker__step"
            aria-label={stepBack}
            disabled={noneBefore}
            onClick={() => stepPage(-1)}
          >
            <Icon name="chevronLeft" />
          </button>
          {/* A live region and the grid's label were one element, so a page
              step was announced twice. The grid takes the same string as a
              name of its own instead. */}
          <span className="ui-datepicker__caption" aria-live="polite">{caption}</span>
          <button
            type="button"
            className="ui-btn ui-btn--ghost ui-btn--xs ui-btn--icon ui-datepicker__step"
            aria-label={stepOn}
            disabled={noneAfter}
            onClick={() => stepPage(1)}
          >
            <Icon name="chevronRight" />
          </button>
        </div>

        <div
          className={cx('ui-datepicker__grid', grain === 'day' && 'is-days')}
          role="grid"
          aria-label={caption}
          ref={grid}
          onKeyDown={onGridKeyDown}
        >
          {weekdays.length > 0 && (
            <div className="ui-datepicker__row" role="row">
              {weekdays.map((weekday) => (
                <span
                  key={weekday.long}
                  className="ui-datepicker__weekday"
                  role="columnheader"
                  aria-label={weekday.long}
                >
                  {weekday.short}
                </span>
              ))}
            </div>
          )}
          {rows.map((cellsInRow, r) => (
            <div className="ui-datepicker__row" role="row" key={`r${r}`}>
              {cellsInRow.map((cell, c) => (cell ? (
                <span
                  key={cell.period}
                  className="ui-datepicker__cell"
                  role="gridcell"
                  aria-selected={isPicked(cell.index)}
                >
                  <button
                    type="button"
                    data-dp-cell=""
                    data-value={cell.period}
                    className={cx('ui-datepicker__opt', 'ui-focusable',
                      isPicked(cell.index) && 'is-selected',
                      showsSpan(cell) && 'is-inside',
                      cell.index === todayIndex && 'is-today',
                      cell.disabled && 'is-disabled')}
                    tabIndex={cell.index === cursor ? 0 : -1}
                    aria-disabled={cell.disabled || undefined}
                    aria-label={state(cell)}
                    onClick={() => pick(cell)}
                    onFocus={() => setCursor(cell.index)}
                  >
                    <span className="ui-datepicker__num">{cell.label}</span>
                  </button>
                </span>
              ) : (
                <span className="ui-datepicker__cell is-empty" role="gridcell" key={`e${r}-${c}`} />
              )))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    // `open` on the root whichever form the panel takes, so the trigger's
    // chevron flips for the sheet as it does for the popover. The panel rules
    // it also switches on have no panel to find while the sheet is up.
    <div className={cx('ui-dropdown', 'ui-datepicker', open && 'open')} id={id} ref={root}>
      <button
        type="button"
        className="ui-dropdown__trigger ui-datepicker__trigger"
        aria-haspopup="dialog"
        aria-expanded={open}
        // Only when the trigger's own text says nothing: with a value the text
        // IS the value, and an aria-label would replace "17 September 2026"
        // with "Select a date".
        aria-label={ariaLabel || (shown ? undefined : name)}
        disabled={disabled}
        ref={trigger}
        onClick={(e: ReactMouseEvent) => { e.stopPropagation(); setOpen(!open); }}
      >
        {/* The value alone: "Period: Apr 2026 – Aug 2026" says "period" twice.
            why: guidelines/density-and-accents.md */}
        <span className="ui-dropdown__value">{shown ?? empty}</span>
        <span className="ui-dropdown__chevron" aria-hidden="true" />
      </button>

      {asSheet ? (
        // A sheet is the kit's drawer, not a wide popover: the scrim, the close
        // control, the focus trap, the inert page behind it and the restored
        // focus all come from <Drawer>, because changing the FORM of the panel
        // without taking the sheet's affordances left a phone reader with no
        // visible way out and a Tab that walked into the live page behind it.
        // why: guidelines/drawer.md
        <Drawer open={open} side="bottom" size="md" title={name} onClose={() => setOpen(false)}>
          {calendar}
        </Drawer>
      ) : (
        <div
          className={cx('ui-dropdown__panel', 'ui-datepicker__panel', align === 'end' && 'is-end')}
          role="dialog"
          aria-label={name}
          // Mounted while closed so the panel can fade out the way every other
          // dropdown in the kit does, and inert while it is, so a grid nobody
          // opened is out of the tab order, out of the pointer's way and out of
          // the accessibility tree. why: docs/specification.md#the-dropdown-panel
          inert={!open}
          onClick={(e: ReactMouseEvent) => e.stopPropagation()}
        >
          {calendar}
        </div>
      )}
    </div>
  );
}
