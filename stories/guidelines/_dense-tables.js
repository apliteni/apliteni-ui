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
  /* The don't half of the long chips draws the chip with no cap, which the kit no longer does. */
  .gdt-uncapped .ui-filter-bar { --ui-filter-chip-max: none; }
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
  /* A card that ends where its table does sets the column, and the filter bar above it
     takes that width, so the bar and the card share their right edge. The bar asks
     for 12rem, a field and a chip, and a card narrower than that, such as a skeleton,
     widens to it. The note asks for no width. The don't half of the content width
     keeps the full column. */
  .gdt-filtered:has(> .ui-card--fit) { grid-template-columns: fit-content(100%); }
  .gdt-filtered:has(> .ui-card--fit) > .ui-toolbar { width: min-content; min-width: max(100%, 12rem); }
  .gdt-filtered:has(> .ui-card--fit) > .ui-card--fit { width: auto; }
  .gdt-filtered:has(> .ui-card--fit) > .gl-cursor { contain: inline-size; }
  /* Paint below draws a state the kit cannot hold at rest. Each rule is scoped to one
     specimen class and uses kit tokens only. */
  /* Hover needs a pointer. The do half holds row 1161 in the kit's hover fill, with its
     rounded ends and the row lines it drops. */
  .gdt-held .gdt-hovering > td { background: var(--surface-2); border-bottom-color: transparent; }
  .gdt-held .gdt-hovering > td:first-child { border-radius: var(--radius-sm) 0 0 var(--radius-sm); }
  .gdt-held .gdt-hovering > td:last-child { border-radius: 0 var(--radius-sm) var(--radius-sm) 0; }
  .gdt-held tr:has(+ .gdt-hovering) > td { border-bottom-color: transparent; }
  /* The kit removed the grey stripe from every table. The don't half paints it back. */
  .gdt-zebra tbody tr:nth-child(even) > td { background: var(--surface-2); }
  /* The don't half shrinks the type one rank, to the kit's unit size. */
  .gdt-shrunk .ui-table :is(th, td) { font-size: var(--text-xs); }
  /* The kit aligns every cell to the top. The don't half centres them again. */
  .gdt-middle .ui-table :is(th, td) { vertical-align: middle; }
  /* The don't half fades the units that the rule keeps in body ink. */
  .gdt-muted .ui-value__unit { /* muted-ink: chrome — the don't half draws the faded unit this rule refuses */ color: var(--muted); }
</style>`;
