// What the page looks like while overlays are open — the half neither axe nor a
// single-overlay test can see.
//
// A drawer and a confirm are the same problem twice, and the moment two of them
// are on one page the questions stop being per-component: which one owns Escape,
// what is inert *now*, where does Tab go, and what is left behind when one closes
// out of order. Those are properties of the page, not of a component, so they are
// tested here against the real markup and the kit's own wiring.
//
// Every test names one such property and fails if the mechanism that provides it
// is removed.

import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html lang="en"><body></body></html>', { pretendToBeVisual: true });
for (const key of ['window', 'document', 'navigator', 'Node', 'Element', 'HTMLElement', 'Event', 'KeyboardEvent', 'MouseEvent']) {
  Object.defineProperty(globalThis, key, { value: dom.window[key] ?? dom.window, configurable: true, writable: true });
}

const { confirm, wireConfirm, openConfirm, closeConfirm } = await import('../src/components/confirm.js');
const { drawer, wireDrawer, openDrawer } = await import('../src/components/drawer.js');
const { button } = await import('../src/components/index.js');

const doc = dom.window.document;

const press = (el, key, opts = {}) =>
  el.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...opts }));
const click = (el) => el.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true, cancelable: true }));
const active = () => doc.activeElement;

// A page with something focusable on it, plus whatever overlays the test needs.
// The overlays are siblings of the page, which is how a real app mounts them.
function mount(overlaysHtml) {
  const page = doc.createElement('main');
  page.id = 'page';
  page.innerHTML = '<h1>Workspace</h1><button id="page-btn">A control on the page</button>';
  const overlays = doc.createElement('div');
  overlays.innerHTML = overlaysHtml;
  doc.body.replaceChildren(page, overlays);
  wireDrawer(doc.body);   // registered first, exactly as .storybook/preview.js does
  wireConfirm(doc.body);
  return { page, overlays };
}

const hidden = (el) => [el.getAttribute('aria-hidden'), el.hasAttribute('inert')];

// ---- Blocker 1: closing out of order ------------------------------------
// Two confirms, closed oldest-first. Per-instance restore snapshots replay a
// state that was true when the overlay opened and is a lie by the time it
// closes: the page came back tabbable under a live modal, and was left
// permanently aria-hidden once both had closed.

test('closing two confirms oldest-first leaves the page neither inert nor aria-hidden', () => {
  const { page } = mount(confirm({ id: 'st-1', title: 'First?' }) + confirm({ id: 'st-2', title: 'Second?' }));
  const one = doc.getElementById('st-1');
  const two = doc.getElementById('st-2');

  assert.deepEqual(hidden(page), [null, false], 'the page starts reachable');
  openConfirm(one);
  assert.deepEqual(hidden(page), ['true', true], 'one open hides the page');
  openConfirm(two);
  assert.deepEqual(hidden(page), ['true', true], 'two open still hides it');

  closeConfirm(one);
  assert.deepEqual(hidden(page), ['true', true],
    'the page stays hidden while the second confirm is still open');

  closeConfirm(two);
  assert.deepEqual(hidden(page), [null, false],
    'and is handed back in full once nothing is open');
});

// ---- Blocker 5: what an overlay under a modal may do --------------------

test('a drawer under a confirm goes inert, and comes back when the confirm closes', () => {
  const { page } = mount(
    drawer({ id: 'st-dr', title: 'Filters', body: '<input id="st-dr-input">' })
    + confirm({ id: 'st-cf', title: 'Discard the filters?' }),
  );
  const dr = doc.getElementById('st-dr');
  const cf = doc.getElementById('st-cf');

  openDrawer(dr);
  assert.deepEqual(hidden(page), ['true', true], 'the page is hidden behind the drawer');
  assert.deepEqual(hidden(dr), [null, false], 'and the drawer itself is not');

  openConfirm(cf);
  assert.deepEqual(hidden(dr), ['true', true],
    'a drawer under an aria-modal alertdialog is neither tabbable nor readable');

  closeConfirm(cf);
  assert.deepEqual(hidden(dr), [null, false], 'and it is the live layer again once the confirm goes');
  assert.deepEqual(hidden(page), ['true', true], 'while the page behind it stays hidden');
});

// ---- Blocker 2: one Escape owner ----------------------------------------

