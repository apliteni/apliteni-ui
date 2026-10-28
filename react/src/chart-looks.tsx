// The four chart variants that draw a whole instead of a measure against zero:
// a line, an area, a stack and a ring. Chart.tsx owns the keyboard, the readout,
// the live region and the table; this file owns each look's geometry and the
// SVG it draws.
// why: docs/components.md#react-charts
import type { ReactNode } from 'react';
import type { ChartTone, Mark, MarkRow } from './Chart';

export type ChartLineLook = 'thin' | 'points' | 'labels';
export type ChartAreaLook = 'flat' | 'stacked' | 'share';
export type ChartStackedLook = 'columns' | 'share' | 'rows';
export type ChartDonutLook = 'thin' | 'table' | 'labels';

export type ChartSlice = { id: string; name: string; value: number; tone?: ChartTone };

export const LOOK_DEFAULT = {
  line: 'thin', area: 'stacked', stacked: 'columns', donut: 'table',
} as const satisfies Record<string, string>;

/** The tones a series or a slice takes in order when the caller names none. */
export const TONE_CYCLE: ChartTone[] = ['accent', 'accent-soft', 'info', 'warn', 'good', 'bad', 'neutral'];

/** One series or one slice, with where it starts and ends in scale units. A
 *  slice's two ends are shares of the whole ring. */
export type Layer = {
  id: string; name: string; tone: ChartTone;
  /** The caller's values. A missing one is NaN. */
  values: number[];
  from: number[]; to: number[];
};

export type Look = {
  variant: 'line' | 'area' | 'stacked' | 'donut';
  look: string;
  layout: 'columns' | 'rows' | 'ring';
  /** Each layer sits on the one before it, and a column reads as its total. */
  stacked: boolean;
  /** Each column is drawn as shares of its total. */
  share: boolean;
  layers: Layer[];
  totals: number[];
  /** The donut's centre caption. */
  totalLabel: string;
};

export type LookGeometry = {
  look: Look;
  labels: { short: string; estimated: boolean }[];
  plotWidth: number; plotHeight: number; colWidth: number;
  pad: number; target: number; floor: number;
  y: (value: number) => number;
  centre: (column: number) => number;
  scale: { min: number; max: number; ticks: number[] };
  format: (value: number) => string;
  formatAxis: (value: number) => string;
};

export const pct = (share: number) => `${Math.round(share * 100)}%`;
const px = (n: number) => Math.round(n * 10) / 10;
const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(' ');
const tone = (t: ChartTone) => `ui-chart__tone--${t}`;
const MISSING = '—';

/* The rows look. A row is as tall as the pointer's floor, so a phone gets 44px
   to tap and a desktop the picture's density. The bar inside it keeps 12px. */
const ROW_BAR = 12;
const ROW_LEFT = 36;
const ROW_RIGHT = 64;
const ROW_FOOT = 24;
/* The ring looks: the box, the ring's width, and for the labels look the widest
   box and the room a label needs beside the ring. */
const RING = {
  thin: { size: 216, thick: 12 },
  table: { size: 200, thick: 44 },
  labels: { size: 264, thick: 24, width: 470, radius: 104, room: 90 },
};
/** The bar width of the columns looks: slim for an amount, wide for a share. */
const STACK_BAR = { columns: 12, share: 20 };

/** An annulus slice from angle `a0` to `a1`, clockwise from twelve o'clock. */
function arc(x: number, y: number, r0: number, r1: number, a0: number, a1: number) {
  const p = (r: number, a: number) => `${px(x + r * Math.cos(a))} ${px(y + r * Math.sin(a))}`;
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return `M${p(r1, a0)} A${px(r1)} ${px(r1)} 0 ${large} 1 ${p(r1, a1)}`
    + ` L${p(r0, a1)} A${px(r0)} ${px(r0)} 0 ${large} 0 ${p(r0, a0)} Z`;
}
const angle = (share: number) => -Math.PI / 2 + share * Math.PI * 2;

