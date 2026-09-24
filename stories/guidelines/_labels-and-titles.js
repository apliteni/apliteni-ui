import { loadGuideline, withSpecimens } from './_markdown.js';
const content = await loadGuideline('labels-and-titles.md', new URL('../../guidelines/labels-and-titles.md', import.meta.url));
export const TITLE = content.title;
export const BLURB = content.blurb;
// The shape of a rule and the gates that walk this page: docs/guidelines.md
import { badge, card } from '../../src/components/index.js';

const stage = (html) => `<div class="gl-stage">${html}</div>`;

const figure = (label, value, chip) => `<div>
  <div class="ui-eyebrow">${label}</div>
  <div style="font:600 var(--text-xl)/1.2 var(--font-display);color:var(--strong);margin:var(--space-1) 0 var(--space-2)">${value}</div>
  ${chip}</div>`;

const band = (a, b) => stage(`<div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-5)">
  ${figure(a[0], '€4.81M', badge(a[1], 'success'))}${figure(b[0], '14', badge(b[1], 'danger'))}</div>`);

export const caseDo = () => band(['Income', '+12% on last year'], ['Invoices waiting', '3 overdue']);
export const caseDont = () => band(['INCOME', '+12% ON LAST YEAR'], ['INVOICES WAITING', '3 OVERDUE']);

// Inside the shell's main column, so the h1 takes the page title's rank.
const page = (cardHtml) => stage(`<div class="ui-app__main" style="padding:0;--ui-app-main:100%">
  <h1>Overview</h1>${cardHtml}</div>`);

export const rankDo = () => page(card({ title: 'Monthly cashflow', sub: 'Income and expenses by month.' }));
export const rankDont = () => page(`<div class="ui-card"><h1>Monthly cashflow</h1>
  <div class="ui-card__sub">Income and expenses by month.</div></div>`);

export const eyebrowDo = () => stage(`<div class="ui-card"><div class="ui-eyebrow">Last 30 days</div>
  <h2 class="ui-card__title">Top contractors</h2><div class="ui-card__sub">Paid out, by counterparty.</div></div>`);
export const eyebrowDont = () => stage(`<div class="ui-card"><div class="ui-eyebrow">Top contractors</div>
  <div class="ui-card__sub">Paid out, by counterparty.</div></div>`);

export const RULES = withSpecimens(content.rules, [
{ id: 'text-ink' },
{ id: 'text-ink-exceptions' },
{ id: 'sentence-case', doHtml: caseDo, dontHtml: caseDont },
{ id: 'title-rank', doHtml: rankDo, dontHtml: rankDont },
{ id: 'title-is-heading' },
{ id: 'eyebrow-names-the-kind', doHtml: eyebrowDo, dontHtml: eyebrowDont }
]);
