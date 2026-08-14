// Keyboard + assistive-technology gate — the half axe cannot see.
//
// The a11y gate next door reads static markup and nothing else. #130 shipped a
// control that announced itself as a tablist, had no arrow keys and controlled
// no panel, and axe passed it clean everywhere — role="tablist" with role="tab"
// children satisfies every parent/child rule axe owns, and axe has no rule for
// "a tab that controls nothing".
//
// So this file presses keys and asserts what moved: real markup, the kit's own
// wiring, real KeyboardEvents, then document.activeElement and the announced
// state.
//
// why: CONTRIBUTING.md#a-rule-is-proven-by-the-mutation-that-kills-its-case

import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

// A DOM has to exist before the kit's wiring runs — initTabs() no-ops off-DOM by
// design, and wireDropdown() compares its scope against the global `document`.
const dom = new JSDOM('<!doctype html><html lang="en"><body></body></html>', { pretendToBeVisual: true });
for (const key of ['window', 'document', 'navigator', 'Node', 'Element', 'HTMLElement', 'Event', 'KeyboardEvent', 'MouseEvent']) {
  Object.defineProperty(globalThis, key, { value: dom.window[key] ?? dom.window, configurable: true, writable: true });
}

const { segmented, field, input, textarea } = await import('../src/components/index.js');
const { tabs, initTabs } = await import('../src/components/tabs.js');
const { wireTopbar } = await import('../src/components/topbar.js');

// Mount markup, wire it the way the preview decorator does, hand back the host.
function mount(html) {
  const host = dom.window.document.createElement('div');
  host.innerHTML = html;
  dom.window.document.body.replaceChildren(host);
  wireTopbar(host);
  initTabs(host);
  return host;
}

const press = (el, key) => el.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
const active = () => dom.window.document.activeElement;
const labels = (els) => Array.prototype.map.call(els, (b) => b.textContent);
const pressedOne = (btns) => Array.prototype.filter.call(btns, (b) => b.getAttribute('aria-pressed') === 'true');

// ---- segmented(): one Tab stop, arrows move ------------------------------

test('segmented() is a toolbar, not a tablist — it controls no panel, so it must not announce one', () => {
  const html = segmented({ options: ['Any', 'Verified', 'Pending'], active: 0, ariaLabel: 'Status' });
  assert.match(html, /role="toolbar"/);
  assert.match(html, /aria-label="Status"/);
  assert.doesNotMatch(html, /role="tablist"/);
  assert.doesNotMatch(html, /role="tab"/);
});

test('segmented() names itself even when the caller forgets', () => {
  assert.match(segmented({ options: ['A', 'B'] }), /role="toolbar" aria-label="[^"]+"/);
});

test('segmented() is ONE Tab stop, not one per option', () => {
  const host = mount(segmented({ options: ['Any', 'Verified', 'Pending'], active: 1, ariaLabel: 'Status' }));
  const btns = host.querySelectorAll('.ui-seg button');
  assert.equal(btns.length, 3);
  const stops = Array.prototype.filter.call(btns, (b) => b.tabIndex === 0);
  assert.deepEqual(labels(stops), ['Verified'], 'exactly one option may hold the Tab stop');
});

test('segmented(): ArrowRight moves the active option and wraps at the end', () => {
  const host = mount(segmented({ options: ['Any', 'Verified', 'Pending'], active: 0, ariaLabel: 'Status' }));
  const btns = host.querySelectorAll('.ui-seg button');
  btns[0].focus();

  press(active(), 'ArrowRight');
  assert.equal(active().textContent, 'Verified', 'ArrowRight moves focus to the next option');
  assert.deepEqual(labels(pressedOne(btns)), ['Verified'], 'and the pressed state moves with it');

  press(active(), 'ArrowRight');
  assert.equal(active().textContent, 'Pending');

  press(active(), 'ArrowRight');
  assert.equal(active().textContent, 'Any', 'ArrowRight wraps from the last option to the first');
  assert.deepEqual(labels(pressedOne(btns)), ['Any']);
});

test('segmented(): ArrowLeft moves the active option and wraps at the start', () => {
  const host = mount(segmented({ options: ['Any', 'Verified', 'Pending'], active: 0, ariaLabel: 'Status' }));
  const btns = host.querySelectorAll('.ui-seg button');
  btns[0].focus();

  press(active(), 'ArrowLeft');
  assert.equal(active().textContent, 'Pending', 'ArrowLeft wraps from the first option to the last');
  assert.deepEqual(labels(pressedOne(btns)), ['Pending']);

  press(active(), 'ArrowLeft');
  assert.equal(active().textContent, 'Verified');
});

test('segmented(): Home and End jump to the ends', () => {
  const host = mount(segmented({ options: ['Any', 'Verified', 'Pending'], active: 1, ariaLabel: 'Status' }));
  const btns = host.querySelectorAll('.ui-seg button');
  btns[1].focus();

  press(active(), 'End');
  assert.equal(active().textContent, 'Pending', 'End jumps to the last option');
  assert.deepEqual(labels(pressedOne(btns)), ['Pending']);

  press(active(), 'Home');
  assert.equal(active().textContent, 'Any', 'Home jumps to the first option');
  assert.deepEqual(labels(pressedOne(btns)), ['Any']);
});

