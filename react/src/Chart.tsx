// The two shapes a money dashboard keeps redrawing, and the sparkline that sits
// beside a figure. The arithmetic is the kit's (src/logic/chart.js), the readout
// is the kit's tooltip, and the paint is the kit's tokens — this file owns the
// pixels, the keyboard and the markup, and nothing else.
// why: docs/components.md#chart
import {
  useCallback, useContext, useEffect, useId, useLayoutEffect, useMemo, useRef, useState,
  type CSSProperties, type KeyboardEvent as ReactKeyboardEvent, type RefObject,
} from 'react';
import { createPortal } from 'react-dom';
import { CHART_FLOOR, bridgeWalk, chartScale, pointTarget } from '@apliteni/apliteni-ui';
import { Segmented } from './Segmented';
import { CardTools } from './primitives/Card';
import { placeTip } from './tip';
import {
  LOOK_DEFAULT, Shares, TONE_CYCLE, keyShape, lookBox, lookDrawing, lookMarks, overlaps, pct,
  type ChartAreaLook, type ChartDonutLook, type ChartLineLook, type ChartSlice, type ChartStackedLook,
  type Layer, type Look, type LookGeometry,
} from './chart-looks';

function placeChartTip(mark: Element, tip: HTMLElement) {
  const rect = mark.getBoundingClientRect();
  const view = tip.ownerDocument.documentElement;
  const gap = parseFloat(getComputedStyle(tip).getPropertyValue('--ui-tip-gap')) || 8;
  const above = rect.top;
  const below = view.clientHeight - rect.bottom;
  const isBelow = above < tip.offsetHeight + gap && below > above;
  tip.classList.toggle('is-below', isBelow);
  const ideal = rect.left + rect.width / 2 - tip.offsetWidth / 2;
  const left = Math.max(0, Math.min(ideal, view.clientWidth - tip.offsetWidth));
  tip.style.setProperty('--ui-tip-x', `${rect.left + rect.width / 2}px`);
  tip.style.setProperty('--ui-tip-y', `${isBelow ? rect.bottom : rect.top}px`);
  tip.style.setProperty('--ui-tip-shift', `${left - ideal}px`);
}

// The paint is src/styles/chart.css, and this module does NOT import it: a kit
// sheet imported from react/src is re-emitted into react/dist/index.css, which a
// consumer loads after `apliteni-ui/css` and which then outranks the kit's own
// copy at equal specificity. The chart has no vanilla markup for a story to
// render, so there is nothing to measure that re-emission against. A consumer
// imports both sheets, which is what react/README.md asks for, and the kit's copy
// is the only one. why: docs/components.md#load-both-stylesheets

export type ChartTone =
  | 'accent' | 'accent-soft' | 'good' | 'bad' | 'warn' | 'info' | 'neutral';

export type ChartPeriod = {
  /** The period as the readout and the table name it: `Jan 2026`. */
  label: string;
  /** The period as the axis names it. Defaults to `label`'s first word. */
  short?: string;
  /**
   * The period is not final. `incomplete` is the period still running,
   * `projected` a future one, and `true` any other estimate. The readout and
   * the table name the state; the chart at rest prints none.
   */
  estimated?: ChartEstimate;
  /** Why it is not final. Printed in the readout and in the table. */
  note?: string;
  /** `false` prints the period's value in the readout with no comparison text. */
  compare?: boolean;
};

export type ChartEstimate = boolean | 'incomplete' | 'projected';

export type ChartSeries = {
  id: string;
  name: string;
  values: readonly number[];
  /**
   * `bars` stand on the zero line, `bars-below` hang under it from positive
   * magnitudes (spend given as 31870, not −31870), and `line` crosses both.
   */
  shape?: 'bars' | 'bars-below' | 'line';
  /**
   * Bars take a tone. A line is `neutral` unless the caller says otherwise.
   * The tones are the chart's own fixed palette and do not follow the product
   * accent. Each tone has its own hue: `accent` is blue and `accent-soft` is
   * cyan, so two series read apart by hue.
   */
  tone?: ChartTone;
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
  estimated?: ChartEstimate;
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
  /** Offer the same numbers as a table, behind a chart and table switch at the
   *  top right, or in a titled Card's title row. On by default, off for a sparkline. */
  table?: boolean;
  /** Draw a key that names each series. Off by default: the readout and the
   *  table name every series. */
  legend?: boolean;
  /** Let Enter and a click pick a column. */
  selectable?: boolean;
  /** The picked column, when the caller keeps that state. */
  selected?: number | null;
  onSelect?: (index: number) => void;
  className?: string;
};

/** A series of a line, an area or a stacked chart. Its `shape` is the variant's. */
export type ChartLookSeries = Omit<ChartSeries, 'shape'>;

export type ChartProps = ChartCommon & (
  | {
    variant?: 'months'; periods: readonly ChartPeriod[]; series: readonly ChartSeries[];
    /** Print each bar's value past its end, in `formatAxis`: over a bar that grows
     *  up from zero, under one that grows down. A value that does not
     *  fit its bar's room is left out; the readout and the table keep it. */
    values?: boolean;
  }
  | { variant: 'spark'; periods: readonly ChartPeriod[]; series: readonly ChartSeries[] }
  | { variant: 'bridge'; steps: readonly ChartBridgeStep[]; tones?: ChartBridgeTones }
  | { variant: 'line'; look?: ChartLineLook; periods: readonly ChartPeriod[]; series: readonly ChartLookSeries[] }
  | { variant: 'area'; look?: ChartAreaLook; periods: readonly ChartPeriod[]; series: readonly ChartLookSeries[] }
  | { variant: 'stacked'; look?: ChartStackedLook; periods: readonly ChartPeriod[]; series: readonly ChartLookSeries[] }
  | {
    variant: 'donut'; look?: ChartDonutLook; slices: readonly ChartSlice[];
    /** What the whole is called in the centre and in the side list. Defaults to `Total`. */
    totalLabel?: string;
    /** A slice is a part of one whole, so there is no column to pick. */
    selectable?: never; selected?: never; onSelect?: never;
  }
);

/** `state` is the word the chart prints for a period that is not final. */
type Column = {
  label: string; short: string; estimated: boolean; state?: string; note?: string;
  /** The readout compares the period with the one before it. */
  compare: boolean;
};
type Key = { id: string; name: string; tone: ChartTone; shape: 'bars' | 'bars-below' | 'line' | 'fill' };
type Band = 'up' | 'down' | 'full';

/** One line of a column's readout: a series and what it holds there. */
export type MarkRow = { name: string; tone: ChartTone; text: string; shape: 'line' | 'fill' };

/** One drawn value: a bar's box or a dot's target square, with what it says. */
export type Mark = {
  id: string;
  column: number;
  name: string;
  tone: ChartTone;
  value: number;
  /** The readout's one comparison. */
  detail: string;
  x: number; y: number; w: number; h: number;
  /** Which of its band's bars this is, and how many share the column. */
  lane: number; lanes: number;
  /** A point's pointer target: bigger than the box the readout is placed
   *  against once a coarse pointer asks for the phone floor, and placed by
   *  `pointTarget` so the chart's edge never clips it. */
  hit?: { x: number; y: number; w: number; h: number };
  /** A ring slice's target, which no box describes. */
  hitPath?: string;
  /** A `column` is every series in one period, a `slice` one part of a ring. */
  kind: 'bar' | 'dot' | 'column' | 'slice';
  /** What a column's readout lists, and the total under the list. */
  rows?: MarkRow[];
  total?: string;
  band: Band;
  /** Which of a bar's two edges stands on the zero line, if either does. */
  foot: 'top' | 'bottom' | null;
  estimated: boolean;
};

