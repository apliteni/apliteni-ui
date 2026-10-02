// The two shapes a money dashboard keeps redrawing, and the sparkline that sits
// beside a figure. The arithmetic is the kit's (src/logic/chart.js), the readout
// is the kit's tooltip, and the paint is the kit's tokens — this file owns the
// pixels, the keyboard and the markup, and nothing else.
// why: docs/specification.md#react-charts
import {
  useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState,
  type CSSProperties, type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { CHART_FLOOR, bridgeWalk, chartScale } from '@apliteni/apliteni-ui';
import '../../src/styles/chart.css';
import { placeTip } from './tip';

export type ChartTone = 'accent' | 'good' | 'bad' | 'warn' | 'info' | 'neutral';

export type ChartPeriod = {
  /** The period as the readout and the table name it: `Jan 2026`. */
  label: string;
  /** The period as the axis names it. Defaults to `label`'s first word. */
  short?: string;
  /** The period is not final — estimated, forecast, or still running. */
  estimated?: boolean;
  /** Why it is not final. Printed in the readout and in the legend. */
  note?: string;
};

export type ChartSeries = {
  id: string;
  name: string;
  values: readonly number[];
  /**
   * `bars` stand on the zero line, `bars-below` hang under it from positive
   * magnitudes (spend given as 31870, not −31870), and `line` crosses both.
   */
  shape?: 'bars' | 'bars-below' | 'line';
  /** Bars take a tone. A line is `neutral` unless the caller says otherwise. */
  tone?: ChartTone;
  /** Fade the bars towards the zero line. */
  fade?: boolean;
};

export type ChartBridgeStep = {
  label: string;
  short?: string;
  /**
   * A `total` is an absolute column; a `change` is added to the running total.
   * The first step is a total and every later one a change, unless it says so.
   */
  kind?: 'total' | 'change';
  /** A change's amount. A `total` without one takes the running total. */
  value?: number;
  estimated?: boolean;
  note?: string;
};

export type ChartBridgeTones = { rise?: ChartTone; fall?: ChartTone; total?: ChartTone };

type ChartCommon = {
  /**
   * Names the chart for a reader who cannot see it, and the table under it.
   * Never drawn: the card around a chart already carries its title.
   */
  title: string;
  /** Exact values, for the readout, the live region and the table. */
  format: (value: number) => string;
  /** Axis ticks, which are whole units. Defaults to `format`. */
  formatAxis?: (value: number) => string;
  /** The plot's height in CSS px. */
  height?: number;
  /** Offer the same numbers as a table. On by default, off for a sparkline. */
  table?: boolean;
  /** Let Enter and a click pick a column. */
  selectable?: boolean;
  /** The picked column, when the caller keeps that state. */
  selected?: number | null;
  onSelect?: (index: number) => void;
  className?: string;
};

export type ChartProps = ChartCommon & (
  | { variant?: 'months'; periods: readonly ChartPeriod[]; series: readonly ChartSeries[] }
  | { variant: 'spark'; periods: readonly ChartPeriod[]; series: readonly ChartSeries[] }
  | { variant: 'bridge'; steps: readonly ChartBridgeStep[]; tones?: ChartBridgeTones }
);

type Column = { label: string; short: string; estimated: boolean; note?: string };
type Key = { id: string; name: string; tone: ChartTone; shape: 'bars' | 'bars-below' | 'line' };
type Band = 'up' | 'down' | 'full';

/** One drawn value: a bar's box or a dot's target square, with what it says. */
type Mark = {
  id: string;
  column: number;
  name: string;
  tone: ChartTone;
  value: number;
  /** The readout's one comparison. */
  detail: string;
  x: number; y: number; w: number; h: number;
  kind: 'bar' | 'dot';
  band: Band;
  estimated: boolean;
  faded: boolean;
};

type Line = { id: string; tone: ChartTone; values: number[] };

/** Everything after the memo reads this one shape, whichever variant it came from. */
type Frame = {
  columns: Column[];
  scale: { min: number; max: number; step: number; ticks: number[] };
  /** A bar per column, laid out once the plot's width is known. */
  bars: { id: string; name: string; tone: ChartTone; column: number; from: number; to: number;
    detail: string; faded: boolean; band: Band }[];
  lines: Line[];
  keys: Key[];
  tableHead: string[];
  tableRows: { column: Column; cells: string[] }[];
};

/** The plot's height when the caller names none. */
const HEIGHT = { months: 216, bridge: 216, spark: 32 };
/** Room for a stroke at the band's edges, so a full-height bar is not shaved. */
const PAD = 2;
/**
 * How far a bar stops short of the zero line, each side. The channel this
 * leaves is real empty ground: a stroke of the chart's own colour laid over the
 * marks instead would erase a line series sitting on zero, slice a dot near it,
 * and break the picked column's accent frame where the two bars meet.
 */
const ZERO_INSET = 1.5;
/** A pointer target is at least this wide — guidelines/accessibility-floor.md. */
const TARGET = 24;
/**
 * A faded bar's ramp, as offsets down its own box. It travels towards the zero
 * line and stops short of it, so the bar still holds its tone at the edge the
 * reader measures from: a ramp that reached zero washed out exactly there, and
 * two series meeting on the line read as one block.
 * `up` stands on zero (its box ends there); `down` hangs from it.
 */
const FADE_STOPS = {
  up: [['far', 0], ['near', 0.8], ['far', 1]],
  down: [['far', 0], ['near', 0.2], ['far', 1]],
} as const;
/**
 * The column width used before the plot has been measured: server-rendered, or
 * in a test environment with no layout. `src/styles/chart.css` carries the real
 * floor as `--ui-chart-col`; this only has to be wide enough that geometry
 * computed without a browser is still the geometry of a readable chart.
 */
const FALLBACK_COL = 48;

/** What the table prints where the caller gave no value, as the kit's numeric
 *  value formatter does. */
const MISSING = '—';

const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(' ');
const px = (n: number) => Math.round(n * 10) / 10;
const columnOf = (p: ChartPeriod | ChartBridgeStep, fallback: string): Column => ({
  label: p.label, short: p.short || fallback, estimated: Boolean(p.estimated), note: p.note,
});

/** A share-of-the-previous-column comparison, in the kit's readout wording. */
function onPrevious(value: number, previous: number | undefined, when: string) {
  if (previous === undefined || previous === 0 || !Number.isFinite(previous) || !when) return '';
  const pct = ((value - previous) / Math.abs(previous)) * 100;
  return `${pct < 0 ? '−' : '+'}${Math.abs(pct).toFixed(1)}% on ${when}`;
}

/** The pattern or gradient a bar is painted with, named for the stylesheet.
 *  A `fill` attribute would lose to chart.css's own rule. */
function paintOf(mark: Mark, uid: string): CSSProperties | undefined {
  if (mark.estimated) return { '--ui-chart-paint': `url(#${uid}-hatch-${mark.tone})` } as CSSProperties;
  if (mark.faded) {
    const way = mark.band === 'down' ? 'down' : 'up';
    return { '--ui-chart-paint': `url(#${uid}-fade-${mark.tone}-${way})` } as CSSProperties;
  }
  return undefined;
}

function stateOf(column: Column | undefined) {
  if (!column?.estimated) return '';
  return column.note ? `Estimated — ${column.note}` : 'Estimated';
}

/** The frame a bars-and-line chart draws, and the sparkline's, which is the same
 *  drawing read against itself instead of against zero. */
function seriesFrame(
  periods: readonly ChartPeriod[], series: readonly ChartSeries[],
  spark: boolean, format: (n: number) => string,
): Frame {
  const columns = periods.map((p) => columnOf(p, p.label.split(' ')[0]));
  const shapeOf = (s: ChartSeries) => s.shape ?? 'bars';
  const split = series.some((s) => shapeOf(s) === 'bars-below');
  const reach = series.flatMap((s) => s.values.map((v) => (shapeOf(s) === 'bars-below' ? -v : v)));
  const scale = chartScale(spark ? reach : [...reach, 0], spark
    ? { zero: false, nice: false, floor: CHART_FLOOR }
    : { zero: true, ticks: 4 });

  const bars: Frame['bars'] = [];
  const lines: Line[] = [];
  for (const s of series) {
    const shape = shapeOf(s);
    const tone = s.tone ?? (shape === 'line' ? 'neutral' : 'accent');
    if (shape === 'line') {
      lines.push({ id: s.id, tone, values: s.values.map((v) => (Number.isFinite(v) ? v : Number.NaN)) });
      continue;
    }
    const below = shape === 'bars-below';
    s.values.forEach((raw, i) => {
      // A value the caller did not give draws no bar at all. A zero-height bar
      // standing on the zero line would read as a period that earned nothing.
      if (!Number.isFinite(raw) || i >= columns.length) return;
      const value = raw;
      bars.push({
        id: `${s.id}-${i}`, name: s.name, tone, column: i,
        from: 0, to: below ? -value : value,
        detail: onPrevious(value, s.values[i - 1], columns[i - 1]?.short ?? ''),
        faded: Boolean(s.fade), band: split ? (below ? 'down' : 'up') : 'full',
      });
    });
  }
  return {
    columns,
    scale,
    bars,
    lines,
    keys: series.map((s) => ({
      id: s.id, name: s.name, shape: shapeOf(s),
      tone: s.tone ?? (shapeOf(s) === 'line' ? 'neutral' : 'accent'),
    })),
    tableHead: ['Period', ...series.map((s) => s.name)],
    tableRows: columns.map((column, i) => ({
      column,
      cells: series.map((s) => (Number.isFinite(s.values[i]) ? format(s.values[i]) : MISSING)),
    })),
  };
}

/** The frame a bridge draws: one period walked from a total to a result. */
function bridgeFrame(
  steps: readonly ChartBridgeStep[], tones: ChartBridgeTones | undefined,
  format: (n: number) => string,
): Frame {
  const rise = tones?.rise ?? 'good';
  const fall = tones?.fall ?? 'bad';
  const total = tones?.total ?? 'neutral';
  const walk = bridgeWalk(steps as ChartBridgeStep[]);
  const columns = walk.map((step) => columnOf(step, step.label));
  const toneOf = (step: (typeof walk)[number]) =>
    (step.kind === 'total' ? total : step.value < 0 ? fall : rise);
  const named: Key[] = [];
  for (const step of walk) {
    const tone = toneOf(step);
    const name = step.kind === 'total' ? 'Totals' : step.value < 0 ? 'Decreases' : 'Increases';
    if (!named.some((k) => k.id === tone)) named.push({ id: tone, name, tone, shape: 'bars' });
  }
  return {
    columns,
    scale: chartScale([...walk.flatMap((s) => [s.from, s.to]), 0], { zero: true, ticks: 4 }),
    bars: walk.map((step, i) => ({
      id: `step-${i}`, name: step.label, tone: toneOf(step), column: i,
      from: step.from, to: step.to,
      detail: step.kind === 'total' ? '' : `Running total ${format(step.to)}`,
      faded: false, band: 'full' as Band,
    })),
    lines: [],
    keys: named,
    tableHead: ['Step', 'Amount', 'Running total'],
    tableRows: walk.map((step, i) => ({ column: columns[i], cells: [format(step.value), format(step.to)] })),
  };
}

export function Chart(props: ChartProps) {
  const {
    title, format, formatAxis = format, height, table, selectable, selected, onSelect, className,
  } = props;
  const variant = props.variant ?? 'months';
  const spark = variant === 'spark';
  const plotHeight = height ?? HEIGHT[variant];
  const showTable = table ?? !spark;

  const uid = useId().replace(/[^\w-]/g, '');
  const frameEl = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const plot = useRef<HTMLDivElement>(null);
  const tipEl = useRef<HTMLSpanElement>(null);
  const svgEl = useRef<SVGSVGElement>(null);
  const ignoreMouseUntil = useRef(0);
  const touchMoved = useRef(false);
  const dismissed = useRef<string | null>(null);
  /** Focus a pointer moved onto the frame. The frame's own handler then leaves
   *  the readout and the announcement to the gesture that asked for them. */
  const pointerFocus = useRef(false);

  const [width, setWidth] = useState(0);
  const [openId, setOpenId] = useState<string | null>(null);
  const [rawCursor, setCursor] = useState(0);
  const [said, setSaid] = useState('');
  const [ownPick, setOwnPick] = useState<number | null>(null);
  const pick = selected === undefined ? ownPick : selected;

  const steps = props.variant === 'bridge' ? props.steps : undefined;
  const bridgeTones = props.variant === 'bridge' ? props.tones : undefined;
  const periods = props.variant === 'bridge' ? undefined : props.periods;
  const series = props.variant === 'bridge' ? undefined : props.series;
  const frame = useMemo<Frame>(() => (steps
    ? bridgeFrame(steps, bridgeTones, format)
    : seriesFrame(periods ?? [], series ?? [], spark, format)
  ), [steps, bridgeTones, periods, series, spark, format]);
  const { columns, scale, lines, keys, tableHead, tableRows } = frame;

  /* -- the pixels ---------------------------------------------------------- */

  const count = columns.length || 1;
  // Clamped on read: a caller that shortens the data leaves the cursor past the
  // end, and `lead()` would then find no mark and announce nothing.
  const cursor = Math.min(rawCursor, Math.max(columns.length - 1, 0));
  const plotWidth = width || count * FALLBACK_COL;
  const colWidth = plotWidth / count;
  const span = scale.max - scale.min || 1;
  const y = useCallback(
    (value: number) => PAD + ((scale.max - value) / span) * (plotHeight - PAD * 2),
    [scale.max, span, plotHeight],
  );
  const zero = y(Math.min(Math.max(0, scale.min), scale.max));
  const barWidth = Math.max(4, Math.min(colWidth * 0.62, colWidth - 6));
  const centre = useCallback((column: number) => column * colWidth + colWidth / 2, [colWidth]);

  const marks = useMemo<Mark[]>(() => {
    const out: Mark[] = frame.bars.map((bar) => {
      let top = Math.min(y(bar.from), y(bar.to));
      let bottom = Math.max(y(bar.from), y(bar.to));
      // Whichever edge stands on the zero line gives up the inset, and only
      // that edge: the two series lose the same height, so what the reader
      // compares is unchanged, and each bar's own stroke follows the new edge
      // rather than being cut by something painted after it.
      // A bar with no room to give one up keeps its edge; it is a hairline and
      // cannot hide the line underneath it anyway.
      if (bottom - top > ZERO_INSET + 1) {
        if (Math.abs(bottom - zero) < 0.5) bottom -= ZERO_INSET;
        if (Math.abs(top - zero) < 0.5) top += ZERO_INSET;
      }
      return {
        id: bar.id, column: bar.column, name: bar.name, tone: bar.tone,
        value: bar.band === 'down' ? bar.from - bar.to : bar.to - bar.from,
        detail: bar.detail, kind: 'bar', band: bar.band,
        x: centre(bar.column) - barWidth / 2, y: top, w: barWidth, h: Math.max(bottom - top, 1),
        estimated: Boolean(frame.columns[bar.column]?.estimated), faded: bar.faded,
      };
    });
    for (const line of lines) {
      line.values.forEach((value, i) => {
        if (!Number.isFinite(value)) return;
        out.push({
          id: `${line.id}-${i}`, column: i,
          name: keys.find((k) => k.id === line.id)?.name ?? line.id, tone: line.tone,
          value, detail: onPrevious(value, line.values[i - 1], columns[i - 1]?.short ?? ''),
          kind: 'dot', band: 'full',
          x: centre(i) - TARGET / 2, y: y(value) - TARGET / 2, w: TARGET, h: TARGET,
          estimated: Boolean(columns[i]?.estimated), faded: false,
        });
      });
    }
    return out;
  }, [frame, lines, keys, columns, centre, barWidth, y]);

  const byId = useMemo(() => new Map(marks.map((m) => [m.id, m])), [marks]);
  /** The mark a keystroke opens for a column: its first, in drawing order. */
  const lead = useCallback((column: number) => marks.find((m) => m.column === column), [marks]);
  const open = openId ? byId.get(openId) : undefined;

  /* -- the plot's width, and the sides that still hide columns -------------- */

  useEffect(() => {
    const el = plot.current;
    if (!el) return;
    const read = () => setWidth(el.clientWidth);
    read();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(read);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const syncEdges = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    const last = el.scrollWidth - el.clientWidth;
    el.classList.toggle('is-more-before', el.scrollLeft > 1);
    el.classList.toggle('is-more-after', el.scrollLeft < last - 1);
  }, []);
  useEffect(syncEdges, [syncEdges, plotWidth, count]);

  /* -- the readout --------------------------------------------------------- */

  useLayoutEffect(() => {
    if (!openId || !frameEl.current || !tipEl.current || !svgEl.current) return;
    // Matched by attribute rather than by an interpolated selector: a series id
    // is the caller's string and may carry a quote.
    const anchor = [...svgEl.current.querySelectorAll('[data-anchor]')]
      .find((el) => el.getAttribute('data-anchor') === openId);
    // The frame is both the host and the bound: a readout that left it would
    // open over the legend and the top tick, which belong to the same part.
    if (anchor) placeTip(frameEl.current, anchor, tipEl.current, frameEl.current);
  }, [openId, plotWidth, plotHeight]);

  useEffect(() => {
    if (!openId) return;
    const doc = frameEl.current?.ownerDocument;
    const view = doc?.defaultView;
    if (!doc || !view) return;
    const hide = () => setOpenId(null);
    const escape = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      dismissed.current = openId;
      hide();
    };
    doc.addEventListener('keydown', escape);
    view.addEventListener('resize', hide);
    return () => {
      doc.removeEventListener('keydown', escape);
      view.removeEventListener('resize', hide);
    };
  }, [openId]);

  // Escape dismisses the mark it was pressed on; the readout comes back on the
  // next one, not on that one. why: docs/specification.md#the-hover-readout
  const show = (id: string | null | undefined) => {
    if (!id || dismissed.current === id) return;
    dismissed.current = null;
    setOpenId(id);
  };
  const markAt = (target: EventTarget) =>
    (target as Element).closest?.('[data-mark]')?.getAttribute('data-mark') ?? null;

  /* -- the keyboard, which is the one tab stop ----------------------------- */

  const announce = useCallback((column: number, picked: number | null = pick) => {
    const where = columns[column];
    if (!where) return;
    const values = marks.filter((m) => m.column === column)
      .map((m) => `${m.name} ${format(m.value)}`).join('. ');
    const state = stateOf(where);
    setSaid(`${where.label}. ${values}.${state ? ` ${state}.` : ''}${picked === column ? ' Selected.' : ''}`);
  }, [columns, marks, format, pick]);

  const step = (next: number) => {
    const column = Math.max(0, Math.min(next, count - 1));
    setCursor(column);
    show(lead(column)?.id);
    announce(column);
    const el = scroller.current;
    if (el && el.scrollWidth > el.clientWidth) {
      el.scrollLeft = Math.max(0, centre(column) - el.clientWidth / 2);
      syncEdges();
    }
  };

  const choose = (column: number) => {
    if (!selectable) return;
    if (selected === undefined) setOwnPick(column);
    onSelect?.(column);
  };

  const onKeyDown = (event: ReactKeyboardEvent) => {
    const steps: Record<string, number> = {
      ArrowLeft: cursor - 1, ArrowRight: cursor + 1, Home: 0, End: count - 1,
    };
    if (event.key in steps) {
      event.preventDefault();
      step(steps[event.key]);
      return;
    }
    if ((event.key === 'Enter' || event.key === ' ') && selectable) {
      event.preventDefault();
      choose(cursor);
      announce(cursor, cursor);
    }
  };

  /* -- the drawing --------------------------------------------------------- */

  const tones = [...new Set(marks.map((m) => m.tone))];
  const fades = [...new Set(marks.filter((m) => m.faded).map((m) => m.tone))];
  const estimated = columns.filter((c) => c.estimated);
  const firstNote = estimated.find((c) => c.note)?.note;
  // The key is drawn in the tone of the unfinished mark it stands for, so it
  // looks like that bar rather than like an outline of its own: the income bar
  // in a months chart, the step that is not invoiced yet in a bridge.
  const estimatedTone = marks.find((m) => m.estimated && m.kind === 'bar')?.tone
    ?? keys[0]?.tone ?? 'neutral';
  const hitBand = (band: Band) => (band === 'up'
    ? { y: PAD, h: Math.max(zero - PAD, TARGET) }
    : band === 'down'
      ? { y: zero, h: Math.max(plotHeight - PAD - zero, TARGET) }
      : { y: PAD, h: Math.max(plotHeight - PAD * 2, TARGET) });

  return (
    <div
      className={cx('ui-chart', `ui-chart--${variant}`, selectable && 'ui-chart--pick', className)}
      style={{ '--ui-chart-h': `${plotHeight}px`, '--ui-chart-pad': `${PAD}px` } as CSSProperties}
    >
      {!spark && keys.length > 0 && (
        <ul className="ui-chart__legend">
          {keys.map((key) => (
            <li key={key.id} className={cx('ui-chart__key', `ui-chart__tone--${key.tone}`)}>
              {key.shape === 'line' ? (
                <svg className="ui-chart__key-mark" width="18" height="12" viewBox="0 0 18 12" aria-hidden="true">
                  <path className="ui-chart__key-line" d="M1 9 L6 5 L12 7 L17 3" />
                  <circle className="ui-chart__key-dot" cx="9" cy="6" r="2.5" />
                </svg>
              ) : (
                <svg className="ui-chart__key-mark" width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
                  <rect
                    className="ui-chart__key-swatch" x="1" width="10" height="5" rx="1"
                    y={key.shape === 'bars-below' ? 6 : 1}
                  />
                </svg>
              )}
              {key.name}
            </li>
          ))}
          {estimated.length > 0 && (
            <li className={cx('ui-chart__key', `ui-chart__tone--${estimatedTone}`)}>
              <svg className="ui-chart__key-mark" width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
                <rect className="ui-chart__key-estimated" x="1" y="1" width="10" height="10" rx="1" />
                <path className="ui-chart__key-hatch" d="M1 7 L7 1 M5 11 L11 5" />
              </svg>
              Estimated
              {firstNote && <>{' '}<span className="ui-chart__key-note">{firstNote}</span></>}
            </li>
          )}
        </ul>
      )}

      <div
        ref={frameEl}
        className="ui-chart__frame ui-tip-host ui-focusable"
        tabIndex={0}
        role="group"
        aria-label={`${title}. Arrow keys step through the ${columns.length} columns.`}
        onKeyDown={onKeyDown}
        onFocus={(event) => {
          if (event.target !== event.currentTarget) return;
          if (pointerFocus.current) { pointerFocus.current = false; return; }
          show(lead(cursor)?.id);
          announce(cursor);
        }}
        onBlur={(event) => {
          if (event.target !== event.currentTarget) return;
          setOpenId(null);
          setSaid('');
        }}
      >
        {!spark && scale.ticks.length > 0 && (
          <div className="ui-chart__axis" aria-hidden="true">
            {[...scale.ticks].reverse().map((tick) => (
              <span key={tick} className="ui-chart__tick">{formatAxis(tick)}</span>
            ))}
          </div>
        )}

        {/* Chrome makes an overflowing box keyboard-focusable on its own, and the
            ring it draws there is the browser's, not the kit's. The frame is the
            chart's one tab stop and its arrows scroll this box, so the box is
            taken out of the tab order rather than given a second name.
            why: docs/specification.md#react-charts */}
        <div ref={scroller} className="ui-chart__scroll" tabIndex={-1} onScroll={syncEdges}>
          <div ref={plot} className="ui-chart__plot" style={{ '--ui-chart-cols': count } as CSSProperties}>
            <svg
              ref={svgEl}
              className="ui-chart__svg"
              width={px(plotWidth)}
              height={plotHeight}
              viewBox={`0 0 ${px(plotWidth)} ${plotHeight}`}
              role="img"
              aria-label={spark && marks.length > 0
                ? `${title}. ${format(marks[0].value)} to ${format(marks[marks.length - 1].value)}.`
                : title}
              onMouseMove={(event) => {
                if (Date.now() < ignoreMouseUntil.current) return;
                show(markAt(event.target));
              }}
              onMouseLeave={() => {
                if (Date.now() < ignoreMouseUntil.current) return;
                dismissed.current = null;
                setOpenId(null);
              }}
              onTouchStart={() => { ignoreMouseUntil.current = Date.now() + 800; touchMoved.current = false; }}
              onTouchMove={() => { touchMoved.current = true; }}
              onTouchCancel={() => { touchMoved.current = true; }}
              onTouchEnd={(event) => {
                ignoreMouseUntil.current = Date.now() + 800;
                if (touchMoved.current) return;
                const id = markAt(event.target);
                if (id && id === openId) setOpenId(null);
                else show(id);
              }}
              onPointerDown={() => { pointerFocus.current = true; }}
              onClick={(event) => {
                // The nearest focusable ancestor of a mark is the scroller, which
                // has no role and no name, so a click parked focus on it and a
                // pointer reader never heard that the arrows do anything. The
                // named group takes focus however the chart is entered.
                frameEl.current?.focus();
                pointerFocus.current = false;
                const mark = byId.get(markAt(event.target) ?? '');
                if (!mark) return;
                setCursor(mark.column);
                choose(mark.column);
                announce(mark.column, selectable ? mark.column : pick);
              }}
            >
              <defs>
                {tones.map((tone) => (
                  <pattern
                    key={tone} id={`${uid}-hatch-${tone}`} className={`ui-chart__tone--${tone}`}
                    width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"
                  >
                    <path className="ui-chart__hatch-line" d="M0 0 V6" />
                  </pattern>
                ))}
                {fades.flatMap((tone) => (['up', 'down'] as const).map((way) => (
                  <linearGradient
                    key={`${tone}-${way}`} id={`${uid}-fade-${tone}-${way}`}
                    className={`ui-chart__tone--${tone}`} x1="0" y1="0" x2="0" y2="1"
                  >
                    {FADE_STOPS[way].map(([part, offset]) => (
                      <stop key={offset} className={`ui-chart__fade-${part}`} offset={offset} />
                    ))}
                  </linearGradient>
                )))}
              </defs>

              {/* The zero line is drawn with the gridlines, under every mark. The
                  bars stop ZERO_INSET short of it, so no bar can cover it; a line
                  or a dot crossing zero paints over it, which is a mark over a
                  gridline and is the right way round.
                  why: docs/specification.md#react-charts */}
              {!spark && scale.ticks.map((tick) => (
                <line
                  key={tick} className={tick === 0 ? 'ui-chart__zero' : 'ui-chart__grid'}
                  x1="0" x2={px(plotWidth)} y1={px(y(tick))} y2={px(y(tick))}
                />
              ))}

              {marks.filter((m) => m.kind === 'bar').map((mark) => (
                <rect
                  key={`bar-${mark.id}`}
                  className={cx('ui-chart__bar', `ui-chart__tone--${mark.tone}`,
                    mark.estimated && 'is-estimated', pick === mark.column && 'is-selected')}
                  x={px(mark.x)} y={px(mark.y)} width={px(mark.w)} height={px(mark.h)} rx="2"
                  style={paintOf(mark, uid)}
                />
              ))}

              {lines.flatMap((line) => line.values.slice(1).map((value, i) => (
                Number.isFinite(value) && Number.isFinite(line.values[i]) ? (
                  <line
                    key={`${line.id}-seg-${i}`}
                    className={cx('ui-chart__line', `ui-chart__tone--${line.tone}`,
                      (columns[i]?.estimated || columns[i + 1]?.estimated) && 'is-estimated')}
                    x1={px(centre(i))} y1={px(y(line.values[i]))}
                    x2={px(centre(i + 1))} y2={px(y(value))}
                  />
                ) : null
              )))}

              {marks.filter((m) => m.kind === 'dot').map((mark) => (
                <circle
                  key={`dot-${mark.id}`}
                  className={cx('ui-chart__dot', `ui-chart__tone--${mark.tone}`,
                    mark.estimated && 'is-estimated', pick === mark.column && 'is-selected')}
                  cx={px(mark.x + mark.w / 2)} cy={px(mark.y + mark.h / 2)} r={spark ? 2.5 : 3.5}
                />
              ))}

              {/* The hit areas last, so a dot's circle wins over the band under it.
                  A bar's is its own band in the column, full height, so a pointer
                  between two bars still has one to answer with. */}
              {marks.map((mark) => (
                <g key={`hit-${mark.id}`} data-mark={mark.id}>
                  {mark.kind === 'bar' ? (
                    <rect
                      className="ui-chart__hit" x={px(mark.column * colWidth)} width={px(colWidth)}
                      y={px(hitBand(mark.band).y)} height={px(hitBand(mark.band).h)}
                    />
                  ) : (
                    <circle
                      className="ui-chart__hit" r={TARGET / 2}
                      cx={px(mark.x + mark.w / 2)} cy={px(mark.y + mark.h / 2)}
                    />
                  )}
                  <rect
                    data-anchor={mark.id} className="ui-chart__anchor"
                    x={px(mark.x)} y={px(mark.y)} width={px(mark.w)} height="0"
                  />
                </g>
              ))}
            </svg>

            {!spark && (
              <div className="ui-chart__periods" aria-hidden="true">
                {columns.map((column, i) => (
                  <span key={`${column.label}-${i}`} className="ui-chart__period">{column.short}</span>
                ))}
              </div>
            )}
          </div>
        </div>

        <span ref={tipEl} className={cx('ui-tip', openId && 'is-open')} role={open ? 'tooltip' : undefined}>
          {open && (
            <>
              <span className="ui-tip__label">
                {spark ? columns[open.column]?.label : `${open.name}, ${columns[open.column]?.label}`}
              </span>
              <span className="ui-tip__value">{format(open.value)}</span>
              {(stateOf(columns[open.column]) || open.detail) && (
                <span className="ui-tip__detail">{stateOf(columns[open.column]) || open.detail}</span>
              )}
            </>
          )}
        </span>
      </div>

      <div className="ui-sr" role="status">{said}</div>

      {showTable && (
        <details className="ui-chart__data">
          <summary className="ui-focusable">Values as a table</summary>
          <table className="ui-table" aria-label={title}>
            <thead>
              <tr>
                {tableHead.map((head, i) => (
                  <th key={head} scope="col" className={cx(i > 0 && 'ui-table__num')}>{head}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableRows.map((row, i) => (
                <tr key={`${row.column.label}-${i}`} aria-current={pick === i ? true : undefined}>
                  <th scope="row">
                    {row.column.label}
                    {row.column.estimated && (
                      <> <span className="ui-chart__state">{stateOf(row.column)}</span></>
                    )}
                  </th>
                  {row.cells.map((cell, j) => (
                    <td key={tableHead[j + 1]} className="ui-table__num">{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}
    </div>
  );
}
