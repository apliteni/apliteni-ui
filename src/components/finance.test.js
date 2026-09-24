import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { filterBar, initFilterBar } from './filter-bar.js';
import { segmented } from './index.js';
import { initSegmented } from './segmented.js';
import { numericValue, deltaValue, rowIdentity, initRowIdentity } from './table-values.js';
const filters = [{ id: 'sector', label: 'Sector', value: 'Technology', items: [{ label: 'Energy', value: 'energy' }] }, { id: 'market', label: 'Market', value: 'US', items: [] }];
function setup(html) { const dom = new JSDOM(`<div id="host">${html}</div>`, { pretendToBeVisual: true }); globalThis.document = dom.window.document; return { dom, host: document.querySelector('#host') }; }
test('values preserve zero, escape data, and never judge missing or flat changes', () => {
  assert.match(numericValue({ value: 0, unit: 'USD' }), />0</);
  assert.match(numericValue(), /Not available/);
  assert.match(numericValue({ value: '<img>', unit: '<script>' }), /&lt;img&gt;/);
  assert.doesNotMatch(deltaValue({ value: null, tone: 'danger' }), /--danger/);
  assert.doesNotMatch(deltaValue({ value: '0.00%', tone: 'success' }), /--success/);
  assert.doesNotMatch(deltaValue({ value: '0,00 %', tone: 'danger' }), /--danger/);
  assert.match(deltaValue({ value: '−2%', tone: 'success' }), /--success/);
  assert.doesNotMatch(deltaValue({ value: '+2%' }), /--success/);
});
test('filter removal is controlled and update recovers focus through the last chip', () => {
  const { dom, host } = setup(filterBar({ filters })); const bar = initFilterBar(host, { filters });
  let requested; host.addEventListener('ui-filter-remove', e => { requested = e.detail.id; });
  const remove = host.querySelector('[data-filter-remove]'); remove.focus(); remove.click();
  assert.equal(requested, 'sector'); assert.equal(host.querySelectorAll('[data-filter-id]').length, 2);
  bar.update({ filters: [filters[1]] }); assert.equal(document.activeElement.closest('[data-filter-id]').dataset.filterId, 'market');
  bar.update({ filters: [] }); assert.equal(document.activeElement, host.querySelector('[data-filter-bar]'));
  bar.destroy(); dom.window.close();
});
test('Dropdown selection reports the filter id and value after its own close', async () => {
  const { dom, host } = setup(filterBar({ filters })); const bar = initFilterBar(host, { filters });
  let result; host.addEventListener('ui-filter-change', e => { result = e.detail; });
  host.querySelector('[data-dropdown-trigger]').click(); host.querySelector('[data-dd-item]').click();
  await Promise.resolve(); assert.deepEqual(result, { id: 'sector', value: 'energy' });
  assert.equal(host.querySelector('[data-dropdown-trigger]').getAttribute('aria-expanded'), 'false');
  bar.update({ filters, busy: true }); result = undefined;
  host.querySelector('[data-filter-remove]').click(); assert.equal(result, undefined);
  bar.destroy(); dom.window.close();
});
test('segmented arrows wrap, skip disabled options and emit once after repeated initialization', () => {
  const { dom, host } = setup(segmented({ options: [{ label: 'A', value: 'a' }, { label: 'B', value: 'b', disabled: true }, { label: 'C', value: 'c' }], appearance: 'underline' }));
  const dispose = initSegmented(host); initSegmented(host); let calls = 0;
  host.addEventListener('ui-segment-change', () => calls++);
  host.querySelector('button').dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
  assert.equal(document.activeElement.dataset.value, 'c'); assert.equal(calls, 1);
  document.activeElement.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
  assert.equal(document.activeElement.dataset.value, 'a'); dispose(); dom.window.close();
});
test('broken identity logo exposes a fallback without losing the full company name', () => {
  const { dom, host } = setup(rowIdentity({ symbol: 'ASTR', name: 'Aster Systems', logo: '/missing.png', href: '/aster' }));
  initRowIdentity(host); host.querySelector('img').dispatchEvent(new dom.window.Event('error'));
  assert.equal(host.querySelector('img').hidden, true); assert.match(host.textContent, /Aster Systems/); dom.window.close();
});
