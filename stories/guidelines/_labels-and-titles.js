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
    .gl-rank--muted h3, .gl-rank--muted p { /* muted-ink: chrome — the don't half sets the muted ranks the rule forbids */ color: var(--muted); }
  </style>`;
