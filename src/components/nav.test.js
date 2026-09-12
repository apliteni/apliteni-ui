import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

// wireNav() listens on the document, so one has to exist before it runs — the
// same arrangement stories/nav-cascade.test.js uses.
const dom = new JSDOM('<!doctype html><html lang="en"><body></body></html>');
for (const key of ['window', 'document', 'Event']) {
  Object.defineProperty(globalThis, key, { value: dom.window[key] ?? dom.window, configurable: true, writable: true });
}
const { sidebarNav, wireNav } = await import('./nav.js');

const SECTIONS = [{
  items: [
    { id: 'home', label: 'Home' },
    { id: 'billing', label: 'Billing', items: [{ id: 'invoices', label: 'Invoices' }] },
    { id: 'team', label: 'Team', items: [{ id: 'people', label: 'People' }] },
  ],
}];

const mount = (active) => {
  document.body.innerHTML = sidebarNav({ sections: SECTIONS, active });
  wireNav();
  const group = (label) => [...document.querySelectorAll('[data-nav-toggle]')]
    .find((b) => b.getAttribute('aria-label') === label);
  const listOf = (btn) => document.getElementById(btn.getAttribute('aria-controls'));
  return { group, listOf };
};

test('opening a group fades its list in; the page loads with none entering', () => {
  const { group, listOf } = mount('people'); // Team is open at render, Billing is not
  assert.equal(listOf(group('Team')).hidden, false);
  assert.equal(document.querySelectorAll('.is-entering').length, 0, 'a list animated at first render');

  const billing = listOf(group('Billing'));
  assert.equal(billing.hidden, true);
  group('Billing').click();
  assert.equal(billing.hidden, false);
  assert.equal(group('Billing').getAttribute('aria-expanded'), 'true');
  assert.ok(billing.classList.contains('is-entering'), 'the list the reader opened did not fade in');

  billing.dispatchEvent(new Event('animationend'));
  assert.equal(billing.classList.contains('is-entering'), false);
});

test('closing a group hides it without playing an entrance', () => {
  const { group, listOf } = mount('people');
  const team = listOf(group('Team'));
  group('Team').click();
  assert.equal(team.hidden, true);
  assert.equal(team.classList.contains('is-entering'), false);
});
