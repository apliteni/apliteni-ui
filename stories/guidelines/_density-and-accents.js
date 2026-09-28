import { loadGuideline, withSpecimens } from './_markdown.js';
import { badge, button } from '../../src/components/index.js';
import { statBand } from '../../src/components/stat.js';
import { drawerSection } from '../../src/components/drawer.js';

const content = await loadGuideline('density-and-accents.md', new URL('../../guidelines/density-and-accents.md', import.meta.url));
export const TITLE = content.title;
export const BLURB = content.blurb;

export const SPEC_CSS = `<style>
  .gda-stage { min-width: 0; padding: var(--space-4); background: var(--bg); border-radius: var(--radius-lg); }
  .gda-stage > * + * { margin-top: var(--space-4); }
  .gda-actions { display: flex; flex-wrap: wrap; gap: var(--space-2); margin-top: var(--space-4); }
  .gda-table { overflow-x: auto; }
  .gda-band { max-width: 28rem; }
  .gda-forced { overflow-x: auto; }
  .gda-forced .ui-stats__list { flex-wrap: nowrap; }
  .gda-forced .ui-stats__list > .ui-stat { flex-basis: 0; }
  .gda-coloured .ui-drawer__row dt, .gda-coloured .ui-drawer__row dd { color: var(--accent); }
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

export const RULES = withSpecimens(content.rules, [
  { id: 'check-density', doHtml: () => stage(figures(), 'gda-band'), dontHtml: () => stage(figures(), 'gda-band gda-forced') },
  { id: 'reduce-density', doHtml: () => stage(payouts() + preview()), dontHtml: () => stage(payouts() + preview(true)) },
  { id: 'purposeful-accent', doHtml: () => stage(preview()), dontHtml: () => stage(preview(false, true)) },
]);