test('one Escape with a confirm over a drawer closes only the confirm', () => {
  mount(
    drawer({ id: 'st-e-dr', title: 'Filters', body: '<input id="st-e-input">' })
    + confirm({ id: 'st-e-cf', title: 'Discard the filters?' }),
  );
  const dr = doc.getElementById('st-e-dr');
  const cf = doc.getElementById('st-e-cf');

  openDrawer(dr);
  openConfirm(cf);
  press(active(), 'Escape');

  assert.equal(cf.classList.contains('is-open'), false, 'the topmost overlay answered');
  assert.equal(dr.classList.contains('is-open'), true, 'and the one underneath did not');
});

// The same keystroke with focus outside every panel. A dialog loses focus the
// moment its focused control is removed — the caller's own work usually removes
// the row it was standing on — and the browser drops focus to <body>. Nothing is
// then inside a panel to intercept the key on that panel's behalf, so this is
// where a per-overlay Escape handler stops being the one that answers.
test('Escape closes only the topmost overlay when focus has fallen out of the panel', () => {
  const { page } = mount(
    drawer({ id: 'st-h-dr', title: 'Filters', body: '<input id="st-h-input">' })
    + confirm({ id: 'st-h-cf', title: 'Discard the filters?' }),
  );
  const dr = doc.getElementById('st-h-dr');
  const cf = doc.getElementById('st-h-cf');

  openDrawer(dr);
  openConfirm(cf);
  active().remove();
  assert.equal(active(), doc.body, 'the fixture really has focus outside both panels');

  press(doc.body, 'Escape');

  assert.equal(cf.classList.contains('is-open'), false, 'the confirm still answers Escape');
  assert.equal(dr.classList.contains('is-open'), true, 'and one keystroke does not close two overlays');
  assert.deepEqual(hidden(page), ['true', true], 'the page stays hidden under the drawer that is still open');
});

// ---- Blocker 3: a closed overlay nested inside an open one ---------------

test('a closed confirm inside a drawer does not let Tab walk out of the drawer', () => {
  mount(drawer({
    id: 'st-n-dr', title: 'Filters',
    body: '<input id="st-n-input">' + confirm({ id: 'st-n-cf', title: 'Discard?' }),
  }));
  const dr = doc.getElementById('st-n-dr');

  openDrawer(dr);
  const closeBtn = dr.querySelector('[data-drawer-close]');
  const input = doc.getElementById('st-n-input');

  input.focus();
  assert.equal(press(active(), 'Tab'), false,
    'Tab off the last reachable control is intercepted — the closed dialog behind it is not a stop');
  assert.equal(active(), closeBtn, 'and wraps to the first control in the panel');
});

test('Tab pulls focus back into the topmost panel after it has fallen out', () => {
  mount(confirm({ id: 'st-t-cf', title: 'Discard the filters?' }));
  const cf = doc.getElementById('st-t-cf');

  openConfirm(cf);
  active().remove();
  assert.equal(active(), doc.body, 'the fixture really has focus outside the panel');

  assert.equal(press(doc.body, 'Tab'), false, 'Tab is intercepted');
  assert.equal(active(), cf.querySelector('[data-confirm-accept]'),
    'and lands back inside the dialog rather than walking the page behind it');
});

// ---- Blocker 4: the root is destroyed while it is open -------------------

test('an overlay torn down while open still hands the page back', () => {
  const { page, overlays } = mount(confirm({ id: 'st-gone', title: 'Still here?' }));
  openConfirm(doc.getElementById('st-gone'));
  assert.deepEqual(hidden(page), ['true', true], 'the page is hidden');

  // Storybook switches story, the theme decorator rebuilds its wrapper, HMR
  // fires: the root is gone, and with it any restore state kept on the node.
  overlays.replaceChildren();
  wireConfirm(doc.body);

  assert.deepEqual(hidden(page), [null, false],
    'the page is reachable again without the node that hid it');
});

test('an overlay torn down while open hands the layer underneath it back', () => {
  const { page } = mount(
    drawer({ id: 'st-g-dr', title: 'Filters', body: '<input id="st-g-input">' })
    + confirm({ id: 'st-g-cf', title: 'Discard the filters?' }),
  );
  const dr = doc.getElementById('st-g-dr');
  const cf = doc.getElementById('st-g-cf');

  openDrawer(dr);
  openConfirm(cf);
  assert.deepEqual(hidden(dr), ['true', true], 'the drawer is under the dialog');

  cf.remove();
  wireConfirm(doc.body);

  assert.deepEqual(hidden(dr), [null, false], 'the drawer is the live layer again');
  assert.deepEqual(hidden(page), ['true', true], 'and the page behind it is still hidden');
  press(doc.body, 'Escape');
  assert.equal(dr.classList.contains('is-open'), false,
    'Escape reaches the drawer, not the dialog that is no longer on the page');
});

