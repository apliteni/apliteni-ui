import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { filterBar, initFilterBar } from './filter-bar.js';
import { filterChipText, filterChipName, filterChipUnset, nextFocusStop } from '../logic/filter-bar.js';
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
// Markup only: which control the factory writes, not how it looks.
test('the clear action is offered only once there is something to clear', () => {
  const { dom, host } = setup(filterBar({ filters: [] }));
  assert.equal(host.querySelector('[data-filter-clear]'), null, 'an empty bar offers no clear action');
  assert.equal(host.querySelectorAll('.ui-filter-bar button').length, 0);
  host.innerHTML = filterBar({ filters });
  const clear = host.querySelector('[data-filter-clear] button');
  assert.ok(clear, 'the first chip brings the clear action back');
  assert.equal(clear.disabled, false, 'it is live, so it may not be drawn as unavailable');
  // The bordered skin, not the ghost one: a live action beside two chips has to
  // read as live. This asserts the class the sheet paints, not the colour.
  assert.ok(clear.classList.contains('ui-btn--secondary'), `clear carries ${clear.className}`);
  assert.equal(clear.classList.contains('ui-btn--ghost'), false);
  // A disabled or busy bar still offers it — the fieldset turns it off natively,
  // so nothing jumps out of the row while a refresh is in flight.
  host.innerHTML = filterBar({ filters, busy: true });
  assert.ok(host.querySelector('[data-filter-clear] button'), 'a busy bar keeps the row it had');
  dom.window.close();
});
test('filter removal is controlled and update recovers focus through the last chip', () => {
  const { dom, host } = setup(filterBar({ filters })); const bar = initFilterBar(host, { filters });
  let requested; host.addEventListener('ui-filter-remove', e => { requested = e.detail.id; });
  const remove = host.querySelector('[data-filter-remove]'); remove.focus(); remove.click();
  assert.equal(requested, 'sector'); assert.equal(host.querySelectorAll('[data-filter-id]').length, 2);
  bar.update({ filters: [filters[1]] }); assert.equal(document.activeElement.closest('[data-filter-id]').dataset.filterId, 'market');
  // Chips left, every control in them turned off by the fieldset: the bar still
  // draws a box, so the ring may sit on the bar itself.
  bar.update({ filters, disabled: true });
  assert.equal(document.activeElement, host.querySelector('[data-filter-bar]'));
  bar.destroy(); dom.window.close();
});
// Which control holds the focus, not whether it draws a box: JSDOM has no
// layout. The geometry — the emptied fieldset measuring 0 high — is measured in
// a browser and reported in the pull request.
test('an emptied bar hands the focus to the action beside it, never to its own empty box', () => {
  for (const empty of [bar => bar.update({ filters: [] }), bar => bar.update({ filters: [], busy: true })]) {
    const { dom, host } = setup(filterBar({ filters }));
    const add = document.createElement('button'); add.type = 'button'; add.textContent = 'Add filter';
    host.after(add);
    const bar = initFilterBar(host, { filters });
    host.querySelector('[data-filter-clear] button').focus();
    empty(bar);
    assert.equal(host.querySelector('[data-filter-clear]'), null, 'the clear action left with the last chip');
    assert.equal(document.activeElement, add, `focus went to ${document.activeElement.outerHTML}`);
    // And the bar it left is the thing with nothing in it to focus.
    assert.equal(host.querySelectorAll('[data-filter-bar] button').length, 0);
    bar.destroy(); dom.window.close();
  }
});
// Each of these leaves a control in the document, as a tab stop, with a box a
// browser can still measure — and refuses `focus()`. Before #527's last round the
// bar handed the focus to the first one it found and the request was dropped on
// the floor: the focus ended on BODY, with no ring on anything and the next Tab
// starting over at the top of the page, while Add filter stood there available.
// Which control ends up focused, not what it looks like: JSDOM has no layout.
const OUT_OF_REACH = {
  'a hidden ancestor': el => { el.parentElement.hidden = true; },
  'hidden itself': el => { el.hidden = true; },
  'visibility: hidden': el => { el.style.visibility = 'hidden'; },
  'a visibility: hidden ancestor': el => { el.parentElement.style.visibility = 'hidden'; },
  'display: none': el => { el.style.display = 'none'; },
  inert: el => { el.setAttribute('inert', ''); },
  'an inert ancestor': el => { el.parentElement.setAttribute('inert', ''); },
  disabled: el => { el.disabled = true; },
  'a disabled fieldset': el => { el.closest('fieldset').disabled = true; },
  'out of the tab order': el => { el.tabIndex = -1; },
};
test('an emptied bar walks past a next control no reader could reach', () => {
  for (const [how, hide] of Object.entries(OUT_OF_REACH)) {
    const { dom, host } = setup(filterBar({ filters }));
    // The shape the review reproduced: something unreachable standing between the
    // bar and the action that is actually available.
    const wrap = document.createElement('fieldset');
    wrap.innerHTML = '<button type="button">Export</button>';
    host.after(wrap);
    const add = document.createElement('button'); add.type = 'button'; add.textContent = 'Add filter';
    wrap.after(add);
    hide(wrap.querySelector('button'));
    const bar = initFilterBar(host, { filters });
    host.querySelector('[data-filter-clear] button').focus();
    bar.update({ filters: [] });
    assert.equal(document.activeElement, add, `${how}: focus went to ${document.activeElement.tagName}`);
    // And the exported answer a consumer reads agrees with where the focus went.
    assert.equal(nextFocusStop(host), add, `${how}: nextFocusStop disagrees with the bar`);
    bar.destroy(); dom.window.close();
  }
});
// The belt the list above is the braces for. `focus()` is a request: a control can
// be visible, enabled, in the tab order and still not take it, and nothing throws
// when it does not. So the bar checks where the focus actually landed.
test('a control that is asked for the focus and does not take it is passed over', () => {
  const { dom, host } = setup(filterBar({ filters }));
  const refuses = document.createElement('button');
  refuses.type = 'button'; refuses.textContent = 'Export';
  Object.defineProperty(refuses, 'focus', { value: () => {} });
  host.after(refuses);
  const add = document.createElement('button'); add.type = 'button'; add.textContent = 'Add filter';
  refuses.after(add);
  const bar = initFilterBar(host, { filters });
  host.querySelector('[data-filter-clear] button').focus();
  bar.update({ filters: [] });
  assert.equal(document.activeElement, add, `focus went to ${document.activeElement.tagName}`);
  bar.destroy(); dom.window.close();
});
// The other end of it: with every control around the bar out of reach there is
// nothing to hand the focus to, and the emptied 0-high fieldset is still not a
// substitute for one. The focus goes nowhere rather than onto an empty box.
test('an emptied bar with nothing reachable beside it keeps the ring off its own box', () => {
  const { dom, host } = setup(filterBar({ filters }));
  const hidden = document.createElement('button');
  hidden.type = 'button'; hidden.textContent = 'Export'; hidden.style.visibility = 'hidden';
  host.after(hidden);
  const bar = initFilterBar(host, { filters });
  host.querySelector('[data-filter-clear] button').focus();
  bar.update({ filters: [] });
  assert.equal(document.activeElement, document.body, `focus went to ${document.activeElement.outerHTML}`);
  assert.equal(nextFocusStop(host), null, 'the exported answer offers a control a reader cannot reach');
  bar.destroy(); dom.window.close();
});
test('the last chip removed by keyboard moves the focus out of the bar', () => {
  const { dom, host } = setup(filterBar({ filters: [filters[0]] }));
  const add = document.createElement('button'); add.type = 'button'; add.textContent = 'Add filter';
  host.after(add);
  const bar = initFilterBar(host, { filters: [filters[0]] });
  const remove = host.querySelector('[data-filter-remove]'); remove.focus(); remove.click();
  bar.update({ filters: [] });
  assert.equal(document.activeElement, add);
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
