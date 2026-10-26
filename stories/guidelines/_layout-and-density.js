import { loadGuideline } from './_markdown.js';
const content = await loadGuideline('layout-and-density.md', new URL('../../guidelines/layout-and-density.md', import.meta.url));
export const TITLE = content.title;
export const BLURB = content.blurb;
export const RULES = content.rules;
// The shape of a rule: AGENTS.md#the-guidelines-collection

// The specimens here are rows in a card, because density is a rhythm and a
// rhythm needs more than one row to be visible. `.gl-rows` is the do — every
// gap and pad a step of the spacing scale. `.gl-rows--hand` is the don't, and
// what is wrong with it is the numbers: 13, 9, 14, 6 and 17px, picked one at a
// time until each row looked right on its own. Nothing here is broken markup,
// and both halves clear axe and contrast.gate — the fault is rhythm, which is
// exactly what a picture can carry and a sentence cannot.
export const SPEC_CSS = `
  <style>
    .gl-rows { display: flex; flex-direction: column; gap: var(--space-3); }
    .gl-row { display: flex; align-items: center; justify-content: space-between;
      gap: var(--space-4); padding: var(--space-3) 0; }
    .gl-row + .gl-row { border-top: 1px solid var(--border); }
    .gl-row__k { color: var(--text); font-size: var(--text-sm); }
    .gl-row__v { color: var(--strong); font-size: var(--text-sm); font-weight: var(--weight-medium);
      font-variant-numeric: tabular-nums; }

    .gl-rows--hand { gap: 13px; }
    .gl-rows--hand .gl-row { padding: 9px 0; gap: 17px; }
    .gl-rows--hand .gl-row:nth-child(2) { padding: 14px 0; }
    .gl-rows--hand .gl-row:nth-child(3) { padding: 6px 0; }
    .gl-rows--hand .gl-row__k { font-size: 12.5px; }
    .gl-rows--hand .gl-row__v { font-size: 13.5px; }

    /* The width specimens. A page width cannot be photographed at life size in
       a 420px cell, so these are drawn to scale instead — the ratio is true,
       the pixels are not, and the caption says so. */
    .gl-scale { display: flex; flex-direction: column; gap: var(--space-3); }
    .gl-bar { display: flex; align-items: center; gap: var(--space-3); }
    .gl-bar__fill { height: 22px; border-radius: var(--radius-xs); flex: none;
      background: var(--surface-3); box-shadow: inset 0 0 0 1px var(--border); }
    .gl-bar__fill--tok { background: var(--glow-purple); box-shadow: inset 0 0 0 1px var(--accent); }
    .gl-bar__t { font: 500 11px/1 var(--font-mono); color: var(--text); white-space: nowrap; }
  </style>`;