test('segmented(): moving keeps exactly one Tab stop in the strip', () => {
  const host = mount(segmented({ options: ['Any', 'Verified', 'Pending'], active: 0, ariaLabel: 'Status' }));
  const btns = host.querySelectorAll('.ui-seg button');
  btns[0].focus();
  press(active(), 'ArrowRight');
  const stops = Array.prototype.filter.call(btns, (b) => b.tabIndex === 0);
  assert.deepEqual(labels(stops), ['Verified'], 'the Tab stop follows the selection instead of accumulating');
});

test('segmented(): a key it does not own is left alone', () => {
  const host = mount(segmented({ options: ['Any', 'Verified'], active: 0, ariaLabel: 'Status' }));
  const btns = host.querySelectorAll('.ui-seg button');
  btns[0].focus();
  const notCancelled = press(active(), 'ArrowDown');
  assert.equal(notCancelled, true, 'ArrowDown is not swallowed');
  assert.equal(active().textContent, 'Any');
});

// ---- tabs(): the panel must be reachable ---------------------------------

test('tabs(): the panel is focusable, so a keyboard user can reach text-only content', () => {
  const host = mount(tabs({
    name: 'kb', ariaLabel: 'Sections', active: 0,
    items: [{ label: 'One', panel: '<p>first</p>' }, { label: 'Two', panel: '<p>second</p>' }],
  }));
  const panel = host.querySelector('#kb-panel-0');
  assert.equal(panel.getAttribute('tabindex'), '0', 'a tabpanel with no focusable content needs tabindex="0"');
  panel.focus();
  assert.equal(active(), panel, 'and it actually takes focus');
});

test('tabs(): ArrowRight moves the tab AND swaps the visible panel', () => {
  const host = mount(tabs({
    name: 'kb2', ariaLabel: 'Sections', active: 0,
    items: [{ label: 'One', panel: '<p>first</p>' }, { label: 'Two', panel: '<p>second</p>' }],
  }));
  host.querySelector('#kb2-tab-0').focus();
  press(active(), 'ArrowRight');
  assert.equal(active().id, 'kb2-tab-1');
  assert.equal(host.querySelector('#kb2-panel-0').hidden, true);
  assert.equal(host.querySelector('#kb2-panel-1').hidden, false);
});

// ---- field(): the error has to reach the control -------------------------

test('field(): an error is exposed to the control through aria-describedby', () => {
  const host = mount(field({
    label: 'API token',
    error: 'This token has already been revoked.',
    control: input({ value: 'sk-live-9f2c', invalid: true }),
  }));
  const ctl = host.querySelector('input');
  const described = ctl.getAttribute('aria-describedby');
  assert.ok(described, 'the control must point at its error message');
  const msg = host.querySelector(`#${described}`);
  assert.ok(msg, `aria-describedby="${described}" must resolve to a node on the page`);
  assert.match(msg.textContent, /already been revoked/);
});

test('field(): an errored control is marked invalid, not merely painted red', () => {
  const host = mount(field({ label: 'API token', error: 'Nope.', control: input({ value: 'x' }) }));
  assert.equal(host.querySelector('input').getAttribute('aria-invalid'), 'true');
});

test('field(): a hint is exposed the same way an error is', () => {
  const host = mount(field({
    label: 'Work email', hint: 'We only allow apliteni.com addresses.',
    control: input({ type: 'email' }),
  }));
  const ctl = host.querySelector('input');
  const msg = host.querySelector(`#${ctl.getAttribute('aria-describedby')}`);
  assert.ok(msg, 'the control must point at its hint');
  assert.match(msg.textContent, /apliteni\.com addresses/);
});

test('field(): a required field says so in the markup, not only in the label text', () => {
  const host = mount(field({ label: 'Work email', required: true, control: input({ type: 'email' }) }));
  const ctl = host.querySelector('input');
  assert.equal(ctl.required, true, 'requiredness must be readable without parsing the label');
  const star = host.querySelector('.ui-field__req');
  assert.equal(star.getAttribute('aria-hidden'), 'true', 'the asterisk is decoration on top of that');
});

test('field(): an optional field is not marked required, invalid or described', () => {
  const host = mount(field({ label: 'Agent name', control: input({ placeholder: 'e.g. Research bot' }) }));
  const ctl = host.querySelector('input');
  assert.equal(ctl.required, false);
  assert.equal(ctl.hasAttribute('aria-invalid'), false);
  assert.equal(ctl.hasAttribute('aria-describedby'), false);
});

test('field(): the label still points at the control (#119 stays fixed)', () => {
  const host = mount(field({ label: 'Feedback', hint: 'Straight to the owner.', control: textarea({ rows: 3 }) }));
  const lab = host.querySelector('label');
  const ctl = host.querySelector('textarea');
  assert.equal(lab.getAttribute('for'), ctl.id);
  assert.ok(ctl.getAttribute('aria-describedby'), 'a textarea gets described too, not just an input');
});

test('field(): two fields on one page get distinct message ids', () => {
  const host = mount(
    field({ label: 'One', error: 'first problem', control: input({}) })
    + field({ label: 'Two', error: 'second problem', control: input({}) }),
  );
  const [a, b] = host.querySelectorAll('input');
  const da = a.getAttribute('aria-describedby');
  const db = b.getAttribute('aria-describedby');
  assert.notEqual(da, db, 'ids must be unique or one field describes the other');
  assert.match(host.querySelector(`#${da}`).textContent, /first problem/);
  assert.match(host.querySelector(`#${db}`).textContent, /second problem/);
});

test('input(): invalid is announced, not only painted', () => {
  const html = input({ value: 'x', invalid: true });
  assert.match(html, /class="[^"]*is-invalid/);
  assert.match(html, /aria-invalid="true"/);
});
