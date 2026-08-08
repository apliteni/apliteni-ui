// The landing page's segmented strip, held against the kit's own.
//
// The strip in the bento's "Controls" cell is a specimen: it demonstrates what
// a segmented control looks like, and it switches nothing. That does not excuse
// it from the contract — it is a real focusable control on a real page, like
// the four buttons in "Buttons & actions" and the switch beside it in the same
// cell. #147 shipped it with the kit's class name and none of the kit's
// behaviour: no accessible name, no pressed state, one Tab stop per button and
// dead arrow keys.
//
// So this file does not assert a list of attributes someone wrote down. It
// imports segmented() and wireTopbar() FROM THE KIT, builds the kit's own strip
// next to the site's, drives both through the same keys, and asserts they came
// out in the same state. That is what makes the fourth item of #147 true: the
// gate fails if the site drifts, and it fails just as loudly if the KIT changes
// and the site is not brought along. A test that hard-coded role="toolbar"
// would sit green through a kit that had moved on.
//
// Two things differ from site/audience-switcher.test.js next door, both
// deliberate:
//
//   - It substitutes the REAL chrome. That file blanks {{CHROME_JS}} because the
//     audience switcher's behaviour lives in index.html's own <script>. The
//     .ui-seg handler lives in site/chrome.mjs, so blanking the chrome here
//     would test a page with no handler at all and pass whatever the markup
//     said. The topbar and footer come in with it: CHROME_JS reaches for
//     #tglIc on load, and a page without the topbar throws before it binds
//     anything.
//   - It compares against the kit rather than against a fixed expectation, for
//     the reason above.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { topbar, footer, CHROME_CSS, CHROME_JS } from './chrome.mjs';

// The kit's wiring needs a DOM in place before it is imported: wireDropdown()
// compares its scope against the global `document` and throws without one. Same
// preamble as stories/keyboard.test.js:23-28, for the same reason. It scopes the
// KIT's side only — the site's page gets its own JSDOM below and runs its own
// scripts inside it.
const kitDom = new JSDOM('<!doctype html><html lang="en"><body></body></html>', { pretendToBeVisual: true });
for (const key of ['window', 'document', 'navigator', 'Node', 'Element', 'HTMLElement', 'Event', 'KeyboardEvent', 'MouseEvent']) {
  Object.defineProperty(globalThis, key, { value: kitDom.window[key] ?? kitDom.window, configurable: true, writable: true });
}

const { segmented } = await import('../src/components/index.js');
const { wireTopbar } = await import('../src/components/topbar.js');

// The two options the specimen shows, and the name it answers to. The kit's
// strip is built with the same ones so any difference that turns up is a
// difference in BEHAVIOUR, not in content.
const OPTIONS = ['Deck', 'Text'];
const LABEL = 'Example segmented control';

// The page exactly as build.mjs hands it to a browser.
const PAGE = readFileSync(new URL('./index.html', import.meta.url), 'utf8')
  .replace('{{TOPBAR}}', topbar(''))
  .replace('{{FOOTER}}', footer())
  .replace('{{CHROME_CSS}}', CHROME_CSS)
  .replace('{{CHROME_JS}}', CHROME_JS);

// A strip, its document, and the two verbs the tests drive it with. Both sides
// are built through this so neither gets a helper the other lacks.
function harness(dom, strip) {
  const doc = dom.window.document;
  const buttons = () => [...strip.querySelectorAll('button')];
  return {
    dom,
    doc,
    strip,
    buttons,
    click: (i) => buttons()[i].dispatchEvent(
      new dom.window.MouseEvent('click', { bubbles: true })),
    press: (i, key) => {
      const b = buttons()[i];
      b.focus();
      b.dispatchEvent(new dom.window.KeyboardEvent(
        'keydown', { key, bubbles: true, cancelable: true }));
    },
  };
}

// The site's strip, inside the whole real page with the real handler bound.
function site() {
  const errors = [];
  const dom = new JSDOM(PAGE, {
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    beforeParse(w) { w.addEventListener('error', (e) => errors.push(e.message)); },
  });
  const strip = dom.window.document.querySelector('.ui-seg');
  assert.ok(strip, 'the bento’s Controls cell must still carry a .ui-seg strip');
  assert.deepEqual(errors, [], 'the page’s own scripts must run clean');
  return harness(dom, strip);
}

