import { loadGuideline } from './_markdown.js';
const content = await loadGuideline('pagination.md', new URL('../../guidelines/pagination.md', import.meta.url));
export const TITLE = content.title;
export const BLURB = content.blurb;
export const RULES = content.rules;
// The shape of a rule: AGENTS.md#the-guidelines-collection

// The specimens are pagers, and a pager is a strip rather than a box — so the
// stage here is only a surface to sit them on. Two things it does have to do:
// hold the two halves of a pair at the same width, so a difference in control
// count reads as a difference rather than as a different size of picture, and
// leave the wrapping alone. --panel-md is 420px and every specimen below wraps
// at it, which is the width a pager meets inside a card on a laptop.
export const SPEC_CSS = `
  <style>
    .gp-stage { background: var(--surface); border-radius: var(--radius-lg);
      box-shadow: inset 0 0 0 1px var(--border); padding: var(--space-4) var(--space-5); }
    /* The hand-built don'ts below are rows of kit buttons, so they need the one
       thing .ui-pager would have given them: a row. Nothing else is styled — what
       is wrong with them is what they leave out, and a don't dressed differently
       from its do would read as a styling argument. */
    .gp-hand { display: flex; flex-wrap: wrap; align-items: center;
      gap: var(--space-3) var(--space-4); font-size: var(--text-sm); }
    .gp-hand__status { margin: 0 auto 0 0; color: var(--text);
      font-variant-numeric: tabular-nums; }
    .gp-hand__steps { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-1); }
  </style>`;