/** A segment whose top is round and whose foot is square, for a stack's top. */
function topRounded(x: number, y: number, w: number, h: number, r: number) {
  const k = Math.min(r, h, w / 2);
  return `M${px(x)} ${px(y + h)}V${px(y + k)}A${px(k)} ${px(k)} 0 0 1 ${px(x + k)} ${px(y)}`
    + `H${px(x + w - k)}A${px(k)} ${px(k)} 0 0 1 ${px(x + w)} ${px(y + k)}V${px(y + h)}Z`;
}
/** The same for a horizontal stack, round on the right. */
function rightRounded(x: number, y: number, w: number, h: number, r: number) {
  const k = Math.min(r, w, h / 2);
  return `M${px(x)} ${px(y)}H${px(x + w - k)}A${px(k)} ${px(k)} 0 0 1 ${px(x + w)} ${px(y + k)}`
    + `V${px(y + h - k)}A${px(k)} ${px(k)} 0 0 1 ${px(x + w - k)} ${px(y + h)}H${px(x)}Z`;
}
const square = (x: number, y: number, w: number, h: number) =>
  `M${px(x)} ${px(y)}h${px(w)}v${px(h)}h${px(-w)}Z`;

/** A series' key shape: a line for a line, a square for a fill. */
export const keyShape = (look: Look): 'line' | 'fill' =>
  (look.variant === 'line' || (look.variant === 'area' && look.look === 'flat') ? 'line' : 'fill');

/** What one column's readout lists, top of the stack first. */
function columnRows(g: LookGeometry, i: number): MarkRow[] {
  const { look, format } = g;
  const shape = keyShape(look);
  const rows = look.layers.map((layer) => ({
    name: layer.name, tone: layer.tone, shape,
    text: look.share ? pct(layer.to[i] - layer.from[i])
      : Number.isFinite(layer.values[i]) ? format(layer.values[i]) : MISSING,
  }));
  return look.stacked ? rows.reverse() : rows;
}

/** The size of the box a look draws in, when it is not the plot's own. */
export function lookBox(g: LookGeometry) {
  const { look, plotWidth, floor, target } = g;
  if (look.layout === 'rows') {
    const row = Math.max(target, floor);
    return { w: plotWidth, h: row * g.labels.length + ROW_FOOT, row };
  }
  if (look.layout === 'ring') {
    const ring = RING[look.look as ChartDonutLook];
    const w = 'width' in ring ? Math.min(plotWidth, ring.width) : ring.size;
    return { w, h: ring.size, row: 0 };
  }
  return null;
}

function ringOf(g: LookGeometry) {
  const look = g.look.look as ChartDonutLook;
  const box = lookBox(g)!;
  const spec = RING[look];
  const r = 'radius' in spec
    ? Math.max(spec.thick * 2, Math.min(spec.radius, box.w / 2 - spec.room))
    : spec.size / 2 - g.pad;
  return { x: box.w / 2, y: box.h / 2, r, thick: spec.thick };
}

function rowsOf(g: LookGeometry) {
  const box = lookBox(g)!;
  const span = g.scale.max - g.scale.min || 1;
  const x = (v: number) => ROW_LEFT + (box.w - ROW_LEFT - ROW_RIGHT) * ((v - g.scale.min) / span);
  return { ...box, x, top: (i: number) => i * box.row + (box.row - ROW_BAR) / 2 };
}

/** One mark per column, row or slice: what a pointer lands on, what the keyboard
 *  steps to, and what the readout says. */
