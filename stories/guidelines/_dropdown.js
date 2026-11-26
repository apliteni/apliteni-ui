import { loadGuideline } from './_markdown.js';
const content = await loadGuideline('dropdown.md', new URL('../../guidelines/dropdown.md', import.meta.url));
export const TITLE = content.title;
export const BLURB = content.blurb;
export const RULES = content.rules;
// The shape of a rule: AGENTS.md#the-guidelines-collection

// The panel joins the flow, so the stage is as tall as what it shows. The don't paints
// the group label in an option's normal weight and body ink. Main drew it medium.
export const SPEC_CSS = `
  <style>
    .gl-stage--menu { display: flex; flex-direction: column; align-items: flex-start; }
    .gl-stage--menu .ui-dropdown { display: flex; flex-direction: column; align-items: flex-start; }
    .gl-stage--menu .ui-dropdown__panel { position: static; transform: none; margin-top: var(--space-2); }
    .gl-flat-group .ui-dropdown__group { font-weight: var(--weight-normal); color: var(--text); }
  </style>`;
