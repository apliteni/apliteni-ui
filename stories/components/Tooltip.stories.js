import { tooltip } from '../../src/components/tooltip.js';
import { card } from '../../src/components/index.js';
import { pad, row, specimen } from '../_gallery.js';
import { CHART_CSS, EXPENSES, NET, REVENUE, bars, eur, pointOf, sparkline } from '../_chart.js';

// The readout over two kinds of chart. Chart is wired by the preview's
// decorator, so every point and bar there answers a real pointer; the other two
// are rendered with the readout already open, which is what the a11y and
// contrast gates can see. Their hosts leave off [data-tip-host], so no wiring
// reaches them and a passing pointer cannot take the readout down.

const HOT = 10;
const host = (inner) => `<div class="ui-tip-host" data-tip-host>${inner}</div>`;
const picture = (inner) => `<div class="ui-tip-host" style="width: max-content">${inner}</div>`;

const STORY_CSS = `
  <style>
    .tt-page { display: flex; flex-direction: column; gap: var(--space-5); max-width: var(--container); }
    .tt-kpis { display: grid; gap: var(--space-5);
      grid-template-columns: repeat(auto-fit, minmax(min(var(--panel-sm), 100%), 1fr)); }
    .tt-figure { margin: var(--space-2) 0 var(--space-4); font: var(--weight-semibold) var(--text-xl)/1.2 var(--font-display);
      color: var(--strong); font-variant-numeric: tabular-nums; }
    .tt-note { margin: 0; font-size: var(--text-sm); color: var(--muted); max-width: var(--prose-body); }
    .tt-room { padding-top: calc(var(--space-16) + var(--space-4)); }
    .tt-clip { overflow: hidden; border-radius: var(--radius-sm); box-shadow: inset 0 0 0 1px var(--border); padding: 0 var(--space-8); }
  </style>`;

export default {
  title: 'Components/Tooltip',
  parameters: { layout: 'fullscreen' },
  argTypes: {
    label: { control: 'text' },
    value: { control: 'text' },
    detail: { control: 'text' },
    placement: { control: 'inline-radio', options: ['top', 'bottom'] },
  },
  args: { ...pointOf(REVENUE, HOT), placement: 'top' },
  render: (a) => {
    const chart = bars({ hot: HOT });
    const p = chart.at(HOT);
    return pad(`${CHART_CSS}${STORY_CSS}<div class="tt-room">${picture(
      chart.svg + tooltip({ ...a, open: true, x: p.x, y: p.top }),
    )}</div>`);
  },
};

export const Playground = {};

const kpi = (title, values) => card({
  title,
  sub: 'Last 12 months',
  body: `<p class="tt-figure">${eur(values[values.length - 1])}</p>`
    + host(sparkline({ values, fluid: true, label: `${title}, last 12 months` }).svg + tooltip()),
});

// The case #282 was reported against: KPI cards with sparklines above a bar
// chart. Hover any point or bar — the readout opens over the page, and the card
// under the charts stays exactly where it was.
export const Chart = {
  render: () => pad(`${CHART_CSS}${STORY_CSS}
    <div class="tt-page">
      <div class="tt-kpis">${kpi('Revenue', REVENUE)}${kpi('Expenses', EXPENSES)}${kpi('Net', NET)}</div>
      ${card({
    title: 'Revenue by month',
    sub: 'Hover a bar. The first and last slide inward rather than leave the card.',
    body: host(bars({ fluid: true, width: 720, height: 200 }).svg + tooltip()),
  })}
      ${card({
    title: 'Below the charts',
    body: '<p class="tt-note">This card does not move when a readout opens above it. Nothing on the page does.</p>',
  })}
    </div>`),
};

// The two sides, rendered open. Below is what the wiring picks when the side
// above would be clipped — here by a box that hides its overflow, with the
// tallest bar against its top edge.
export const Placement = {
  render: () => {
    const up = bars({ hot: HOT });
    const down = bars({ hot: HOT });
    const pu = up.at(HOT);
    const pd = down.at(HOT);
    // A wrapping row, not a two-column grid: each chart is drawn in fixed
    // pixels, so at a phone width the two have to stack rather than overlap.
    return pad(`${CHART_CSS}${STORY_CSS}${row(
      specimen('Above the mark — the default', `<div class="tt-room">${picture(
        up.svg + tooltip({ ...pointOf(REVENUE, HOT), open: true, x: pu.x, y: pu.top }),
      )}</div>`),
      specimen('Below — where above is clipped', `<div class="tt-room"><div class="tt-clip">${picture(
        down.svg + tooltip({ ...pointOf(REVENUE, HOT), open: true, placement: 'bottom', x: pd.x, y: pd.bottom }),
      )}</div></div>`),
    )}`);
  },
};
