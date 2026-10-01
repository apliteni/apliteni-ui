import { loadGuideline, withSpecimens } from './_markdown.js';

const content = await loadGuideline('dense-tables.md', new URL('../../guidelines/dense-tables.md', import.meta.url));
export const TITLE = content.title;
export const BLURB = content.blurb;

export const SPEC_CSS = `<style>
  /* The hairline is the room the table has, and the subject of this pair is where
     the table stops inside it. A ground tinted instead of outlined shows nothing in
     dark mode, where a table paints the page's own colour. */
  .gdt-stage { min-width: 0; padding: var(--space-4); border-radius: var(--radius-lg);
    box-shadow: inset 0 0 0 1px var(--border); }
  /* The don't half draws the state the kit no longer produces by itself. */
  .gdt-stretch { width: 100%; max-width: none; }
</style>`;

const PAYOUTS = [['Payout 1162', '1,240.00'], ['Payout 1161', '860.00'], ['Payout 1160', '2,100.00']];

// One table, twice: the pair is the width and nothing else.
const payouts = (stretch = false) => `<div class="gdt-stage">
  <table class="ui-table ui-table--hover${stretch ? ' gdt-stretch' : ''}">
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
  { id: 'width', doHtml: () => payouts(), dontHtml: () => payouts(true) },
  { id: 'overflow' },
  { id: 'states' },
]);
