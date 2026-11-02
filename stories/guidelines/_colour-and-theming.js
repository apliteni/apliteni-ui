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

    .gl-stage > .gl-cursor { display: flex; }
    /* The dark Nebula ground the accent pair is measured on, whatever the page theme. */
    .gl-pin { display: flex; padding: var(--space-3); margin-bottom: var(--space-3); border-radius: var(--radius-sm); }
    /* The swatch takes a button's height: one tight line, 9px padding and a 1px edge each side. */
    .gl-swatch { display: block; width: 120px; height: calc(var(--text-sm) * var(--leading-tight) + 20px); border-radius: var(--radius-sm); background: var(--accent); }
    /* The Do draws the button's paint, not a focusable control: the kit ring follows the page theme, not the pin. */
    .gl-swatch--strong { display: grid; place-items: center; background: var(--accent-strong); color: var(--accent-contrast); font-size: var(--text-sm); font-weight: var(--weight-medium); }

    /* Four theme cells. Their literal grounds and inks are the subject. */
    .gl-themes { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-3); }
    .gl-theme { display: flex; flex-direction: column; align-items: flex-start; gap: var(--space-2);
      padding: var(--space-3); border-radius: var(--radius-sm); box-shadow: inset 0 0 0 1px var(--border-strong);
      font-size: var(--text-sm); }
    .gl-theme__t { font-weight: var(--weight-medium); }
    .gl-theme__btn { padding: var(--space-1) var(--space-3); border-radius: var(--radius-xs); font-weight: var(--weight-medium); }
    .gl-theme__on { font-weight: var(--weight-semibold); }

    /* The grey fills: a track and a divider carry no words, the don't's box and chip do. */
    .gl-tracks { display: flex; align-items: center; gap: var(--space-4); margin-top: var(--space-4); }
    .gl-track { width: 120px; height: 8px; border-radius: var(--radius-pill); background: var(--surface-3); }
    .gl-divider { flex: 1; border: 0; border-top: 1px solid var(--border); margin: 0; }
    .ui-input.gl-grey { background: var(--surface-3); border-color: transparent; }
    .gl-chip { padding: var(--space-1) var(--space-2); border-radius: var(--radius-xs); background: var(--surface-3);
      color: var(--text); font-size: var(--text-xs); font-weight: var(--weight-medium); }

    /* High Contrast Black: Canvas #000, CanvasText #fff, Highlight #1aebff, HighlightText #000. */
    .gl-hc { display: flex; flex-direction: column; gap: var(--space-1); padding: var(--space-3);
      border-radius: var(--radius-sm); background: #000; color: #fff; font-size: var(--text-sm); }
    .gl-hc__row { padding: var(--space-2) var(--space-3); border-radius: var(--radius-xs); }
    .gl-hc__row.is-fill { background: #1aebff; color: #000; }
    .gl-hc__row.is-outline, .gl-hc__row.is-focus { outline: 2px solid #fff; outline-offset: 2px; }
  </style>`;
