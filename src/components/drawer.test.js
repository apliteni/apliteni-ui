import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM, VirtualConsole } from 'jsdom';
import { drawer, wireDrawer, openDrawer, closeDrawer } from './drawer.js';

const quiet = new VirtualConsole();
quiet.on('jsdomError', () => {});

// A fresh document per test with a trigger + a drawer, wired. Globals are set so
// drawer.js (which reads document/HTMLElement) runs against this DOM.
function mount(drawerHtml, page = '') {
  const dom = new JSDOM(
    `<!doctype html><html><body>` +
    `<main id="page"><h1>Page</h1><button id="trigger" data-drawer-open="d1">Open</button>${page}</main>` +
    drawerHtml +
    `</body></html>`,
    { pretendToBeVisual: true, virtualConsole: quiet },
  );
  const { window } = dom;
  // Expose the jsdom globals drawer.js references.
  global.document = window.document;
  global.HTMLElement = window.HTMLElement;
  wireDrawer(window.document);
  return window;
}

// --- markup / a11y contract ----------------------------------------------
test('drawer() emits role=dialog + aria-modal and names itself from the title', () => {
  const html = drawer({ side: 'left', title: 'Filters' });
  assert.match(html, /role="dialog"/);
  assert.match(html, /aria-modal="true"/);
  assert.match(html, /aria-labelledby="drawer-title-\d+"/);
  assert.match(html, /class="ui-drawer__title" id="drawer-title-\d+"/);
  assert.match(html, /ui-drawer--left/);
});

test('drawer() with no title falls back to aria-label', () => {
  const html = drawer({ ariaLabel: 'Quick panel', dismissible: false });
  assert.match(html, /aria-label="Quick panel"/);
  assert.match(html, /data-drawer-static/);
  assert.doesNotMatch(html, /data-drawer-close/); // no close button when not dismissible
});

test('sides + sizes render as modifier classes', () => {
  assert.match(drawer({ side: 'top', size: 'lg' }), /ui-drawer--top/);
  assert.match(drawer({ side: 'top', size: 'lg' }), /ui-drawer--lg/);
});

// --- wiring: open / close / scrim / Esc / focus return --------------------
test('a [data-drawer-open] trigger opens the drawer and moves focus in', () => {
  const win = mount(drawer({ id: 'd1', title: 'Filters', body: '<input id="f1">' }));
  const dr = win.document.querySelector('[data-drawer]');
  win.document.getElementById('trigger').click();
  assert.ok(dr.classList.contains('is-open'), 'drawer opened');
  // Focus landed on the first focusable control inside the panel (the close button).
  assert.equal(win.document.activeElement, win.document.querySelector('[data-drawer-close]'));
  // Background is inert + aria-hidden while open.
  const page = win.document.getElementById('page');
  assert.equal(page.getAttribute('aria-hidden'), 'true');
});

test('scrim click closes and returns focus to the trigger', () => {
  const win = mount(drawer({ id: 'd1', title: 'Filters', body: '<input id="f1">' }));
  const trigger = win.document.getElementById('trigger');
  trigger.click();
  win.document.querySelector('[data-drawer-scrim]').click();
  const dr = win.document.querySelector('[data-drawer]');
  assert.ok(!dr.classList.contains('is-open'), 'drawer closed on scrim click');
  assert.equal(win.document.activeElement, trigger, 'focus returned to trigger');
  assert.equal(win.document.getElementById('page').getAttribute('aria-hidden'), null,
    'background aria-hidden restored on close');
});

test('Esc closes the open drawer', () => {
  const win = mount(drawer({ id: 'd1', title: 'Filters', body: '<input id="f1">' }));
  win.document.getElementById('trigger').click();
  const dr = win.document.querySelector('[data-drawer]');
  dr.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  assert.ok(!dr.classList.contains('is-open'), 'drawer closed on Esc');
});

test('close button closes the drawer', () => {
  const win = mount(drawer({ id: 'd1', title: 'Filters', body: '<input id="f1">' }));
  win.document.getElementById('trigger').click();
  win.document.querySelector('[data-drawer-close]').click();
  assert.ok(!win.document.querySelector('[data-drawer]').classList.contains('is-open'));
});

test('a static (non-dismissible) drawer ignores scrim + Esc', () => {
  const win = mount(drawer({ id: 'd1', title: 'Locked', body: '<input id="f1">', dismissible: false }));
  const dr = win.document.querySelector('[data-drawer]');
  openDrawer(dr);
  win.document.querySelector('[data-drawer-scrim]').click();
  dr.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  assert.ok(dr.classList.contains('is-open'), 'static drawer stays open');
  closeDrawer(dr); // programmatic close still works
  assert.ok(!dr.classList.contains('is-open'));
});

test('Tab wraps from last focusable back to the first (focus trap)', () => {
  const body = '<input id="a"><input id="b"><button id="c">go</button>';
  const win = mount(drawer({ id: 'd1', title: 'Trap', body }));
  const dr = win.document.querySelector('[data-drawer]');
  win.document.getElementById('trigger').click();
  // Focusables inside the panel: the close button, a, b, c. Focus the last one…
  const last = win.document.getElementById('c');
  last.focus();
  dr.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
  // …Tab wraps back to the first focusable (the header close button).
  assert.equal(win.document.activeElement, win.document.querySelector('[data-drawer-close]'));
});
