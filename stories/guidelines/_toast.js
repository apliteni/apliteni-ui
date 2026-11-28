import { loadGuideline } from './_markdown.js';
const content = await loadGuideline('toast.md', new URL('../../guidelines/toast.md', import.meta.url));
export const TITLE = content.title;
export const BLURB = content.blurb;
export const RULES = content.rules;
// The shape of a rule: AGENTS.md#the-guidelines-collection

// The bar's room sticks to the view's bottom on a page. In a picture it stays in the flow, and
// its top padding is the gap between the notice and the bar. The don't puts the notice and the
// room in one cell, and takes the room's layer off, so the notice stands on the bar as a stack
// with no inset does. The notice stands low enough that the bar shows under it.
export const SPEC_CSS = `
  <style>
    .gt-stage .ui-selection-room { position: static; }
    .gt-stage--over { display: grid; }
    .gt-stage--over > * { grid-area: 1 / 1; }
    .gt-stage--over > .ui-selection-room { z-index: auto; }
    .gt-stage--over > .ui-toast { align-self: end; justify-self: end; margin-bottom: var(--space-10); }
  </style>`;
