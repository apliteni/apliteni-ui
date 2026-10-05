import { loadGuideline, withSpecimens } from './_markdown.js';

const content = await loadGuideline('dense-tables.md', new URL('../../guidelines/dense-tables.md', import.meta.url));
export const TITLE = content.title;
export const BLURB = content.blurb;

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

const PAYOUTS = [['1162', '1,240.00'], ['1161', '860.00'], ['1160', '2,100.00']];

// One table, twice: the pair is the width and nothing else. Dense, because the base
// recipe leaves its last header flush with the table edge while its values keep a
// right inset — 16px apart, against this page's own rule on numeric alignment three
// rules above. Short references keep the two halves far apart at phone width.
const payouts = (stretch = false) => `<div class="gdt-stage ui-card ui-card--pad-sm${stretch ? '' : ' ui-card--fit'}">
  <table class="ui-table ui-table--dense ui-table--hover${stretch ? ' gdt-stretch' : ''}">
    <caption>Payouts · EUR</caption>
    <thead><tr><th>Reference</th><th class="ui-table__num">Amount</th></tr></thead>
    <tbody>${PAYOUTS.map(([reference, amount]) => `
      <tr><td>${reference}</td><td class="ui-table__num">${amount}</td></tr>`).join('')}
    </tbody>
  </table>
</div>`;

export const RULES = withSpecimens(content.rules, [
  { id: 'surface' },
  { id: 'density' },
  { id: 'numbers' },
  { id: 'delta' },
  { id: 'units' },
  { id: 'content-width', doHtml: () => payouts(), dontHtml: () => payouts(true) },
  { id: 'overflow' },
  { id: 'states' },
]);
