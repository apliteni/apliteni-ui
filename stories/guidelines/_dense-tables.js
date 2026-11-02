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
  /* The filter bar's card sits above the table's card, at the gap the shell keeps
     between two cards. */
  .gdt-filtered { display: grid; gap: var(--space-5); align-content: start; }
  /* The two cards are one unit of the table's width: the bar's card adds no width of
     its own and fills the unit. A stretched table keeps the full column. */
  .gdt-unit { width: fit-content; max-width: 100%; }
  .gdt-unit > :not(:last-child) { contain: inline-size; }
  /* The don't half's hovered row, held still: a fill with rounded ends. The do half
     holds no hover, so only its row lines show. */
  .gdt-hovered > td { background: var(--surface-2); }
  .gdt-hovered > td:first-child { border-start-start-radius: var(--radius-sm); border-end-start-radius: var(--radius-sm); }
  .gdt-hovered > td:last-child { border-start-end-radius: var(--radius-sm); border-end-end-radius: var(--radius-sm); }
  /* The don'ts draw what the kit refuses: a tinted table with grey stripes, type below
     the small rank, figures on the label edge, muted units, squeezed columns. */
  .gdt-grey { --table-bg: var(--surface-2); }
  .gdt-grey tbody tr:nth-child(even) > td { background: var(--surface-3); }
  .gdt-grey .gdt-hovered > td { background: var(--border); }
  .gdt-shrunk :is(th, td) { font-size: var(--text-xs); }
  .ui-table.gdt-left :is(th, td).ui-table__num { text-align: left; font-variant-numeric: proportional-nums; }
  .gdt-muted-units .ui-value__unit { /* muted-ink: chrome — the don't half draws the muted unit the rule forbids */ color: var(--muted); }
  .gdt-squeezed { table-layout: fixed; }
  .gdt-squeezed :is(th, td) { white-space: normal; overflow-wrap: anywhere; }
  .gdt-note { margin: var(--space-3) 0 0; font-size: var(--text-sm); color: var(--text); }
  .gdt-flex { display: flex; gap: var(--space-2); align-items: center; }
  /* The phone frame above the page's own width: a cell has no room for both on one line. */
  .gdt-widths { display: grid; gap: var(--space-4); justify-items: start; }
  .gdt-widths > .gdt-stage { justify-self: stretch; }
</style>`;
