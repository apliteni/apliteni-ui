// The dropdown's search field: what typing, the arrows, Enter and Escape do,
// and what a query with no match shows. Real markup, the kit's own wiring and
// real events, then the DOM is read back.
//
// why: docs/specification.md#a-dropdown-with-a-search-field

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM, VirtualConsole } from 'jsdom';
import { dropdown, wireDropdown } from './dropdown.js';

const quiet = new VirtualConsole();
quiet.on('jsdomError', () => {});

function mount(html) {
  const dom = new JSDOM(`<!doctype html><html><body><main id="page">${html}</main></body></html>`, {
    pretendToBeVisual: true, virtualConsole: quiet,
  });
  const { window } = dom;
  for (const key of ['window', 'document', 'HTMLElement', 'Element', 'Node', 'getComputedStyle']) {
    Object.defineProperty(globalThis, key, { value: window[key] ?? window, configurable: true, writable: true });
  }
  wireDropdown(window.document);
  const doc = window.document;
  const q = (sel) => doc.querySelector(sel);
  return {
    window, doc,
    trigger: q('[data-dropdown-trigger]'),
    field: q('[data-dd-search]'),
    dd: q('[data-dropdown]'),
    rows: () => [...doc.querySelectorAll('[data-dd-item]')],
    shown: () => [...doc.querySelectorAll('[data-dd-item]')].filter((r) => !r.hidden).map((r) => r.textContent),
    active: () => doc.querySelector('[data-dd-item].is-active')?.textContent ?? null,
    none: () => q('[data-dd-none]').textContent,
  };
}

