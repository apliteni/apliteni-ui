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
  </style>`;
