import { loadGuideline } from './_markdown.js';
const content = await loadGuideline('stat-bands.md', new URL('../../guidelines/stat-bands.md', import.meta.url));
export const TITLE = content.title;
export const BLURB = content.blurb;
export const RULES = content.rules;
// The shape of a rule: AGENTS.md#the-guidelines-collection

// Every specimen is figures from the finance portal's Company Overview, so the
// halves of a pair differ in one decision and not in their data.
export const SPEC_CSS = `
  <style>
    .gs-stage { background: var(--bg); border-radius: var(--radius-lg); padding: var(--space-4); }
  </style>`;