type Line = { id: string; tone: ChartTone; values: number[] };

/** Everything after the memo reads this one shape, whichever variant it came from. */
type Frame = {
  columns: Column[];
  scale: { min: number; max: number; step: number; ticks: number[] };
  /** A bar per column, laid out once the plot's width is known. */
  bars: { id: string; name: string; tone: ChartTone; column: number; from: number; to: number;
    detail: string; band: Band; lane: number; lanes: number }[];
  lines: Line[];
  /** A bridge carries its running total from each step to the next. */
  links: boolean;
  keys: Key[];
  tableHead: string[];
  tableRows: { column: Column; cells: string[] }[];
  /** A line, an area, a stacked or a donut chart draws from this instead. */
  look?: Look;
};

/** The plot's height when the caller names none. */
const HEIGHT = { months: 216, bridge: 216, spark: 32, line: 216, area: 216, stacked: 216, donut: 216 };
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
 * The phone floor, and the step it applies at: the same 44px and the same
 * `(max-width: 560px) and (pointer: coarse)` that `src/styles/tap-zone.css`
 * declares. A bar's target is its own band in its column and already clears
 * both; a line's point is a box over that band and is the one mark the kit has
 * to grow. It is grown here rather than in the sheet because an SVG target is
 * geometry a browser computes from attributes, not a layer CSS can lay over it.
 * why: guidelines/accessibility-floor.md#tap-target-on-a-phone
 */
const TAP_FLOOR = 44;
const PHONE_MAX = 560;
/**
 * The column width used before the plot has been measured: server-rendered, or
 * in a test environment with no layout. `src/styles/chart.css` carries the real
 * floor as `--ui-chart-col`; this only has to be wide enough that geometry
 * computed without a browser is still the geometry of a readable chart.
 */
const FALLBACK_COL = 48;
/**
 * The share of its column a bar may take, and the width it may never pass. The
 * share alone let a bar grow with the card: at a desktop width twelve months
 * became twelve 45px blocks and the plot read as one mass of colour. A mark is
 * capped instead, and the rest of the column is ground — which is the one
 * proportion every reference keeps, however wide the chart is drawn.
 */
const BAR_SHARE = 0.5;
const BAR_MAX = 12;
/**
 * The same cap for a bridge, whose columns are not a month's. A bridge draws
 * one column per step and each carries its own name, so a column is three or
 * four times as wide; a mark capped at a month's width would be a sliver in it,
 * and the carry joining two steps would be longer than the steps it joins.
 */
const BAR_MAX_BRIDGE = 22;
/**
 * The months chart's columns (#841, look A): the plot takes the card's width and
 * every period shares it, so nothing scrolls. A bar takes two thirds of its
 * column up to --space-12, and its corner is --radius-xs or a quarter of the
 * bar, whichever is smaller, so a narrow bar keeps the same shape.
 */
const FIT_SHARE = 2 / 3;
const FIT_MAX = 48;
const FIT_CORNER = 6;
/** The ground a value or a period label keeps beside its neighbour: --space-1, --space-2. */
const TEXT_GAP = 4;
const LABEL_GAP = 8;
/** The text size the plot's words are drawn at: --text-xs. */
const TEXT_SIZE = 12;
/** The room a bar's value takes past its bar: one line of the tick's box and the gap. */
const VALUE_ROOM = Math.ceil(TEXT_SIZE * 1.45) + TEXT_GAP;
/** The room the "Not final" group label takes over the plot: --space-8. Its
 *  baseline is at --space-4 and the boundary starts at --space-6. */
const GROUP_ROOM = 32;
const GROUP_BASELINE = 16;
const BOUNDARY_TOP = 24;
const GROUP_WORDS = 'Not final';
/** The ground between two bars that share a column. */
const LANE_GAP = 2;

/** What the table prints where the caller gave no value, as the kit's numeric
 *  value formatter does. */
const MISSING = '—';

const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(' ');
const px = (n: number) => Math.round(n * 10) / 10;
const STATE_WORD = { incomplete: 'Incomplete', projected: 'Projected' } as const;
const columnOf = (p: ChartPeriod | ChartBridgeStep, fallback: string): Column => ({
  label: p.label, short: p.short || fallback, estimated: Boolean(p.estimated), note: p.note,
  compare: !('compare' in p) || p.compare !== false,
  state: !p.estimated ? undefined : p.estimated === true ? 'Estimated' : STATE_WORD[p.estimated],
});

/** A share-of-the-previous-column comparison, in the kit's readout wording. */
function onPrevious(value: number, previous: number | undefined, when: string) {
  if (previous === undefined || previous === 0 || !Number.isFinite(previous) || !when) return '';
  const pct = ((value - previous) / Math.abs(previous)) * 100;
  return `${pct < 0 ? '−' : '+'}${Math.abs(pct).toFixed(1)}% on ${when}`;
}

/**
 * A bar, drawn as a path so the end that stands on the zero line can be left
 * square while the end the reader measures from carries a small corner: its
 * radius is --radius-xs or a quarter of the bar, whichever is smaller. A rounded
 * foot would lift the bar off the one rule the chart draws, and the top of a bar
 * has to measure its length. SVG gives a `rect` one radius for all four corners,
 * and a foot on the zero line needs none. `foot` names the edge that stands on
 * zero; a bridge step floats between two running totals and stands on nothing,
 * so both of its ends carry the corner.
 */
function barPath(
  m: { x: number; y: number; w: number; h: number; foot: 'top' | 'bottom' | null },
  corner = Math.min(FIT_CORNER, m.w / 4),
): string {
  const r = px(Math.min(corner, m.w / 2, m.h / (m.foot ? 1 : 4)));
  const { x, y: top, w, h } = m;
  const bottom = top + h;
  const arc = (dx: number, dy: number, sweep: 0 | 1) =>
    `a${px(r)} ${px(r)} 0 0 ${sweep} ${px(dx)} ${px(dy)}`;
  if (r <= 0) return `M${px(x)} ${px(top)}h${px(w)}v${px(h)}h${px(-w)}z`;
  // Up the left edge, across the top, down the right edge, back along the bottom.
  // Each corner is an arc unless it sits on the foot.
  const roundTop = m.foot !== 'top';
  const roundBottom = m.foot !== 'bottom';
  return `M${px(x)} ${px(roundBottom ? bottom - r : bottom)}`
    + `V${px(roundTop ? top + r : top)}`
    + (roundTop ? `${arc(r, -r, 1)}h${px(w - r * 2)}${arc(r, r, 1)}` : `h${px(w)}`)
    + `V${px(roundBottom ? bottom - r : bottom)}`
    + (roundBottom ? `${arc(-r, r, 1)}h${px(-(w - r * 2))}${arc(-r, -r, 1)}` : `h${px(-w)}`)
    + 'z';
}

/**
 * The target floor this pointer asks for. `TARGET` until the component has
 * mounted, so a server render and the first client render draw the same boxes
 * and the phone's larger ones arrive on the pass after — the shape
 * `react/src/DatePicker.tsx` already uses for its own step.
 */
