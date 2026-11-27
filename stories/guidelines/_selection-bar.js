import { loadGuideline } from './_markdown.js';
const content = await loadGuideline('selection-bar.md', new URL('../../guidelines/selection-bar.md', import.meta.url));
export const TITLE = content.title;
export const BLURB = content.blurb;
export const RULES = content.rules;
// The shape of a rule: AGENTS.md#the-guidelines-collection

// The bar's room sticks to the view's bottom on a page. In a picture it stays in the flow.
// The don't paints the bar with the page's own surface, ink and edge. More's panel joins the
// flow, so the stage is as tall as what it shows. The Apply don't sets the button beside the list.
export const SPEC_CSS = `
  <style>
    .gl-stage--bar .ui-selection-room { position: static; }
    .gl-same-theme .ui-selection-bar {
      --inverse-bg: var(--surface); --inverse-text: var(--text); --inverse-strong: var(--text);
      --inverse-muted: var(--muted); --inverse-edge: var(--border); --inverse-hover: var(--surface-2);
      --inverse-frame: var(--border);
    }
    .gl-stage--menu .ui-dropdown { display: flex; flex-direction: column; align-items: flex-start; }
    .gl-stage--menu .ui-dropdown__panel { position: static; transform: none; margin-top: var(--space-2); }
    .gl-stage--apply { display: flex; flex-wrap: wrap; align-items: flex-start; gap: var(--space-2); }
  </style>`;
