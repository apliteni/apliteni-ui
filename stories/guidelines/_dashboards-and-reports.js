import { loadGuideline } from './_markdown.js';
const content = await loadGuideline('dashboards-and-reports.md', new URL('../../guidelines/dashboards-and-reports.md', import.meta.url));
export const TITLE = content.title;
export const BLURB = content.blurb;
export const RULES = content.rules;
// The shape of a rule and the gates that walk this page: docs/components.md

// One made-up portal supplies every specimen, and the Finance report showcase
// prints the same payouts with the same fees and nets —
// react/src/dashboard-report-refs.test.tsx holds the two in step. The halves of a
// pair differ in one decision.
export const SPEC_CSS = `
  <style>
    .gd-stage { display: flex; flex-direction: column; gap: var(--space-4); }
    /* One screen of a dashboard: the height is the Do's own blocks at 1280. The
       Don't's extra blocks run past that fold and are cut there. A phone stacks the
       Do's blocks taller than the fold, so the Do grows instead of being cut. */
    .gd-screen { display: flex; flex-direction: column; align-items: flex-start; gap: var(--space-4);
      min-height: 52rem; padding: var(--space-4); background: var(--bg);
      border: 1px solid var(--border); border-radius: var(--radius-lg); }
    .gd-screen--fold { height: 52rem; overflow: hidden; }
    .gd-screen > :not(.ui-seg) { align-self: stretch; }
  </style>`;

// Made-up monthly spend for the made-up portal, in thousands of euros.
export const SPEND = [18.2, 19.4, 21.1, 20.3, 22.8, 23.6];
export const ESTIMATED = [17.5, 17.8, 18.1, 18.4, 18.7, 19.0];

// Three columns fit a specimen cell at 390, so a table draws reference and net
// with either the status or the fees. The gross stays here undrawn. The Finance
// report prints every column.
// react/src/dashboard-report-refs.test.tsx reads it from this export and holds it
// against the report's, so the agreement is measured rather than asserted.
export const LEDGER = [
  ['PO-1162', '14,942.27', '489.44', '14,452.83', 'success', 'Paid'],
  ['PO-1163', '14,490.70', '574.19', '13,916.51', 'success', 'Paid'],
  ['PO-1164', '14,566.66', '483.97', '14,082.69', 'pending', 'In transit'],
  ['PO-1165', '39,054.98', '1,369.76', '37,685.22', 'success', 'Paid'],
  ['PO-1166', '14,969.33', '472.71', '14,496.62', 'danger', 'Failed'],
];
