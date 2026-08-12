// Keyboard gate for confirm() — the half axe cannot see.
//
// Same method as stories/keyboard.test.js: build the real markup, wire it with
// the kit's own wiring, dispatch real KeyboardEvents, assert what
// document.activeElement became afterwards. A confirmation whose focus never
// arrives, or whose Tab walks out of the question, is a confirmation only for
// people using a mouse — and axe passes it clean either way, because every
// attribute it reads is correct.
//
// Every test here should fail if you delete the behaviour it names.

import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html lang="en"><body></body></html>', { pretendToBeVisual: true });
for (const key of ['window', 'document', 'navigator', 'Node', 'Element', 'HTMLElement', 'Event', 'KeyboardEvent', 'MouseEvent']) {
  Object.defineProperty(globalThis, key, { value: dom.window[key] ?? dom.window, configurable: true, writable: true });
}

const { confirm, wireConfirm, openConfirm, closeConfirm } = await import('../src/components/confirm.js');
const { button } = await import('../src/components/index.js');

const doc = dom.window.document;

const TITLE = 'Delete the “Nebula” workspace?';
const BODY = 'Its 42 API keys stop working immediately. Nothing restores them.';

// A trigger and a control outside the dialog, so "focus left the confirm" is
// something a test can reach for.
function mount(id) {
  const host = doc.createElement('div');
  host.innerHTML =
    button({ label: 'Delete workspace', variant: 'danger' })
      .replace('<button ', `<button id="${id}-trigger" data-confirm-open="${id}" `)
    + confirm({ id, title: TITLE, body: BODY, confirmLabel: 'Delete workspace', cancelLabel: 'Keep it' })
    + `<button type="button" id="${id}-outside">Outside</button>`;
  doc.body.replaceChildren(host);
  wireConfirm(host);
  return host;
}

const press = (el, key, opts = {}) =>
  el.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...opts }));
const click = (el) => el.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true, cancelable: true }));
const active = () => doc.activeElement;

// ---- Opening: focus arrives, and it arrives on the safe answer ------------

test('a [data-confirm-open] trigger opens the dialog and focus lands on the safe action', () => {
  const host = mount('ck-open');
  const trigger = doc.getElementById('ck-open-trigger');
  trigger.focus();
  click(trigger);

  assert.equal(host.querySelector('[data-confirm]').classList.contains('is-open'), true, 'the dialog opened');
  assert.equal(active(), host.querySelector('[data-confirm-cancel]'), 'focus is on the answer that changes nothing');
  assert.notEqual(active(), host.querySelector('[data-confirm-accept]'), 'never on the destructive one');
  assert.notEqual(active(), doc.body, 'and never on <body>');
});

test('openConfirm() moves focus into the panel without a trigger element', () => {
  const host = mount('ck-api');
  openConfirm(host.querySelector('[data-confirm]'));
  assert.ok(host.querySelector('[data-confirm-panel]').contains(active()), 'focus is inside the panel');
});

// ---- The trap: Tab wraps both ways ---------------------------------------

test('Tab off the last control wraps to the first — focus cannot leave the question', () => {
  const host = mount('ck-tab');
  click(doc.getElementById('ck-tab-trigger'));
  const cancel = host.querySelector('[data-confirm-cancel]');
  const accept = host.querySelector('[data-confirm-accept]');

  accept.focus();
  assert.equal(press(active(), 'Tab'), false, 'Tab off the last control is intercepted');
  assert.equal(active(), cancel, 'and wraps back to the first');
});

test('Shift+Tab off the first control wraps to the last', () => {
  const host = mount('ck-shift');
  click(doc.getElementById('ck-shift-trigger'));
  const cancel = host.querySelector('[data-confirm-cancel]');
  const accept = host.querySelector('[data-confirm-accept]');

  cancel.focus();
  assert.equal(press(active(), 'Tab', { shiftKey: true }), false, 'Shift+Tab off the first is intercepted');
  assert.equal(active(), accept, 'and wraps to the last');
});

