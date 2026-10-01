import {
  useCallback, useEffect, useId, useMemo, useRef, useState,
  type KeyboardEvent as ReactKeyboardEvent, type MouseEvent as ReactMouseEvent,
} from 'react';
import { Icon } from './primitives/Icon';
import { useIsoLayoutEffect } from './dialog';
import './DatePicker.css';

// The kit's date and month picker. It wears the dropdown's shell — the same
// `.ui-dropdown` trigger and `.ui-dropdown__panel` surface the rest of the kit
// opens — and adds only the grid inside it, so a picker and a select beside it
// are the same control at rest. The panel is a dialog rather than a listbox
// because a calendar is a grid, and a listbox may own only options.
// why: docs/specification.md#the-dropdown-panel
// why: docs/specification.md#react-date-and-month-picker

/** `'month'` and `'range'` work in whole months; `'day'` in whole dates. */
export type DatePickerMode = 'month' | 'range' | 'day';

/**
 * A consumer's note on one period — "incomplete", "estimate". It shows as a dot
 * in the cell, as a word in the legend under the grid, and in the cell's
 * accessible name, so the colour is never the only channel.
 */
export type DatePickerMark = {
  /** The word readers see and hear. */
  label: string;
  tone?: 'neutral' | 'info' | 'success' | 'warn' | 'danger';
};

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
  /** Keyed by period: `{ '2026-06': { label: 'Restated' } }`. */
  marks?: Readonly<Record<string, DatePickerMark>>;
  /** Range mode: the shortcuts beside the grid. */
  presets?: readonly DatePickerPreset[];
  /** Muted prefix in the trigger, e.g. "Period:". */
  label?: string;
  placeholder?: string;
  /** Names the trigger and the panel. */
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
 * A period as one integer: months since year 0, or days since the epoch. Every
 * step, bound and comparison below is arithmetic on that integer, so no part of
 * this component walks a Date across a daylight-saving boundary.
 */
