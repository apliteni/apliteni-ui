import { loadGuideline } from './_markdown.js';
const content = await loadGuideline('iconography.md', new URL('../../guidelines/iconography.md', import.meta.url));
export const TITLE = content.title;
export const BLURB = content.blurb;
export const RULES = content.rules;
// The shape of a rule: AGENTS.md#the-guidelines-collection

export const SPEC_CSS = `
  <style>
    .gl-stage--row { display: flex; align-items: center; gap: var(--space-3); flex-wrap: wrap; }
    /* The meaning pairs read as a table, so they get one. */
    .gl-mean { border-collapse: collapse; font-size: var(--text-sm); }
    .gl-mean td { padding: var(--space-2) var(--space-3); vertical-align: middle; }
    .gl-mean td:first-child { line-height: 0; }
    .gl-mean code { font-family: var(--font-mono); font-size: .9em; }
    .gl-mean .gl-mean__what { color: var(--text); }
  </style>`;