test('everything outside the open dialog is inert, and reachable again once it closes', () => {
  const host = mount('ck-inert');
  const outside = doc.getElementById('ck-inert-outside');
  click(doc.getElementById('ck-inert-trigger'));
  assert.equal(outside.hasAttribute('inert'), true, 'the page behind cannot be tabbed into');
  assert.equal(outside.getAttribute('aria-hidden'), 'true', 'nor read by a screen reader');

  closeConfirm(host.querySelector('[data-confirm]'));
  assert.equal(outside.hasAttribute('inert'), false, 'and it is handed back on close');
  assert.equal(outside.hasAttribute('aria-hidden'), false);
});

// ---- Escape and the return trip ------------------------------------------

test('Escape cancels and hands focus back to the trigger', () => {
  const host = mount('ck-esc');
  const trigger = doc.getElementById('ck-esc-trigger');
  trigger.focus();
  click(trigger);

  press(active(), 'Escape');
  assert.equal(host.querySelector('[data-confirm]').classList.contains('is-open'), false, 'Escape closed it');
  assert.equal(active(), trigger, 'and focus went back where it came from');
});

test('either answer closes it and returns focus to the trigger', () => {
  const host = mount('ck-answer');
  const trigger = doc.getElementById('ck-answer-trigger');
  for (const answer of ['[data-confirm-cancel]', '[data-confirm-accept]']) {
    trigger.focus();
    click(trigger);
    click(host.querySelector(answer));
    assert.equal(host.querySelector('[data-confirm]').classList.contains('is-open'), false, `${answer} closed it`);
    assert.equal(active(), trigger, `${answer} returned focus`);
  }
});

test('a scrim click cancels — the click that misses is the harmless answer', () => {
  const host = mount('ck-scrim');
  const trigger = doc.getElementById('ck-scrim-trigger');
  trigger.focus();
  click(trigger);
  click(host.querySelector('[data-confirm-scrim]'));
  assert.equal(host.querySelector('[data-confirm]').classList.contains('is-open'), false);
  assert.equal(active(), trigger);
});

// ---- What it announces ----------------------------------------------------

test('it announces itself as an alertdialog, named by the question and described by the consequence', () => {
  const host = mount('ck-aria');
  const panel = host.querySelector('[data-confirm-panel]');
  assert.equal(panel.getAttribute('role'), 'alertdialog', 'a confirm is an alertdialog, not a plain dialog');
  assert.equal(panel.getAttribute('aria-modal'), 'true');

  const named = host.querySelector(`#${panel.getAttribute('aria-labelledby')}`);
  const described = host.querySelector(`#${panel.getAttribute('aria-describedby')}`);
  assert.match(named.textContent, /Delete the .Nebula. workspace/, 'the name is the question');
  assert.match(described.textContent, /Nothing restores them/, 'the description is the consequence');
});

test('two confirms on one page do not share ids', () => {
  const host = doc.createElement('div');
  host.innerHTML = confirm({ id: 'c-one', title: 'First?', body: 'One.' })
    + confirm({ id: 'c-two', title: 'Second?', body: 'Two.' });
  const [a, b] = host.querySelectorAll('[data-confirm-panel]');
  assert.notEqual(a.getAttribute('aria-labelledby'), b.getAttribute('aria-labelledby'));
  assert.notEqual(a.getAttribute('aria-describedby'), b.getAttribute('aria-describedby'));
});

test('the destructive answer is the danger button, and the safe one is not', () => {
  const host = mount('ck-variant');
  assert.match(host.querySelector('[data-confirm-accept]').className, /ui-btn--danger/);
  assert.doesNotMatch(host.querySelector('[data-confirm-cancel]').className, /ui-btn--danger/);
});

test('wireConfirm() is safe to call twice — Storybook re-renders', () => {
  const host = mount('ck-twice');
  wireConfirm(host);
  const trigger = doc.getElementById('ck-twice-trigger');
  trigger.focus();
  click(trigger);
  press(active(), 'Escape');
  assert.equal(host.querySelector('[data-confirm]').classList.contains('is-open'), false, 'one open, one close');
  assert.equal(active(), trigger);
});
