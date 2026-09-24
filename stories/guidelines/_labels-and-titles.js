import { loadGuideline, withSpecimens } from './_markdown.js';
const content = await loadGuideline(new URL('../../guidelines/labels-and-titles.md', import.meta.url));
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

const inkSample = (ink) => stage(card({ body: ['xs', 'sm', 'base'].map(size =>
  `<p style="font-size:var(--text-${size});color:var(--${ink});margin-bottom:var(--space-3)">Updated 23 Sep · ready to export</p>`,
).join('') }));

export const RULES = withSpecimens(content.rules, [
{ id: 'text-ink', doHtml: () => inkSample('text'), dontHtml: () => inkSample('muted'), kit: [{ ref: 'src/styles/base.css:123', pattern: 'color: var(--text);' }] },
{ id: 'text-ink-exceptions', kit: [{ ref: 'src/styles/muted-ink.test.js:1', pattern: 'Every muted/dim colour path' }] },
{ id: 'sentence-case', doHtml: caseDo, dontHtml: caseDont, kit: [
      { ref: 'src/styles/base.css:117', pattern: 'in sentence case like every' },
      { ref: 'src/components/topbar.js:44', pattern: 'the kit writes the word for it' },
      { ref: 'stories/guidelines/letter-case.test.js:1', pattern: 'text is never set in capitals by style' },
    ] },
{ id: 'title-rank', doHtml: rankDo, dontHtml: rankDont, kit: [
      { ref: 'src/styles/layout.css:398', pattern: 'rank: page-title' },
      { ref: 'src/styles/card.css:57', pattern: 'rank: card-title' },
    ] },
{ id: 'title-is-heading', kit: [
      { ref: 'src/components/index.js:63', pattern: 'const h = [2, 3, 4, 5, 6]' },
      { ref: 'react/src/primitives/Card.tsx:9', pattern: 'const Heading' },
    ] },
{ id: 'eyebrow-names-the-kind', doHtml: eyebrowDo, dontHtml: eyebrowDont, kit: [
      { ref: 'src/styles/base.css:120', pattern: 'rank: label' },
    ] }
]);