export function lookMarks(g: LookGeometry): Mark[] {
  const { look, format, colWidth, plotHeight, pad, floor } = g;
  const base = { lane: 0, lanes: 1, band: 'full' as const, foot: null, detail: '' };

  if (look.layout === 'ring') {
    const ring = ringOf(g);
    const total = look.totals[0];
    return look.layers.map((slice, i) => {
      const mid = angle((slice.from[0] + slice.to[0]) / 2);
      // The ring is the target, grown inward to the floor, so a thin ring still
      // answers a pointer that lands just inside it.
      const reach = Math.max(ring.thick, floor);
      return {
        ...base, id: slice.id, column: i, name: slice.name, tone: slice.tone, kind: 'slice',
        value: slice.values[0],
        detail: total > 0 ? `${pct(slice.to[0] - slice.from[0])} of ${format(total)}` : '',
        x: ring.x + ring.r * Math.cos(mid) - 2, y: ring.y + ring.r * Math.sin(mid), w: 4, h: 0,
        hitPath: slice.to[0] > slice.from[0]
          ? arc(ring.x, ring.y, Math.max(0, ring.r - reach), ring.r, angle(slice.from[0]), angle(slice.to[0]))
          : undefined,
        estimated: false,
      };
    });
  }

  const name = look.layers[0]?.name ?? '';
  if (look.layout === 'rows') {
    const rows = rowsOf(g);
    return g.labels.map((label, i) => {
      const end = rows.x(look.totals[i]);
      return {
        ...base, id: `row-${i}`, column: i, name, tone: look.layers[0]?.tone ?? 'neutral', kind: 'column',
        value: look.totals[i], rows: columnRows(g, i), total: format(look.totals[i]),
        x: end - 2, y: rows.top(i), w: 4, h: ROW_BAR,
        hit: { x: 0, y: i * rows.row, w: rows.w, h: rows.row },
        estimated: label.estimated,
      };
    });
  }

  const lift = look.variant === 'line' && look.look === 'points' ? 6
    : look.variant === 'stacked' ? 2 : 4;
  return g.labels.map((label, i) => {
    const tops = look.layers.map((l) => l.to[i]).filter(Number.isFinite);
    const top = tops.length ? Math.max(...tops) : g.scale.min;
    const first = look.layers.map((l) => l.values[i]).find(Number.isFinite) ?? Number.NaN;
    return {
      ...base, id: `column-${i}`, column: i, name, tone: look.layers[0]?.tone ?? 'neutral', kind: 'column',
      value: look.stacked ? look.totals[i] : first,
      rows: columnRows(g, i),
      total: look.stacked ? format(look.totals[i]) : undefined,
      x: g.centre(i) - 2, y: g.y(top) - lift, w: 4, h: 0,
      hit: { x: i * colWidth, y: pad, w: colWidth, h: Math.max(plotHeight - pad * 2, g.target) },
      estimated: label.estimated,
    };
  });
}

/** The look's drawing, between the grid and the hit areas. `open` is the column
 *  under the pointer or the keyboard, and `pick` the selected one. */
export function lookDrawing(g: LookGeometry, open: number | null, pick: number | null): ReactNode {
  const { look } = g;
  if (look.layout === 'ring') return ringDrawing(g);
  if (look.layout === 'rows') return rowsDrawing(g, pick);
  return look.variant === 'stacked' ? columnsDrawing(g) : linesDrawing(g, open);
}

