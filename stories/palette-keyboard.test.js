// Keyboard gate for commandPalette() — the half axe cannot see.
//
// Same method as stories/confirm-keyboard.test.js: build the real markup, wire
// it with the kit's own wiring, dispatch real KeyboardEvents, and assert what
// moved. A palette is a keyboard component before it is anything else — it is
// opened with a key, driven with keys and answered with a key — and every
// attribute on it can be perfect while none of that works.
//
// The one thing this cannot see is the same thing the drawer gate cannot: JSDOM
// has no layout, so a focus() that a real browser would refuse (a panel still
// `visibility: hidden` in that frame) lands here. The stylesheet rules that
// decide it are read as text in stories/overlay-css.test.js instead.
//
// Every test here should fail if you delete the behaviour it names.

import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html lang="en"><body></body></html>', { pretendToBeVisual: true });
for (const key of ['window', 'document', 'navigator', 'Node', 'Element', 'HTMLElement', 'Event', 'KeyboardEvent', 'MouseEvent', 'CustomEvent']) {
  Object.defineProperty(globalThis, key, { value: dom.window[key] ?? dom.window, configurable: true, writable: true });
}

const { commandPalette, wireCommandPalette } = await import('../src/components/command-palette.js');
const { confirm, wireConfirm } = await import('../src/components/confirm.js');

const doc = dom.window.document;

const GROUPS = [
  {
    label: 'Actions',
    items: [
      { id: 'new-campaign', label: 'New campaign', icon: 'plus' },
      { id: 'invite', label: 'Invite a teammate', icon: 'user' },
      { id: 'export', label: 'Export rows', icon: 'download', disabled: true },
    ],
  },
  {
    label: 'Go to',
    items: [
      { id: 'reports', label: 'Reports', icon: 'chart' },
      { id: 'settings', label: 'Settings', icon: 'gear', keywords: ['preferences'] },
    ],
  },
];

// A trigger, a text box outside the palette, and the palette itself — so
// "focus went back where it came from" and "the reader was typing elsewhere"
// are both things a test can reach for.
function mount(id, extra = '') {
  const host = doc.createElement('div');
  host.innerHTML = `<button type="button" id="${id}-trigger" data-cmdk-open="${id}">Search</button>`
    + `<input id="${id}-field" type="text">`
    + commandPalette({ id, groups: GROUPS })
    + extra;
  doc.body.replaceChildren(host);
  wireCommandPalette(host);
  wireConfirm(host);
  return host;
}

const press = (el, key, opts = {}) =>
  el.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...opts }));
const click = (el) => el.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true, cancelable: true }));
const type = (input, value) => {
  input.value = value;
  input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
};
const active = () => doc.activeElement;
const activeRow = (root) => root.querySelector('[data-cmdk-item].is-active');
const labelOf = (row) => row && row.querySelector('.ui-cmdk__label').textContent;

// ---- Opening -------------------------------------------------------------

test('Cmd+K opens the palette and focus lands in the text box', () => {
  const host = mount('pk-open');
  const root = doc.getElementById('pk-open');
  doc.getElementById('pk-open-trigger').focus();
  press(doc.body, 'k', { metaKey: true });

  assert.equal(root.classList.contains('is-open'), true, 'the palette opened');
  assert.equal(active(), root.querySelector('[data-cmdk-input]'), 'focus is in the text box');
  assert.notEqual(active(), doc.body);
});

test('Ctrl+K in a text box is left to the text box; Cmd+K is answered anywhere', () => {
  mount('pk-field');
  const root = doc.getElementById('pk-field');
  const field = doc.getElementById('pk-field-field');

  field.focus();
  press(field, 'k', { ctrlKey: true });
  assert.equal(root.classList.contains('is-open'), false, 'Ctrl+K is kill-to-end-of-line here');

  press(field, 'k', { metaKey: true });
  assert.equal(root.classList.contains('is-open'), true, 'Cmd+K is nothing else\'s key');
});

