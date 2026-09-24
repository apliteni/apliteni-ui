import { appShell, wireShell } from '../../src/components/shell.js';
import { button, segmented } from '../../src/components/index.js';
import { numericValue, deltaValue, rowIdentity, initRowIdentity } from '../../src/components/table-values.js';
import { filterBar, initFilterBar } from '../../src/components/filter-bar.js';
import { initSegmented } from '../../src/components/segmented.js';

export default { title: 'Apps/Stock screener', parameters: { layout: 'fullscreen' } };
const names = ['Aster Systems', 'Birch Semiconductor', 'Cobalt Energy', 'Dovetail Health', 'Elm Networks', 'Fable Robotics', 'Grove Financial', 'Harbor Software', 'Iris Materials', 'Juniper Devices', 'Kestrel Logistics', 'Linden Foods', 'Morrow Industries', 'Northstar Analytics', 'Opal Telecom', 'Pine Mobility', 'Quartz Medical', 'Reed Computing', 'Solstice Power', 'Tern Aerospace', 'Umber Retail', 'Vale Instruments', 'Willow Biotech', 'Xenon Storage', 'Yarrow Payments', 'Zephyr Motors', 'Alder Water', 'Bracken Research', 'Cedar Infrastructure', 'Drift Media'];
const sectors = ['Technology', 'Energy', 'Health care', 'Financials', 'Industrials'];
const rows = names.map((name, i) => ({ name, symbol: name.slice(0, 4).toUpperCase(), price: 340 - i * 8.37, cap: 980 - i * 27.31, sector: sectors[i % sectors.length], i }));
const signed = n => `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n).toFixed(2)}%`;
const change = n => deltaValue({ value: signed(n), tone: n > 0 ? 'success' : n < 0 ? 'danger' : 'neutral', basisId: 'screener-basis' });
const filters = [{ id: 'sector', label: 'Sector', value: 'Technology', items: sectors.map(label => ({ label, value: label })) }];
const views = ['Overview', 'Performance', 'Valuation'];
const headers = ['Company', 'Price', 'Change %', 'Volume', 'Rel. volume', 'Market cap', 'P/E', 'EPS', 'EPS growth', 'Div. yield', 'Revenue', 'Rev. growth', 'Beta', 'Sector', 'Rating'];
const css = `<style>
.screener { min-width:0; }
.screener h1 { font-size:var(--text-xl); margin-bottom:var(--space-2); }
.screener__context { font-size:var(--text-sm); margin-bottom:var(--space-4); }
.screener__filters { display:flex; flex-wrap:wrap; align-items:center; gap:var(--space-2); margin-bottom:var(--space-4); }
.screener .ui-table-scroll { --ui-table-height:75vh; margin-top:var(--space-3); }
.screener .ui-table { min-width:110rem; }
.screener .ui-identity__name { white-space:nowrap; }
.screener__sort { background:none; border:0; color:inherit; font:inherit; padding:var(--space-1); border-radius:var(--radius-xs); cursor:pointer; }
.screener__sort:focus-visible { outline:2px solid transparent; box-shadow:var(--ring); }
.screener__foot { font-size:var(--text-sm); margin-top:var(--space-3); }

</style>`;
const table = (data, density, view = 'Overview', sort = 'desc', emptyMessage = 'No companies match these filters.') => {
  const order = view === 'Performance' ? [0, 2, 8, 11, 1, 3, 4, 5, 6, 7, 9, 10, 12, 13, 14] : view === 'Valuation' ? [0, 5, 6, 7, 1, 2, 3, 4, 8, 9, 10, 11, 12, 13, 14] : headers.map((_, i) => i);
  return `<table class="ui-table ui-table--${density} ui-table--sticky ui-table--pinned ui-table--hover"><caption class="ui-filter-bar__legend">Fictional stock screener, ${view}, values in USD</caption><thead><tr>${order.map(i => `<th scope="col" class="${i === 0 ? 'ui-table__identity' : i < 13 ? 'ui-table__num' : ''}"${i === 5 ? ` aria-sort="${sort === 'desc' ? 'descending' : 'ascending'}"` : ''}>${i === 5 ? `<button type="button" class="screener__sort">Market cap ${sort === 'desc' ? '↓' : '↑'}</button>` : headers[i]}</th>`).join('')}</tr></thead><tbody>${data.map(({ name, symbol, price, cap, sector, i }) => {
    const cells = [rowIdentity({ name, symbol, href: '#company-detail' }), numericValue({ value: price.toFixed(2), unit: 'USD' }), change(i === 8 ? 0 : ((i * 17) % 63 - 28) / 10), numericValue({ value: (95 - i * 2.71).toFixed(2), unit: 'M' }), (0.6 + i * .07).toFixed(2), numericValue({ value: cap.toFixed(2), unit: 'B USD' }), numericValue({ value: i === 5 ? null : (18 + i * 1.2).toFixed(2) }), numericValue({ value: (11 - i * .23).toFixed(2), unit: 'USD' }), change(22 - i * 1.7), `${(i * .13).toFixed(2)}%`, numericValue({ value: (72 - i * 1.9).toFixed(2), unit: 'B USD' }), change(17 - i * .8), (0.7 + i * .03).toFixed(2), sector, ['Buy', 'Hold', 'Sell'][i % 3]];
    return `<tr>${order.map(j => `<td class="${j === 0 ? 'ui-table__identity' : j < 13 ? 'ui-table__num' : ''}">${cells[j]}</td>`).join('')}</tr>`;
  }).join('') || `<tr><td colspan="15">${emptyMessage}</td></tr>`}</tbody></table>`;
};
function render({ density = 'compact', applied = false, state = 'ready', limit = 30 } = {}) {
  const data = applied ? rows.filter(r => r.sector === 'Technology') : state === 'ready' ? rows.slice(0, limit) : rows.slice(0, 3);
  const body = `${css}<section class="screener"><div class="screener__filters"><div data-screener-filters>${filterBar({ filters: applied ? filters : [], busy: state === 'refreshing' })}</div>${button({ label: 'Filter by technology', size: 'sm' })}</div>${segmented({ options: views, appearance: 'underline', ariaLabel: 'Dataset view', name: 'screener' })}<div class="ui-table-scroll" role="region" aria-label="Stock screener, scroll for more columns and rows" tabindex="0"${state === 'refreshing' || state === 'loading' ? ' aria-busy="true"' : ''}>${table(state === 'empty' || state === 'loading' ? [] : data, density, 'Overview', 'desc', state === 'loading' ? 'Loading companies…' : 'No companies available.')}</div>${state === 'error' ? `<p role="alert">Could not refresh prices. Existing rows are still shown. ${button({ label: 'Retry refresh', size: 'sm' })}</p>` : state === 'loading' ? '<p role="status">Loading companies…</p>' : state === 'refreshing' ? '<p role="status">Refreshing prices…</p>' : ''}<p class="screener__foot">${state === 'empty' || state === 'loading' ? 0 : data.length} fictional companies. USD = US dollars; M = million; B = billion.</p><p class="screener__foot" id="company-detail" tabindex="-1" aria-live="polite">Company links are demonstration links; no live prices or company detail service is connected.</p></section>`;
  return appShell({ word: 'Finance', title: 'Stock screener', sub: '<span id="screener-basis">Fictional demonstration data. Changes versus previous close.</span>', nav: [{ id: 'screener', icon: 'chart', label: 'Stock screener', href: '#screener' }], active: 'screener', width: 'wide', collapsible: true, collapsed: true, body });
}
export const Screener = { render, play: ({ canvasElement }) => {
  wireShell(canvasElement); initSegmented(canvasElement); initRowIdentity(canvasElement);
  let active = [], view = 'Overview', sort = 'desc';
  const host = canvasElement.querySelector('[data-screener-filters]');
  const bar = initFilterBar(host, { filters: active });
  const repaint = () => {
    const data = rows.filter(r => !active.length || r.sector === active[0].value).toSorted((a, b) => sort === 'desc' ? b.cap - a.cap : a.cap - b.cap);
    canvasElement.querySelector('.ui-table-scroll').innerHTML = table(data, 'compact', view, sort);
    canvasElement.querySelector('.screener__foot').textContent = `${data.length} fictional companies. USD = US dollars; M = million; B = billion.`;
    initRowIdentity(canvasElement);
  };
  host.addEventListener('ui-filter-remove', () => { active = []; bar.update({ filters: active }); repaint(); });
  host.addEventListener('ui-filter-clear', () => { active = []; bar.update({ filters: active }); repaint(); });
  host.addEventListener('ui-filter-change', e => { active = active.map(f => ({ ...f, value: e.detail.value })); bar.update({ filters: active }); repaint(); });
  canvasElement.addEventListener('ui-segment-change', e => { view = e.detail.value; repaint(); });
  canvasElement.addEventListener('click', e => { const identity = e.target.closest('.ui-identity'); if (identity) { e.preventDefault(); const detail = canvasElement.querySelector('#company-detail'); detail.textContent = `${identity.querySelector('.ui-identity__name').textContent}. Fictional company; no live prices are connected.`; detail.focus(); } if (e.target.closest('.screener__filters > .ui-btn')) { active = filters; bar.update({ filters: active }); repaint(); } if (e.target.closest('.screener__sort')) { sort = sort === 'desc' ? 'asc' : 'desc'; repaint(); canvasElement.querySelector('.screener__sort').focus(); } });
} };
export const Dense = { render: () => render({ density: 'dense', limit: 6 }) };
export const AppliedFilters = { render: () => render({ applied: true }) };
export const Refreshing = { render: () => render({ state: 'refreshing' }) };
export const Loading = { render: () => render({ state: 'loading' }) };
export const Empty = { render: () => render({ state: 'empty' }) };
export const RefreshError = { render: () => render({ state: 'error' }), play: ({ canvasElement }) => { canvasElement.querySelector('[role="alert"] button').addEventListener('click', () => { canvasElement.innerHTML = render(); Screener.play({ canvasElement }); }); } };
