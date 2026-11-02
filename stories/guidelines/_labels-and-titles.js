import { loadGuideline } from './_markdown.js';
const content = await loadGuideline('labels-and-titles.md', new URL('../../guidelines/labels-and-titles.md', import.meta.url));
export const TITLE = content.title;
export const BLURB = content.blurb;
export const RULES = content.rules;
// The shape of a rule: AGENTS.md#the-guidelines-collection

export const SPEC_CSS = `
  <style>
    /* Body ink at three ranks: size and weight carry the order. */
    .gl-rank h3 { font: 600 var(--text-lg)/1.3 var(--font-display); color: var(--strong); margin-bottom: var(--space-2); }
    .gl-rank p { font-size: var(--text-base); line-height: 1.55; color: var(--text); }
    .gl-rank .gl-rank__s { font-size: var(--text-sm); margin-top: var(--space-2); }
    /* Muted rank as lines, so the page sets no words in the ink the rule forbids. */
    .gl-faded { display: flex; flex-direction: column; gap: var(--space-2); }
    .gl-faded span { height: 10px; width: 92%; border-radius: var(--radius-xs); background: var(--muted); }
    .gl-faded .gl-faded__h { height: 18px; width: 45%; margin-bottom: var(--space-1); }
    .gl-faded .gl-faded__s { width: 30%; }
    /* An axis: tick labels are one of the four muted classes. */
    .gl-axis { display: flex; justify-content: space-between; margin-top: var(--space-4);
      padding-top: var(--space-2); box-shadow: inset 0 1px var(--border-strong);
      font: 500 var(--text-xs)/1 var(--font-sans); font-variant-numeric: tabular-nums;
      color: var(--muted); /* muted-ink: chrome — chart axis ticks */ }
    /* A record row whose timestamp, count and action are faded. */
    .gl-row { display: flex; flex-wrap: wrap; align-items: baseline; gap: var(--space-2) var(--space-4);
      font-size: var(--text-sm); color: var(--text); }
    .gl-row > * { white-space: nowrap; }
    .gl-row > :first-child { flex: 1; font-weight: 500; color: var(--strong); }
    .gl-row .gl-row__dim { color: var(--muted); }
  </style>`;
