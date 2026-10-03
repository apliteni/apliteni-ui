// Chart arithmetic, shared by the React Chart and by anything that draws the
// same shapes without it. No DOM, no pixels: a scale and a walk, both pure.
// why: docs/specification.md#react-charts

/** The steps a whole-unit axis may take, per decade, smallest first. 2.5 is
 *  among them — 25000 is a whole step and the one that turns a four-tick axis
 *  into four ticks — but it is taken only where it lands on a whole number, so
 *  nothing below the units decade can put 2.5 on an axis. */
const STEPS = [1, 2, 2.5, 5, 10];

/** The smallest band a series is drawn in, as a share of its own reach. Below
 *  this, a series that barely moves would be stretched into a cliff. */
export const CHART_FLOOR = 0.25;

const round = (n) => Math.round(n * 1e6) / 1e6;

/** The smallest nice step at or above `raw` that is a whole unit. */
function niceStep(raw) {
  if (!(raw > 0)) return 1;
  const decade = 10 ** Math.floor(Math.log10(raw));
  for (const s of STEPS) {
    const step = round(s * decade);
    if (step >= raw - 1e-9 && step >= 1 && Number.isInteger(step)) return step;
  }
  return Math.max(1, Math.ceil(raw));
}

/**
 * The band a series is drawn in, and the ticks written beside it.
 *
 * @param {Iterable<number>} values every number that has to fit
 * @param {object} [options]
 * @param {number} [options.ticks] how many steps to aim for
 * @param {boolean} [options.zero] keep the zero line inside the band — true for
 *   bars, which are read from zero, false for a line read against itself
 * @param {number} [options.floor] the smallest band, as a share of the series'
 *   own reach; `CHART_FLOOR` for a sparkline
 * @param {boolean} [options.nice] round the band out to whole steps and return
 *   them; false for a chart with no axis
 * @returns {{min: number, max: number, step: number, ticks: number[]}}
 */
export function chartScale(values, { ticks = 4, zero = true, floor = 0, nice = true } = {}) {
  const finite = [...values].filter((v) => Number.isFinite(v));
  if (finite.length === 0) return { min: 0, max: 1, step: 1, ticks: [0, 1] };

  let min = Math.min(...finite);
  let max = Math.max(...finite);
  if (zero) { min = Math.min(min, 0); max = Math.max(max, 0); }

  const reach = Math.max(Math.abs(min), Math.abs(max)) || 1;
  const want = reach * floor;
  if (max - min < want) {
    const pad = (want - (max - min)) / 2;
    min -= pad;
    max += pad;
    if (zero) { min = Math.min(min, 0); max = Math.max(max, 0); }
  }
  if (min === max) { min -= 0.5; max += 0.5; }

  if (!nice) return { min: round(min), max: round(max), step: 0, ticks: [] };

  const step = niceStep((max - min) / Math.max(ticks, 1));
  min = Math.floor(round(min / step)) * step;
  max = Math.ceil(round(max / step)) * step;
  const out = [];
  for (let t = min; t <= max + 1e-9; t += step) out.push(round(t));
  return { min: round(min), max: round(max), step, ticks: out };
}

/**
 * One period walked from a starting total through its components to a result.
 *
 * The first step is a total unless it says otherwise; every later step is a
 * component added to the running total. A step marked `total` with no value of
 * its own takes the running total, which is how the closing column is written
 * without repeating a sum the caller already gave piece by piece.
 *
 * @param {Iterable<{label: string, value?: number, kind?: 'total'|'change'}>} steps
 * @returns {Array<{label: string, kind: 'total'|'change', value: number, from: number, to: number}>}
 *   each column's own amount and the two ends of the bar that draws it
 */
export function bridgeWalk(steps) {
  let running = 0;
  return [...steps].map((step, index) => {
    const kind = step.kind || (index === 0 ? 'total' : 'change');
    if (kind === 'total') {
      const value = Number.isFinite(step.value) ? step.value : running;
      running = value;
      return { ...step, kind, value: round(value), from: 0, to: round(value) };
    }
    const value = Number.isFinite(step.value) ? step.value : 0;
    const from = running;
    running += value;
    return { ...step, kind, value: round(value), from: round(from), to: round(running) };
  });
}
