import { numericValue, deltaValue, rowIdentity } from '../../src/components/table-values.js';
import { filterBar, initFilterBar } from '../../src/components/filter-bar.js';
import { segmented } from '../../src/components/index.js';
import { initSegmented } from '../../src/components/segmented.js';
import { pad } from '../_gallery.js';
export default { title: 'Components/Finance cells', parameters: { layout: 'fullscreen' } };
const filters = [{ id: 'sector', label: 'Sector', value: 'Technology', items: [{ label: 'Technology', value: 'Technology', selected: true }, { label: 'Energy', value: 'Energy' }] }, { id: 'market', label: 'Market', value: 'US', items: [{ label: 'US', value: 'US' }] }];
// --table-bg is the card's surface in a card and the page's own ground outside one, and a
// content-width table no longer covers the page it stands on. --fit so the surface ends
// where the table does rather than leaving the slack white. #504
// why: guidelines/dense-tables.md, use the right surface
// The basis is the table's own caption, which is what aria-describedby resolves to.
// It was a paragraph above the card, a loose sentence over a block of figures.
export const Values = { render: () => pad(`<div class="ui-card ui-card--fit"><table class="ui-table ui-table--compact"><caption id="cells-basis">Changes since the previous close</caption><thead><tr><th>State</th><th>Value</th><th>Change</th><th>Company</th></tr></thead><tbody>${[
  ['Positive', numericValue({ value: '228.87', unit: 'USD' }), deltaValue({ value: '+0.66%', tone: 'success', basisId: 'cells-basis' }), rowIdentity({ symbol: 'ASTR', name: 'Aster Systems', href: '#company' })],
  ['Negative', numericValue({ value: '−24.60', unit: 'USD' }), deltaValue({ value: '−2.01%', tone: 'danger', basisId: 'cells-basis' }), rowIdentity({ symbol: 'CEDR', name: 'Cedar Infrastructure Holdings International' })],
  ['Zero', numericValue({ value: '0.00', unit: 'USD' }), deltaValue({ value: '0.00%', tone: 'success', basisId: 'cells-basis' }), rowIdentity({ symbol: 'TEST', name: '会社の長い名前', logo: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="24" height="24"%3E%3Ccircle cx="12" cy="12" r="10" fill="%23808080"/%3E%3C/svg%3E' })],
  ['Missing', numericValue(), deltaValue(), rowIdentity({ symbol: 'NONE', name: 'No logo available' })],
  ['Neutral', numericValue({ value: '1,000,000.00', unit: 'USD' }), deltaValue({ value: '+1.20%', basisId: 'cells-basis' }), rowIdentity({ symbol: 'FLAT', name: 'Flat Materials' })],
].map(cells => `<tr>${cells.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`) };
export const FilterStates = { render: () => pad(`<div style="display:grid;gap:var(--space-8)"><section><h2>Applied filters</h2><div data-filter-host>${filterBar({ filters })}</div></section><section><h2>Nothing chosen yet</h2>${filterBar({ label: 'Unset filter example', filters: [{ id: 'listing', label: 'Listing', items: [{ label: 'Any listing', value: '' }, { label: 'Primary', value: 'Primary' }] }] })}</section><section><h2>Open filter</h2>${filterBar({ label: 'Open filter example', filters: [{ ...filters[0], open: true }] })}</section><section style="margin-top:var(--space-16)"><h2>Disabled</h2>${filterBar({ filters, disabled: true })}</section><section><h2>Refreshing</h2>${filterBar({ filters, busy: true })}</section><section><h2>No applied filters</h2>${filterBar()}</section></div>`), play: ({ canvasElement }) => {
  const host = canvasElement.querySelector('[data-filter-host]'); let state = filters;
  const controller = initFilterBar(host, { filters: state });
  host.addEventListener('ui-filter-remove', e => { state = state.filter(f => f.id !== e.detail.id); controller.update({ filters: state }); });
  host.addEventListener('ui-filter-clear', () => { state = []; controller.update({ filters: state }); });
  host.addEventListener('ui-filter-change', e => { state = state.map(f => f.id === e.detail.id ? { ...f, value: e.detail.value } : f); controller.update({ filters: state }); });
} };
export const Views = { render: () => pad(segmented({ options: [{ label: 'Overview', value: 'overview' }, { label: 'Performance', value: 'performance' }, { label: 'Unavailable', value: 'unavailable', disabled: true }], appearance: 'underline', ariaLabel: 'Dataset view' })), play: ({ canvasElement }) => initSegmented(canvasElement) };
