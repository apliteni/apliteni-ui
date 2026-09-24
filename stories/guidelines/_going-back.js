import { loadGuideline, withSpecimens } from './_markdown.js';
const content = await loadGuideline(new URL('../../guidelines/going-back.md', import.meta.url));
export const TITLE = content.title;
export const BLURB = content.blurb;
// The shape of a rule and the gates that walk this page: docs/guidelines.md
import { button } from '../../src/components/index.js';
import { backLink } from '../../src/components/back.js';
import { breadcrumbs, sidebarNav } from '../../src/components/nav.js';





// The specimens are the top of a page — the link, and the title under it — so
// the stage draws a title in the page's own face at a size that fits the
// panel. A <p>, not an <h1>: one guideline page must not carry a dozen h1s.
export const SPEC_CSS = `
  <style>
    .gb-head { display: flex; flex-direction: column; gap: var(--space-3); }
    .gb-head > .ui-btn { align-self: flex-start; }
    .gb-title { margin: 0; font: 700 21px/1.15 var(--font-display); letter-spacing: var(--tracking-tight);
      color: var(--strong); }
    .gb-titlerow { display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); }
    .gb-page { display: grid; grid-template-columns: max-content 1fr; gap: var(--space-5); align-items: start; }
  </style>`;

const stage = (html) => `<div class="gl-stage">${html}</div>`;
const head = (above, title, action = '') => stage(`<div class="gb-head">${above}`
  + `<div class="gb-titlerow"><p class="gb-title">${title}</p>${action}</div></div>`);
const back = (label) => backLink({ href: '#', label });

// A rail folded to its icons, so a specimen can show which row is lit beside the
// page it belongs to at the width of one panel.
const RAIL = [
  { id: 'dashboard', icon: 'chart', label: 'Dashboard', href: '#' },
  { id: 'invoices', icon: 'doc', label: 'Invoices', href: '#' },
  { id: 'payouts', icon: 'card', label: 'Payouts', href: '#' },
];
const withRail = (id, active, above) => stage(`<div class="gb-page">`
  + sidebarNav({ items: RAIL, active, activeIs: 'section', collapsed: true, ariaLabel: `${id} sidebar` })
  + `<div class="gb-head">${above}<p class="gb-title">INV-1001</p></div></div>`);

export const RULES = withSpecimens(content.rules, [
{ id: 'below-a-list', doHtml: () => head(back('Invoices'), 'Invoice INV-1001'), dontHtml: () => head(back('Dashboard'), 'Invoices') },
{ id: 'name-it', doHtml: () => head(back('Invoices'), 'Invoice INV-1001'), dontHtml: () => head(back('Back'), 'Invoice INV-1001'), kit: [{ ref: 'src/components/back.js:54', pattern: 'BARE} to ${name}' }] },
{ id: 'address-not-history', kit: [{ ref: 'src/components/back.js:26', pattern: 'const SCRIPTED = /^javascript:/i' }] },
{ id: 'one-or-the-other', doHtml: () => head(back('Invoices'), 'Invoice INV-1001'), dontHtml: () => head(
      breadcrumbs({
        items: [{ label: 'Finance', href: '#' }, { label: 'Invoices', href: '#' }, { label: 'INV-1001' }],
        ariaLabel: 'Trail beside a back link',
      }) + back('Invoices'),
      'Invoice INV-1001',
    ), kit: [{ ref: 'src/components/shell.js:322', pattern: '${up || (crumbs.length' }] },
{ id: 'section-lit', doHtml: () => withRail('lit', 'invoices', back('Invoices')), dontHtml: () => withRail('unlit', null, back('Invoice list')), kit: [{ ref: 'src/components/nav.js:109', pattern: "const current = activeIs === 'section'" }] },
{ id: 'quiet', doHtml: () => head(back('Invoices'), 'Invoice INV-1001', button({ label: 'Send', variant: 'primary', size: 'sm' })), dontHtml: () => head(
      button({ label: 'Back to invoices', variant: 'primary', size: 'sm', icon: 'arrowLeft' }),
      'Invoice INV-1001',
      button({ label: 'Send', variant: 'primary', size: 'sm' }),
    ), kit: [{ ref: 'src/styles/back.css:33', pattern: '.ui-back[href] { color: var(--text); }' }] }
]);