// ---- Blocker 9: markup that arrives already open -------------------------
// `open: true` renders .is-open and aria-modal="true", but nothing called
// openConfirm/openDrawer, so nothing put the root on the stack. Wiring is the
// moment the page finds out; without it the dialog tells a screen reader the
// page is unavailable while the page is still tabbable and Escape is dead.

test('a confirm rendered open is on the stack once it is wired', () => {
  const { page } = mount(confirm({ id: 'st-o-cf', title: 'Delete the workspace?', open: true }));
  const cf = doc.getElementById('st-o-cf');

  assert.deepEqual(hidden(page), ['true', true], 'the page behind it is neither tabbable nor readable');

  assert.equal(press(doc.body, 'Tab'), false, 'Tab is intercepted');
  assert.ok(cf.querySelector('[data-confirm-panel]').contains(active()),
    'and lands inside the dialog rather than walking the page');

  press(active(), 'Escape');
  assert.equal(cf.classList.contains('is-open'), false, 'Escape closes it');
  assert.deepEqual(hidden(page), [null, false], 'and the page is handed back');
});

test('a drawer rendered open is on the stack once it is wired', () => {
  const { page } = mount(drawer({ id: 'st-o-dr', title: 'Filters', body: '<input id="st-o-input">', open: true }));
  const dr = doc.getElementById('st-o-dr');

  assert.deepEqual(hidden(page), ['true', true], 'the page behind it is neither tabbable nor readable');

  assert.equal(press(doc.body, 'Tab'), false, 'Tab is intercepted');
  assert.ok(dr.querySelector('[data-drawer-panel]').contains(active()), 'and lands inside the panel');

  press(active(), 'Escape');
  assert.equal(dr.classList.contains('is-open'), false, 'Escape closes it');
  assert.deepEqual(hidden(page), [null, false], 'and the page is handed back');
});

// Adoption happens at wire time, and wiring has no history to order by. What
// the page does have is paint order: a confirm declares
// `z-index: calc(var(--z-overlay) + 1)` (src/styles/confirm.css:29) and a drawer
// `z-index: var(--z-overlay)` (src/styles/drawer.css:22), so the confirm is drawn
// over the drawer whichever root the markup puts first — and the overlay the
// reader can see is the one Escape has to answer. Document position is left to
// separate two overlays on the same layer, where the later root is the painted one.

test('the confirm owns Escape when its markup comes first and the drawer is drawn later', () => {
  mount(
    confirm({ id: 'st-ord-cf', title: 'Discard the filters?', open: true })
    + drawer({ id: 'st-ord-dr', title: 'Filters', body: '<input id="st-ord-input">', open: true }),
  );
  const cf = doc.getElementById('st-ord-cf');
  const dr = doc.getElementById('st-ord-dr');

  press(doc.body, 'Escape');
  assert.equal(cf.classList.contains('is-open'), false,
    'the confirm paints above the drawer, so it is the one Escape closes');
  assert.equal(dr.classList.contains('is-open'), true,
    'and the drawer it is asking about stays open underneath');
});

test('the confirm owns Escape when the drawer is the root that comes first', () => {
  mount(
    drawer({ id: 'st-rev-dr', title: 'Filters', body: '<input id="st-rev-input">', open: true })
    + confirm({ id: 'st-rev-cf', title: 'Discard the filters?', open: true }),
  );
  const cf = doc.getElementById('st-rev-cf');
  const dr = doc.getElementById('st-rev-dr');

  press(doc.body, 'Escape');
  assert.equal(cf.classList.contains('is-open'), false,
    'the same answer with the document order reversed — the layer decides, not the markup');
  assert.equal(dr.classList.contains('is-open'), true, 'and the drawer is still open');
});

