import { loadGuideline } from './_markdown.js';
const content = await loadGuideline('state-set.md', new URL('../../guidelines/state-set.md', import.meta.url));
export const TITLE = content.title;
export const BLURB = content.blurb;
export const RULES = content.rules;
// The shape of a rule: AGENTS.md#the-guidelines-collection

export const SPEC_CSS = `
  <style>
    .gl-row { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-3); }
    .gl-stack { display: flex; flex-direction: column; align-items: stretch; gap: var(--space-4); }
  </style>`;
