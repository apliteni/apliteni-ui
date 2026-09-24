import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { button } from './index.js';
import { success } from './success.js';
import { setButtonBusy } from './button-busy.js';

function setup(options) {
  return new JSDOM(button({ label: 'Save', icon: 'check', ...options })).window.document.querySelector('.ui-btn');
}

test('busy preserves labels, icons and disabled state and uses three decorative dots', () => {
  for (const disabled of [false, true]) {
    const el = setup({ disabled });
    const icon = el.querySelector('svg');
    const label = el.querySelector('.ui-btn__label');
    for (let cycle = 0; cycle < 2; cycle++) {
      setButtonBusy(el, { busy: true });
      setButtonBusy(el, { busy: true });
      assert.equal(el.disabled, disabled);
      assert.equal(el.getAttribute('aria-busy'), 'true');
      assert.equal(el.querySelector('.ui-btn__label'), label);
      assert.equal(label.textContent, 'Save');
      assert.equal(el.querySelectorAll('.ui-btn__dots').length, 1);
      assert.equal(el.querySelectorAll('.ui-btn__dots i').length, 3);
      assert.equal(el.querySelector('.ui-btn__dots').getAttribute('aria-hidden'), 'true');
      setButtonBusy(el, { busy: false });
      assert.equal(el.disabled, disabled);
      assert.equal(el.querySelector('svg'), icon);
      assert.equal(el.querySelector('.ui-btn__dots'), null);
    }
  }
});

test('icon-only keeps its accessible name without adding visible text', () => {
  const el = setup({ iconOnly: true });
  setButtonBusy(el, { busy: true });
  assert.equal(el.getAttribute('aria-label'), 'Save');
  assert.equal(el.querySelector('.ui-btn__label'), null);
  assert.equal(el.querySelectorAll('.ui-btn__dots i').length, 3);
});

test('clearing busy twice preserves an originally disabled control', () => {
  const el = setup({ disabled: true });
  setButtonBusy(el, { busy: false });
  assert.equal(el.disabled, true);
  setButtonBusy(el, { busy: true });
  setButtonBusy(el, { busy: false });
  setButtonBusy(el, { busy: false });
  assert.equal(el.disabled, true);
});

test('wired busy keeps focus, blocks activation, and announces progress outside the button', async () => {
  const el = setup();
  const win = el.ownerDocument.defaultView;
  let clicks = 0;
  let keys = 0;
  el.addEventListener('click', () => clicks++);
  el.addEventListener('keydown', () => keys++);
  el.focus();
  assert.equal(el.nextElementSibling, null);
  setButtonBusy(el, { busy: true });
  const status = el.nextElementSibling;
  assert.equal(status.getAttribute('aria-live'), 'polite');
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(el.ownerDocument.activeElement, el);
  assert.equal(el.disabled, false);
  assert.equal(el.getAttribute('aria-disabled'), 'true');
  assert.equal(status.textContent, 'Save: in progress');
  assert.equal(el.querySelector('[role="status"]'), null);
  el.click();
  for (const key of ['Enter', ' ']) {
    for (const type of ['keydown', 'keyup']) {
      const event = new win.KeyboardEvent(type, { key, bubbles: true, cancelable: true });
      assert.equal(el.dispatchEvent(event), false);
    }
  }
  assert.equal(clicks, 0);
  assert.equal(keys, 0);
  setButtonBusy(el, { busy: false });
  assert.equal(status.textContent, 'Save: complete');
  assert.equal(el.ownerDocument.activeElement, el);
  el.click();
  assert.equal(clicks, 1);
});

test('wiring static busy removes only the native busy fallback', () => {
  for (const disabled of [false, true]) {
    const el = setup({ busy: true, disabled });
    assert.equal(el.disabled, true);
    setButtonBusy(el, { busy: true });
    assert.equal(el.disabled, disabled);
    setButtonBusy(el, { busy: false });
    assert.equal(el.disabled, disabled);
  }
});

test('idle factories omit status regions; busy wiring creates one even without a new label', async () => {
  const idle = setup();
  assert.equal(idle.ownerDocument.querySelectorAll('[role="status"]').length, 0);
  setButtonBusy(idle, { busy: true });
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(idle.nextElementSibling.textContent, 'Save: in progress');
  setButtonBusy(idle, { busy: true });
  assert.equal(idle.ownerDocument.querySelectorAll('[role="status"]').length, 1);
  const busy = setup({ busy: true });
  assert.equal(busy.ownerDocument.querySelectorAll('[role="status"]').length, 1);
});

test('success action buttons do not nest status regions inside the success announcement', () => {
  const doc = new JSDOM(success({ actions: [{ label: 'Continue' }, { label: 'Back' }] })).window.document;
  assert.equal(doc.querySelectorAll('[role="status"]').length, 1);
  assert.equal(doc.querySelector('[role="status"] [role="status"]'), null);
});
