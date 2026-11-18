import { loadGuideline } from './_markdown.js';
const content = await loadGuideline('notifications.md', new URL('../../guidelines/notifications.md', import.meta.url));
export const TITLE = content.title;
export const BLURB = content.blurb;
export const RULES = content.rules;
// The shape of a rule: AGENTS.md#the-guidelines-collection

export const SPEC_CSS = `
  <style>
    /* The panel joins the flow, so the stage is as tall as what it shows. */
    .gl-stage--menu { display: flex; flex-direction: column; align-items: flex-start; }
    .gl-stage--menu .ui-dropdown { display: flex; flex-direction: column; align-items: flex-start; }
    .gl-stage--menu .ui-dropdown__panel { position: static; transform: none; margin-top: var(--space-2); }
    /* The count sits beside the bell, so the trigger needs no layer of its own. */
    .gn-bell { display: inline-flex; align-items: center; gap: var(--space-1); }
  </style>`;