// The kit's strip: segmented() for the markup, wireTopbar() for the behaviour —
// the same two calls .storybook/preview.js makes after every render. Mounted
// into the one kit DOM the globals above point at, the way
// stories/keyboard.test.js:35-42 does it.
function kit() {
  const host = kitDom.window.document.createElement('div');
  host.innerHTML = segmented({ options: OPTIONS, ariaLabel: LABEL });
  kitDom.window.document.body.replaceChildren(host);
  wireTopbar(host);
  return harness(kitDom, host.querySelector('.ui-seg'));
}

// Everything the contract is made of, and nothing incidental. data-seg and
// data-value are the kit's own caller hooks, not part of what a reader or a
// screen reader meets, so they are left out on purpose — the site is not asked
// to reproduce them.
const announcement = (h) => ({
  role: h.strip.getAttribute('role'),
  label: h.strip.getAttribute('aria-label'),
  buttons: h.buttons().map((b) => ({
    label: b.textContent.trim(),
    pressed: b.getAttribute('aria-pressed'),
    tabindex: b.getAttribute('tabindex'),
    active: b.classList.contains('is-active'),
  })),
});

const focusedLabel = (h) => (h.doc.activeElement && h.doc.activeElement.textContent
  ? h.doc.activeElement.textContent.trim()
  : null);

// ---- the announcement -----------------------------------------------------

test('the site’s strip announces itself exactly as the kit’s does', () => {
  assert.deepEqual(announcement(site()), announcement(kit()));
});

test('the strip is a named toolbar', () => {
  const { strip } = site();
  assert.equal(strip.getAttribute('role'), 'toolbar');
  const label = strip.getAttribute('aria-label');
  assert.ok(label && label.trim(), 'a toolbar with no name is an unnamed control');
});

test('every option says whether it is the one that is on', () => {
  const { buttons } = site();
  const pressed = buttons().map((b) => b.getAttribute('aria-pressed'));
  assert.deepEqual(pressed, ['true', 'false'],
    'Deck is the one on show, and Text has to say it is not');
});

test('the whole strip costs one Tab stop, not one per option', () => {
  const { buttons } = site();
  const stops = buttons().filter((b) => b.getAttribute('tabindex') === '0');
  assert.equal(stops.length, 1, 'exactly one option holds the Tab stop');
  assert.deepEqual(
    buttons().filter((b) => b.getAttribute('tabindex') !== '0')
      .map((b) => b.getAttribute('tabindex')),
    ['-1'],
    'every other option is taken out of the Tab order, not left at its default');
});

// ---- the behaviour, key for key against the kit ---------------------------

test('clicking an option moves the pressed state and the Tab stop, as the kit does', () => {
  const s = site();
  const k = kit();
  s.click(1);
  k.click(1);
  assert.deepEqual(announcement(s), announcement(k));
  assert.equal(s.buttons()[1].getAttribute('aria-pressed'), 'true',
    'clicking Text has to say Text is now the one on');
});

for (const [key, from, expected] of [
  ['ArrowRight', 0, 'Text'],
  ['ArrowRight', 1, 'Deck'],
  ['ArrowLeft', 1, 'Deck'],
  ['ArrowLeft', 0, 'Text'],
  ['Home', 1, 'Deck'],
  ['End', 0, 'Text'],
]) {
  test(`${key} from ${OPTIONS[from]} selects ${expected}, as the kit does`, () => {
    const s = site();
    const k = kit();
    s.press(from, key);
    k.press(from, key);
    assert.deepEqual(announcement(s), announcement(k));
    assert.equal(announcement(s).buttons.find((b) => b.active).label, expected);
    assert.equal(focusedLabel(s), expected,
      'the arrow keys move focus with the selection, or a keyboard user is left behind');
    assert.equal(focusedLabel(s), focusedLabel(k));
  });
}

test('a key the strip does not own is left alone for the page to handle', () => {
  const s = site();
  const k = kit();
  const before = announcement(s);
  s.press(0, 'ArrowDown');
  k.press(0, 'ArrowDown');
  assert.deepEqual(announcement(s), before, 'ArrowDown must not move the selection');
  assert.deepEqual(announcement(s), announcement(k));
});
