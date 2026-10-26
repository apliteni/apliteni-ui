import { loadGuideline } from './_markdown.js';
const content = await loadGuideline('destructive-actions.md', new URL('../../guidelines/destructive-actions.md', import.meta.url));
export const TITLE = content.title;
export const BLURB = content.blurb;
export const RULES = content.rules;
// The shape of a rule: AGENTS.md#the-guidelines-collection

// `.gl-hovering` pins the dropdown's danger row into its hover appearance,
// because hover cannot be screenshotted.
export const SPEC_CSS = `
  <style>
    /* The panel joins the flow, so the stage is as tall as what it shows. */
    .gl-stage--menu { display: flex; flex-direction: column; align-items: flex-start; }
    .gl-stage--menu .ui-dropdown { display: flex; flex-direction: column; align-items: flex-start; }
    .gl-stage--menu .ui-dropdown__panel { position: static; transform: none; margin-top: var(--space-2); }
    .gl-hovering .ui-dropdown__item.is-danger { background: var(--surface); }
    .gl-hovering--accent .ui-dropdown__item.is-danger .ui-dropdown__label { color: var(--accent); }
    .gl-hovering--pink   .ui-dropdown__item.is-danger .ui-dropdown__label { color: var(--pink); }
  </style>`;
