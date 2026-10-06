import { numericValue, deltaValue, rowIdentity, initRowIdentity } from '../../src/components/table-values.js';
import { filterBar, initFilterBar } from '../../src/components/filter-bar.js';
import { segmented } from '../../src/components/index.js';
import { initSegmented } from '../../src/components/segmented.js';
import { pad } from '../_gallery.js';
export default { title: 'Components/Finance cells', parameters: { layout: 'fullscreen' } };
// The demo logo, served from stories/assets. .storybook/main.js declares that
// root and says why this is spelled relative to the story page.
const DEMO_LOGO = 'demo-assets/demo-logo.svg';
const filters = [{ id: 'sector', label: 'Sector', value: 'Technology', items: [{ label: 'Technology', value: 'Technology' }, { label: 'Energy', value: 'Energy' }] }, { id: 'market', label: 'Market', value: 'US', items: [{ label: 'US', value: 'US' }] }];
export const Values = { render: () => pad(`<p id="cells-basis">Changes versus previous close.</p><table class="ui-table ui-table--compact"><thead><tr><th>State</th><th>Value</th><th>Change</th><th>Company</th></tr></thead><tbody>${[
  ['Positive', numericValue({ value: '228.87', unit: 'USD' }), deltaValue({ value: '+0.66%', tone: 'success', basisId: 'cells-basis' }), rowIdentity({ symbol: 'ASTR', name: 'Aster Systems', href: '#company' })],
  ['Negative', numericValue({ value: '−24.60', unit: 'USD' }), deltaValue({ value: '−2.01%', tone: 'danger', basisId: 'cells-basis' }), rowIdentity({ symbol: 'CEDR', name: 'Cedar Infrastructure Holdings International' })],
  ['Zero', numericValue({ value: '0.00', unit: 'USD' }), deltaValue({ value: '0.00%', tone: 'success', basisId: 'cells-basis' }), rowIdentity({ symbol: 'TEST', name: '会社の長い名前', logo: DEMO_LOGO })],
  ['Missing', numericValue(), deltaValue(), rowIdentity({ symbol: 'NONE', name: 'No logo available' })],
  ['Neutral', numericValue({ value: '1,000,000.00', unit: 'USD' }), deltaValue({ value: '+1.20%', basisId: 'cells-basis' }), rowIdentity({ symbol: 'FLAT', name: 'Flat Materials' })],
].map(cells => `<tr>${cells.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`), play: ({ canvasElement }) => initRowIdentity(canvasElement) };
export const FilterStates = { render: () => pad(`<div style="display:grid;gap:var(--space-8)"><section><h2>Applied filters</h2><div data-filter-host>${filterBar({ filters })}</div></section><section><h2>Nothing chosen yet</h2>${filterBar({ label: 'Unset filter example', filters: [{ id: 'listing', label: 'Listing', items: [{ label: 'Any listing', value: '' }, { label: 'Primary', value: 'Primary' }] }] })}</section><section><h2>Open filter</h2>${filterBar({ label: 'Open filter example', filters: [{ ...filters[0], open: true }] })}</section><section style="margin-top:var(--space-16)"><h2>Disabled</h2>${filterBar({ filters, disabled: true })}</section><section><h2>Refreshing</h2>${filterBar({ filters, busy: true })}</section><section><h2>No applied filters</h2><p>The bar draws nothing: with no chip to clear, the clear action is not offered.</p>${filterBar()}</section></div>`), play: ({ canvasElement }) => {
  const host = canvasElement.querySelector('[data-filter-host]'); let state = filters;
  const controller = initFilterBar(host, { filters: state });
  host.addEventListener('ui-filter-remove', e => { state = state.filter(f => f.id !== e.detail.id); controller.update({ filters: state }); });
  host.addEventListener('ui-filter-clear', () => { state = []; controller.update({ filters: state }); });
  host.addEventListener('ui-filter-change', e => { state = state.map(f => f.id === e.detail.id ? { ...f, value: e.detail.value } : f); controller.update({ filters: state }); });
} };
export const Views = { render: () => pad(segmented({ options: [{ label: 'Overview', value: 'overview' }, { label: 'Performance', value: 'performance' }, { label: 'Unavailable', value: 'unavailable', disabled: true }], appearance: 'underline', ariaLabel: 'Dataset view' })), play: ({ canvasElement }) => initSegmented(canvasElement) };