function useTapFloor() {
  const [floor, setFloor] = useState(TARGET);
  useEffect(() => {
    const query = typeof window === 'undefined' ? null
      : window.matchMedia?.(`(max-width: ${PHONE_MAX}px) and (pointer: coarse)`);
    if (!query) return;
    const read = () => setFloor(query.matches ? TAP_FLOOR : TARGET);
    read();
    query.addEventListener?.('change', read);
    return () => query.removeEventListener?.('change', read);
  }, []);
  return floor;
}

/**
 * How wide a word is drawn in the chart's font, so a value or a period label is
 * printed only where it fits. A browser measures it; where no canvas can
 * (server-rendered, or a test environment) a figure is taken as 0.62 of the text
 * size, which is wider than any figure of the kit's face, so an estimate never
 * prints a word over its neighbour.
 */
function useTextWidth(host: RefObject<HTMLElement | null>) {
  const [face, setFace] = useState<{ regular: string; medium: string } | null>(null);
  // A web font that arrives after the first draw changes every width.
  const [loaded, setLoaded] = useState(0);
  useEffect(() => {
    const el = host.current;
    if (!el || typeof OffscreenCanvas === 'undefined') return;
    const style = getComputedStyle(el);
    // The group label is drawn at --weight-medium, which is wider than the body weight.
    const font = (weight: string) => `${weight} ${TEXT_SIZE}px ${style.fontFamily}`;
    setFace({ regular: font(style.fontWeight), medium: font(style.getPropertyValue('--weight-medium').trim() || '500') });
    let live = true;
    el.ownerDocument.fonts?.ready.then(() => { if (live) setLoaded((n) => n + 1); });
    return () => { live = false; };
  }, [host]);
  return useMemo(() => {
    void loaded;
    const ctx = face ? new OffscreenCanvas(1, 1).getContext('2d') : null;
    return (text: string, medium = false) => {
      if (!ctx || !face) return text.length * TEXT_SIZE * 0.62;
      ctx.font = medium ? face.medium : face.regular;
      return Math.ceil(ctx.measureText(text).width);
    };
  }, [face, loaded]);
}

/** What a bar is worth: its length, read in the direction its band grows. */
function barValue(bar: { band: Band; from: number; to: number }) {
  return bar.band === 'down' ? bar.from - bar.to : bar.to - bar.from;
}

/** A bar that grows down from zero prints its value under it, whatever its band. */
function printsBelow(bar: { from: number; to: number }) {
  return bar.to < bar.from;
}

/** The readout's words for a period that is not final: the state, then why. */
function stateOf(column: Column | undefined) {
  if (!column?.state) return '';
  return column.note ? `${column.state} — ${column.note}` : column.state;
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
  /* Two series of bars in one band used to be drawn at the same x, one over the
     other. They are laid side by side instead, which is how every reference
     draws two measures of one period. */
  const bandOf = (s: ChartSeries) => (split ? (shapeOf(s) === 'bars-below' ? 'down' : 'up') : 'full');
  const inBand = (band: string) => series.filter((s) => shapeOf(s) !== 'line' && bandOf(s) === band);
  for (const s of series) {
    const shape = shapeOf(s);
    const tone = s.tone ?? (shape === 'line' ? 'neutral' : 'accent');
    if (shape === 'line') {
      lines.push({ id: s.id, tone, values: s.values.map((v) => (Number.isFinite(v) ? v : Number.NaN)) });
      continue;
    }
    const below = shape === 'bars-below';
    const band = bandOf(s) as Band;
    const lanes = inBand(band).length;
    const lane = inBand(band).indexOf(s);
    s.values.forEach((raw, i) => {
      // A value the caller did not give draws no bar at all. A zero-height bar
      // standing on the zero line would read as a period that earned nothing.
      if (!Number.isFinite(raw) || i >= columns.length) return;
      const value = raw;
      bars.push({
        id: `${s.id}-${i}`, name: s.name, tone, column: i,
        from: 0, to: below ? -value : value,
        detail: columns[i].compare ? onPrevious(value, s.values[i - 1], columns[i - 1]?.short ?? '') : '',
        band, lane, lanes,
      });
    });
  }
  return {
    columns,
    scale,
    bars,
    lines,
    links: false,
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
      band: 'full' as Band, lane: 0, lanes: 1,
    })),
    lines: [],
    links: true,
    keys: named,
    tableHead: ['Step', 'Amount', 'Running total'],
    tableRows: walk.map((step, i) => ({ column: columns[i], cells: [format(step.value), format(step.to)] })),
  };
}

/** A part of a whole is never under zero: one would draw a part outside the
 *  whole and clip the scale. Throws before anything is drawn. */
function noNegative(variant: string, values: readonly { name: string; value: number }[]) {
  const bad = values.find((v) => v.value < 0);
  if (bad) throw new RangeError(`Chart: a ${variant} chart takes values of 0 or more; ${bad.name} is ${bad.value}`);
}

/** The frame of a line, an area or a stacked chart. A stack counts a missing
 *  value as nothing; the table and the readout still print it as missing. */
function lookFrame(
  variant: 'line' | 'area' | 'stacked', look: string,
  periods: readonly ChartPeriod[], series: readonly ChartLookSeries[], format: (n: number) => string,
): Frame {
  if (variant !== 'line') noNegative(variant, series.flatMap((s) => s.values.map((value) => ({ name: s.name, value }))));
  const columns = periods.map((p) => columnOf(p, p.label.split(' ')[0]));
  const stacked = variant === 'stacked' || variant === 'area' && !overlaps(look);
  const share = look === 'share';
  const n = columns.length;
  const value = (s: ChartLookSeries, i: number) => (Number.isFinite(s.values[i]) ? s.values[i] : Number.NaN);
  const totals = columns.map((_, i) => series.reduce((sum, s) => sum + (Number.isFinite(s.values[i]) ? s.values[i] : 0), 0));
  const base = new Array<number>(n).fill(0);
  const layers: Layer[] = series.map((s, k) => {
    const values = columns.map((_, i) => value(s, i));
    const tone = s.tone ?? TONE_CYCLE[k % TONE_CYCLE.length];
    if (!stacked) return { id: s.id, name: s.name, tone, values, from: base.slice(), to: values.slice() };
    const from = base.slice();
    values.forEach((v, i) => { base[i] += Number.isFinite(v) ? v : 0; });
    const to = base.slice();
    const of = (v: number, i: number) => (share ? (totals[i] > 0 ? v / totals[i] : 0) : v);
    return { id: s.id, name: s.name, tone, values, from: from.map(of), to: to.map(of) };
  });
  const reach = stacked ? totals : series.flatMap((s) => s.values.filter(Number.isFinite));
  const frameLook: Look = {
    variant, look, layout: look === 'rows' ? 'rows' : 'columns',
    stacked, share, layers, totals, totalLabel: 'Total',
  };
  const shape = keyShape(frameLook);
  return {
    columns,
    scale: share ? { min: 0, max: 1, step: 0.25, ticks: [0, 0.25, 0.5, 0.75, 1] }
      : chartScale([...reach, 0], { zero: true, ticks: 4 }),
    bars: [],
    lines: [],
    links: false,
    keys: layers.map((l) => ({ id: l.id, name: l.name, tone: l.tone, shape })),
    tableHead: ['Period', ...series.map((s) => s.name), ...(stacked ? ['Total'] : [])],
    tableRows: columns.map((column, i) => ({
      column,
      cells: [
        ...series.map((s) => (Number.isFinite(s.values[i]) ? format(s.values[i]) : MISSING)),
        ...(stacked ? [format(totals[i])] : []),
      ],
    })),
    look: frameLook,
  };
}