function toIndex(period: string | null | undefined, grain: Grain): number | null {
  if (!period) return null;
  if (grain === 'month') {
    const m = MONTH_RE.exec(period);
    if (!m) return null;
    const month = +m[2];
    return month >= 1 && month <= 12 ? +m[1] * 12 + month - 1 : null;
  }
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

const clamp = (index: number, lo: number | null, hi: number | null) =>
  Math.min(hi ?? index, Math.max(lo ?? index, index));

type Cell = {
  period: string;
  index: number;
  label: string;
  name: string;
  disabled: boolean;
  mark?: DatePickerMark;
};

export function DatePicker({
  mode = 'month',
  value, defaultValue = null, onChange,
  range, defaultRange, onRangeChange,
  min, max, disabledPeriods, marks, presets,
  label, placeholder, ariaLabel, id, disabled = false,
  align = 'start', locale = 'en-GB', weekStartsOn = 1, today,
  open: openProp, defaultOpen = false, onOpenChange,
}: DatePickerProps) {
  const grain: Grain = mode === 'day' ? 'day' : 'month';
  const auto = useId().replace(/:/g, '');
  const uid = id ?? auto;
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
    weekday: new Intl.DateTimeFormat(locale, { weekday: 'long', timeZone: 'UTC' }),
    weekdayShort: new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' }),
  }), [locale]);

  const at = useCallback((index: number) => new Date(
    grain === 'month'
      ? Date.UTC(Math.floor(index / 12), index % 12, 1)
      : index * DAY_MS,
  ), [grain]);

  const lo = toIndex(min, grain);
  const hi = toIndex(max, grain);
  const blocked = useMemo(() => new Set(disabledPeriods ?? []), [disabledPeriods]);
  const outOfBounds = (index: number) => (lo != null && index < lo) || (hi != null && index > hi);
  const isBlocked = (index: number) => outOfBounds(index) || blocked.has(fromIndex(index, grain));

  const todayIndex = useMemo(() => {
    const given = toIndex(today, 'day');
    const now = given ?? Math.floor(Date.now() / DAY_MS);
    return grain === 'month' ? monthOf(now) : now;
  }, [today, grain]);

  // Where the arrows are, and therefore which year or month the grid shows: one
  // piece of state, the way the APG grid pattern keeps it. A page cannot drift
  // from the cell the keyboard is on, because the page is derived from it.
  const anchor = toIndex(picked, grain)
    ?? toIndex(mode === 'range' ? (span.start ?? span.end) : null, grain)
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

  // Click-outside and Escape, while it is open.
  useEffect(() => {
    if (!open) return;
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

  const cells: Cell[] = useMemo(() => {
    const first = grain === 'month' ? page * 12 : firstDayOf(page);
    const count = grain === 'month' ? 12 : daysInMonth(page);
    return Array.from({ length: count }, (_, i) => {
      const index = first + i;
      const period = fromIndex(index, grain);
      return {
        period,
        index,
        label: grain === 'month'
          ? names.monthShort.format(at(index))
          : String(new Date(index * DAY_MS).getUTCDate()),
        name: periodName(index),
        disabled: isBlocked(index),
        mark: marks?.[period],
      };
    });
    // `isBlocked` is read here and closes over lo, hi and blocked; all three are
    // in the list below.
  }, [grain, page, names, at, periodName, marks, lo, hi, blocked]);

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
  const isInside = (index: number) =>
    edges[0] != null && edges[1] != null && index > edges[0] && index < edges[1];
  const isPicked = (index: number) => (mode === 'range'
    ? isEdge(index)
    : index === toIndex(picked, grain));

  function pick(cell: Cell) {
    if (cell.disabled) return;
    setCursor(cell.index);
    if (mode === 'range') {
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
    setOpen(false);
    trigger.current?.focus();
  }

  function usePreset(preset: DatePickerPreset) {
    if (range === undefined) setSelfRange(preset.range);
    onRangeChange?.(preset.range);
    const start = toIndex(preset.range.start, grain);
    if (start != null) setCursor(start);
    setOpen(false);
    trigger.current?.focus();
  }

  function step(by: number) {
    setCursor((now) => clamp(now + by, lo, hi));
  }

  // A page step keeps the cursor's place in the year or month where it fits.
  function stepPage(by: number) {
    setCursor((now) => clamp(grain === 'month' ? now + 12 * by : stepMonths(now, by), lo, hi));
  }

  function onGridKeyDown(e: ReactKeyboardEvent) {
    const rowStart = cursor - ((cursor - (grain === 'month' ? page * 12 : firstDayOf(page) - lead)) % columns);
    const moves: Record<string, () => void> = {
      ArrowLeft: () => step(-1),
      ArrowRight: () => step(1),
      ArrowUp: () => step(-columns),
      ArrowDown: () => step(columns),
      Home: () => setCursor(clamp(rowStart, lo, hi)),
      End: () => setCursor(clamp(rowStart + columns - 1, lo, hi)),
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
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      setOpen(false);
      trigger.current?.focus();
    }
  }

  const shown = useMemo(() => {
    if (mode === 'range') {
      const text = (period: string | null) => {
        const index = toIndex(period, grain);
        return index == null ? null : names.monthYearShort.format(at(index));
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
  }, [mode, grain, span.start, span.end, picked, names, at]);

  const empty = placeholder
    ?? (mode === 'range' ? 'Select a period' : mode === 'day' ? 'Select a date' : 'Select a month');
  const name = ariaLabel || (label ? String(label).replace(/:\s*$/, '') : '') || empty;

  // The marks on this page, once each, in the order the grid meets them. The
  // legend is what keeps a mark from being colour alone.
  // why: guidelines/accessibility-floor.md
  const legend: DatePickerMark[] = [];
  for (const cell of cells) {
    if (cell.mark && !legend.some((m) => m.label === cell.mark!.label)) legend.push(cell.mark);
  }

  const captionId = `${uid}-caption`;
  const stepBack = grain === 'month' ? 'Previous year' : 'Previous month';
  const stepOn = grain === 'month' ? 'Next year' : 'Next month';

  function state(cell: Cell) {
    const parts = [cell.name];
    if (cell.mark) parts.push(cell.mark.label);
    if (cell.index === todayIndex) parts.push(grain === 'month' ? 'this month' : 'today');
    if (mode === 'range') {
      if (cell.index === edges[0] && cell.index === edges[1]) parts.push('selected');
      else if (cell.index === edges[0]) parts.push('range start');
      else if (cell.index === edges[1]) parts.push('range end');
      else if (isInside(cell.index)) parts.push('in range');
    }
    return parts.join(', ');
  }

  return (
    <div className={cx('ui-dropdown', 'ui-datepicker', open && 'open')} id={id} ref={root}>
      <button
        type="button"
        className="ui-dropdown__trigger ui-datepicker__trigger"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={label ? undefined : name}
        disabled={disabled}
        ref={trigger}
        onClick={(e: ReactMouseEvent) => { e.stopPropagation(); setOpen(!open); }}
      >
        {label && <span className="ui-dropdown__pre">{label}</span>}
        <span className="ui-dropdown__value">{shown ?? empty}</span>
        <span className="ui-dropdown__chevron" aria-hidden="true" />
      </button>

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
        <div className="ui-datepicker__body">
          {mode === 'range' && presets?.length ? (
            <div className="ui-datepicker__presets" role="group" aria-label="Period shortcuts">
              {presets.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  className="ui-btn ui-btn--ghost ui-btn--xs ui-datepicker__preset"
                  onClick={() => usePreset(preset)}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          ) : null}

          <div className="ui-datepicker__calendar">
            <div className="ui-datepicker__head">
              <button
                type="button"
                className="ui-btn ui-btn--ghost ui-btn--xs ui-btn--icon ui-datepicker__step"
                aria-label={stepBack}
                onClick={() => stepPage(-1)}
              >
                <Icon name="chevronLeft" />
              </button>
              <span className="ui-datepicker__caption" id={captionId} aria-live="polite">{caption}</span>
              <button
                type="button"
                className="ui-btn ui-btn--ghost ui-btn--xs ui-btn--icon ui-datepicker__step"
                aria-label={stepOn}
                onClick={() => stepPage(1)}
              >
                <Icon name="chevronRight" />
              </button>
            </div>

            <div
              className={cx('ui-datepicker__grid', grain === 'day' && 'is-days')}
              role="grid"
              aria-labelledby={captionId}
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
                          isInside(cell.index) && 'is-inside',
                          cell.index === todayIndex && 'is-today',
                          cell.disabled && 'is-disabled')}
                        tabIndex={cell.index === cursor ? 0 : -1}
                        aria-disabled={cell.disabled || undefined}
                        aria-label={state(cell)}
                        onClick={() => pick(cell)}
                        onFocus={() => setCursor(cell.index)}
                      >
                        <span className="ui-datepicker__num">{cell.label}</span>
                        {cell.mark && (
                          <span
                            className={`ui-datepicker__mark is-${cell.mark.tone ?? 'neutral'}`}
                            aria-hidden="true"
                          />
                        )}
                      </button>
                    </span>
                  ) : (
                    <span className="ui-datepicker__cell is-empty" role="gridcell" key={`e${r}-${c}`} />
                  )))}
                </div>
              ))}
            </div>

            {legend.length > 0 && (
              <ul className="ui-datepicker__legend">
                {legend.map((mark) => (
                  <li key={mark.label} className="ui-datepicker__legend-item">
                    <span className={`ui-datepicker__mark is-${mark.tone ?? 'neutral'}`} aria-hidden="true" />
                    {mark.label}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
