// Every label and title the kit sets, on one board. The guideline these obey:
// docs/specification.md#labels-and-titles
import { card, badge, pill, snippet } from '../../src/components/index.js';
import { sidebarNav } from '../../src/components/nav.js';
import { dropdown } from '../../src/components/dropdown.js';
import { footer } from '../../src/components/footer.js';
import { success } from '../../src/components/success.js';
import { versionSwitcher } from '../../src/components/topbar.js';

export default {
  title: 'Foundations/Labels and titles',
  parameters: { layout: 'fullscreen' },
};

const caption = (text) =>
  `<p style="font:400 12px/1.5 var(--font-sans);color:var(--muted);margin:0 0 10px">${text}</p>`;

const cell = (text, html, style = '') =>
  `<div style="min-width:0;${style}">${caption(text)}${html}</div>`;

const kpi = (label, value, chip) => `
  <div>
    <div class="ui-eyebrow">${label}</div>
    <div style="font:600 var(--text-xl)/1.2 var(--font-display);color:var(--strong);margin:6px 0 8px">${value}</div>
    ${chip}
  </div>`;

const LEDGER = `
  <table class="ui-table">
    <thead><tr><th>Month</th><th>Income</th><th>Expenses</th><th>Status</th></tr></thead>
    <tbody>
      <tr><td class="ui-table__title">August 2026</td><td>€412,300</td><td>€338,120</td><td>${badge('Reconciled', 'success')}</td></tr>
      <tr><td class="ui-table__title">July 2026</td><td>€398,040</td><td>€351,900</td><td>${badge('Pending', 'pending')}</td></tr>
      <tr><td class="ui-table__title">June 2026</td><td>€377,610</td><td>€362,450</td><td>${badge('Overdue', 'danger')}</td></tr>
    </tbody>
  </table>`;

// The shape of the portal page #268 and #269 were reported from: a page title,
// the window it covers, a band of labelled figures and a titled card.
const inAPage = () => `
  <div class="ui-app__main" style="--ui-app-main:1040px">
    <div style="display:flex;align-items:baseline;justify-content:space-between;gap:var(--space-4);flex-wrap:wrap">
      <h1>Overview</h1>
      <div class="ui-eyebrow">12 months to 31 Aug 2026</div>
    </div>
    <div class="ui-app__body">
      <div class="ui-card">
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:var(--space-6)">
          ${kpi('Income', '€4.81M', badge('+12% on last year', 'success'))}
          ${kpi('Expenses', '€3.95M', badge('+4% on last year', 'neutral'))}
          ${kpi('Net', '€862K', badge('+41% on last year', 'success'))}
          ${kpi('Invoices waiting', '14', badge('3 overdue', 'danger'))}
        </div>
      </div>
      ${card({ title: 'Monthly cashflow', sub: 'Income and expenses by month, all entities.', body: LEDGER })}
    </div>
  </div>`;

const NAV = sidebarNav({
  active: 'ov',
  ariaLabel: 'Board navigation',
  sections: [
    { label: 'Company', items: [
      { id: 'ov', icon: 'layers', label: 'Overview', href: '#' },
      { id: 'tx', icon: 'compass', label: 'Transactions', href: '#' },
    ] },
    { label: 'My space', items: [
      { id: 'me', icon: 'user', label: 'My invoices', href: '#' },
      { id: 'st', icon: 'gear', label: 'Settings', href: '#' },
    ] },
  ],
});

const MENU = dropdown({
  open: true,
  label: 'version:',
  value: 'phoenix.2026.002',
  ariaLabel: 'Version',
  sections: [
    { label: 'Current', items: [
      { label: 'phoenix.2026.002', description: 'Product units, animated deck', badge: 'Live', selected: true },
    ] },
    { label: 'Earlier', items: [
      { label: 'phoenix.2026.001', description: 'Phoenix, 2026-05-17', badge: 'Archive' },
    ] },
  ],
});

const VERSIONS = versionSwitcher([
  { label: 'phoenix.2026.002', meta: 'Product units, animated deck', badge: 'live' },
  { label: 'phoenix.2026.001', meta: 'Phoenix, 2026-05-17', badge: 'archive' },
], 0).replace('class="vsw"', 'class="vsw open"');

const everyLabel = () => `
  <div style="padding:40px;display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:var(--space-8) var(--space-6);max-width:1120px">
    ${cell('A label above a card title', `<div class="ui-card"><div class="ui-eyebrow">Last 30 days</div>
      <h2 class="ui-card__title">Top contractors</h2><div class="ui-card__sub">Paid out, by counterparty.</div></div>`)}
    ${cell('Status badges and pills', `<div style="display:flex;flex-wrap:wrap;gap:8px">
      ${badge('Live', 'live')}${badge('Soon', 'soon')}${badge('Paid', 'success')}${badge('Pending', 'pending')}
      ${badge('Failed', 'danger')}${badge('Archived', 'archive')}${pill('Connected', 'live')}${pill('Two agents')}</div>`)}
    ${cell('Navigation section captions', NAV)}
    ${cell('Menu group captions and row badges', MENU, 'min-height:280px')}
    ${cell('Version badges', `<div class="topbar" style="position:static;background:none">${VERSIONS}</div>`, 'min-height:220px')}
    ${cell('A code sample’s label', snippet({ label: 'Shell', code: 'npm install @apliteni/apliteni-ui' }))}
    ${cell('A confirmation’s eyebrow', success({ layout: 'compact', backdrop: 'flat', eyebrow: 'Payment received', title: 'Invoice 1042 is paid' }))}
    ${cell('Footer column titles', footer({ variant: 'full', columns: [
      { title: 'Product', links: [{ label: 'Deck' }, { label: 'Text' }] },
      { title: 'Company', links: [{ label: 'About' }, { label: 'Careers' }] },
    ] }), 'grid-column:1/-1')}
  </div>`;

export const InAPage = { render: inAPage };
export const EveryLabel = { render: everyLabel };
