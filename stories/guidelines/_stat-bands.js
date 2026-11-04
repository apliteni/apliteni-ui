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
    /* The cards sit on the reading page itself: a grey ground under them is a block in a block (#768). */
    .gs-stage { min-width: 0; }
  </style>`;
