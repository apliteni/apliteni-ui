import { loadGuideline } from './_markdown.js';
const content = await loadGuideline('state-set.md', new URL('../../guidelines/state-set.md', import.meta.url));
export const TITLE = content.title;
export const BLURB = content.blurb;
export const RULES = content.rules;
// The shape of a rule: AGENTS.md#the-guidelines-collection

// `.gl-ring` pins what :focus-visible paints (src/styles/base.css), because a
// focus band exists only under a live keyboard and cannot be screenshotted.
export const SPEC_CSS = `
  <style>
    .gl-row { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-3); }
    /* .ui-input is width:100%, which as a flex item claims the whole row and
       wraps the button off it. Let it take the slack instead. */
    .gl-row .ui-input { flex: 1 1 11rem; width: auto; min-width: 0; }
    .gl-stack { display: flex; flex-direction: column; align-items: stretch; gap: var(--space-4); }
    .gl-ring .ui-btn, .gl-ring .ui-input { outline: var(--ring); outline-offset: var(--ring-offset); }
    .gl-ring--adhoc .ui-input { outline: 2px solid var(--muted); outline-offset: 2px; }
  </style>`;