test('a trigger opens it too, and the palette opens empty', () => {
  const host = mount('pk-empty');
  const root = doc.getElementById('pk-empty');
  const trigger = doc.getElementById('pk-empty-trigger');
  trigger.focus();
  click(trigger);
  type(root.querySelector('[data-cmdk-input]'), 'settings');
  press(root, 'Escape');
  click(trigger);

  assert.equal(root.querySelector('[data-cmdk-input]').value, '', 'a palette that comes back '
    + 'holding the last query answers a question the reader has finished asking');
  assert.equal(labelOf(activeRow(root)), 'New campaign', 'and it is back at the top of the list');
  assert.ok(host);
});

// ---- Moving --------------------------------------------------------------

test('the arrows move the active row while DOM focus stays in the text box', () => {
  mount('pk-move');
  const root = doc.getElementById('pk-move');
  const input = root.querySelector('[data-cmdk-input]');
  press(doc.body, 'k', { metaKey: true });

  assert.equal(labelOf(activeRow(root)), 'New campaign', 'the first row is active on open');
  press(input, 'ArrowDown');
  assert.equal(labelOf(activeRow(root)), 'Invite a teammate');
  assert.equal(active(), input, 'the caret never leaves the text box — that is the combobox pattern');
  assert.equal(input.getAttribute('aria-activedescendant'), activeRow(root).id,
    'and the row it is on is named by aria-activedescendant, which is all a screen reader has');
  assert.equal(activeRow(root).getAttribute('aria-selected'), 'true');
});

test('a disabled row is stepped over rather than landed on', () => {
  mount('pk-skip');
  const root = doc.getElementById('pk-skip');
  const input = root.querySelector('[data-cmdk-input]');
  press(doc.body, 'k', { metaKey: true });
  press(input, 'ArrowDown');
  press(input, 'ArrowDown');

  assert.equal(labelOf(activeRow(root)), 'Reports', 'Export rows is disabled and is not a stop');
});

test('the list wraps at both ends', () => {
  mount('pk-wrap');
  const root = doc.getElementById('pk-wrap');
  const input = root.querySelector('[data-cmdk-input]');
  press(doc.body, 'k', { metaKey: true });

  press(input, 'ArrowUp');
  assert.equal(labelOf(activeRow(root)), 'Settings', 'up from the first row is the last one');
  press(input, 'ArrowDown');
  assert.equal(labelOf(activeRow(root)), 'New campaign', 'and down from the last is the first');
});

test('typing moves the active row to the best answer, never leaving it on a hidden one', () => {
  mount('pk-retype');
  const root = doc.getElementById('pk-retype');
  const input = root.querySelector('[data-cmdk-input]');
  press(doc.body, 'k', { metaKey: true });
  press(input, 'ArrowDown');
  press(input, 'ArrowDown');

  type(input, 'settings');
  assert.equal(labelOf(activeRow(root)), 'Settings');
  assert.equal(activeRow(root).hidden, false);
});

test('with nothing matching there is no active row, and nothing for Enter to run', () => {
  mount('pk-none');
  const root = doc.getElementById('pk-none');
  const input = root.querySelector('[data-cmdk-input]');
  const ran = [];
  root.addEventListener('ui-command', (e) => ran.push(e.detail.id));
  press(doc.body, 'k', { metaKey: true });

  type(input, 'zzzz');
  assert.equal(activeRow(root), null);
  assert.equal(input.getAttribute('aria-activedescendant'), null);

  press(input, 'Enter');
  assert.deepEqual(ran, [], 'Enter on an empty list must not run the row that was active before it');
  assert.equal(root.classList.contains('is-open'), true);
});

// ---- Answering -----------------------------------------------------------