function linesDrawing(g: LookGeometry, open: number | null) {
  const { look, labels, y, centre, pad, plotHeight, format } = g;
  const n = labels.length;
  const area = look.variant === 'area';
  const finite = (layer: Layer, i: number) => Number.isFinite(look.stacked ? layer.to[i] : layer.values[i]);
  const at = (layer: Layer, i: number) => (look.stacked ? layer.to[i] : layer.values[i]);
  const fills = area && look.layers.map((layer) => {
    const up = layer.to.map((v, i) => `${i ? 'L' : 'M'}${px(centre(i))} ${px(y(Number.isFinite(v) ? v : layer.from[i]))}`);
    const down = layer.from.map((v, i) => `L${px(centre(i))} ${px(y(v))}`).reverse();
    return (
      <path key={`fill-${layer.id}`}
        className={cx(look.share ? 'ui-chart__segment' : 'ui-chart__area', tone(layer.tone))}
        d={`${up.join('')}${down.join('')}Z`} />
    );
  });
  const edges = !look.share && look.layers.flatMap((layer) => layer.to.slice(1).map((_, k) => (
    finite(layer, k) && finite(layer, k + 1) ? (
      <line key={`edge-${layer.id}-${k}`}
        className={cx('ui-chart__line', tone(layer.tone),
          (labels[k]?.estimated || labels[k + 1]?.estimated) && 'is-estimated')}
        x1={px(centre(k))} y1={px(y(at(layer, k)))} x2={px(centre(k + 1))} y2={px(y(at(layer, k + 1)))} />
    ) : null)));
  const points = look.variant === 'line' && look.look === 'points';
  const dots = look.layers.flatMap((layer) => layer.to.map((_, i) => {
    if (!finite(layer, i)) return null;
    const lonely = !finite(layer, i - 1) && !finite(layer, i + 1);
    const shown = i === open || points || (lonely && !look.share);
    if (!shown || (look.share && i !== open)) return null;
    // The share look's dot marks only the top of the whole.
    if (look.share && layer !== look.layers[look.layers.length - 1]) return null;
    return (
      <circle key={`dot-${layer.id}-${i}`} className={cx('ui-chart__dot', tone(layer.tone))}
        cx={px(centre(i))} cy={px(y(at(layer, i)))} r={points && i === open ? 5.5 : 4} />
    );
  }));
  const ends = look.variant === 'line' && look.look === 'labels' && look.layers.map((layer) => {
    const last = [...Array(n).keys()].reverse().find((i) => finite(layer, i));
    if (last === undefined) return null;
    return (
      <g key={`end-${layer.id}`}>
        <circle className={cx('ui-chart__dot', tone(layer.tone))}
          cx={px(centre(last))} cy={px(y(layer.values[last]))} r="4" />
        <text className="ui-chart__text ui-chart__text--strong" textAnchor="end"
          x={px(centre(last) + 4)} y={px(y(layer.values[last]) - 10)}>{format(layer.values[last])}</text>
      </g>
    );
  });
  return (
    <>
      {fills}
      {open !== null && (
        <line className="ui-chart__cross"
          x1={px(centre(open))} x2={px(centre(open))} y1={pad} y2={px(plotHeight - pad)} />
      )}
      {edges}
      {ends}
      {dots}
    </>
  );
}

function columnsDrawing(g: LookGeometry) {
  const { look, labels, y, centre, colWidth } = g;
  const w = Math.min(STACK_BAR[look.look as 'columns' | 'share'], Math.max(4, colWidth - 6));
  return labels.flatMap((label, i) => {
    const filled = look.layers.filter((l) => l.to[i] > l.from[i]);
    return filled.map((layer) => {
      const y0 = y(layer.from[i]);
      const y1 = y(layer.to[i]);
      const x = centre(i) - w / 2;
      const d = layer === filled[filled.length - 1] ? topRounded(x, y1, w, y0 - y1, 4) : square(x, y1, w, y0 - y1);
      return (
        <path key={`seg-${layer.id}-${i}`}
          className={cx('ui-chart__segment', tone(layer.tone), label.estimated && 'is-estimated')} d={d} />
      );
    });
  });
}

