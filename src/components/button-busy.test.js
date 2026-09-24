import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { button } from './index.js';
import { setButtonBusy } from './button-busy.js';

function setup(options) {
  return new JSDOM(button({ label: 'Save', icon: 'check', ...options })).window.document.querySelector('.ui-btn');
}

test('busy updates preserve the control, icons and previous disabled state', () => {
  for (const disabled of [false, true]) {
    const el = setup({ disabled });
    const icon = el.querySelector('svg');
    setButtonBusy(el, { busy: true, label: 'Saving…' });
    assert.equal(el.disabled, disabled);
    assert.equal(el.getAttribute('aria-busy'), 'true');
    assert.equal(el.querySelector('.ui-btn__label-old').textContent, 'Save');
    assert.equal(el.querySelector('.ui-btn__label-old').getAttribute('aria-hidden'), 'true');
    setButtonBusy(el, { busy: true, label: 'Almost done' });
    assert.equal(el.querySelectorAll('.ui-btn__label-old').length, 1);
    assert.equal(el.querySelectorAll('.ui-btn__bars').length, 1);
    setButtonBusy(el, { busy: false, label: 'Saved' });
    assert.equal(el.disabled, disabled);
    assert.equal(el.querySelector('svg'), icon);
    assert.equal(el.querySelector('.ui-btn__bars'), null);
    el.querySelector('.ui-btn__label').dispatchEvent(new el.ownerDocument.defaultView.Event('animationend'));
    assert.equal(el.querySelector('.ui-btn__label-old'), null);
  }
});

test('reduced motion replaces text immediately without an outgoing copy', () => {
  const previous = globalThis.matchMedia;
  globalThis.matchMedia = () => ({ matches: true });
  try {
    const el = setup();
    setButtonBusy(el, { busy: true, label: '<Saving>' });
    assert.equal(el.querySelector('.ui-btn__label').textContent, '<Saving>');
    assert.equal(el.querySelector('.ui-btn__label-old'), null);
    assert.equal(el.querySelector('saving'), null);
  } finally { globalThis.matchMedia = previous; }
});

test('icon-only updates the accessible name without adding visible text', () => {
  const el = setup({ iconOnly: true });
  setButtonBusy(el, { busy: true, label: 'Saving' });
  assert.equal(el.getAttribute('aria-label'), 'Saving');
  assert.equal(el.querySelector('.ui-btn__label'), null);
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

test('wired busy keeps focus, blocks activation, and announces new labels outside the button', () => {
  const el = setup();
  const win = el.ownerDocument.defaultView;
  let clicks = 0;
  let keys = 0;
  el.addEventListener('click', () => clicks++);
  el.addEventListener('keydown', () => keys++);
  el.focus();
  const status = el.nextElementSibling;
  assert.equal(status.getAttribute('aria-live'), 'polite');
  assert.equal(status.textContent, '');
  setButtonBusy(el, { busy: true, label: 'Saving' });
  assert.equal(el.ownerDocument.activeElement, el);
  assert.equal(el.disabled, false);
  assert.equal(el.getAttribute('aria-disabled'), 'true');
  assert.equal(status.textContent, 'Saving');
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
  setButtonBusy(el, { busy: false, label: 'Saved' });
  assert.equal(status.textContent, 'Saved');
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
