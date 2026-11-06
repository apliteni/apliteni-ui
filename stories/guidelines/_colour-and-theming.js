import { loadGuideline } from './_markdown.js';
const content = await loadGuideline('colour-and-theming.md', new URL('../../guidelines/colour-and-theming.md', import.meta.url));
export const TITLE = content.title;
export const BLURB = content.blurb;
export const RULES = content.rules;
// The shape of a rule: AGENTS.md#the-guidelines-collection

// The frozen hexes below are the specimen's subject, not a slip: `.gl-literal`
// writes out what the dark theme composites, so the pair is one picture in dark
// and the flip to light is what separates them. stories/colour-tokens.test.js
// scans src/styles only, so it never sees them.
export const SPEC_CSS = `
  <style>
    .gl-literal .ui-callout { background: #22394a; color: #c6c2d6; }
    .gl-literal .ui-callout__icon { color: #20dcf5; }
    .gl-drift { --pink: var(--accent); }
    .gl-grey .ui-input { background: var(--surface-2); border-color: transparent; }
    /* Windows High Contrast, written out: JSDOM's own system colours are not the ones
       a browser paints. Dark shows High Contrast Black (canvas #000, text #fff,
       highlight #1aebff, highlight text #000). Light shows High Contrast White
       (canvas #fff, text #000, highlight #37006e, highlight text #fff), because the
       ring walk measures the light theme's ring on this canvas. */
    .gl-forced { background: #000; color: #fff; padding: var(--space-3); }
    .gl-forced .ui-seg { background: #000; border-color: #fff; }
    .gl-forced .ui-seg button { background: #000; color: #fff; }
    .gl-forced--fill .ui-seg button[aria-pressed="true"] { background: #1aebff; color: #000; box-shadow: 0 0 0 2px #fff; }
    .gl-forced--outline .ui-seg button[aria-pressed="true"] { outline: 2px solid #1aebff; }
    [data-theme="light"] .gl-forced { background: #fff; color: #000; }
    [data-theme="light"] .gl-forced .ui-seg { background: #fff; border-color: #000; }
    [data-theme="light"] .gl-forced .ui-seg button { background: #fff; color: #000; }
    [data-theme="light"] .gl-forced--fill .ui-seg button[aria-pressed="true"] { background: #37006e; color: #fff; box-shadow: 0 0 0 2px #000; }
    [data-theme="light"] .gl-forced--outline .ui-seg button[aria-pressed="true"] { outline-color: #37006e; }
  </style>`;
