import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { feedbackWidget, wireFeedback } from './feedback.js';

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

test('an old send result does not replace a reopened note', async () => {
  const { window } = new JSDOM('<!doctype html><body><main><h2 id="s">Section</h2><p id="p">A passage worth a note</p></main></body>');
  Object.assign(globalThis, { window, document: window.document });
  try {
    document.body.insertAdjacentHTML('beforeend', feedbackWidget());
    window.Range.prototype.getBoundingClientRect = () => ({ left: 0, top: 0, width: 40, height: 10 });
    let finish;
    wireFeedback({ container: 'main', onSend: () => new Promise(resolve => { finish = resolve; }) });
    const select = async () => {
      const range = document.createRange();
      range.setStart(document.getElementById('p').firstChild, 0);
      range.setEnd(document.getElementById('p').firstChild, 9);
      window.getSelection().removeAllRanges();
      window.getSelection().addRange(range);
      document.querySelector('main').dispatchEvent(new window.MouseEvent('mouseup', { bubbles: true }));
      await new Promise(resolve => setTimeout(resolve, 0));
      document.querySelector('[data-fb-pill]').click();
    };
    await select();
    const note = document.querySelector('[data-fb-note]');
    note.value = 'First note';
    note.dispatchEvent(new window.Event('input'));
    document.querySelector('[data-fb-send]').click();
    document.querySelector('[data-fb-cancel]').click();
    await select();
    note.value = 'Second note';
    note.dispatchEvent(new window.Event('input'));
    finish({ ok: true });
    await new Promise(resolve => setTimeout(resolve, 0));
    assert.equal(note.value, 'Second note');
    assert.equal(document.querySelector('[data-fb-form]').style.display, '');
    assert.equal(document.querySelector('[data-fb-done]').style.display, 'none');
  } finally {
    delete globalThis.window;
    delete globalThis.document;
  }
});