const click = (m, el) => el.dispatchEvent(new m.window.MouseEvent('click', { bubbles: true, cancelable: true }));
const press = (m, el, key) => el.dispatchEvent(new m.window.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
const type = (m, text) => { m.field.value = text; m.field.dispatchEvent(new m.window.Event('input', { bubbles: true })); };

const ITEMS = [
  { label: 'Australian dollar (AUD)', value: 'AUD' },
  { label: 'Euro (EUR)', value: 'EUR', selected: true },
  { label: 'Hong Kong dollar (HKD)', value: 'HKD', disabled: true },
  { label: 'Polish złoty (PLN)', value: 'PLN' },
  { label: 'US dollar (USD)', value: 'USD' },
];
const searchable = (extra = {}) => dropdown({ label: 'currency:', ariaLabel: 'Currency', items: ITEMS, search: true, ...extra });

// ---- The markup ----------------------------------------------------------

test('a dropdown without search emits none of the search markup', () => {
  const html = dropdown({ label: 'currency:', ariaLabel: 'Currency', items: ITEMS, scroll: true });
  for (const hook of ['data-dd-search', 'ui-dropdown__list', 'ui-dropdown__none', 'aria-haspopup="dialog"', 'role="dialog"', ' id="', ' hidden']) {
    assert.ok(!html.includes(hook), `${hook} leaked into the plain dropdown`);
  }
  assert.match(html, /class="ui-dropdown__panel is-scroll" data-dropdown-panel role="listbox"/);
});

test('the field is a combobox that controls the listbox, and each row can be named by it', () => {
  const m = mount(searchable({ id: 'cur' }));
  const list = m.doc.getElementById(m.field.getAttribute('aria-controls'));
  assert.equal(m.field.getAttribute('role'), 'combobox');
  assert.equal(m.field.getAttribute('aria-expanded'), 'true');
  assert.equal(list?.getAttribute('role'), 'listbox', 'aria-controls resolves to the listbox');
  assert.equal(m.field.getAttribute('aria-label'), 'Search Currency');
  assert.ok(m.rows().every((r) => r.id && r.getAttribute('role') === 'option'), 'every row is an option with an id');
  // A listbox may own options and groups only, so the field sits in a dialog.
  assert.equal(m.doc.querySelector('[data-dropdown-panel]').getAttribute('role'), 'dialog');
  assert.equal(m.trigger.getAttribute('aria-haspopup'), 'dialog');
  assert.equal(list.contains(m.field), false);
});

test('two search dropdowns on one page get distinct ids', () => {
  const m = mount(searchable() + searchable());
  const ids = [...m.doc.querySelectorAll('[data-dd-item]')].map((r) => r.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('a preset query hides what it does not match, anywhere in the label, and needs no wiring', () => {
  const html = searchable({ search: { query: 'dollar' } });
  const dom = new JSDOM(html);
  const shown = [...dom.window.document.querySelectorAll('[data-dd-item]:not([hidden])')].map((r) => r.textContent);
  assert.deepEqual(shown, ['Australian dollar (AUD)', 'Hong Kong dollar (HKD)', 'US dollar (USD)']);
});

// Found in Chromium, where jsdom cannot look: with `visibility` transitioned on
// open, the panel is still `hidden` when the field is focused, and the focus is
// lost. So the open search panel transitions everything but visibility.
test('the open search panel does not transition visibility, so the field can take focus', () => {
  const css = readFileSync(new URL('../styles/dropdown.css', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const open = [...css.matchAll(/([^{}]+)\{([^}]*)\}/g)]
    .filter(([, sel]) => /\.ui-dropdown\.open \.ui-dropdown__panel--search/.test(sel) && /\.ui-dropdown__panel--search\.is-open/.test(sel));
  assert.equal(open.length, 1, 'one rule opens the search panel, in place and portalled');
  const property = /transition-property\s*:([^;]*)/.exec(open[0][2])?.[1] ?? '';
  assert.ok(property.includes('opacity') && !/visibility/.test(property), `transition-property: ${property.trim()}`);
});

// ---- Typing filters ------------------------------------------------------

test('opening puts focus in the field with the selected row active', () => {
  const m = mount(searchable());
  click(m, m.trigger);
  assert.equal(m.doc.activeElement, m.field);
  assert.equal(m.active(), 'Euro (EUR)');
  assert.equal(m.field.getAttribute('aria-activedescendant'), m.doc.querySelector('.is-active').id);
});

test('ArrowDown on the closed trigger opens into the field too', () => {
  const m = mount(searchable());
  press(m, m.trigger, 'ArrowDown');
  assert.ok(m.dd.classList.contains('open'));
  assert.equal(m.doc.activeElement, m.field);
});

test('typing filters the rows and makes the first match active', () => {
  const m = mount(searchable());
  click(m, m.trigger);
  type(m, 'dollar');
  assert.deepEqual(m.shown(), ['Australian dollar (AUD)', 'Hong Kong dollar (HKD)', 'US dollar (USD)']);
  assert.equal(m.active(), 'Australian dollar (AUD)');
  assert.equal(m.doc.activeElement, m.field, 'focus never leaves the field');
});

test('the match ignores case and accents', () => {
  const m = mount(searchable());
  click(m, m.trigger);
  type(m, 'ZLOTY');
  assert.deepEqual(m.shown(), ['Polish złoty (PLN)']);
  type(m, '  usd ');
  assert.deepEqual(m.shown(), ['US dollar (USD)'], 'surrounding spaces are not part of the query');
});

// ---- Arrows move through the filtered set --------------------------------

test('the arrows walk only the rows still showing, skip a disabled one, and wrap', () => {
  const m = mount(searchable());
  click(m, m.trigger);
  type(m, 'dollar');
  press(m, m.field, 'ArrowDown');
  assert.equal(m.active(), 'US dollar (USD)', 'Hong Kong is disabled, so the next row is US');
  press(m, m.field, 'ArrowDown');
  assert.equal(m.active(), 'Australian dollar (AUD)', 'and it wraps to the top');
  press(m, m.field, 'ArrowUp');
  assert.equal(m.active(), 'US dollar (USD)', 'ArrowUp wraps to the bottom');
  assert.equal(m.doc.activeElement, m.field);
});

test('the pointer moves the active row, and a move that goes nowhere does not', () => {
  const m = mount(searchable());
  click(m, m.trigger);
  const move = (el, x, y) => el.dispatchEvent(new m.window.MouseEvent('mousemove', { bubbles: true, clientX: x, clientY: y }));
  const row = (v) => m.doc.querySelector(`[data-value="${v}"]`);
  move(row('PLN'), 10, 40);
  assert.equal(m.active(), 'Polish złoty (PLN)');
  move(row('HKD'), 10, 30);
  assert.equal(m.active(), 'Polish złoty (PLN)', 'a disabled row is never active');
  press(m, m.field, 'ArrowDown');
  assert.equal(m.active(), 'US dollar (USD)');
  move(row('AUD'), 10, 30);
  assert.equal(m.active(), 'US dollar (USD)', 'the same point again is the browser after a scroll');
  press(m, m.field, 'Enter');
  assert.equal(m.trigger.querySelector('.ui-dropdown__value').textContent, 'US dollar (USD)');
});

test('Home and End are left to the text field', () => {
  const m = mount(searchable());
  click(m, m.trigger);
  type(m, 'euro');
  assert.equal(press(m, m.field, 'Home'), true, 'Home is not cancelled');
  assert.equal(press(m, m.field, 'End'), true, 'End is not cancelled');
});

// ---- Enter selects, Escape closes ----------------------------------------

test('Enter picks the active row, writes it into the trigger and closes', () => {
  const m = mount(searchable());
  click(m, m.trigger);
  type(m, 'dollar');
  press(m, m.field, 'ArrowDown');
  press(m, m.field, 'Enter');
  assert.equal(m.trigger.querySelector('.ui-dropdown__value').textContent, 'US dollar (USD)');
  assert.equal(m.doc.querySelector('[data-value="USD"]').getAttribute('aria-selected'), 'true');
  assert.equal(m.doc.querySelector('[data-value="EUR"]').getAttribute('aria-selected'), 'false');
  assert.equal(m.dd.classList.contains('open'), false);
  assert.equal(m.doc.activeElement, m.trigger);
});

test('Escape closes and gives focus back to the trigger', () => {
  const m = mount(searchable());
  click(m, m.trigger);
  type(m, 'eu');
  press(m, m.field, 'Escape');
  assert.equal(m.dd.classList.contains('open'), false);
  assert.equal(m.trigger.getAttribute('aria-expanded'), 'false');
  assert.equal(m.doc.activeElement, m.trigger);
  assert.equal(m.trigger.querySelector('.ui-dropdown__value').textContent, 'Euro (EUR)', 'nothing was picked');
});

test('every open starts from the whole list', () => {
  const m = mount(searchable());
  click(m, m.trigger);
  type(m, 'zloty');
  press(m, m.field, 'Escape');
  click(m, m.trigger);
  assert.equal(m.field.value, '');
  assert.equal(m.shown().length, ITEMS.length);
  assert.equal(m.active(), 'Euro (EUR)');
});

// ---- No match ------------------------------------------------------------

test('a query with no match shows the empty state, and Enter picks nothing', () => {
  const m = mount(searchable());
  click(m, m.trigger);
  type(m, 'bitcoin');
  assert.deepEqual(m.shown(), []);
  assert.match(m.none(), /No match for “bitcoin”/);
  assert.equal(m.doc.querySelector('[data-dd-none]').getAttribute('role'), 'status', 'announced, not only painted');
  assert.equal(m.field.hasAttribute('aria-activedescendant'), false);
  press(m, m.field, 'Enter');
  assert.ok(m.dd.classList.contains('open'), 'Enter on nothing leaves the panel open');
  type(m, 'bit');
  type(m, '');
  assert.equal(m.none(), '', 'the empty state leaves once something matches');
});

test('the empty state takes a custom line, and a typed query is text, never markup', () => {
  const m = mount(searchable({ search: { empty: 'No currency matches “{q}”' } }));
  click(m, m.trigger);
  type(m, '<img src=x onerror=alert(1)> $&');
  assert.equal(m.doc.querySelector('[data-dd-none] img'), null);
  assert.match(m.none(), /^No currency matches “<img src=x onerror=alert\(1\)> \$&”/);
});

test('a preset query with no match renders the empty state before any wiring runs', () => {
  const dom = new JSDOM(searchable({ search: { query: 'bitcoin' } }));
  assert.match(dom.window.document.querySelector('[data-dd-none]').textContent, /No match for “bitcoin”/);
  const none = new JSDOM(searchable()).window.document.querySelector('[data-dd-none]');
  assert.equal(none.innerHTML, '', 'and nothing at all while every row shows, so :empty hides it');
});

// ---- Groups and separators -----------------------------------------------

test('a group with no match goes, and separators go while a query is in the field', () => {
  const m = mount(dropdown({
    ariaLabel: 'Account', search: true, variant: 'select',
    sections: [
      { label: 'Operating', items: [{ label: 'Payroll', value: 'p' }, '---', { label: 'Payables', value: 'a' }] },
      { label: 'Reserve', items: [{ label: 'Tax reserve', value: 't' }] },
    ],
  }));
  click(m, m.trigger);
  type(m, 'pay');
  const sections = [...m.doc.querySelectorAll('.ui-dropdown__section')];
  assert.deepEqual(sections.map((s) => s.hidden), [false, true]);
  assert.equal(m.doc.querySelector('.ui-dropdown__sep').hidden, true);
  type(m, '');
  assert.deepEqual(sections.map((s) => s.hidden), [false, false]);
  assert.equal(m.doc.querySelector('.ui-dropdown__sep').hidden, false);
});

// ---- Portalled -----------------------------------------------------------

test('a portalled search panel still filters and picks from the keyboard', () => {
  const m = mount(searchable({ portal: true }));
  assert.equal(m.doc.querySelector('[data-dropdown-panel]').parentElement, m.doc.body);
  const trigger = m.doc.querySelector('[data-dropdown-trigger]');
  trigger.getBoundingClientRect = () => ({ top: 20, bottom: 51, left: 40, right: 200, width: 160, height: 31 });
  click(m, trigger);
  const field = m.doc.querySelector('[data-dd-search]');
  assert.equal(m.doc.activeElement, field);
  field.value = 'pln';
  field.dispatchEvent(new m.window.Event('input', { bubbles: true }));
  press(m, field, 'Enter');
  assert.equal(trigger.querySelector('.ui-dropdown__value').textContent, 'Polish złoty (PLN)');
});
