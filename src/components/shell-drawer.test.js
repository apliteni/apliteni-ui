import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM, VirtualConsole } from 'jsdom';
import { appShell, wireShell } from './shell.js';

const quiet = new VirtualConsole();
quiet.on('jsdomError', () => {});

const SHELL = (o = {}) => appShell({
  word: 'Finance',
  nav: [
    { id: 'dashboard', icon: 'chart', label: 'Dashboard', href: '#dashboard' },
    { icon: 'card', label: 'Payouts', items: [{ id: 'pending', icon: 'clock', label: 'Pending', href: '#pending' }] },
  ],
  active: 'pending',
  account: { name: 'Ada Lovelace', email: 'ada@apliteni.com' },
  signOutHref: '#logout',
  ...o,
});

function mount(html) {
  const dom = new JSDOM(`<!doctype html><html><body>${html}</body></html>`, { pretendToBeVisual: true, virtualConsole: quiet });
  const { window } = dom;
  global.document = window.document;
  global.HTMLElement = window.HTMLElement;
  wireShell(window.document, { persist: false });
  return window;
}

test('the menu control is the kit\'s ghost icon button, named Menu, and it opens the shell\'s own drawer', () => {
  const { document: doc } = mount(SHELL());
  const menu = doc.querySelector('.ui-app__menu');
  assert.ok(menu, 'the shell draws no menu control');
  assert.equal(menu.tagName, 'BUTTON');
  assert.equal(menu.getAttribute('aria-label'), 'Menu');
  assert.ok(menu.classList.contains('ui-btn--ghost') || menu.className.includes('ghost'), 'the menu control is not a ghost button');
  assert.ok(menu.querySelector('svg'), 'the menu control carries no glyph');
  const drawer = doc.getElementById(menu.getAttribute('data-drawer-open'));
  assert.ok(drawer?.classList.contains('ui-drawer--left'), 'the control does not point at a left drawer');
  assert.ok(doc.querySelector('.ui-app__bar--phone').contains(menu), 'the control is not in the phone band');
});

test('the menu control opens the drawer, and Escape closes it and returns focus to the control', () => {
  const win = mount(SHELL());
  const doc = win.document;
  const menu = doc.querySelector('.ui-app__menu');
  const drawer = doc.getElementById(menu.getAttribute('data-drawer-open'));
  menu.focus();
  menu.click();
  assert.ok(drawer.classList.contains('is-open'), 'the control did not open the drawer');
  doc.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  assert.ok(!drawer.classList.contains('is-open'), 'Escape left the drawer open');
  assert.equal(doc.activeElement, menu, 'focus did not return to the menu control');
});

test('a press on a page in the drawer closes it, and a press on a group head does not', () => {
  const win = mount(SHELL());
  const doc = win.document;
  const menu = doc.querySelector('.ui-app__menu');
  const drawer = doc.getElementById(menu.getAttribute('data-drawer-open'));
  menu.click();
  drawer.querySelector('.ui-nav__toggle').click();
  assert.ok(drawer.classList.contains('is-open'), 'a group head closed the drawer, so its children are out of reach');
  const link = drawer.querySelector('a.ui-nav__item[href="#dashboard"]');
  assert.ok(link, 'the drawer lost the dashboard row');
  link.addEventListener('click', (e) => e.preventDefault());
  link.click();
  assert.ok(!drawer.classList.contains('is-open'), 'a press on a page left the drawer open over it');
  assert.equal(doc.activeElement, menu, 'focus did not return to the menu control');
});

test('the drawer\'s current row keeps one plate and no accent mark', () => {
  const { document: doc } = mount(SHELL());
  const current = doc.querySelectorAll('.ui-app__drawer [aria-current="page"]');
  assert.equal(current.length, 1, 'the drawer marks more than one current page');
  assert.ok(current[0].classList.contains('is-active'));
});

test('the drawer closes when the window grows past the phone width', () => {
  const win = mount(SHELL());
  const doc = win.document;
  const menu = doc.querySelector('.ui-app__menu');
  const drawer = doc.getElementById(menu.getAttribute('data-drawer-open'));
  menu.click();
  assert.ok(drawer.classList.contains('is-open'));
  // No stylesheet is loaded, so the wrapper is drawn: the drawer stays open on a resize.
  win.dispatchEvent(new win.Event('resize'));
  assert.ok(drawer.classList.contains('is-open'), 'a resize closed a drawer that is still drawn');
  drawer.parentElement.style.display = 'none';
  win.dispatchEvent(new win.Event('resize'));
  assert.ok(!drawer.classList.contains('is-open'), 'a drawer that is no longer drawn still holds the page inert');
});

test('the banded layout puts the menu control at the start of its one band, with no phone band of its own', () => {
  const { document: doc } = mount(SHELL({ layout: 'topbar', search: 'cmdk-1' }));
  const bar = doc.querySelector('.ui-app__bar');
  assert.ok(bar.firstElementChild.classList.contains('ui-app__menu'), 'the menu control does not lead the band');
  assert.equal(doc.querySelector('.ui-app__bar--phone'), null, 'a second band stands over the page');
  assert.equal(doc.querySelectorAll('.ui-app__drawer .ui-app__user').length, 0, 'the account block stands in the band and again in the drawer');
});

test('a page with the compatibility topbar gets the menu control inside that bar', () => {
  const { document: doc } = mount(SHELL({ topbar: { word: 'Finance' } }));
  assert.ok(doc.querySelector('.topbar .ui-app__menu'), 'the product bar carries no menu control');
  assert.equal(doc.querySelector('.ui-app__bar--phone'), null, 'a second band stands over the page');
  assert.equal(doc.querySelectorAll('.ui-app__menu').length, 1);
});
