import { loadGuideline } from './_markdown.js';

const content = await loadGuideline('dense-tables.md', new URL('../../guidelines/dense-tables.md', import.meta.url));
export const TITLE = content.title;
export const BLURB = content.blurb;
export const RULES = content.rules;

export const SPEC_CSS = `<style>
  /* The card is the room the table has, and the subject of this pair is where the table
     stops inside it. It is also the surface this page's first rule asks for: outside a
     card --table-bg is the page's own ground, which leaves a dark table no surface. */
  .gdt-stage { min-width: 0; }
  /* The do half's card ends where its table does — the surface is the block, and a
     card holding the slack as white space is the shape this rule is against. The
     don't half keeps the column's full width, which is what it is showing. */
  /* The don't half draws the state the kit no longer produces by itself. It fills the
     bled box a dense table gets in a card — the same expression table.css caps it at —
     so both halves start and could end on the same edges. */
  .gdt-stretch { width: calc(100% + 2 * var(--space-3)); max-width: none; }
</style>`;
