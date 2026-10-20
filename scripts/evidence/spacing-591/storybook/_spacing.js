// Temporary page for the #591 follow-up: the option B rules in three wordings.
// Copy into stories/guidelines/ with the three Markdown files in guidelines/; see capture-followup.mjs.
import { loadGuideline, withSpecimens } from './_markdown.js';
import { card, segmented } from '../../src/components/index.js';
import { filterBar } from '../../src/components/filter-bar.js';

const WORDINGS = {
  px: await loadGuideline('spacing.md', new URL('../../guidelines/spacing.md', import.meta.url)),
  tokens: await loadGuideline('spacing-tokens.md', new URL('../../guidelines/spacing-tokens.md', import.meta.url)),
  words: await loadGuideline('spacing-words.md', new URL('../../guidelines/spacing-words.md', import.meta.url)),
};

// Layout glue only: each specimen places kit parts at the gap its rule names.
// The numbers are the specimens' subject, so they are written out here.
export const SPEC_CSS = `
  <style>
    .gl-sp { display: flex; flex-direction: column; min-width: 0; }
    .gl-sp > * + * { margin-top: 8px; }
    .gl-sp > .gl-sp__next { margin-top: 32px; }
    .gl-sp--third > .ui-table-scroll { margin-top: 12px; }
    .gl-sp--third > .gl-sp__next { margin-top: 20px; }
    .gl-sp--phone .ui-filter-bar { row-gap: 20px; }
    .gl-sp--phone > * + * { margin-top: 20px; }
    .gl-sp--phone-dont > .ui-table-scroll { margin-top: 8px; }
    .gl-sp--float .ui-card__title { margin-bottom: 32px; }
    /* Every specimen keeps the text-edge rule: the strip's 4px pad and 12px tab pad hang out. */
    .gl-sp > .ui-seg--underline { margin-inline-start: -16px; }
    .gl-sp--indent > .ui-seg--underline { margin-inline-start: 0; }
    .gl-sp--indent > .ui-table-scroll, .gl-sp--indent > .ui-filter-bar { margin-inline-start: 16px; }
  </style>`;

const chips = (n = 2) => filterBar({ filters: [
  { id: 'status', label: 'Status', value: 'Open', items: [{ label: 'Open', value: 'Open' }, { label: 'Paid', value: 'Paid' }] },
  { id: 'customer', label: 'Customer', value: 'Aster Systems', items: [{ label: 'Aster Systems', value: 'Aster Systems' }] },
  { id: 'currency', label: 'Currency', value: 'EUR', items: [{ label: 'EUR', value: 'EUR' }] },
].slice(0, n) });
const strip = () => segmented({ options: ['All', 'Open', 'Paid'], active: 1, appearance: 'underline', ariaLabel: 'Invoice view', name: 'view' });
const table = () => `<div class="ui-table-scroll" role="region" aria-label="Invoices" tabindex="0"><table class="ui-table ui-table--compact"><thead><tr><th scope="col">Invoice</th><th scope="col">Due</th><th scope="col" class="ui-table__num">Amount EUR</th></tr></thead><tbody>${[['INV-1042', '3 Nov', '4,180.00'], ['INV-1039', '28 Oct', '960.50']].map(([a, b, c]) => `<tr><td>${a}</td><td>${b}</td><td class="ui-table__num">${c}</td></tr>`).join('')}</tbody></table></div>`;
const reminders = (cls = 'gl-sp__next') => `<div class="${cls}">${card({ title: 'Reminders', body: '<p>A reminder goes out 3 days before an invoice falls due.</p>' })}</div>`;
const stage = (mod, html) => `<div class="gl-stage"><div class="gl-sp ${mod}">${html}</div></div>`;

const SPECIMENS = [
  { id: 'two-gaps', doHtml: () => stage('', chips() + strip() + table() + reminders()),
    dontHtml: () => stage('gl-sp--third', chips() + strip() + table() + reminders()) },
  { id: 'two-gaps-phone', doHtml: () => stage('gl-sp--phone', chips(3) + table()),
    dontHtml: () => stage('gl-sp--phone gl-sp--phone-dont', chips(3) + table()) },
  { id: 'title', doHtml: () => stage('', card({ title: 'Reminders', body: '<p>A reminder goes out 3 days before an invoice falls due.</p>' }) + reminders().replace('Reminders', 'Late fees').replace('A reminder goes out 3 days before an invoice falls due.', 'A late fee of 2% applies after 14 days.')),
    dontHtml: () => stage('gl-sp--float', card({ title: 'Reminders', body: '<p>A reminder goes out 3 days before an invoice falls due.</p>' }) + reminders().replace('Reminders', 'Late fees').replace('A reminder goes out 3 days before an invoice falls due.', 'A late fee of 2% applies after 14 days.')) },
  { id: 'text-edge', doHtml: () => stage('', '<h3>Invoices</h3>' + strip() + chips() + table()),
    dontHtml: () => stage('gl-sp--indent', '<h3>Invoices</h3>' + strip() + chips() + table()) },
];

export const pages = Object.fromEntries(Object.entries(WORDINGS).map(([k, c]) => [k, { title: c.title, rules: withSpecimens(c.rules, SPECIMENS) }]));
