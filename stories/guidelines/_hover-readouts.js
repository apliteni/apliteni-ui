import { loadGuideline } from './_markdown.js';
const content = await loadGuideline('hover-readouts.md', new URL('../../guidelines/hover-readouts.md', import.meta.url));
export const TITLE = content.title;
export const BLURB = content.blurb;
export const RULES = content.rules;
// The shape of a rule: AGENTS.md#the-guidelines-collection
import { CHART_CSS } from '../_chart.js';

// Every readout below is rendered open, at the anchor the wiring would have
// measured, so the gates can read it. The charts are fixed-size for the same
// reason: a readout placed in pixels has to sit on a chart drawn in pixels. The
// hosts carry no [data-tip-host], so the preview's wiring leaves the pictures be.
export const SPEC_CSS = `${CHART_CSS}
  <style>
    .gh-stack { display: flex; flex-direction: column; gap: var(--space-4); }
    .gh-figure { margin: var(--space-2) 0 var(--space-4); font: var(--weight-semibold) var(--text-xl)/1.2 var(--font-display);
      color: var(--strong); font-variant-numeric: tabular-nums; }
    /* The don't's readout is a line of ordinary card text, styled as the one it
       replaces would be — what is wrong with it is where it is. */
    .gh-inline { margin: var(--space-2) 0 0; font-size: var(--text-sm); color: var(--text);
      font-variant-numeric: tabular-nums; }
    .gh-room { padding-top: var(--space-16); }
    .gh-room--tall { padding-top: calc(var(--space-16) * 2); }
    /* A region that hides its overflow, the way a scrolling table or a clipped
       card body does, with less room above the tallest bar than a readout needs. */
    .gh-clip { overflow: hidden; border-radius: var(--radius-sm);
      box-shadow: inset 0 0 0 1px var(--border); padding: var(--space-8) var(--space-3) 0; }
  </style>`;