/** The frame of a donut: one whole, and each slice's share of it. */
function donutFrame(
  look: ChartDonutLook, slices: readonly ChartSlice[], totalLabel: string, format: (n: number) => string,
): Frame {
  noNegative('donut', slices);
  const parts = slices.map((s) => (Number.isFinite(s.value) ? s.value : 0));
  const total = parts.reduce((a, b) => a + b, 0);
  let at = 0;
  const layers: Layer[] = slices.map((s, k) => {
    const from = total > 0 ? at / total : 0;
    at += parts[k];
    return {
      id: s.id, name: s.name, tone: s.tone ?? TONE_CYCLE[k % TONE_CYCLE.length],
      values: [Number.isFinite(s.value) ? s.value : Number.NaN], from: [from], to: [total > 0 ? at / total : 0],
    };
  });
  const columns = slices.map((s) => ({ label: s.name, short: s.name, estimated: false, compare: false }));
  return {
    columns,
    scale: { min: 0, max: 1, step: 1, ticks: [] },
    bars: [],
    lines: [],
    links: false,
    keys: layers.map((l) => ({ id: l.id, name: l.name, tone: l.tone, shape: 'fill' as const })),
    tableHead: ['Slice', 'Value', 'Share'],
    tableRows: columns.map((column, i) => ({
      column,
      cells: [
        Number.isFinite(slices[i].value) ? format(slices[i].value) : MISSING,
        total > 0 ? pct(layers[i].to[0] - layers[i].from[0]) : MISSING,
      ],
    })),
    look: {
      variant: 'donut', look, layout: 'ring', stacked: true, share: true,
      layers, totals: [total], totalLabel,
    },
  };
}

/** A legend key's mark: a line, a bar standing on zero or under it, or a square. */
function KeyMark({ shape }: { shape: Key['shape'] }) {
  if (shape === 'line') {
    return (
      <svg className="ui-chart__key-mark" width="18" height="12" viewBox="0 0 18 12" aria-hidden="true">
        <path className="ui-chart__key-line" d="M1 9 L6 5 L12 7 L17 3" />
      </svg>
    );
  }
  return (
    <svg className="ui-chart__key-mark" width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
      {shape === 'fill'
        ? <rect className="ui-chart__key-swatch" x="1" y="1" width="10" height="10" rx="2.5" />
        : <path className="ui-chart__key-swatch"
          d={barPath({ x: 3.5, y: 1, w: 5, h: 10, foot: shape === 'bars-below' ? 'top' : 'bottom' })} />}
    </svg>
  );
}

