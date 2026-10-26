import { loadGuideline } from './_markdown.js';
const content = await loadGuideline('dashboards-and-reports.md', new URL('../../guidelines/dashboards-and-reports.md', import.meta.url));
export const TITLE = content.title;
export const BLURB = content.blurb;
export const RULES = content.rules;
// The shape of a rule and the gates that walk this page: docs/components.md
import { CHART_CSS } from '../_chart.js';

// One made-up portal supplies every specimen, and the Finance report showcase
// prints the same payouts with the same fees and nets —
// react/src/dashboard-report-refs.test.tsx holds the two in step. The halves of a
// pair differ in one decision.
export const SPEC_CSS = `${CHART_CSS}
  <style>
    .gd-stage { display: flex; flex-direction: column; gap: var(--space-4); }
    /* The chart is a picture above a table, not the table's own head band: the
       scale's gap is what keeps the bar baselines off the header's cap height. */
    /* The dense table under it hangs out of the card by --space-3 so its columns
       start on the card's text edge; the chart takes the same bleed, so chart and
       table are one box rather than two of different widths. */
    .gd-chart { display: flex; flex-direction: column; gap: var(--space-2);
      width: calc(100% + 2 * var(--space-3)); margin-inline: calc(-1 * var(--space-3));
      margin-bottom: var(--space-4); }
    .gd-chart__months { display: flex; }
    .gd-chart__months span { flex: 1 1 0; min-width: 0; text-align: center; }
  </style>`;

// Reference, fees, net, status. A fifth column does not fit a specimen cell,
// so the gross stays here undrawn: it is what makes each net checkable, and
// the Finance report prints it in a column this cell has no room for.
// react/src/dashboard-report-refs.test.tsx reads it from this export and holds it
// against the report's, so the agreement is measured rather than asserted.
export const LEDGER = [
  ['PO-1162', '14,942.27', '489.44', '14,452.83', 'success', 'Paid'],
  ['PO-1163', '14,490.70', '574.19', '13,916.51', 'success', 'Paid'],
  ['PO-1164', '14,566.66', '483.97', '14,082.69', 'pending', 'In transit'],
  ['PO-1165', '39,054.98', '1,369.76', '37,685.22', 'success', 'Paid'],
  ['PO-1166', '14,969.33', '472.71', '14,496.62', 'danger', 'Failed'],
];