test('Enter runs the active row and closes the palette', () => {
  mount('pk-enter');
  const root = doc.getElementById('pk-enter');
  const input = root.querySelector('[data-cmdk-input]');
  const ran = [];
  root.addEventListener('ui-command', (e) => ran.push(e.detail.id));

  doc.getElementById('pk-enter-trigger').focus();
  press(doc.body, 'k', { metaKey: true });
  type(input, 'invite');
  press(input, 'Enter');

  assert.deepEqual(ran, ['invite']);
  assert.equal(root.classList.contains('is-open'), false);
});

test('Escape closes it, with a query typed, and hands focus back to the opener', () => {
  mount('pk-esc');
  const root = doc.getElementById('pk-esc');
  const trigger = doc.getElementById('pk-esc-trigger');
  trigger.focus();
  click(trigger);
  type(root.querySelector('[data-cmdk-input]'), 'rep');

  press(root.querySelector('[data-cmdk-input]'), 'Escape');

  assert.equal(root.classList.contains('is-open'), false, 'one Escape closes it whatever is typed');
  assert.equal(active(), trigger, 'and the reader is put back where they were');
});

test('Tab does not walk out of the palette', () => {
  mount('pk-tab');
  const root = doc.getElementById('pk-tab');
  const input = root.querySelector('[data-cmdk-input]');
  press(doc.body, 'k', { metaKey: true });

  press(input, 'Tab');
  assert.ok(root.contains(active()), 'the overlay stack traps Tab, so the page behind is unreachable');
  press(input, 'Tab', { shiftKey: true });
  assert.ok(root.contains(active()));
});

test('the page behind is inert while it is open, and is handed back when it closes', () => {
  mount('pk-inert');
  const root = doc.getElementById('pk-inert');
  const field = doc.getElementById('pk-inert-field');
  press(doc.body, 'k', { metaKey: true });

  assert.equal(field.hasAttribute('inert'), true, 'nothing behind the palette is reachable');
  press(root.querySelector('[data-cmdk-input]'), 'Escape');
  assert.equal(field.hasAttribute('inert'), false, 'and it all comes back');
});

// ---- The confirm the palette opens ---------------------------------------

test('Escape answers the confirm a row opened, and leaves the palette standing', () => {
  mount('pk-confirm', confirm({
    id: 'pk-confirm-dialog',
    title: 'Delete the workspace?',
    body: 'Its 42 API keys stop working immediately.',
    confirmLabel: 'Delete workspace',
    cancelLabel: 'Keep it',
  }));
  const root = doc.getElementById('pk-confirm');
  const dialog = doc.getElementById('pk-confirm-dialog');
  // A destructive row is only ever added by a caller who has a confirm to name.
  const row = root.querySelector('[data-cmdk-item]');
  row.setAttribute('data-confirm-open', 'pk-confirm-dialog');

  press(doc.body, 'k', { metaKey: true });
  click(row);

  assert.equal(dialog.classList.contains('is-open'), true, 'the question is up');
  assert.equal(root.classList.contains('is-open'), true, 'over a palette that did not vanish');

  press(doc.body, 'Escape');
  assert.equal(dialog.classList.contains('is-open'), false, 'one Escape answers the top overlay');
  assert.equal(root.classList.contains('is-open'), true, 'and only the top one');
});

// ---- What a screen reader is told ----------------------------------------

test('the count is announced politely, and the rows are not', () => {
  mount('pk-say');
  const root = doc.getElementById('pk-say');
  const input = root.querySelector('[data-cmdk-input]');
  const status = root.querySelector('[data-cmdk-status]');
  press(doc.body, 'k', { metaKey: true });

  assert.equal(status.getAttribute('role'), 'status');
  assert.equal(status.getAttribute('aria-live'), 'polite');
  assert.equal(status.className, 'ui-sr', 'the sighted reader is already looking at the list');

  type(input, 'settings');
  assert.equal(status.textContent, '1 result', 'the count, and never the rows: a live region '
    + 'holding the list would read all of it out again on every keystroke');
  type(input, 'zzzz');
  assert.equal(status.textContent, 'No results');
});
