// Specimen charts for the tooltip's stories and the hover-readout guideline.
// They are pictures of the surfaces a readout sits over, not kit components:
// the kit ships the readout, and a consumer brings the chart.
//
// Every point and bar is a mark in the tooltip's sense — a `<g>` carrying the
// data-tip-* attributes, with a full-height hit area so the pointer never falls
// between two marks, and a `[data-tip-anchor]` that says where the readout
// opens. `at(i)` returns the same anchor in the chart's own pixels, for a
// specimen rendered with the readout already open.

// Twelve months of made-up revenue for a made-up company.
export const MONTHS = ['Dec 2024', 'Jan 2025', 'Feb 2025', 'Mar 2025', 'Apr 2025', 'May 2025',
  'Jun 2025', 'Jul 2025', 'Aug 2025', 'Sep 2025', 'Oct 2025', 'Nov 2025'];
export const REVENUE = [38240, 40110, 39420, 42810, 41030, 44620, 46210, 45140, 47930, 46820, 49300, 48210];
export const EXPENSES = [29870, 30410, 31220, 30980, 32140, 31760, 32900, 33410, 32780, 33950, 34120, 31870];
export const NET = REVENUE.map((r, i) => r - EXPENSES[i]);

export const eur = (n) => `${n < 0 ? '−' : ''}€${Math.abs(n).toLocaleString('en-US')}`;

const delta = (values, i) => {
  if (i === 0) return '';
  const pct = ((values[i] - values[i - 1]) / Math.abs(values[i - 1])) * 100;
  return `${pct < 0 ? '−' : '+'}${Math.abs(pct).toFixed(1)}% on ${MONTHS[i - 1].split(' ')[0]}`;
};

const markAttrs = (values, i) => [
  `data-tip-label="${MONTHS[i]}"`,
  `data-tip-value="${eur(values[i])}"`,
  i ? `data-tip-detail="${delta(values, i)}"` : '',
].filter(Boolean).join(' ');

export const pointOf = (values, i) => ({ label: MONTHS[i], value: eur(values[i]), detail: delta(values, i) });

export const CHART_CSS = `
  <style>
    .ch-chart { display: block; overflow: visible; }
    .ch-chart--fluid { width: 100%; height: auto; }
    .ch-area { fill: color-mix(in srgb, var(--accent) 14%, transparent); }
    .ch-line { fill: none; stroke: var(--accent); stroke-width: 2; stroke-linejoin: round; stroke-linecap: round; }
    .ch-hit { fill: transparent; }
    .ch-dot { fill: var(--accent); stroke: var(--surface); stroke-width: 2; opacity: 0; }
    .ch-bar { fill: color-mix(in srgb, var(--accent) 45%, transparent); }
    .ch-cap { fill: none; }
    [data-tip-value]:hover .ch-dot, .ch-dot.is-on { opacity: 1; }
    [data-tip-value]:hover .ch-bar, .ch-bar.is-on { fill: var(--accent); }
  </style>`;

const PAD = 6;
const R = 3.5;
const n1 = (v) => Math.round(v * 10) / 10;
const svgOpen = (cls, width, height, label) =>
  `<svg class="${cls}" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="${label}">`;

/** A line with a dot at every point; the dot is where the readout opens. */
export function sparkline({
  values = REVENUE, width = 240, height = 56, hot = -1, fluid = false,
  label = 'Revenue, last 12 months',
} = {}) {
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const step = (width - PAD * 2) / (values.length - 1);
  const pts = values.map((v, i) => ({
    x: n1(PAD + i * step),
    y: n1(PAD + ((hi - v) / (hi - lo || 1)) * (height - PAD * 2)),
  }));
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p.x} ${p.y}`).join(' ');
  const area = `${line} L${pts[pts.length - 1].x} ${height} L${pts[0].x} ${height} Z`;
  const marks = pts.map((p, i) => `<g ${markAttrs(values, i)}>`
    + `<rect class="ch-hit" x="${n1(p.x - step / 2)}" y="0" width="${n1(step)}" height="${height}"></rect>`
    + `<circle class="ch-dot${i === hot ? ' is-on' : ''}" data-tip-anchor cx="${p.x}" cy="${p.y}" r="${R}"></circle>`
    + '</g>').join('');
  return {
    svg: `${svgOpen(`ch-chart${fluid ? ' ch-chart--fluid' : ''}`, width, height, label)}`
      + `<path class="ch-area" d="${area}"></path><path class="ch-line" d="${line}"></path>${marks}</svg>`,
    at: (i) => ({ x: pts[i].x, top: n1(pts[i].y - R), bottom: n1(pts[i].y + R) }),
  };
}

/** A bar per month. Its anchor is the bar's top edge, so a readout that flips
 *  below opens over the bar it describes rather than under the axis. */
export function bars({
  values = REVENUE, width = 260, height = 110, hot = -1, fluid = false,
  label = 'Revenue by month, last 12 months',
} = {}) {
  const hi = Math.max(...values);
  const slot = width / values.length;
  const bw = n1(slot * 0.62);
  const tops = values.map((v) => n1(height - (v / hi) * (height - 2)));
  const marks = values.map((v, i) => {
    const x = n1(i * slot + (slot - bw) / 2);
    return `<g ${markAttrs(values, i)}>`
      + `<rect class="ch-hit" x="${n1(i * slot)}" y="0" width="${n1(slot)}" height="${height}"></rect>`
      + `<rect class="ch-bar${i === hot ? ' is-on' : ''}" x="${x}" y="${tops[i]}" width="${bw}" height="${n1(height - tops[i])}" rx="2"></rect>`
      + `<rect class="ch-cap" data-tip-anchor x="${x}" y="${tops[i]}" width="${bw}" height="0"></rect>`
      + '</g>';
  }).join('');
  return {
    svg: `${svgOpen(`ch-chart${fluid ? ' ch-chart--fluid' : ''}`, width, height, label)}${marks}</svg>`,
    at: (i) => ({ x: n1(i * slot + slot / 2), top: tops[i], bottom: tops[i] }),
  };
}
