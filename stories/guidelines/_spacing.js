import { loadGuideline, withSpecimens } from './_markdown.js';
// The shape of a rule: AGENTS.md#the-guidelines-collection
import { card, segmented } from '../../src/components/index.js';
import { filterBar } from '../../src/components/filter-bar.js';

const content = await loadGuideline('spacing.md', new URL('../../guidelines/spacing.md', import.meta.url));
export const TITLE = content.title;
export const BLURB = content.blurb;

// Layout glue only: each specimen places kit parts at the gap its rule names.
// The inner gap is --space-2, the group gap --space-8 and the phone gap --tap-gap. A
// don't uses a step the rule does not allow. The view strip hangs its 16px of
// padding into the margin, so its first label sits on the column's text edge.
export const SPEC_CSS = `
  <style>
    .gl-sp { display: flex; flex-direction: column; min-width: 0; }
    .gl-sp > * + * { margin-top: var(--space-2); }
    .gl-sp > .gl-sp__next { margin-top: var(--space-8); }
    .gl-sp__row { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between;
      gap: var(--space-2); min-width: 0; }
    .gl-sp__row > .ui-seg--underline { margin-inline-start: calc(-1 * var(--space-4)); }
    .gl-sp--third > .ui-table-scroll { margin-top: var(--space-3); }
    .gl-sp--third > .gl-sp__next { margin-top: var(--space-5); }
    .gl-sp--phone .gl-sp__row { row-gap: var(--tap-gap); }
    .gl-sp--phone .ui-filter-bar { row-gap: var(--tap-gap); }
    .gl-sp--phone > * + * { margin-top: var(--tap-gap); }
    .gl-sp--phone-dont > * + * { margin-top: var(--space-2); }
    .gl-sp--float .gl-sp__far { margin-top: var(--space-8); }
    .gl-sp__indent { margin-inline-start: var(--space-4); }
  </style>`;

const chips = (n = 2) => filterBar({ filters: [
  { id: 'status', label: 'Status', value: 'Open', items: [{ label: 'Open', value: 'Open' }, { label: 'Paid', value: 'Paid' }] },
  { id: 'customer', label: 'Customer', value: 'Aster Systems', items: [{ label: 'Aster Systems', value: 'Aster Systems' }] },
  { id: 'currency', label: 'Currency', value: 'EUR', items: [{ label: 'EUR', value: 'EUR' }] },
].slice(0, n) });
const strip = () => segmented({ options: ['All', 'Open', 'Paid'], active: 1, appearance: 'underline', ariaLabel: 'Invoice view', name: 'view' });
const table = () => `<div class="ui-table-scroll" role="region" aria-label="Invoices" tabindex="0"><table class="ui-table ui-table--compact"><thead><tr><th scope="col">Invoice</th><th scope="col">Due</th><th scope="col" class="ui-table__num">Amount EUR</th></tr></thead><tbody>${[['INV-1042', '3 Nov', '4,180.00'], ['INV-1039', '28 Oct', '960.50']].map(([a, b, c]) => `<tr><td>${a}</td><td>${b}</td><td class="ui-table__num">${c}</td></tr>`).join('')}</tbody></table></div>`;
const row = (n = 1) => `<div class="gl-sp__row">${strip()}${chips(n)}</div>`;
const reminders = `<div class="gl-sp__next">${card({ title: 'Reminders', body: '<p>A reminder goes out 3 days before an invoice falls due.</p>' })}</div>`;
const stage = (mod, html) => `<div class="gl-stage"><div class="gl-sp ${mod}">${html}</div></div>`;

const two = (far = '') => [
  card({ title: 'Reminders', body: `<p${far}>A reminder goes out 3 days before an invoice falls due.</p>` }),
  `<div class="gl-sp__next">${card({ title: 'Late fees', body: '<p>A late fee of 2% applies after 14 days.</p>' })}</div>`,
].join('');

export const RULES = withSpecimens(content.rules, [
  { id: 'two-gaps', doHtml: () => stage('', row() + table() + reminders),
    dontHtml: () => stage('gl-sp--third', row() + table() + reminders) },
  { id: 'two-gaps-phone', doHtml: () => stage('gl-sp--phone', chips(3) + table()),
    dontHtml: () => stage('gl-sp--phone gl-sp--phone-dont', chips(3) + table()) },
  { id: 'title', doHtml: () => stage('', two()),
    dontHtml: () => stage('gl-sp--float', two(' class="gl-sp__far"')) },
  { id: 'text-edge', doHtml: () => stage('', '<h3>Invoices</h3>' + row() + table()),
    dontHtml: () => stage('', '<h3>Invoices</h3><div class="gl-sp__indent">' + row() + table() + '</div>') },
]);