function rowsDrawing(g: LookGeometry, pick: number | null) {
  const { look, labels, format, formatAxis, scale } = g;
  const rows = rowsOf(g);
  const bottom = rows.row * labels.length;
  return (
    <>
      {pick !== null && pick >= 0 && pick < labels.length && (
        <rect className="ui-chart__band" x="0" width={px(rows.w)} y={px(pick * rows.row)} height={px(rows.row)} />
      )}
      {scale.ticks.map((tick) => (
        <g key={`tick-${tick}`}>
          <line className={tick === 0 ? 'ui-chart__zero' : 'ui-chart__grid'}
            x1={px(rows.x(tick))} x2={px(rows.x(tick))} y1="0" y2={px(bottom)} />
          <text className="ui-chart__caption" textAnchor="middle" aria-hidden="true"
            x={px(rows.x(tick))} y={px(bottom + 16)}>{formatAxis(tick)}</text>
        </g>
      ))}
      {labels.map((label, i) => {
        const top = rows.top(i);
        const filled = look.layers.filter((l) => l.to[i] > l.from[i]);
        return (
          <g key={`row-${i}`}>
            <text className="ui-chart__caption" textAnchor="end" aria-hidden="true"
              x={ROW_LEFT - 8} y={px(top + ROW_BAR - 2)}>{label.short}</text>
            {filled.map((layer) => {
              const x0 = rows.x(layer.from[i]);
              const x1 = rows.x(layer.to[i]);
              const d = layer === filled[filled.length - 1]
                ? rightRounded(x0, top, x1 - x0, ROW_BAR, 4) : square(x0, top, x1 - x0, ROW_BAR);
              return (
                <path key={`seg-${layer.id}`} d={d}
                  className={cx('ui-chart__segment', tone(layer.tone), label.estimated && 'is-estimated')} />
              );
            })}
            <text className="ui-chart__text" aria-hidden="true"
              x={px(rows.x(look.totals[i]) + 6)} y={px(top + ROW_BAR - 2)}>{format(look.totals[i])}</text>
          </g>
        );
      })}
    </>
  );
}

function ringDrawing(g: LookGeometry) {
  const { look, format } = g;
  const ring = ringOf(g);
  const total = look.totals[0];
  return (
    <>
      {look.layers.filter((s) => s.to[0] > s.from[0]).map((slice) => (
        <path key={`slice-${slice.id}`} className={cx('ui-chart__segment', tone(slice.tone))}
          d={arc(ring.x, ring.y, ring.r - ring.thick, ring.r, angle(slice.from[0]), angle(slice.to[0]))} />
      ))}
      {look.look === 'thin' && (
        <g aria-hidden="true">
          <text className="ui-chart__total" textAnchor="middle" x={px(ring.x)} y={px(ring.y + 2)}>{format(total)}</text>
          <text className="ui-chart__caption" textAnchor="middle" x={px(ring.x)} y={px(ring.y + 22)}>{look.totalLabel}</text>
        </g>
      )}
      {look.look === 'labels' && look.layers.filter((s) => s.to[0] > s.from[0]).map((slice) => {
        const mid = angle((slice.from[0] + slice.to[0]) / 2);
        const x = ring.x + (ring.r + 14) * Math.cos(mid);
        const y = ring.y + (ring.r + 14) * Math.sin(mid);
        const anchor = Math.cos(mid) >= 0 ? 'start' : 'end';
        return (
          <g key={`label-${slice.id}`} aria-hidden="true">
            <text className="ui-chart__text ui-chart__text--strong" textAnchor={anchor} x={px(x)} y={px(y - 2)}>{slice.name}</text>
            <text className="ui-chart__text" textAnchor={anchor} x={px(x)} y={px(y + 13)}>
              {`${format(slice.values[0])}  ${pct(slice.to[0] - slice.from[0])}`}
            </text>
          </g>
        );
      })}
    </>
  );
}

/** The table look's list beside the ring: each slice's value and share, and the
 *  total. The data table under the chart carries the same numbers for a reader
 *  who cannot see it, so the list is hidden from them. */
export function Shares({ look, format, swatch }: {
  look: Look; format: (value: number) => string; swatch: ReactNode;
}) {
  const total = look.totals[0];
  return (
    <ul className="ui-chart__shares" aria-hidden="true">
      {look.layers.map((slice) => (
        <li key={slice.id} className={tone(slice.tone)}>
          {swatch}
          <span>{slice.name}</span>
          <span className="ui-chart__shares-value">{format(slice.values[0])}</span>
          <span className="ui-chart__shares-pct">{total > 0 ? pct(slice.to[0] - slice.from[0]) : MISSING}</span>
        </li>
      ))}
      <li className="ui-chart__shares-total">
        <span />
        <span>{look.totalLabel}</span>
        <span className="ui-chart__shares-value">{format(total)}</span>
        <span className="ui-chart__shares-pct">100%</span>
      </li>
    </ul>
  );
}
