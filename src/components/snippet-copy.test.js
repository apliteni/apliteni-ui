// Rule: the vanilla copy control is a glyph that never changes size, and its
// confirmation reaches a screen reader as well as an eye.
//
// This file exists because the React half of the same change had two tests and
// the vanilla half had none: the `data-orig` restore bug could be reintroduced
// verbatim and the whole suite stayed green. The mutations at the bottom are the
// point of the file — each reinstates a defect this component has actually had.
//
// Names are the **computed accessible name** from axe-core's accname, the same
// way src/components/topbar.test.js reads the theme toggle's. A permanent
// aria-label outranks an element's contents, so matching the attribute would say
// nothing about what is announced after the contents change — which is exactly
// the failure this file guards.
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { JSDOM } from 'jsdom';
import { snippet } from './index.js';
import { wireTopbar } from './topbar.js';

const require = createRequire(import.meta.url);
const axeSrc = readFileSync(path.join(path.dirname(require.resolve('axe-core')), 'axe.min.js'), 'utf8');

// One window for the file — axe is ~1MB and evaluating it per test is the
// expensive part.
const dom = new JSDOM('<!doctype html><html lang="en"><head><title>kit</title></head><body></body></html>', {
  runScripts: 'dangerously',
  pretendToBeVisual: true,
});
dom.window.eval(axeSrc);
after(() => dom.window.close());

const { document: doc, axe } = dom.window;

/** The name a screen reader announces for `el`, per the accname spec. */
const nameOf = (el) => {
  axe.setup(el.ownerDocument.documentElement);
  try {
    return axe.commons.text.accessibleText(el);
  } finally {
    axe.teardown();
  }
};

// wireTopbar() reads the global `document` for the theme root, the way
// src/components/topbar.test.js also has to arrange. There is no theme toggle in
// a snippet, so that branch does nothing here; the global is only needed to reach
// the copy wiring at the end of the function.
globalThis.document = doc;
after(() => { delete globalThis.document; });

/** Mount a snippet, wire it, and hand back the parts this file reads. */
function mount(opts = {}, wire = wireTopbar) {
  doc.body.innerHTML = snippet({ label: 'Terminal', copyLabel: 'Copy command', code: 'npm install example', ...opts });
  wire(doc.body);
  return {
    button: doc.querySelector('.ui-snippet__copy'),
    status: doc.querySelector('.ui-snippet__status'),
    glyph: () => doc.querySelector('.ui-snippet__copy svg')?.outerHTML ?? null,
  };
}

// The wiring reads the global `navigator`, which on Node is the runtime's own and
// carries no clipboard. Replace it rather than reaching into the JSDOM window.
const realNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
after(() => { if (realNavigator) Object.defineProperty(globalThis, 'navigator', realNavigator); });

const stubClipboard = () => {
  const writes = [];
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: { clipboard: { writeText: (text) => { writes.push(text); return Promise.resolve(); } } },
  });
  return writes;
};

test('the resting control is a named, tooltipped glyph with no words', () => {
  const { button, status } = mount();
  assert.equal(button.textContent.trim(), '', 'the button carries no visible text');
  assert.ok(button.querySelector('svg'), 'the glyph is there');
  assert.equal(button.getAttribute('aria-label'), 'Copy command');
  assert.equal(button.getAttribute('title'), 'Copy command', 'icon-only controls carry the tooltip too');
  assert.equal(nameOf(button), 'Copy command');
  assert.equal(status.textContent, '', 'the live region ships empty so a later fill is announced');
  assert.equal(status.getAttribute('role'), 'status');
  assert.equal(status.getAttribute('aria-live'), 'polite');
});

test('copying announces the confirmation and swaps the glyph, without touching the name', () => {
  const writes = stubClipboard();
  const { button, status, glyph } = mount();
  const resting = glyph();

  button.dispatchEvent(new dom.window.Event('click'));
  // One write happened. Not what it wrote: wireTopbar() reads `pre.innerText`,
  // which JSDOM does not implement, so the string is undefined here. The React
  // gate checks the copied text against the source, and the browser captures
  // cover the vanilla side.
  assert.equal(writes.length, 1, 'the control reached the clipboard once');
  assert.equal(status.textContent, 'Copied', 'the word is in the live region, where it is announced');
  assert.notEqual(glyph(), resting, 'the glyph confirms');
  assert.equal(button.textContent.trim(), '', 'the confirmation puts no words in the button');
  // The name stays the action, which is still available. Writing "Copied" into
  // the button instead would show on screen and never reach the name.
  assert.equal(nameOf(button), 'Copy command');
});

test('the glyph and the live region both come back', async () => {
  stubClipboard();
  const { button, status, glyph } = mount();
  const resting = glyph();
  button.dispatchEvent(new dom.window.Event('click'));
  await new Promise((done) => setTimeout(done, 1500));
  assert.equal(glyph(), resting, 'the resting glyph is restored, not a label');
  assert.equal(status.textContent, '', 'the region empties so the next copy is a change');
  assert.equal(nameOf(button), 'Copy command');
});

test('copy: false leaves no button and no live region', () => {
  const { button, status } = mount({ copy: false });
  assert.equal(button, null);
  assert.equal(status, null, 'nothing announces a control that is not there');
});

/* -- the mutations ---------------------------------------------------------
 * Each reinstates a defect this component has had, so the gate is known to bite
 * rather than merely to pass. */

test('rejects restoring the label text instead of the markup', () => {
  // The bug #474 fixed: `data-orig` is a string, so the glyph never came back.
  const broken = (root) => root.querySelectorAll('.ui-snippet__copy').forEach((btn) => {
    btn.addEventListener('click', () => {
      btn.innerHTML = '✓ Copied';
      setTimeout(() => { btn.innerHTML = btn.dataset.orig || 'Copy'; }, 0);
    });
  });
  stubClipboard();
  const { button, glyph } = mount({}, broken);
  const resting = glyph();
  button.dispatchEvent(new dom.window.Event('click'));
  return new Promise((done) => setTimeout(() => {
    assert.notEqual(glyph(), resting, 'the mutation found its target');
    assert.equal(glyph(), null, 'the restore dropped the glyph, which is the bug');
    done();
  }, 20));
});

test('rejects writing the confirmation into the button', () => {
  // The other half of the same bug: words in the button jerk the 24px box wider
  // and, because aria-label outranks contents, never reach the announced name.
  const broken = (root) => root.querySelectorAll('.ui-snippet__copy').forEach((btn) => {
    btn.addEventListener('click', () => { btn.innerHTML = '✓ Copied'; });
  });
  stubClipboard();
  const { button, status } = mount({}, broken);
  button.dispatchEvent(new dom.window.Event('click'));
  assert.equal(button.textContent.trim(), '✓ Copied', 'the mutation found its target');
  assert.equal(nameOf(button), 'Copy command', 'the name is frozen — the confirmation reaches nobody');
  assert.equal(status.textContent, '', 'and nothing else announces it');
});

test('rejects dropping the live region from the markup', () => {
  const without = snippet({ copyLabel: 'Copy command', code: 'x' }).replace(
    /<span class="ui-sr ui-snippet__status"[^>]*><\/span>/, '');
  assert.ok(!without.includes('ui-snippet__status'), 'the mutation found its target');
  doc.body.innerHTML = without;
  wireTopbar(doc.body);
  stubClipboard();
  const button = doc.querySelector('.ui-snippet__copy');
  button.dispatchEvent(new dom.window.Event('click'));
  assert.equal(doc.querySelector('.ui-snippet__status'), null);
  assert.equal(nameOf(button), 'Copy command', 'with no region, the confirmation is announced nowhere');
});
