import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { wireTopbar, themeToggle } from './topbar.js';
import { initFilterBar } from './filter-bar.js';
import { wirePagination, pagination } from './pagination.js';

function mount(t, html) {
  const dom = new JSDOM(`<!doctype html><body>${html}</body>`, { pretendToBeVisual: true });
  for (const key of ['document', 'window', 'HTMLElement', 'getComputedStyle']) {
    const old = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { configurable: true, value: dom.window[key] });
    t.after(() => old ? Object.defineProperty(globalThis, key, old) : delete globalThis[key]);
  }
  t.after(() => dom.window.close());
  return dom.window.document;
}

test('topbar wired twice toggles once; either teardown stops it and allows reinitialization', t => {
  const doc = mount(t, themeToggle());
  doc.documentElement.dataset.theme = 'dark';
  const first = wireTopbar(doc.body);
  const second = wireTopbar(doc.body);
  const button = doc.querySelector('button');
  button.click();
  assert.equal(doc.documentElement.dataset.theme, 'light');
  second(); button.click();
  assert.equal(doc.documentElement.dataset.theme, 'light');
  const third = wireTopbar(doc.body);
  first(); // A stale handle must not remove the new binding.
  button.click();
  assert.equal(doc.documentElement.dataset.theme, 'dark');
  third(); third();
});

test('filter bar wiring twice emits one removal and destroy removes nested dropdown listeners', t => {
  const doc = mount(t, '<main></main>');
  const host = doc.querySelector('main');
  const options = { filters: [{ id: 'status', label: 'Status', value: 'Open', items: [] }] };
  const first = initFilterBar(host, options);
  const second = initFilterBar(host, options);
  let count = 0;
  host.addEventListener('ui-filter-remove', () => count++);
  host.querySelector('[data-filter-remove]').click();
  assert.equal(count, 1);
  second.destroy();
  host.querySelector('[data-filter-remove]').click();
  assert.equal(count, 1);
  host.querySelector('[data-dropdown-trigger]').click();
  assert.equal(host.querySelector('[data-dropdown]').classList.contains('open'), false);
  first.destroy();
});

test('pagination wired twice calls one callback and the returned teardown stops it', t => {
  const doc = mount(t, pagination({ total: 100, pageSize: 10, page: 1, variant: 'pages' }));
  let count = 0;
  wirePagination(doc.body, { onPage: () => count++ });
  const stop = wirePagination(doc.body, { onPage: () => count++ });
  const button = doc.querySelector('.ui-pager__step[data-page="2"]');
  assert.ok(button);
  button.click(); assert.equal(count, 1);
  stop(); button.click(); assert.equal(count, 1);
});

import { wireDropdown, dropdown } from './dropdown.js';
import { initTabs, tabs } from './tabs.js';
import { initSegmented } from './segmented.js';
import { segmented } from './index.js';
import { initRowIdentity, rowIdentity } from './table-values.js';
import { wireDrawer, drawer } from './drawer.js';
import { wireConfirm, confirm } from './confirm.js';
import { wireCommandPalette, commandPalette } from './command-palette.js';
import { wireTooltip } from './tooltip.js';
import { wireNav } from './nav.js';
import { wireShell } from './shell.js';
import { wireFeedback, feedbackWidget } from './feedback.js';

// Observe listener ownership directly, including document/window listeners. DOM behavior
// tests above cover the user-visible duplicate; this catches otherwise silent teardown leaks.
for (const [name, wire, markup] of [
  ['dropdown', wireDropdown, dropdown({ label: 'Menu', items: [{ label: 'One' }] })],
  ['tabs', initTabs, tabs({ items: [{ label: 'One' }, { label: 'Two' }] })],
  ['segmented', initSegmented, segmented({ items: [{ label: 'One', value: 'one' }, { label: 'Two', value: 'two' }] })],
  ['row identity', initRowIdentity, rowIdentity({ symbol: 'A', logo: '/logo.svg' })],
  ['drawer', wireDrawer, drawer({ id: 'drawer' })],
  ['confirm', wireConfirm, confirm({ id: 'confirm' })],
  ['open drawer', wireDrawer, drawer({ id: 'open-drawer', open: true })],
  ['command palette', wireCommandPalette, commandPalette({ id: 'palette' })],
  ['tooltip', wireTooltip, '<div data-tip-host><button data-tip-value="1">One</button></div>'],
  ['nav', wireNav, '<nav></nav>'],
  ['shell', wireShell, '<div class="ui-app"></div>'],
  ['feedback', () => wireFeedback(), `<main></main>${feedbackWidget()}`],
]) {
  test(`${name}: repeat wiring adds no listeners; teardown releases its listeners and can rewire`, t => {
    const doc = mount(t, markup);
    // Warm jsdom's selector engine before tracking component-owned registrations.
    doc.querySelectorAll('*'); doc.defaultView.getComputedStyle(doc.body);
    const proto = doc.defaultView.EventTarget.prototype;
    const add = proto.addEventListener, remove = proto.removeEventListener;
    const live = [];
    proto.addEventListener = function(type, listener, options) {
      live.push({ target: this, type, listener, capture: typeof options === 'boolean' ? options : !!options?.capture });
      return add.call(this, type, listener, options);
    };
    proto.removeEventListener = function(type, listener, options) {
      const capture = typeof options === 'boolean' ? options : !!options?.capture;
      const index = live.findIndex(x => x.target === this && x.type === type && x.listener === listener && x.capture === capture);
      if (index >= 0) live.splice(index, 1);
      return remove.call(this, type, listener, options);
    };
    t.after(() => { proto.addEventListener = add; proto.removeEventListener = remove; });
    const first = wire(doc.body);
    const count = live.length;
    assert.ok(count > 0, 'fixture exercises listener binding');
    const second = wire(doc.body);
    assert.equal(live.length, count, 'repeat initialization adds no listeners');
    assert.equal(typeof second, 'function', 'returns teardown');
    second(); first();
    assert.deepEqual(live.map(x => x.type), [], 'all owned listeners removed');
    const third = wire(doc.body);
    const rewired = live.length;
    assert.ok(rewired > 0, 'same DOM can be initialized again');
    first(); assert.equal(live.length, rewired, 'stale teardown leaves new instance alone');
    third(); assert.equal(live.length, 0);
  });
}

