// The landing page's segmented strip, held against the kit's own.
//
// The strip in the bento's "Controls" cell switches nothing, which does not
// excuse it from the contract: it is a real focusable control on a real page (#147).
//
// So this file asserts no list of attributes. It imports segmented() and
// wireTopbar() FROM THE KIT, builds the kit's own strip beside the site's, drives
// both through the same keys and asserts they came out in the same state — so the
// gate fails if the site drifts, and as loudly if the KIT moves on and the site is
// not brought along.
//
// Unlike site/audience-switcher.test.js next door it substitutes the REAL chrome:
// the .ui-seg handler lives in site/chrome.mjs, and blanking it would leave the
// page with no handler bound at all.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { topbar, footer, CHROME_CSS, CHROME_JS } from './chrome.mjs';

// The kit's wiring needs a DOM in place before it is imported: wireDropdown()
// compares its scope against the global `document` and throws without one. Same
// preamble as stories/keyboard.test.js:23-28 `Object.defineProperty(globalThis, key`,
// for the same reason. It scopes the
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
//
// press() RETURNS what dispatchEvent returned: false when a handler called
// preventDefault(), true when nothing cancelled it. That return value is the
// only evidence of preventDefault() there is, and dropping it is how a gate
// certifies a keyboard trap. Both ways of getting it wrong are silent
// otherwise: without preventDefault, End scrolls the landing page to the footer
// while it selects; with preventDefault hoisted above the "is this a key we
// own" guard, every keydown in the strip is cancelled including Tab, and a
// keyboard-only reader who tabs in cannot tab out.
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
      return b.dispatchEvent(new dom.window.KeyboardEvent(
        'keydown', { key, bubbles: true, cancelable: true }));
    },
  };
}

// The whole real page, with the real handler bound. Returns every .ui-seg on it,
// not just the first: the handler binds all of them, so a strip added later
// inherits the behaviour and owes the same contract. Picking one by
// querySelector would make coverage depend on document order, and a second
// strip added below this one would go ungated in silence.
function sitePage() {
  const errors = [];
  const dom = new JSDOM(PAGE, {
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    beforeParse(w) { w.addEventListener('error', (e) => errors.push(e.message)); },
  });
  assert.deepEqual(errors, [], 'the page’s own scripts must run clean');
  const strips = [...dom.window.document.querySelectorAll('.ui-seg')];
  assert.ok(strips.length, 'the page must still carry at least one .ui-seg strip');
  return { dom, strips: strips.map((s) => harness(dom, s)) };
}

// The specimen this issue is about, found by the name it answers to rather than
// by where it sits in the document.
function site() {
  const { strips } = sitePage();
  const found = strips.find((h) => h.strip.getAttribute('aria-label') === LABEL);
  assert.ok(found, `no .ui-seg on the page is named “${LABEL}”`);
  return found;
}

// The kit's strip: segmented() for the markup, wireTopbar() for the behaviour —
// the same two calls .storybook/preview.js makes after every render. Mounted
// into the one kit DOM the globals above point at, the way
// stories/keyboard.test.js:35-42 `wireTopbar(host);` does it.
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
// aria-selected is read even though neither side emits it. src/styles/segmented.css
// paints on [aria-selected="true"] as well as .is-active, so a stale one in
// hand-written markup is a paint bug and an announcement lie at the same time,
// and it is the pair the handler's own mirroring rule is about. `type` is read
// because a specimen that ever moves inside a form submits it without it.
const announcement = (h) => ({
  role: h.strip.getAttribute('role'),
  label: h.strip.getAttribute('aria-label'),
  buttons: h.buttons().map((b) => ({
    label: b.textContent.trim(),
    type: b.getAttribute('type'),
    pressed: b.getAttribute('aria-pressed'),
    selected: b.getAttribute('aria-selected'),
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

// The handler binds every .ui-seg on the page, so every .ui-seg on the page owes
// the contract — including one added long after this file was written. Without
// this, a second strip dropped in below the first is picked up by the behaviour
// and missed by the gate.
test('every segmented strip on the page owes the contract, not just the first', () => {
  const { strips } = sitePage();
  for (const h of strips) {
    const name = h.strip.getAttribute('aria-label') || '(unnamed)';
    assert.equal(h.strip.getAttribute('role'), 'toolbar',
      `the ${name} strip must announce itself as a toolbar`);
    assert.ok((h.strip.getAttribute('aria-label') || '').trim(),
      'a toolbar with no name is an unnamed control');
    const btns = h.buttons();
    assert.ok(btns.length, `the ${name} strip must have options`);
    assert.deepEqual(
      btns.filter((b) => b.getAttribute('aria-pressed') === null).map((b) => b.textContent.trim()),
      [], `every option in ${name} must say whether it is the one on`);
    assert.equal(btns.filter((b) => b.getAttribute('aria-pressed') === 'true').length, 1,
      `exactly one option in ${name} is the one on`);
    assert.equal(btns.filter((b) => b.getAttribute('tabindex') === '0').length, 1,
      `${name} must cost exactly one Tab stop`);
  }
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
    const sLive = s.press(from, key);
    const kLive = k.press(from, key);
    assert.deepEqual(announcement(s), announcement(k));
    assert.equal(announcement(s).buttons.find((b) => b.active).label, expected);
    assert.equal(focusedLabel(s), expected,
      'the arrow keys move focus with the selection, or a keyboard user is left behind');
    assert.equal(focusedLabel(s), focusedLabel(k));
    // A key the strip acts on must be cancelled, or it does its own job too:
    // End selects Text and scrolls the page to the footer underneath it.
    assert.equal(sLive, false, `${key} must be cancelled once the strip has acted on it`);
    assert.equal(sLive, kLive, `${key}: the site and the kit must agree about cancelling`);
  });
}

test('a key the strip does not own is left alone for the page to handle', () => {
  const s = site();
  const k = kit();
  const before = announcement(s);
  const sLive = s.press(0, 'ArrowDown');
  const kLive = k.press(0, 'ArrowDown');
  assert.deepEqual(announcement(s), before, 'ArrowDown must not move the selection');
  assert.deepEqual(announcement(s), announcement(k));
  assert.equal(sLive, true, 'ArrowDown must reach the page — scrolling is not the strip’s to cancel');
  assert.equal(sLive, kLive);
});

// The one that turns a specimen into a cage. If preventDefault() moves above the
// "is this a key we own" guard, the strip cancels Tab too and a keyboard-only
// reader who tabs in cannot tab out. Nothing else in this file can see it: every
// other assertion is about a key the strip DOES own.
test('Tab is never cancelled, so a keyboard reader can always leave the strip', () => {
  const s = site();
  const k = kit();
  for (const key of ['Tab', 'Escape', 'Enter', ' ']) {
    assert.equal(s.press(0, key), true, `${key} must not be cancelled by the strip`);
    assert.equal(k.press(0, key), true, `${key} must not be cancelled by the kit’s strip either`);
  }
});
