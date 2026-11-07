import { loadGuideline } from './_markdown.js';
const content = await loadGuideline('motion.md', new URL('../../guidelines/motion.md', import.meta.url));
export const TITLE = content.title;
export const BLURB = content.blurb;
// The shape of a rule: AGENTS.md#the-guidelines-collection
//
// Each pair is a row of still frames of the kit's own drawer, or the values a
// motion is written with. No picture on this page moves.

export const RULES = content.rules;

// Layout glue only: the frames are kit stages, and the drawer in them is the kit's.
export const SPEC_CSS = `
  <style>
    .gm-film { display: flex; flex-direction: column; gap: var(--space-2); }
    .gm-film > p + .gl-stage { margin-bottom: var(--space-2); }
    .gm-frame { position: relative; height: 296px; overflow: hidden; padding: var(--space-4); }
    .gm-frame .ui-drawer { position: absolute; }
    .gm-frame .ui-drawer__panel { width: 70%; }
    /* Half of --dur-med: --ease has covered 78% of the travel, so 22% of the
       panel's 70% is still past the edge, and the scrim is at 78% of its fade. */
    .gm-frame--half .ui-drawer__panel { right: -15.4%; }
    .gm-frame--half .ui-drawer.is-open .ui-drawer__scrim { opacity: 0.78; }
  </style>`;
