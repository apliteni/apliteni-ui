import { loadGuideline } from './_markdown.js';
const content = await loadGuideline('spacing.md', new URL('../../guidelines/spacing.md', import.meta.url));
export const TITLE = content.title;
export const BLURB = content.blurb;
export const RULES = content.rules;
// The shape of a rule: AGENTS.md#the-guidelines-collection

// Layout glue only: each specimen places kit parts at the gap its rule names.
// The inner gap is --space-2, the group gap --space-8 and the phone gap --tap-gap. A
// don't adds a 20px step the rule does not allow, or floats a heading at the group gap. The view strip hangs its 16px of
// padding into the margin, so its first label sits on the column's text edge.
export const SPEC_CSS = `
  <style>
    .gl-sp { display: flex; flex-direction: column; min-width: 0; }
    .gl-sp > * + * { margin-top: var(--space-2); }
    .gl-sp > .gl-sp__next { margin-top: var(--space-8); }
    .gl-sp__row { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between;
      gap: var(--space-2); min-width: 0; }
    .gl-sp__row > .ui-seg--underline { margin-inline-start: calc(-1 * var(--space-4)); }
    .gl-sp--third .gl-sp__next + .gl-sp__next { margin-top: var(--space-5); }
    .gl-sp--phone .gl-sp__row { row-gap: var(--tap-gap, var(--space-5)); }
    .gl-sp--phone .ui-filter-bar { row-gap: var(--tap-gap, var(--space-5)); }
    .gl-sp--phone > * + * { margin-top: var(--tap-gap, var(--space-5)); }
    .gl-sp--phone-dont > * + * { margin-top: var(--space-2); }
    .gl-sp__indent { margin-inline-start: var(--space-4); }
    @media (max-width: 560px) and (pointer: coarse) {
      .gl-sp__row { row-gap: var(--tap-gap, var(--space-5)); }
      .gl-sp__row + .ui-table-scroll { margin-top: var(--tap-gap, var(--space-5)); }
    }
  </style>`;
