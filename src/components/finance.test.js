import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { filterBar, initFilterBar } from './filter-bar.js';
import { filterChipText, filterChipName, filterChipUnset } from '../logic/filter-bar.js';
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
// These assertions check emitted classes and text, not browser colour or layout.
test('zero deltas stay neutral with currency and other unit suffixes', () => {
  for (const value of ['+0 EUR', '+0 €', '−0.00 %', '0', 0, '-0', '0.00%', '0,00 %', '+00.000 kg', '  +0\u00a0USD  ', '0ms', '0 m2']) {
    for (const tone of ['success', 'danger']) {
      const html = deltaValue({ value, tone });
      assert.doesNotMatch(html, /ui-delta--/, `${value}: ${tone}`);
      assert.ok(html.includes(`>${value}</span>`), 'preserves caller formatting');
    }
  }
});
test('non-zero deltas keep their caller-supplied judgement with unit suffixes', () => {
  for (const value of ['+0.5 EUR', '+10 EUR', '−0.01 %', '-0,5 €', '+00.001 kg', '0.0001', '10', '+0.5']) {
    for (const tone of ['success', 'danger']) {
      assert.match(deltaValue({ value, tone }), new RegExp(`ui-delta--${tone}`), String(value));
    }
  }
});
// Markup only: these read the strings the factory writes, not how a chip looks.
test('a chip prints its value alone and keeps its field in its accessible name', () => {
  const { dom, host } = setup(filterBar({ filters }));
  const [trigger] = host.querySelectorAll('[data-dropdown-trigger]');
  assert.equal(trigger.textContent.trim(), 'Technology');
  assert.equal(trigger.getAttribute('aria-label'), 'Sector: Technology');
  assert.equal(host.querySelector('.ui-dropdown__pre'), null, 'no field name beside the value');
  assert.equal(host.querySelector('[data-filter-id="sector"] legend').textContent, 'Sector');
  dom.window.close();
});
test('a chip with nothing chosen shows the field, says so, and takes the placeholder ink', () => {
  const { dom, host } = setup(filterBar({ filters: [{ id: 'sector', label: 'Sector', value: '', items: [] }] }));
  const trigger = host.querySelector('[data-dropdown-trigger]');
  assert.equal(trigger.textContent.trim(), 'Sector');
  assert.equal(trigger.getAttribute('aria-label'), 'Sector: any');
  // The hook the sheet paints with --muted; this asserts the class, not the colour.
  assert.ok(host.querySelector('.ui-dropdown__value.is-placeholder'), 'the valueless slot is marked');
  assert.equal(host.querySelectorAll('.ui-dropdown__value.is-placeholder').length, 1);
  dom.window.close();
});
test('a chip reads what the consumer answered with — value is display text', async () => {
  const { dom, host } = setup(filterBar({ filters })); const bar = initFilterBar(host, { filters });
  // The documented consumer: take the change, set it as the filter's value, update.
  host.addEventListener('ui-filter-change', e => bar.update({
    filters: filters.map(f => f.id === e.detail.id ? { ...f, value: e.detail.value } : f) }));
  host.querySelector('[data-dropdown-trigger]').click(); host.querySelector('[data-dd-item]').click();
  await Promise.resolve(); // the change is emitted in a microtask
  const settled = host.querySelector('[data-dropdown-trigger]');
  assert.equal(settled.textContent.trim(), 'energy', 'the chip settles on exactly what was answered');
  assert.equal(settled.getAttribute('aria-label'), 'Sector: energy');
  // So a consumer whose rows carry codes answers with the row's label instead.
  bar.update({ filters: [{ ...filters[0], value: 'Energy' }, filters[1]] });
  assert.equal(host.querySelector('[data-dropdown-trigger]').textContent.trim(), 'Energy');
  assert.equal(host.querySelector('.ui-dropdown__value.is-placeholder'), null);
  bar.destroy(); dom.window.close();
});
test('the shared pair never writes an absent field into a chip or its name', () => {
  assert.equal(filterChipText({}), '');
  assert.equal(filterChipName({ value: 'Tech' }), 'Tech');
  assert.equal(filterChipName({}), '');
  assert.equal(filterChipName({ label: 'Listing' }), 'Listing: any');
  assert.equal(filterChipText({ label: 'Listing' }), 'Listing');
  assert.equal(filterChipText({ label: 'Listing', value: 0 }), '0', 'zero is a value');
  assert.equal(filterChipUnset({ value: '' }), true);
  assert.equal(filterChipUnset({ value: 0 }), false);
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
  // The trigger's own optimistic text and the name it is read by stay together.
  assert.equal(host.querySelector('[data-dropdown-trigger]').textContent.trim(), 'Energy');
  assert.equal(host.querySelector('[data-dropdown-trigger]').getAttribute('aria-label'), 'Sector: Energy');
  assert.equal(host.querySelector('.ui-dropdown__value.is-placeholder'), null, 'a pick is not a placeholder');
  assert.equal(host.querySelector('[data-dropdown-trigger]').getAttribute('aria-expanded'), 'false');
  bar.update({ filters, busy: true }); result = undefined;
  host.querySelector('[data-filter-remove]').click(); assert.equal(result, undefined);
  bar.destroy(); dom.window.close();
});
// Markup only: the wash is drawn by CSS on .is-selected, which jsdom does not paint. What
// is held here is that the state is in the markup rather than only in the paint —
// aria-selected names the chosen row, and the check stays in the DOM as the mark a forced
// palette falls back to. src/styles/filter-bar-mark.test.js holds the CSS side.
test('the chip menu marks the current value and nothing else', () => {
  const chips = [
    { id: 'sector', label: 'Sector', value: 'Technology', items: [{ label: 'Technology', value: 'technology' }, { label: 'Energy', value: 'energy', selected: true }, { label: 'Technology', value: 'legacy' }] },
    { id: 'market', label: 'Market', value: 'us', items: [{ label: 'US', value: 'us' }, { label: 'EU', value: 'eu' }] },
    { id: 'plan', label: 'Plan', value: 'Gone', items: [{ label: 'Free', value: 'free' }] },
  ];
  const { dom, host } = setup(filterBar({ filters: chips }));
  const state = id => [...host.querySelectorAll(`[data-filter-id="${id}"] [data-dd-item]`)]
    .map(row => `${row.getAttribute('aria-selected')}${row.classList.contains('is-selected') ? '+' : ''}`);
  assert.deepEqual(state('sector'), ['true+', 'false', 'false'], 'the label match wins, once, over a stale selected');
  assert.deepEqual(state('market'), ['true+', 'false'], 'a value the consumer echoes back marks its row');
  assert.deepEqual(state('plan'), ['false'], 'a value no row carries marks nothing');
  assert.ok(host.querySelector('[data-filter-id="sector"] .is-selected .ui-dropdown__tick'),
    'the check is gone from the DOM, so a forced palette has nothing to fall back to');
  dom.window.close();
});
// Markup only, as above. These guard the pass-through in filterBarItems(): without it a
// '---' string spreads character by character into a blank selectable row. A null entry is
// not covered because dropdown.js reads `it.separator` before testing the entry, so the
// vanilla menu throws on one whatever filterBarItems does.
test('the chip menu leaves separators alone while it marks', () => {
  const chips = [
    { id: 'sector', label: 'Sector', value: 'Energy',
      items: [{ label: 'Technology', value: 'technology' }, '---', { label: 'Energy', value: 'energy' }, { separator: true }] },
  ];
  const { dom, host } = setup(filterBar({ filters: chips }));
  const chip = id => host.querySelector(`[data-filter-id="${id}"]`);
  assert.equal(chip('sector').querySelectorAll('[data-dd-item]').length, 2, 'two rows, and no row made out of a separator');
  assert.equal(chip('sector').querySelectorAll('.ui-dropdown__sep').length, 2, 'both separator spellings still draw a rule');
  assert.deepEqual([...chip('sector').querySelectorAll('[data-dd-item]')].map(row => row.getAttribute('aria-selected')),
    ['false', 'true'], 'the mark still lands on the row past the separator');
  dom.window.close();
});
// The labels differ from the numbers' string form on purpose: with label '2024' the label
// branch matches first and the value branch decides nothing, so the test proves nothing.
test('a numeric chip value marks the row carrying that number', () => {
  const chips = [{ id: 'year', label: 'Year', value: 2024, items: [{ label: 'FY 2023', value: 2023 }, { label: 'FY 2024', value: 2024 }] }];
  const { dom, host } = setup(filterBar({ filters: chips }));
  assert.deepEqual([...host.querySelectorAll('[data-filter-id="year"] [data-dd-item]')].map(row => row.getAttribute('aria-selected')),
    ['false', 'true'], 'the row value is compared as text, so the number 2024 finds its row');
  dom.window.close();
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
  assert.equal(host.querySelector('img').hidden, true); assert.match(host.textContent, /Aster Systems/);
  host.querySelector('img').dispatchEvent(new dom.window.Event('load')); assert.equal(host.querySelector('img').hidden, false);
  host.querySelector('img').dispatchEvent(new dom.window.Event('error')); assert.equal(host.querySelector('img').hidden, true); dom.window.close();
});
