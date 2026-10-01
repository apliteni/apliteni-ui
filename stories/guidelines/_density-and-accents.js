import { loadGuideline, withSpecimens } from './_markdown.js';
import { badge, button } from '../../src/components/index.js';
import { statBand } from '../../src/components/stat.js';
import { drawerSection } from '../../src/components/drawer.js';

const content = await loadGuideline('density-and-accents.md', new URL('../../guidelines/density-and-accents.md', import.meta.url));
export const TITLE = content.title;
export const BLURB = content.blurb;

export const SPEC_CSS = `<style>
  .gda-stage { min-width: 0; padding: var(--space-4); background: var(--bg); --ring-gap: var(--bg); border-radius: var(--radius-lg); }
  .gda-stage > * + * { margin-top: var(--space-4); }
  .gda-actions { display: flex; flex-wrap: wrap; gap: var(--space-2); margin-top: var(--space-4); }
  .gda-table { overflow-x: auto; }
  .gda-band { max-width: 28rem; }
  .gda-forced { overflow-x: auto; }
  .gda-forced .ui-stats__list { flex-wrap: nowrap; }
  .gda-forced .ui-stats__list > .ui-stat { flex-basis: 0; }
  .gda-coloured .ui-drawer__row dt, .gda-coloured .ui-drawer__row dd { color: var(--accent); }
  /* Two panes, one source and one set of values to be saved. Which track is the wide
     one, and which pane comes first, is the whole specimen. */
  .gda-panes { display: grid; align-items: start; gap: var(--space-4);
    grid-template-columns: minmax(0, 1fr) 190px; }
  .gda-saved .ui-drawer__row dd { font-weight: var(--weight-medium); }
  .gda-sheet > p { margin: 0 0 var(--space-3); }
  .gda-page .gc-except { box-shadow: none; padding-left: 0; }
</style>`;

const stage = (html, cls = '') => `<div class="gda-stage ${cls}">${html}</div>`;
const actions = (bad = false) => `<div class="gda-actions">${button({ label: 'Open payout', variant: 'primary', size: 'sm' })}${button({ label: 'Copy reference', variant: bad ? 'primary' : 'secondary', size: 'sm' })}</div>`;
const facts = [['Amount', '€ 1,240.00'], ['Arrival', '30 Sep 2026'], ['Source', 'Bank feed']];
const preview = (bad = false, colourful = false) => `<div class="ui-card ui-card--pad-sm ${colourful ? 'gda-coloured' : ''}">
  <h3 class="ui-card__title">Payout 1162</h3>
  ${badge('In transit', 'pending')}
  ${drawerSection({ rows: facts })}
  ${bad ? drawerSection({ title: 'Payout details', rows: [['Payout reference', 'Payout 1162'], ['Payout status', 'In transit'], ['Payout amount', '€ 1,240.00']] })
    + drawerSection({ title: 'History', rows: [['28 Sep, 09:00', 'Created'], ['28 Sep, 09:02', 'Approved'], ['29 Sep, 08:00', 'Sent to bank']] }) : ''}
  ${actions(colourful)}
</div>`;

// The vanilla Table/FinanceData recipe and React DataTable share these classes.
const payouts = () => `<div class="gda-table"><table class="ui-table ui-table--dense ui-table--zebra">
  <caption>Payouts · EUR</caption>
  <thead><tr><th>Reference</th><th class="ui-table__num">Amount</th><th>Status</th></tr></thead>
  <tbody><tr><td>1162</td><td class="ui-table__num">1,240.00</td><td>${badge('In transit', 'pending')}</td></tr>
  <tr><td>1161</td><td class="ui-table__num">860.00</td><td>${badge('Paid', 'success')}</td></tr>
  <tr><td>1160</td><td class="ui-table__num">2,100.00</td><td>${badge('Paid', 'success')}</td></tr></tbody>
</table></div>`;
const figures = () => statBand({ variant: 'tiles', basis: 'Payouts · September', stats: [
  { label: 'Paid', value: '€ 8,640' }, { label: 'In transit', value: '€ 1,240' },
] });

// A source document beside the fields a parser read from it. The fields are what an
// approval writes to the record, so the Do leads with them in the wide track and gives
// each value more weight than its label; the Don't hands both to the preview.
const saved = (emphasised) => `<div class="ui-card ui-card--pad-sm ${emphasised ? 'gda-saved' : ''}">
  <h3 class="ui-card__title">Extracted fields</h3>
  ${drawerSection({ rows: [['Supplier', 'Sample Studio'], ['Invoice', 'DEMO-1042'], ['Total', '\u20ac 1,440.00']] })}
</div>`;
const sourceDocument = () => `<div class="ui-card ui-card--pad-sm">
  <h3 class="ui-card__title">Source document</h3>
  <div class="gda-sheet">
    <p>Invoice DEMO-1042 \u00b7 Issued 14 Sep 2026</p>
    <table class="ui-table ui-table--dense">
      <tbody>
        <tr><td>Interface design</td><td class="ui-table__num">450.00</td></tr>
        <tr><td>Prototype review</td><td class="ui-table__num">300.00</td></tr>
      </tbody>
    </table>
  </div>
</div>`;
const consequence = (savedLeads) => stage(`<div class="gda-panes">
  ${savedLeads ? saved(true) + sourceDocument() : sourceDocument() + saved(false)}
</div>`);

export const RULES = withSpecimens(content.rules, [
  { id: 'check-density', doHtml: () => stage(figures(), 'gda-band'), dontHtml: () => stage(figures(), 'gda-band gda-forced') },
  { id: 'reduce-density', doHtml: () => stage(payouts() + preview()), dontHtml: () => stage(payouts() + preview(true)) },
  { id: 'purposeful-accent', doHtml: () => stage(preview()), dontHtml: () => stage(preview(false, true)) },
  { id: 'follow-the-consequence', doHtml: () => consequence(true), dontHtml: () => consequence(false) },
]);