export function Chart(props: ChartProps) {
  const {
    title, format, formatAxis = format, height, table, legend: keyed = false, selectable, selected,
    onSelect, className,
  } = props;
  const variant = props.variant ?? 'months';
  const spark = variant === 'spark';
  /** The months chart fits its card: look A's columns, and no scroll. */
  const fit = variant === 'months';
  const showValues = fit && 'values' in props && props.values === true;
  const plotHeight = height ?? HEIGHT[variant];
  const showTable = table ?? !spark;
  const [view, setView] = useState<'chart' | 'table'>('chart');
  const asTable = showTable && view === 'table';

  const uid = useId().replace(/[^\w-]/g, '');
  const frameEl = useRef<HTMLDivElement>(null);
  // In a titled Card the chart and table switch sits at the end of the card's
  // title row, so the chart draws no row of its own for it.
  const card = useContext(CardTools);
  const claim = card?.claim;
  useLayoutEffect(() => (showTable && claim ? claim(uid) : undefined), [showTable, claim, uid]);
  const toCard = showTable && card?.owner === uid ? card.slot : null;
  const scroller = useRef<HTMLDivElement>(null);
  const plot = useRef<HTMLDivElement>(null);
  const tipEl = useRef<HTMLSpanElement>(null);
  const svgEl = useRef<SVGSVGElement>(null);
  const ignoreMouseUntil = useRef(0);
  const touchMoved = useRef(false);
  const dismissed = useRef<string | null>(null);
  /** The touch that just opened a readout, waiting for its synthetic click to
   *  arrive so that click can be let through to the page without picking. */
  const opening = useRef(false);
  /** Focus a pointer moved onto the frame. The frame's own handler then leaves
   *  the readout and the announcement to the gesture that asked for them. */
  const pointerFocus = useRef(false);

  const floor = useTapFloor();
  const textWidth = useTextWidth(frameEl);
  const [width, setWidth] = useState(0);
  /** The scroller's own width, which the axis beside it can still change after
   *  the plot has its width: a chart that opens at its end follows it there. */
  const [boxWidth, setBoxWidth] = useState(0);
  const [overflows, setOverflows] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [rawCursor, setCursor] = useState(0);
  const [said, setSaid] = useState('');
  const [ownPick, setOwnPick] = useState<number | null>(null);
  const pick = selected === undefined ? ownPick : selected;
  const topLayer = typeof HTMLElement !== 'undefined'
    && typeof HTMLElement.prototype.showPopover === 'function';

  const steps = props.variant === 'bridge' ? props.steps : undefined;
  const bridgeTones = props.variant === 'bridge' ? props.tones : undefined;
  const periods = props.variant === 'bridge' || props.variant === 'donut' ? undefined : props.periods;
  const series = props.variant === 'bridge' || props.variant === 'donut' ? undefined : props.series;
  const slices = props.variant === 'donut' ? props.slices : undefined;
  const totalLabel = props.variant === 'donut' ? props.totalLabel ?? 'Total' : 'Total';
  const lookName: string | undefined = props.variant === 'line' || props.variant === 'area'
    || props.variant === 'stacked' || props.variant === 'donut'
    ? props.look ?? LOOK_DEFAULT[props.variant] : undefined;
  const frame = useMemo<Frame>(() => {
    if (steps) return bridgeFrame(steps, bridgeTones, format);
    if (slices) return donutFrame(lookName as ChartDonutLook, slices, totalLabel, format);
    if (lookName) return lookFrame(variant as 'line' | 'area' | 'stacked', lookName, periods ?? [], series ?? [], format);
    return seriesFrame(periods ?? [], (series ?? []) as readonly ChartSeries[], spark, format);
  }, [steps, bridgeTones, slices, totalLabel, lookName, variant, periods, series, spark, format]);
  const { columns, scale, lines, keys, tableHead, tableRows, look } = frame;
  /** The look draws its own box: rows as tall as the target floor, or a ring. */
  const columnsLayout = !look || look.layout === 'columns';

  /* -- the pixels ---------------------------------------------------------- */

  const count = columns.length || 1;
  // Clamped on read: a caller that shortens the data leaves the cursor past the
  // end, and `lead()` would then find no mark and announce nothing.
  const cursor = Math.min(rawCursor, Math.max(columns.length - 1, 0));
  const plotWidth = width || count * FALLBACK_COL;
  const colWidth = plotWidth / count;
  /**
   * The box the drawing is handed, which is the plot and, for a sparkline on a
   * phone, the room a 44px target needs past it. 32px of drawing cannot hold
   * one: the overflow a drawing leaves is clipped by the chart's own edge, so
   * a point near the top read 28 x 19.4 where its attributes said 28 x 32. The
   * line keeps the height it is drawn at and is centred in the taller box, so
   * the reader sees the same sparkline and the target is whole.
   * why: docs/components.md#chart
   */
  const boxHeight = Math.max(plotHeight, floor);
  const boxTop = -(boxHeight - plotHeight) / 2;
  const span = scale.max - scale.min || 1;
  /* The first period that is not final, where the months chart draws its
     boundary and the "Not final" group label over the plot. */
  const groupFrom = fit ? columns.findIndex((c) => c.estimated) : -1;
  /* The group a column draws, and one bar's slot inside it. The cap is the
     mark's, so two bars in a column take two caps and the gap between them;
     the share is the column's, so a narrow column still keeps its ground. */
  const lanes = Math.max(1, ...frame.bars.map((b) => b.lanes));
  const cap = fit ? FIT_MAX : variant === 'bridge' ? BAR_MAX_BRIDGE : BAR_MAX;
  const groupWidth = fit
    ? Math.max(lanes * 2, Math.min(colWidth * FIT_SHARE, cap * lanes + LANE_GAP * (lanes - 1)))
    : Math.max(4, Math.min(colWidth * BAR_SHARE, colWidth - 6, cap * lanes + LANE_GAP * (lanes - 1)));
  const barWidth = Math.max(1, (groupWidth - LANE_GAP * (lanes - 1)) / lanes);
  const centre = useCallback((column: number) => column * colWidth + colWidth / 2, [colWidth]);
  /** A bar's left edge: each band centres the lanes it actually has. */
  const barX = useCallback((bar: { column: number; lane: number; lanes: number }) => centre(bar.column)
    - (bar.lanes * barWidth + LANE_GAP * (bar.lanes - 1)) / 2
    + bar.lane * (barWidth + LANE_GAP), [centre, barWidth]);
  /* The bars that print their value. A value is centred on its bar and takes
     at most half the space to the next value on its side of zero, or the whole
     space to the plot's edge, so no two values meet. One that cannot fit there
     is left out, never shrunk under the kit's text size; the readout and the
     table keep it. */
  const under = useMemo(() => new Set(frame.bars.filter(printsBelow).map((b) => b.id)), [frame.bars]);
  const printed = useMemo(() => {
    const out = new Set<string>();
    if (!showValues) return out;
    const at = frame.bars.map((bar) => ({ bar, x: barX(bar) + barWidth / 2 }));
    for (const { bar, x } of at) {
      const side = at.filter((o) => o.bar !== bar && under.has(o.bar.id) === under.has(bar.id));
      const left = Math.min(2 * x, ...side.filter((o) => o.x <= x).map((o) => x - o.x));
      const right = Math.min(2 * (plotWidth - x), ...side.filter((o) => o.x > x).map((o) => o.x - x));
      if (textWidth(formatAxis(barValue(bar))) + TEXT_GAP <= Math.min(left, right)) out.add(bar.id);
    }
    return out;
  }, [showValues, frame.bars, under, barX, barWidth, plotWidth, textWidth, formatAxis]);
  // The room the group label and the printed values take, inside the plot's
  // height, on the side where each value prints. A chart that prints no value
  // gives that room back to its bars.
  const roomTop = (groupFrom >= 0 ? GROUP_ROOM : 0) + ([...printed].some((id) => !under.has(id)) ? VALUE_ROOM : 0);
  const roomBottom = [...printed].some((id) => under.has(id)) ? VALUE_ROOM : 0;
  const y = useCallback(
    (value: number) => PAD + roomTop
      + ((scale.max - value) / span) * (plotHeight - PAD * 2 - roomTop - roomBottom),
    [scale.max, span, plotHeight, roomTop, roomBottom],
  );
  const zero = y(Math.min(Math.max(0, scale.min), scale.max));

  const axisFormat = look?.share ? pct : formatAxis;
  const geometry = useMemo<LookGeometry | null>(() => (look ? {
    look, uid, labels: columns, plotWidth, plotHeight, colWidth, pad: PAD, target: TARGET, floor,
    y, centre, scale, format, formatAxis: axisFormat,
  } : null), [look, uid, columns, plotWidth, plotHeight, colWidth, floor, y, centre, scale, format, axisFormat]);
  const box = geometry ? lookBox(geometry) : null;

  const marks = useMemo<Mark[]>(() => {
    if (geometry) return lookMarks(geometry);
    const out: Mark[] = frame.bars.map((bar) => {
      let top = Math.min(y(bar.from), y(bar.to));
      let bottom = Math.max(y(bar.from), y(bar.to));
      // Whichever edge stands on the zero line gives up the inset, and only
      // that edge: the two series lose the same height, so what the reader
      // compares is unchanged, and each bar's own stroke follows the new edge
      // rather than being cut by something painted after it.
      // A bar with no room to give one up keeps its edge; it is a hairline and
      // cannot hide the line underneath it anyway.
      let foot: 'top' | 'bottom' | null = null;
      if (bottom - top > ZERO_INSET + 1) {
        if (Math.abs(bottom - zero) < 0.5) { bottom -= ZERO_INSET; foot = 'bottom'; }
        if (Math.abs(top - zero) < 0.5) { top += ZERO_INSET; foot = 'top'; }
      }
      return {
        id: bar.id, column: bar.column, name: bar.name, tone: bar.tone,
        value: barValue(bar),
        detail: bar.detail, kind: 'bar', band: bar.band, foot,
        lane: bar.lane, lanes: bar.lanes,
        // Every bar in the chart is drawn at one width, and each band centres
        // the lanes it actually has: a chart with two series above the line and
        // one below puts the single one in the middle of its column rather than
        // in the left half of a group it does not fill.
        x: barX(bar),
        y: top, w: barWidth, h: Math.max(bottom - top, 1),
        estimated: Boolean(frame.columns[bar.column]?.estimated),
      };
    });
    const dots: Mark[] = [];
    for (const line of lines) {
      line.values.forEach((value, i) => {
        if (!Number.isFinite(value)) return;
        dots.push({
          id: `${line.id}-${i}`, column: i,
          name: keys.find((k) => k.id === line.id)?.name ?? line.id, tone: line.tone,
          value, detail: columns[i]?.compare ? onPrevious(value, line.values[i - 1], columns[i - 1]?.short ?? '') : '',
          kind: 'dot', band: 'full', foot: null, lane: 0, lanes: 1,
          x: centre(i) - TARGET / 2, y: y(value) - TARGET / 2, w: TARGET, h: TARGET,
          estimated: Boolean(columns[i]?.estimated),
        });
      });
    }
    // What a point's target is allowed to take, and where it ends up. The
    // arithmetic is the kit's (`pointTarget`): the box grows to the floor this
    // pointer asks for, stops at half the clear space to the nearest point
    // each way, and is then held inside the box the chart draws in, so the
    // chart's own edge clips none of it. A target the drawing clips is not a
    // target, whatever its attributes say.
    const box = { left: 0, right: plotWidth, top: boxTop, bottom: boxTop + boxHeight };
    for (const dot of dots) {
      const apart = dots.filter((d) => d !== dot && d.column === dot.column)
        .map((d) => d.y + d.h / 2);
      dot.hit = pointTarget(
        { x: dot.x + dot.w / 2, y: dot.y + dot.h / 2 },
        { floor, min: Math.min(TARGET, colWidth), box, column: [dot.column * colWidth, (dot.column + 1) * colWidth], apart },
      );
    }
    return [...out, ...dots];
  }, [geometry, frame, lines, keys, columns, centre, barX, barWidth, groupWidth, y, floor, colWidth, plotWidth, boxTop, boxHeight]);

  const byId = useMemo(() => new Map(marks.map((m) => [m.id, m])), [marks]);
  /** The mark a keystroke opens for a column: its first, in drawing order. */
  const lead = useCallback((column: number) => marks.find((m) => m.column === column), [marks]);
  const open = openId ? byId.get(openId) : undefined;

  /* -- the plot's width, and the sides that still hide columns -------------- */

  useEffect(() => {
    const el = plot.current;
    const box = scroller.current;
    if (!el || !box) return;
    const read = () => {
      setWidth(el.clientWidth);
      setBoxWidth(box.clientWidth);
      setOverflows(box.scrollWidth > box.clientWidth);
    };
    read();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(read);
    observer.observe(el);
    observer.observe(box);
    return () => observer.disconnect();
  }, []);

  // A chart of periods wider than its card opens on its latest period, which is
  // the one a reader came for. A labels look also keeps its labels there.
  const opensAtEnd = Boolean(periods);
  useLayoutEffect(() => {
    const el = scroller.current;
    if (opensAtEnd && el) el.scrollLeft = el.scrollWidth - el.clientWidth;
  }, [opensAtEnd, plotWidth, boxWidth, count]);

  /* -- the readout --------------------------------------------------------- */

  useLayoutEffect(() => {
    const tip = tipEl.current;
    if (!tip) return;
    const layered = topLayer;
    if (!openId) {
      if (layered && tip.matches(':popover-open')) tip.hidePopover();
      return;
    }
    if (!frameEl.current || !svgEl.current) return;
    // Matched by attribute rather than by an interpolated selector: a series id
    // is the caller's string and may carry a quote.
    const anchor = [...svgEl.current.querySelectorAll('[data-anchor]')]
      .find((el) => el.getAttribute('data-anchor') === openId);
    // The readout floats over the page, so only the view and a box that really
    // clips bound it: it opens above its mark, over the legend if it must.
    // why: guidelines/hover-readouts.md#prefer-above-the-mark
    if (!anchor) return;
    if (layered && !tip.matches(':popover-open')) tip.showPopover();
    if (layered) placeChartTip(anchor, tip);
    else placeTip(frameEl.current, anchor, tip);
  }, [openId, plotWidth, plotHeight, topLayer]);

  useEffect(() => {
    if (!openId) return;
    const doc = frameEl.current?.ownerDocument;
    const view = doc?.defaultView;
    if (!doc || !view) return;
    const hide = (event?: globalThis.Event) => {
      // The chart's own plot scroll re-places the readout beside its mark, so a
      // keyboard reader who scrolls the plot keeps it open. A page scroll with
      // the pointer still closes it. why: guidelines/hover-readouts.md#keep-readouts-over-the-page
      if (event?.target === scroller.current) return;
      setOpenId(null);
    };
    const escape = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      dismissed.current = openId;
      hide();
    };
    doc.addEventListener('keydown', escape);
    doc.addEventListener('scroll', hide, true);
    view.addEventListener('resize', hide);
    return () => {
      doc.removeEventListener('keydown', escape);
      doc.removeEventListener('scroll', hide, true);
      view.removeEventListener('resize', hide);
    };
  }, [openId]);

  // Escape dismisses the mark it was pressed on; the readout comes back on the
  // next one, not on that one. why: docs/components.md#tooltip
  const show = (id: string | null | undefined) => {
    if (!id) { setOpenId(null); return; }
    if (dismissed.current === id) return;
    dismissed.current = null;
    setOpenId(id);
  };
  const markAt = (target: EventTarget) =>
    (target as Element).closest?.('[data-mark]')?.getAttribute('data-mark') ?? null;

  /* -- the keyboard, which is the one tab stop ----------------------------- */

  const announce = useCallback((column: number, picked: number | null = pick) => {
    const where = columns[column];
    if (!where) return;
    const values = marks.filter((m) => m.column === column).map((m) => {
      if (m.kind === 'slice') return [format(m.value), m.detail].filter(Boolean).join(', ');
      if (!m.rows) return `${m.name} ${format(m.value)}`;
      return [...m.rows.map((r) => `${r.name} ${r.text}`), ...(m.total ? [`${totalLabel} ${m.total}`] : [])].join('. ');
    }).join('. ') || 'No value';
    const state = stateOf(where);
    setSaid(`${where.label}. ${values}.${state ? ` ${state}.` : ''}${picked === column ? ' Selected.' : ''}`);
  }, [columns, marks, format, pick, totalLabel]);

  /** The column focus opens on: the cursor, or the nearest column in view when
   *  the plot is scrolled away from it, so the readout stands beside its mark. */
  const inView = (column: number) => {
    const el = scroller.current;
    if (!el || el.scrollWidth <= el.clientWidth || !colWidth) return column;
    const first = Math.min(count - 1, Math.max(0, Math.ceil(el.scrollLeft / colWidth - 0.01)));
    const last = Math.max(first, Math.min(count - 1,
      Math.floor((el.scrollLeft + el.clientWidth) / colWidth + 0.01) - 1));
    return Math.min(Math.max(column, first), last);
  };

  const step = (next: number) => {
    const column = Math.max(0, Math.min(next, count - 1));
    setCursor(column);
    show(lead(column)?.id);
    announce(column);
    const el = scroller.current;
    if (el && el.scrollWidth > el.clientWidth) {
      el.scrollLeft = Math.max(0, centre(column) - el.clientWidth / 2);
    }
  };

  const choose = (column: number) => {
    if (!selectable) return;
    if (selected === undefined) setOwnPick(column);
    onSelect?.(column);
  };

  const onKeyDown = (event: ReactKeyboardEvent) => {
    // The scroll box inside the frame keeps its own keys for native scrolling.
    if (event.target !== event.currentTarget) return;
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

  const hitBand = (band: Band) => (band === 'up'
    ? { y: PAD, h: Math.max(zero - PAD, TARGET) }
    : band === 'down'
      ? { y: zero, h: Math.max(plotHeight - PAD - zero, TARGET) }
      : { y: PAD, h: Math.max(plotHeight - PAD * 2, TARGET) });

  // A thin ring reads its total first and its key after; the table look's list
  // beside the ring is its key.
  const legendFirst = !(look?.variant === 'donut' && look.look !== 'labels');
  const legend = keyed && !asTable && keys.length > 0 && !(look?.variant === 'donut' && look.look === 'table') && (
    <ul className="ui-chart__legend">
      {keys.map((key) => (
        <li key={key.id} className={cx('ui-chart__key', `ui-chart__tone--${key.tone}`)}>
          <KeyMark shape={key.shape} />
          {key.name}
        </li>
      ))}
    </ul>
  );
  const viewSwitch = showTable && (
    <Segmented size="sm" label={`${title}, view`} value={view}
      onChange={(next) => setView(next as 'chart' | 'table')} options={[
        { value: 'chart', label: 'Chart', icon: 'chart', iconOnly: true },
        { value: 'table', label: 'Table', icon: 'table', iconOnly: true },
      ]} />
  );
  const noun = look?.layout === 'ring' ? 'slices' : look?.layout === 'rows' ? 'rows' : 'columns';

  /* The period row. The months and bridge charts print every bar's short name,
     wrapped at a word break inside its column, so no bar goes unnamed. Where one
     word alone is wider than the column, wrapping cannot help, so those charts
     step by the whole label, counted from the first period that is not final,
     or from the latest one, so the period a reader came for keeps its label.
     The other variants keep that stepping for every label that does not fit. */
  const wrapAtWords = variant === 'months' || variant === 'bridge';
  const labelRoom = Math.max(0, ...columns.map((c) => textWidth(c.short))) + LABEL_GAP;
  const widestWord = wrapAtWords
    ? Math.max(0, ...columns.flatMap((c) => c.short.split(/\s+/).map((word) => textWidth(word)))) + LABEL_GAP
    : labelRoom;
  const every = widestWord <= colWidth ? 1 : Math.ceil(labelRoom / colWidth);
  const anchor = groupFrom >= 0 ? groupFrom : count - 1;
  const labelled = (i: number) => ((anchor - i) % every + every) % every === 0;
  /** A stepped label wider than its column stands centred on it, or on the
   *  plot's edge where centring would carry it past that edge. */
  const edgeOf = (i: number) => {
    const half = textWidth(columns[i].short) / 2;
    return centre(i) - half < 0 ? 'is-start' : centre(i) + half > plotWidth ? 'is-end' : null;
  };
  const groupX = groupFrom >= 0 ? Math.min(Math.max(groupFrom * colWidth, 1), plotWidth - 1) : 0;

  return (
    <div
      className={cx('ui-chart', `ui-chart--${variant}`, look && `ui-chart--${variant}-${look.look}`,
        selectable && 'ui-chart--pick', className)}
      style={{
        '--ui-chart-h': `${plotHeight}px`,
        '--ui-chart-box': `${px(boxHeight)}px`,
        '--ui-chart-cols': count,
        '--ui-chart-pad': `${PAD}px`,
        '--ui-chart-top': `${PAD + roomTop}px`,
        '--ui-chart-bottom': `${PAD + roomBottom}px`,
      } as CSSProperties}
    >
      {toCard && createPortal(viewSwitch, toCard)}
      {((showTable && !toCard) || (legendFirst && legend)) && (
        <div className="ui-chart__head">
          {legendFirst && legend}
          {!toCard && viewSwitch}
        </div>
      )}

      {/* Hidden, not unmounted, so the width it measured is still there when
          the reader switches back. */}
      <div
        ref={frameEl}
        hidden={asTable}
        className="ui-chart__frame ui-tip-host ui-focusable"
        tabIndex={0}
        role="group"
        aria-label={`${title}. Arrow keys step through the ${columns.length} ${noun}.`}
        onKeyDown={onKeyDown}
        onFocus={(event) => {
          if (event.target !== event.currentTarget) return;
          if (pointerFocus.current) { pointerFocus.current = false; return; }
          const column = inView(cursor);
          setCursor(column);
          show(lead(column)?.id);
          announce(column);
        }}
        onBlur={(event) => {
          if (event.target !== event.currentTarget) return;
          // A press on the plot moves focus to the scroller for a moment, and
          // the click behind it brings focus back. The readout it opened stays.
          if (pointerFocus.current) return;
          setOpenId(null);
          setSaid('');
        }}
      >
        {!spark && columnsLayout && scale.ticks.length > 0 && (
          <div className="ui-chart__axis" aria-hidden="true">
            {[...scale.ticks].reverse().map((tick) => (
              <span key={tick} className="ui-chart__tick">{axisFormat(tick)}</span>
            ))}
          </div>
        )}

        {/* While the plot overflows, this box is a named region and a Tab stop
            after the frame, with the kit's ring, so a reader can scroll it with
            the keyboard. While it fits, it stays out of the tab order.
            why: docs/components.md#chart */}
        <div
          ref={scroller}
          className={cx('ui-chart__scroll', overflows && 'ui-focusable')}
          tabIndex={overflows ? 0 : -1}
          role={overflows ? 'region' : undefined}
          aria-label={overflows ? `${title}. Scroll for more ${noun}.` : undefined}
          onScroll={() => {
            const anchor = [...(svgEl.current?.querySelectorAll('[data-anchor]') ?? [])]
              .find((el) => el.getAttribute('data-anchor') === openId);
            if (!anchor || !scroller.current || !frameEl.current || !tipEl.current) return;
            const mark = anchor.getBoundingClientRect();
            const view = scroller.current.getBoundingClientRect();
            if (mark.right <= view.left || mark.left >= view.right) setOpenId(null);
            else placeTip(frameEl.current, anchor, tipEl.current);
          }}
        >
          <div ref={plot} className="ui-chart__plot">
            <svg
              ref={svgEl}
              className="ui-chart__svg"
              width={px(plotWidth)}
              height={px(boxHeight)}
              viewBox={`0 ${px(boxTop)} ${px(plotWidth)} ${px(boxHeight)}`}
              /* A rows or ring look draws its own box, and each row in it is the floor already. */
              {...box && { width: px(box.w), height: px(box.h), viewBox: `0 0 ${px(box.w)} ${px(box.h)}` }}
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
                // The tap that OPENS a readout is the reader asking what the mark
                // is worth, so it answers and nothing else: the synthetic click
                // behind it is let through to the page but may not pick the
                // column. The tap that closes one is a second, deliberate press
                // and keeps the action.
                // why: guidelines/hover-readouts.md#tap-to-open-or-close
                // A new tap is a deliberate press, so it also undoes an Escape.
                if (id && id === openId) { opening.current = false; setOpenId(null); }
                else { dismissed.current = null; opening.current = Boolean(id); show(id); }
              }}
              onPointerDown={() => { pointerFocus.current = true; }}
              onClick={(event) => {
                // The nearest focusable ancestor of a mark is the scroller, so a
                // click parked focus on it and a pointer reader never heard that
                // the arrows do anything. The named group takes focus however
                // the chart is entered.
                frameEl.current?.focus();
                pointerFocus.current = false;
                const opened = opening.current;
                opening.current = false;
                const mark = byId.get(markAt(event.target) ?? '');
                if (!mark) return;
                setCursor(mark.column);
                if (opened) { announce(mark.column); return; }
                choose(mark.column);
                announce(mark.column, selectable ? mark.column : pick);
              }}
            >
              {/* The picked column, behind everything the chart draws. Selection
                  is a background highlight and nothing else; the outline on the
                  frame belongs to focus. The band is a quiet fill rather than
                  the accent, which the chart spends on a series, and the picked
                  label carries the weight that survives with no colour at all. */}
              {!spark && columnsLayout && pick !== null && pick >= 0 && pick < count && (
                <rect className="ui-chart__band"
                  x={px(pick * colWidth)} width={px(colWidth)}
                  y="0" height={px(plotHeight)} />
              )}

              {/* The carry a bridge draws from each step to the next: the running
                  total leaves one column at the height it reached and meets the
                  next where it starts from. Without it a waterfall is a row of
                  floating blocks and the reader has to find the walk. */}
              {frame.links && frame.bars.slice(0, -1).map((bar, i) => {
                const from = byId.get(bar.id);
                const to = byId.get(frame.bars[i + 1].id);
                return from && to ? (
                  <line key={`carry-${bar.id}`} className="ui-chart__carry"
                    x1={px(from.x + from.w)} x2={px(to.x)}
                    y1={px(y(bar.to))} y2={px(y(bar.to))} />
                ) : null;
              })}

              {/* A hairline at every tick, and the zero rule over them. The grid is
                  what carries a value across twelve columns to its label; the one
                  line a signed series is measured from is drawn heavier, which is
                  the one rule every reference keeps. Both go under every mark: the
                  bars stop ZERO_INSET short of zero so no bar can cover it, and a
                  line or a dot crossing a rule paints over it. */}
              {!spark && columnsLayout && scale.ticks.filter((tick) => tick !== 0).map((tick) => (
                <line key={`grid-${tick}`} className="ui-chart__grid"
                  x1="0" x2={px(plotWidth)} y1={px(y(tick))} y2={px(y(tick))} />
              ))}
              {!spark && columnsLayout && scale.ticks.includes(0) && (
                <line className="ui-chart__zero"
                  x1="0" x2={px(plotWidth)} y1={px(y(0))} y2={px(y(0))} />
              )}

              {/* One solid boundary before the first period that is not final, and
                  the words over that group. The readout and the table name each
                  period's state. why: docs/components.md#chart */}
              {groupFrom >= 0 && (
                <>
                  <line className="ui-chart__boundary"
                    x1={px(groupX)} x2={px(groupX)} y1={BOUNDARY_TOP} y2={px(plotHeight - PAD)} />
                  <text className="ui-chart__text ui-chart__group" y={GROUP_BASELINE}
                    x={px(Math.max(0, Math.min(groupX + TEXT_GAP, plotWidth - textWidth(GROUP_WORDS, true))))}
                  >{GROUP_WORDS}</text>
                </>
              )}

              {marks.filter((m) => m.kind === 'bar').map((mark) => (
                <path
                  key={`bar-${mark.id}`}
                  className={cx('ui-chart__bar', `ui-chart__tone--${mark.tone}`,
                    mark.estimated && 'is-estimated')}
                  d={barPath(mark)}
                />
              ))}

              {/* A bar's value over its end, or under a bar that grows down from zero. */}
              {marks.filter((m) => m.kind === 'bar' && printed.has(m.id)).map((mark) => {
                const text = formatAxis(mark.value);
                const below = under.has(mark.id);
                return (
                  <text key={`value-${mark.id}`}
                    className={cx('ui-chart__text', 'ui-chart__value', below && 'ui-chart__value--below')}
                    x={px(mark.x + mark.w / 2)}
                    y={px(below ? mark.y + mark.h + TEXT_GAP : mark.y - TEXT_GAP)}
                  >{text}</text>
                );
              })}

              {/* Every casing before any stroke. A casing is wider than the stroke
                  it carries, so one drawn per segment in step with its stroke would
                  cut the segment before it at the joint. The casing is the ground,
                  which is how the dots already separate themselves from the line:
                  it buys the line its 3:1 against whatever it crosses, and the
                  bars it crosses are now its own hue.
                  why: docs/components.md#chart */}
              {(['casing', 'stroke'] as const).map((layer) => lines.flatMap(
                (line) => line.values.slice(1).map((value, i) => (
                  Number.isFinite(value) && Number.isFinite(line.values[i]) ? (
                    <line
                      key={`${line.id}-${layer}-${i}`}
                      className={layer === 'casing' ? 'ui-chart__line-casing'
                        : cx('ui-chart__line', `ui-chart__tone--${line.tone}`,
                          (columns[i]?.estimated || columns[i + 1]?.estimated) && 'is-estimated')}
                      x1={px(centre(i))} y1={px(y(line.values[i]))}
                      x2={px(centre(i + 1))} y2={px(y(value))}
                    />
                  ) : null
                )),
              ))}

              {lines.flatMap((line) => line.values.map((value, i) => (
                Number.isFinite(value) && !Number.isFinite(line.values[i - 1])
                  && !Number.isFinite(line.values[i + 1]) ? (
                    <circle key={`isolated-${line.id}-${i}`}
                      className={cx('ui-chart__isolated', `ui-chart__tone--${line.tone}`)}
                      cx={px(centre(i))} cy={px(y(value))} r="2" />
                  ) : null
              )))}

              {geometry && lookDrawing(geometry, open?.column ?? null, pick)}

              {/* The hit areas last, so a point's box wins over the band under it.
                  A bar's is its own band in the column, full height, so a pointer
                  between two bars still has one to answer with. */}
              {marks.map((mark) => (
                <g key={`hit-${mark.id}`} data-mark={mark.id}>
                  {mark.hitPath ? (
                    <path className="ui-chart__hit" d={mark.hitPath} />
                  ) : mark.kind === 'bar' ? (
                    <rect
                      className="ui-chart__hit"
                      x={px(mark.column * colWidth + (mark.lane * colWidth) / mark.lanes)}
                      width={px(colWidth / mark.lanes)}
                      y={px(hitBand(mark.band).y)} height={px(hitBand(mark.band).h)}
                    />
                  ) : (
                    <rect
                      className="ui-chart__hit"
                      x={px(mark.hit?.x ?? mark.x)} y={px(mark.hit?.y ?? mark.y)}
                      width={px(mark.hit?.w ?? TARGET)} height={px(mark.hit?.h ?? TARGET)}
                    />
                  )}
                  <rect
                    data-anchor={mark.id} className="ui-chart__anchor"
                    x={px(mark.x)} y={px(mark.y)} width={px(mark.w)} height="0"
                  />
                </g>
              ))}
            </svg>

            {look?.variant === 'donut' && look.look === 'table' && (
              <Shares look={look} format={format} swatch={<KeyMark shape="fill" />} />
            )}

            {!spark && columnsLayout && (
              <div className={cx('ui-chart__periods', every > 1 && 'ui-chart__periods--step')} aria-hidden="true">
                {columns.map((column, i) => (
                  <span key={`${column.label}-${i}`}
                    className={cx('ui-chart__period', pick === i && 'is-selected', every > 1 && edgeOf(i))}
                  >{labelled(i) ? column.short : null}</span>
                ))}
              </div>
            )}
          </div>
        </div>

        <span ref={tipEl} {...topLayer && { popover: 'manual' }} className={cx('ui-tip', openId && 'is-open')} role={open ? 'tooltip' : undefined}>
          {open && (
            <>
              <span className="ui-tip__label">
                {spark || look ? columns[open.column]?.label : `${open.name}, ${columns[open.column]?.label}`}
              </span>
              {open.rows ? (
                <>
                  {open.rows.map((row) => (
                    <span key={row.name} className="ui-tip__value ui-chart__row">
                      <span className={cx('ui-chart__key', `ui-chart__tone--${row.tone}`)}>
                        <KeyMark shape={row.shape} />{row.name}
                      </span>
                      <span>{row.text}</span>
                    </span>
                  ))}
                  {open.total && (
                    <span className="ui-tip__value ui-chart__row">
                      <span>{totalLabel}</span><span>{open.total}</span>
                    </span>
                  )}
                </>
              ) : (
                <span className="ui-tip__value">{format(open.value)}</span>
              )}
              {(stateOf(columns[open.column]) || open.detail) && (
                <span className="ui-tip__detail">{stateOf(columns[open.column]) || open.detail}</span>
              )}
            </>
          )}
        </span>
      </div>

      {!legendFirst && legend}

      <div className="ui-sr" role="status">{said}</div>

      {asTable && (
        <div className="ui-chart__data">
          {/* The kit's scroller, so four columns of exact money stay reachable
              in the card at any width, rather than widening the page under
              them. A browser makes an overflowing box keyboard-focusable on its
              own, so the box is named and takes the kit's inward band rather
              than the browser's outline.
              why: docs/components.md#chart */}
          <div
            className="ui-table-scroll" role="region" tabIndex={0}
            aria-label={`${title}, as a table. Scroll for more columns.`}
          >
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
          </div>
        </div>
      )}
    </div>
  );
}
