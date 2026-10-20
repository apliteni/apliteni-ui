// field() around a dropdown(): the trigger is the control a reader meets, so the
// label, the hint and the error have to reach it. A dropdown's id sits on its
// outer div, which <label for> cannot name, and the only form element in the
// markup is the search field inside the panel. The React Field and Dropdown pair
// does the same; these tests hold the vanilla half.
//
// Limit: JSDOM has no accessibility tree. The name is worked out here from
// aria-labelledby the way the platform does it, and the browser reading is made
// by hand and recorded in the pull request.
//
// why: docs/components.md#forms

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { field, input, select } from './index.js';
import { dropdown } from './dropdown.js';

const ITEMS = [{ label: 'Avery Example', value: 'avery', selected: true }, { label: 'Jordan Example', value: 'jordan' }];
const owner = (o = {}, d = {}) => new JSDOM(field({
  label: 'Owner',
  control: dropdown({ variant: 'select', items: ITEMS, value: 'Avery Example', ...d }),
  ...o,
})).window.document;
const trigger = (doc) => doc.querySelector('[data-dropdown-trigger]');
const panel = (doc) => doc.querySelector('[data-dropdown-panel]');
const textOf = (doc, ids) => ids.split(' ').map((id) => doc.getElementById(id).textContent.trim()).join(' ');

test('an error describes the trigger and marks it invalid', () => {
  const doc = owner({ error: 'Choose another owner.' });
  const t = trigger(doc);
  assert.equal(t.getAttribute('aria-invalid'), 'true');
  const err = doc.querySelector('.ui-field__error');
  assert.equal(t.getAttribute('aria-describedby'), err.id);
  assert.match(err.textContent, /Choose another owner\./);
});

test('a hint describes the trigger and does not mark it invalid', () => {
  const doc = owner({ hint: 'Who answers for it.' });
  const t = trigger(doc);
  assert.equal(t.getAttribute('aria-describedby'), doc.querySelector('.ui-field__hint').id);
  assert.equal(t.hasAttribute('aria-invalid'), false);
});

test('an error replaces the hint, so only the error is described', () => {
  const doc = owner({ hint: 'Who answers for it.', error: 'Choose another owner.' });
  assert.equal(doc.querySelector('.ui-field__hint'), null);
  assert.equal(trigger(doc).getAttribute('aria-describedby'), doc.querySelector('.ui-field__error').id);
});

test('no hint and no error leaves the trigger without either attribute', () => {
  const t = trigger(owner());
  assert.equal(t.hasAttribute('aria-describedby'), false);
  assert.equal(t.hasAttribute('aria-invalid'), false);
});

test('the label and then the value name the trigger', () => {
  const doc = owner();
  const t = trigger(doc);
  assert.equal(textOf(doc, t.getAttribute('aria-labelledby')), 'Owner Avery Example');
  assert.equal(t.getAttribute('aria-labelledby').split(' ')[1], t.id, 'the value is the trigger itself');
  assert.equal(t.getAttribute('aria-haspopup'), 'listbox');
  assert.equal(t.getAttribute('aria-expanded'), 'false');
});

test('the id stays on the outer div and the label points at it', () => {
  const doc = owner({}, { id: 'owner' });
  assert.equal(doc.querySelector('[data-dropdown]').id, 'owner');
  assert.equal(doc.querySelector('label').getAttribute('for'), 'owner');
  assert.equal(doc.querySelector('label').id, 'owner-label');
  assert.equal(trigger(doc).id, 'owner-trigger');
});

test('the list panel is named by the label unless it has a name already', () => {
  const doc = owner();
  assert.equal(panel(doc).getAttribute('aria-labelledby'), doc.querySelector('label').id);
  const named = owner({}, { ariaLabel: 'Project owner' });
  assert.equal(panel(named).hasAttribute('aria-labelledby'), false);
  assert.equal(panel(named).getAttribute('aria-label'), 'Project owner');
});

test('an aria-label the caller put on the trigger wins over the label', () => {
  const doc = owner({}, { ariaLabel: 'Project owner', triggerContent: '<span>Avery</span>' });
  const t = trigger(doc);
  assert.equal(t.getAttribute('aria-label'), 'Project owner');
  assert.equal(t.hasAttribute('aria-labelledby'), false);
});

test('a dropdown with a search field wires the trigger and leaves the search field alone', () => {
  const doc = owner({ error: 'Choose another owner.', required: true }, { search: true });
  const t = trigger(doc);
  assert.equal(t.getAttribute('aria-invalid'), 'true');
  assert.equal(t.getAttribute('aria-describedby'), doc.querySelector('.ui-field__error').id);
  const search = doc.querySelector('[data-dd-search]');
  for (const a of ['id', 'aria-describedby', 'aria-invalid', 'required']) {
    assert.equal(search.hasAttribute(a), false, `the search field has no ${a}`);
  }
  assert.equal(doc.querySelector('label').getAttribute('for'), doc.querySelector('[data-dropdown]').id);
});

test('without a label the trigger is described but not named by the field', () => {
  const doc = new JSDOM(field({ error: 'Choose another owner.', control: dropdown({ variant: 'select', items: ITEMS, ariaLabel: 'Owner' }) })).window.document;
  const t = trigger(doc);
  assert.equal(t.hasAttribute('aria-labelledby'), false);
  assert.equal(t.getAttribute('aria-describedby'), doc.querySelector('.ui-field__error').id);
});

test('every field in a page gets its own ids', () => {
  const doc = new JSDOM(`${field({ label: 'Owner', control: dropdown({ items: ITEMS }) })}${field({ label: 'Reviewer', control: dropdown({ items: ITEMS }) })}`).window.document;
  const ids = [...doc.querySelectorAll('[id]')].map((n) => n.id);
  assert.equal(new Set(ids).size, ids.length);
  const [a, b] = [...doc.querySelectorAll('[data-dropdown-trigger]')];
  assert.notEqual(a.getAttribute('aria-labelledby'), b.getAttribute('aria-labelledby'));
});

test('a field around an input or a select is wired as before', () => {
  const i = new JSDOM(field({ label: 'Name', error: 'Required.', required: true, control: input() })).window.document.querySelector('input');
  assert.equal(i.getAttribute('aria-invalid'), 'true');
  assert.ok(i.hasAttribute('required'));
  assert.equal(i.getAttribute('aria-describedby').startsWith('field-err-'), true);
  const s = new JSDOM(field({ label: 'Plan', hint: 'Pick one.', control: select({ options: ['A', 'B'] }) })).window.document;
  assert.equal(s.querySelector('label').getAttribute('for'), s.querySelector('select').id);
  assert.equal(s.querySelector('select').getAttribute('aria-describedby'), s.querySelector('.ui-field__hint').id);
});
