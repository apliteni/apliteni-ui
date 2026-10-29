import { loadGuideline } from './_markdown.js';
const content = await loadGuideline('button-labels.md', new URL('../../guidelines/button-labels.md', import.meta.url));
export const TITLE = content.title;
export const BLURB = content.blurb;
export const RULES = content.rules;
// The shape of a rule: AGENTS.md#the-guidelines-collection

export const SPEC_CSS = `
  <style>
    .gl-stage--row { display: flex; align-items: center; gap: var(--space-3); flex-wrap: wrap; }
    .gl-clause { display: flex; flex-direction: column; gap: var(--space-3); }
  </style>`;
