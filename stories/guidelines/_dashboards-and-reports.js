import { loadGuideline } from './_markdown.js';
const content = await loadGuideline('dashboards-and-reports.md', new URL('../../guidelines/dashboards-and-reports.md', import.meta.url));
export const TITLE = content.title;
export const BLURB = content.blurb;
export const RULES = content.rules;
// The shape of a rule and the gates that walk this page: docs/components.md

// One made-up portal supplies every specimen, and the Report showcase
// prints the same sales with the same fees and nets —
// react/src/dashboard-report-refs.test.tsx holds the two in step. The halves of a
// pair differ in one decision.
export const SPEC_CSS = `
  <style>
    .gd-stage { display: flex; flex-direction: column; gap: var(--space-4); }
    /* The Don't of "Switch a chart to its table" stacks the chart above the
       table, so the chart keeps one step of room before the table's header. */
    .gd-chart { margin-bottom: var(--space-4); }
    /* A block's title and its Chart and Table switch share one row, at phone
       width too: the title takes what the switch leaves and wraps, and baseline
       alignment keeps its first line on the switch's text. The margin is the
       title's own step, kept below a switch taller than the title. */
    .gd-block-head { display: flex; align-items: baseline; column-gap: var(--space-4);
      margin-bottom: var(--space-2); }
    .gd-block-head > :first-child { flex: 1 1 0; min-width: 0; }
    /* The Don't removes the tiles' soft edge, so three figures run together. */
    :root[data-theme="light"] .gd-no-lines .ui-stats--tiles .ui-card:not(.ui-card--pad-lg):not(.ui-card--accent):not(.ui-card--live) { border-color: transparent; }
  </style>`;

// Made-up monthly spend for the made-up portal, in thousands of euros.
export const SPEND = [18.2, 19.4, 21.1, 20.3, 22.8, 23.6];
export const ESTIMATED = [17.5, 17.8, 18.1, 18.4, 18.7, 19.0];

// Reference, fees, net, status. A fifth column does not fit a specimen cell,
// so the gross stays here undrawn: it is what makes each net checkable, and
// the Report prints it in a column this cell has no room for.
// react/src/dashboard-report-refs.test.tsx reads it from this export and holds it
// against the report's, so the agreement is measured rather than asserted.
export const LEDGER = [
  ['SAL-1042', '14,942.27', '489.44', '14,452.83', 'success', 'Paid'],
  ['SAL-1043', '14,490.70', '574.19', '13,916.51', 'success', 'Paid'],
  ['SAL-1044', '14,566.66', '483.97', '14,082.69', 'pending', 'Pending'],
  ['SAL-1045', '39,054.98', '1,369.76', '37,685.22', 'success', 'Paid'],
  ['SAL-1046', '14,969.33', '472.71', '14,496.62', 'danger', 'Failed'],
];
