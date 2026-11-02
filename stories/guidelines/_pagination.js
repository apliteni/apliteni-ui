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
    /* The Next step that was just pressed: the page after 26 is 27. */
    .gp-stage .ui-pager__step[data-page="27"] { outline: var(--ring); outline-offset: var(--ring-offset); }
  </style>`;