// The tie-break between two overlays on one layer, mounted so that adoption order
// and document order disagree — which is the only mount that can prove it. Two
// open confirms in one lump of markup cannot: wiring walks [data-confirm] in
// document order, so the later root is always adopted last and simply appending
// it gives the same answer the tie-break would. Here the second dialog is
// inserted ABOVE the one already on the stack and wired after it, which is what
// an ordinary re-render does. Appending would put the earlier root on top and
// hand it Escape; comparing document position puts it underneath, where equal
// z-index paints it and where the reader sees it.

test('the root later in the document owns Escape even when it reached the stack first', () => {
  const { overlays } = mount(confirm({ id: 'st-tie-b', title: 'Delete the workspace?', open: true }));
  const later = doc.getElementById('st-tie-b');

  const host = doc.createElement('div');
  host.innerHTML = confirm({ id: 'st-tie-a', title: 'Discard the filters?', open: true });
  overlays.insertBefore(host.firstElementChild, later);
  wireConfirm(doc.body);
  const earlier = doc.getElementById('st-tie-a');

  press(doc.body, 'Escape');
  assert.equal(later.classList.contains('is-open'), false,
    'equal z-index paints in tree order, so the later root is on top however it got onto the stack');
  assert.equal(earlier.classList.contains('is-open'), true,
    'and the one it covers is not the one Escape closes, though it was adopted last');
});

test('wiring twice does not put the same open root on the stack twice', () => {
  const { page } = mount(confirm({ id: 'st-tw-cf', title: 'Delete the workspace?', open: true }));
  wireConfirm(doc.body);   // Storybook re-renders; the root is the same node
  const cf = doc.getElementById('st-tw-cf');

  assert.deepEqual(hidden(page), ['true', true], 'the page is hidden by one dialog');
  closeConfirm(cf);
  assert.deepEqual(hidden(page), [null, false],
    'and one close hands it back — a second copy on the stack would still be holding it');
});

// ---- Blocker 8: a specimen is a picture, not a dialog --------------------

test('a specimen renders open but carries no dialog hooks', () => {
  const host = doc.createElement('div');
  host.innerHTML = confirm({ specimen: true, title: 'Revoke access for Research bot?', cancelLabel: 'Keep access' });
  const root = host.firstElementChild;
  const panel = root.querySelector('[data-confirm-panel]');

  assert.equal(root.classList.contains('is-open'), true, 'it is drawn in its open state');
  assert.equal(root.hasAttribute('data-confirm'), false, 'nothing can wire it');
  assert.equal(panel.hasAttribute('aria-modal'), false, 'and it does not claim to own the page');
  assert.equal(panel.getAttribute('role'), 'alertdialog', 'the markup is otherwise the real component');
});

test('a specimen survives the click and the Escape that would erase it', () => {
  const { overlays } = mount(
    confirm({ specimen: true, title: 'Revoke access for Research bot?', cancelLabel: 'Keep access' })
    + confirm({ id: 'st-real', title: 'A real one?' }),
  );
  const spec = overlays.firstElementChild;
  const real = doc.getElementById('st-real');

  click(spec.querySelector('[data-confirm-cancel]'));
  assert.equal(spec.classList.contains('is-open'), true, 'the safe answer does not erase the picture');

  openConfirm(real);
  press(active(), 'Escape');
  assert.equal(real.classList.contains('is-open'), false, 'the real dialog closes — the gate is not vacuous');
  assert.equal(spec.classList.contains('is-open'), true, 'and the specimen was never in the running');

  press(doc.body, 'Escape');
  assert.equal(spec.classList.contains('is-open'), true, 'Escape with nothing open leaves it alone too');
});

// The other half of that claim: wiring adopts a root that renders open, and a
// specimen must be the one it walks past. A picture of a dialog owns nothing —
// the page behind it stays readable, Tab walks straight through it, and Escape
// has no one to talk to.
test('a specimen is not adopted onto the stack when the page is wired', () => {
  const { page, overlays } = mount(confirm({ specimen: true, title: 'Revoke access for Research bot?' }));
  const spec = overlays.firstElementChild;
  const pageBtn = doc.getElementById('page-btn');

  assert.deepEqual(hidden(page), [null, false], 'the page behind the picture is untouched');

  pageBtn.focus();
  assert.equal(press(pageBtn, 'Tab'), true, 'Tab off a page control is nobody’s to intercept');

  press(doc.body, 'Escape');
  assert.equal(spec.classList.contains('is-open'), true, 'and Escape leaves the picture where it is');
});