import { wireToastStack, pushToast } from './toasts.js';
import { wireSuccess, success } from './success.js';

test('toast stack keeps its element return and gains teardown for listeners and timers, including pushed toasts', t => {
  const doc = mount(t, '<div id="stack"></div>');
  const stack = doc.querySelector('#stack');
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const toast = pushToast(stack, { title: 'Saved', timer: 5 });
  assert.equal(wireToastStack(stack), stack);
  assert.equal(wireToastStack(stack), stack);
  assert.equal(typeof stack.destroy, 'function');
  stack.destroy(); stack.destroy();
  toast.querySelector('.ui-toast__close').click();
  t.mock.timers.tick(6000);
  assert.equal(toast.isConnected, true);
  assert.equal(toast.dataset.leaving, undefined);
});

test('success initialized twice counts down once and teardown cancels its timer', t => {
  const doc = mount(t, success({ countdown: { seconds: 3 } }));
  assert.ok(doc.querySelector('[data-sx-count]'));
  t.mock.timers.enable({ apis: ['setInterval'] });
  let done = 0;
  const first = wireSuccess(doc.body, { onDone: () => done++ });
  const second = wireSuccess(doc.body, { onDone: () => done++ });
  t.mock.timers.tick(3000);
  assert.equal(done, 1);
  second(); first();
  const third = wireSuccess(doc.body, { onDone: () => done++ });
  third(); t.mock.timers.tick(6000);
  assert.equal(done, 1);
});

test('dropdown teardown restores its portal, releases observer, and leaves a sibling working', t => {
  const doc = mount(t, `<main>${dropdown({ label: 'One', portal: true })}</main><aside>${dropdown({ label: 'Two' })}</aside>`);
  let observing = 0;
  const prior = globalThis.ResizeObserver;
  globalThis.ResizeObserver = class { observe() { observing++; } disconnect() { observing--; } };
  t.after(() => { if (prior) globalThis.ResizeObserver = prior; else delete globalThis.ResizeObserver; });
  const host = doc.querySelector('main'), other = doc.querySelector('aside');
  const dd = host.querySelector('[data-dropdown]');
  const panel = dd.querySelector('[data-dropdown-panel]');
  const stop = wireDropdown(host), stopOther = wireDropdown(other);
  assert.equal(panel.parentNode, doc.body); assert.equal(observing, 1);
  host.querySelector('button').click(); assert.equal(dd.classList.contains('open'), true);
  stop(); assert.equal(panel.parentNode, dd); assert.equal(observing, 0);
  assert.equal(dd.classList.contains('open'), false);
  other.querySelector('button').click();
  assert.equal(other.querySelector('[data-dropdown]').classList.contains('open'), true);
  doc.body.click();
  assert.equal(other.querySelector('[data-dropdown]').classList.contains('open'), false);
  stopOther();
});


test('pagination delegation survives replacement without rewiring', t => {
  const doc = mount(t, '<main></main>');
  const host = doc.querySelector('main');
  const seen = [];
  const stop = wirePagination(host, { onPage: page => seen.push(page) });
  host.innerHTML = pagination({ total: 100, pageSize: 10 });
  host.querySelector('.ui-pager__step[data-page="2"]').click();
  host.innerHTML = pagination({ total: 100, pageSize: 10, page: 2 });
  host.querySelector('.ui-pager__step[data-page="3"]').click();
  assert.deepEqual(seen, [2, 3]);
  stop();
});
