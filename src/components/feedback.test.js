import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { nearestSection, feedbackWidget, wireFeedback } from './feedback.js';

// Minimal fake DOM nodes — enough for nearestSection's walk (tagName, id,
// previousElementSibling, parentElement, nodeType). No jsdom needed.
const elem = (tagName, id = '', { prev = null, parent = null } = {}) =>
  ({ tagName, id, previousElementSibling: prev, parentElement: parent, nodeType: 1 });

test('nearestSection returns the closest preceding h2/h3[id]', () => {
  const root = { tagName: 'MAIN', id: '', nodeType: 1, querySelector: () => null };
  const h2 = elem('H2', 'intro', { parent: root });
  const p = elem('P', '', { prev: h2, parent: root });
  const textNode = { nodeType: 3, parentNode: p };
  assert.equal(nearestSection(textNode, root), h2);
});

test('nearestSection walks up to an ancestor heading', () => {
  const root = { tagName: 'MAIN', id: '', nodeType: 1, querySelector: () => null };
  const h3 = elem('H3', 'sub', { parent: root });
  const wrap = elem('DIV', '', { prev: h3, parent: root });
  const span = elem('SPAN', '', { parent: wrap });
  assert.equal(nearestSection(span, root), h3);
});

test('nearestSection ignores headings without an id', () => {
  const root = { tagName: 'MAIN', id: '', nodeType: 1, querySelector: () => null };
  const h2noId = elem('H2', '', { parent: root });
  const p = elem('P', '', { prev: h2noId, parent: root });
  // no id on the heading, no fallback → querySelector stub returns null
  assert.equal(nearestSection(p, root), null);
});

test('nearestSection falls back to the first heading in root', () => {
  const first = elem('H2', 'first');
  const root = { tagName: 'MAIN', id: '', nodeType: 1, querySelector: () => first };
  const orphan = elem('P', '', { parent: root });
  assert.equal(nearestSection(orphan, root), first);
});

// The whole path to an error, in a jsdom lent to this test and given back: select,
// open, type, send, fail. jsdom has no layout, so a range reports a box by hand.
test('a failed send fades its error line in; the widget mounts with none entering', async () => {
  const { window } = new JSDOM('<!doctype html><body><main><h2 id="s">Section</h2><p id="p">A passage worth a note</p></main></body>');
  Object.assign(globalThis, { window, document: window.document });
  try {
    document.body.insertAdjacentHTML('beforeend', feedbackWidget());
    window.Range.prototype.getBoundingClientRect = () => ({ left: 0, top: 0, width: 40, height: 10 });
    wireFeedback({ container: 'main', onSend: async () => ({ ok: false, error: 'Nope' }) });
    const err = document.querySelector('[data-fb-err]');
    assert.equal(document.querySelectorAll('.is-entering').length, 0, 'something animated at first render');

    const text = document.getElementById('p').firstChild;
    const range = document.createRange();
    range.setStart(text, 0);
    range.setEnd(text, 9);
    window.getSelection().addRange(range);
    document.querySelector('main').dispatchEvent(new window.MouseEvent('mouseup', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 0));
    document.querySelector('[data-fb-pill]').click();

    const note = document.querySelector('[data-fb-note]');
    note.value = 'Off by one';
    note.dispatchEvent(new window.Event('input'));
    document.querySelector('[data-fb-send]').click();
    await new Promise((r) => setTimeout(r, 0));

    assert.ok(err.classList.contains('show'), 'the send did not fail — the path above did not run');
    assert.equal(err.textContent, 'Nope');
    assert.ok(err.classList.contains('is-entering'), 'the error line appeared in one frame');
    err.dispatchEvent(new window.Event('animationend'));
    assert.equal(err.classList.contains('is-entering'), false);
  } finally {
    delete globalThis.window;
    delete globalThis.document;
  }
});
