// What the page looks like while overlays are open — the half neither axe nor a
// single-overlay test can see.
//
// A drawer, a confirm and a command palette are the same problem three times, and
// the moment two of them are on one page the questions stop being per-component:
// which one owns Escape, what is inert *now*, where does Tab go, and what is left
// behind when one closes out of order. Those are properties of the page, not of a
// component, so they are tested here against the real markup and the kit's own
// wiring.
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
const { commandPalette, wireCommandPalette, openCommandPalette } = await import('../src/components/command-palette.js');
const { OVERLAY_LAYER } = await import('../src/components/overlay.js');
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
  wireCommandPalette(doc.body);
  return { page, overlays };
}

// One product's palette, small enough to read in an assertion.
const PALETTE_GROUPS = [{
  label: 'Actions',
  items: [
    { id: 'new-invoice', label: 'New invoice', description: 'Draft one for a client' },
    { id: 'invite', label: 'Invite a teammate', description: 'They get a read-only seat' },
  ],
}];

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
// src/styles/confirm.css:26 `z-index: calc(var(--z-overlay) + 2)` and a drawer
// src/styles/drawer.css:22 `z-index: var(--z-overlay)`, so the confirm is drawn
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

// ---- A palette and a drawer on one page ---------------------------------
// The third overlay, and the first pair the kit gives two different layers that
// are not a dialog over the thing it is asking about. The palette paints one step
// above the drawer (src/styles/command-palette.css `calc(var(--z-overlay) + 1)`
// against src/styles/drawer.css `var(--z-overlay)`): a palette is summoned
// deliberately and has to be seen, so it goes over a drawer that was already open.
//
// What these hold is that the two answers agree — the overlay Escape talks to is
// the overlay the reader can see. Both mount orders and both open orders, because
// each is decided by a different rule: adoption orders by paint, opening orders by
// history within a layer, and either one on its own can put the keyboard under the
// panel that covers it. stories/overlay-css.test.js pins OVERLAY_LAYER to what the
// two sheets resolve to, so the layers compared here are the painted ones.

test('the palette is painted over the drawer, so the numbers the stack orders by say so', () => {
  assert.ok(
    OVERLAY_LAYER.palette > OVERLAY_LAYER.drawer,
    `a palette sits at layer ${OVERLAY_LAYER.palette} and a drawer at ${OVERLAY_LAYER.drawer}. At `
    + 'equal levels paint order falls back to document order while the keyboard follows the stack, '
    + 'so which of the two the reader can see stops matching which one answers the keys',
  );
  assert.ok(
    OVERLAY_LAYER.confirm > OVERLAY_LAYER.palette,
    'and a confirm opened from a palette row is above both — it is a question about what is under it',
  );
});

test('a palette adopted beside a drawer owns Escape with the drawer mounted first', () => {
  mount(
    drawer({ id: 'st-pd-dr', title: 'Filters', body: '<input id="st-pd-input">', open: true })
    + commandPalette({ id: 'st-pd-cp', groups: PALETTE_GROUPS, open: true }),
  );
  const dr = doc.getElementById('st-pd-dr');
  const cp = doc.getElementById('st-pd-cp');

  assert.deepEqual(hidden(dr), ['true', true], 'the drawer under the palette is neither tabbable nor readable');

  press(doc.body, 'Escape');
  assert.equal(cp.classList.contains('is-open'), false,
    'the palette is the one painted on top, so it is the one Escape closes');
  assert.equal(dr.classList.contains('is-open'), true, 'and the drawer under it stays open');
  assert.equal(active(), doc.body,
    'nobody called openCommandPalette, so no opener was ever recorded and nothing places focus — '
    + 'the Tab trap is what puts the reader back inside the drawer');
});

test('a palette adopted beside a drawer owns Escape with the palette mounted first', () => {
  mount(
    commandPalette({ id: 'st-dp-cp', groups: PALETTE_GROUPS, open: true })
    + drawer({ id: 'st-dp-dr', title: 'Filters', body: '<input id="st-dp-input">', open: true }),
  );
  const dr = doc.getElementById('st-dp-dr');
  const cp = doc.getElementById('st-dp-cp');

  assert.deepEqual(hidden(dr), ['true', true], 'the layer decides what is inert, not the markup');

  press(doc.body, 'Escape');
  assert.equal(cp.classList.contains('is-open'), false,
    'the same answer with the document order reversed — the palette still paints above');
  assert.equal(dr.classList.contains('is-open'), true, 'and the drawer is still open');
  assert.equal(active(), doc.body, 'and an adopted palette has no opener to hand focus back to either');
});

test('a palette opened over a drawer owns Escape', () => {
  mount(
    drawer({ id: 'st-od-dr', title: 'Filters', body: '<input id="st-od-input">' })
    + commandPalette({ id: 'st-od-cp', groups: PALETTE_GROUPS }),
  );
  const dr = doc.getElementById('st-od-dr');
  const cp = doc.getElementById('st-od-cp');

  openDrawer(dr);
  const drClose = dr.querySelector('[data-drawer-close]');
  assert.equal(active(), drClose, 'the drawer opened focus on its first control');
  openCommandPalette(cp);
  assert.deepEqual(hidden(dr), ['true', true], 'the drawer goes inert under the palette it is covered by');

  press(active(), 'Escape');
  assert.equal(cp.classList.contains('is-open'), false, 'the palette answers — it is on top by paint and by history');
  assert.equal(dr.classList.contains('is-open'), true, 'and the drawer the reader came from is still there');
  assert.equal(active(), drClose,
    'and focus goes back to the control the palette was summoned from, which the drawer holds open again');
});

test('a drawer opened over a palette does not take the keyboard under it', () => {
  mount(
    commandPalette({ id: 'st-do-cp', groups: PALETTE_GROUPS })
    + drawer({ id: 'st-do-dr', title: 'Filters', body: '<input id="st-do-input">' }),
  );
  const dr = doc.getElementById('st-do-dr');
  const cp = doc.getElementById('st-do-cp');

  // Summoned from a control on the page, which is where a hotkey finds the reader.
  doc.getElementById('page-btn').focus();
  openCommandPalette(cp);
  openDrawer(dr);

  assert.deepEqual(hidden(dr), ['true', true],
    'the drawer opened last, but the palette paints over it, so the drawer is the covered one');
  assert.deepEqual(hidden(cp), [null, false], 'and the palette is the live layer');

  press(active(), 'Escape');
  assert.equal(cp.classList.contains('is-open'), false,
    'Escape answers the panel the reader can see, not the one that opened most recently');
  assert.equal(dr.classList.contains('is-open'), true, 'the drawer underneath is untouched');
  assert.equal(active(), dr.querySelector('[data-drawer-close]'),
    'and focus is in the drawer that is left: the page control the palette was summoned from is inert '
    + 'under it, so handing focus back there would leave the reader on <body>');
});

// ---- Where focus is left when the covering overlay closes ----------------
// Closing hands focus back to whatever the overlay was opened from. That works
// while the page underneath is the page — but an overlay opened UNDER one already
// on screen leaves a second surface open when the covering one goes, and the
// opener is then out on a page that surface is holding inert. focus() on an inert
// node does nothing at all, so nobody would place focus and the reader would be
// left on <body>, looking at a panel that holds neither the keyboard nor the Tab
// trap. popOverlay catches that and opens the panel left underneath where it opens.
//
// Measured by hand in headless Chrome: all three land on <body> without that
// recovery and inside the drawer with it. Remove the two lines after sync() in
// popOverlay and every focus assertion below goes red.

test('a palette closing over a drawer opened under it leaves focus in the drawer', () => {
  const { page } = mount(
    commandPalette({ id: 'st-fp-cp', groups: PALETTE_GROUPS })
    + drawer({ id: 'st-fp-dr', title: 'Filters', body: '<input id="st-fp-input">' }),
  );
  const cp = doc.getElementById('st-fp-cp');
  const dr = doc.getElementById('st-fp-dr');

  doc.getElementById('page-btn').focus();   // where a hotkey finds the reader
  openCommandPalette(cp);
  openDrawer(dr);

  press(active(), 'Escape');
  assert.equal(cp.classList.contains('is-open'), false, 'Escape closed the palette');
  assert.equal(dr.classList.contains('is-open'), true, 'and the drawer it covered is still open');
  assert.deepEqual(hidden(page), ['true', true],
    'so the page — and the button the palette was summoned from — is still inert');
  assert.equal(active(), dr.querySelector('[data-drawer-close]'),
    'focus is in the drawer the reader can see, not on a trigger no focus can reach');
});

test('a confirm closing over a drawer opened under it leaves focus in the drawer', () => {
  const { page } = mount(
    confirm({ id: 'st-fc-cf', title: 'Discard the filters?' })
    + drawer({ id: 'st-fc-dr', title: 'Filters', body: '<input id="st-fc-input">' }),
  );
  const cf = doc.getElementById('st-fc-cf');
  const dr = doc.getElementById('st-fc-dr');

  doc.getElementById('page-btn').focus();
  openConfirm(cf);
  openDrawer(dr);   // under the alertdialog, which is the layer above it

  closeConfirm(cf);
  assert.equal(dr.classList.contains('is-open'), true, 'the drawer is what the dialog was asking about');
  assert.deepEqual(hidden(page), ['true', true], 'and the page the dialog was opened from stays inert');
  assert.equal(active(), dr.querySelector('[data-drawer-close]'),
    'so focus goes to the drawer rather than to a trigger sitting in the inert page');
});

// The palette's mainline: a row runs the caller's command and the palette closes
// itself on the way out. When that command opens a drawer, the drawer opens UNDER
// the palette — it is not what the reader is looking at until the palette goes —
// and the palette then closes over it in the same click.
test('a palette row that opens a drawer leaves focus in the drawer it opened', () => {
  const { page } = mount(
    commandPalette({ id: 'st-uc-cp', groups: PALETTE_GROUPS })
    + drawer({ id: 'st-uc-dr', title: 'Filters', body: '<input id="st-uc-input">' }),
  );
  const cp = doc.getElementById('st-uc-cp');
  const dr = doc.getElementById('st-uc-dr');
  cp.addEventListener('ui-command', (e) => { if (e.detail.id === 'new-invoice') openDrawer(dr); });

  doc.getElementById('page-btn').focus();
  openCommandPalette(cp);
  click(cp.querySelector('[data-cmdk-item]'));

  assert.equal(cp.classList.contains('is-open'), false, 'running a row closes the palette');
  assert.equal(dr.classList.contains('is-open'), true, 'and the command it ran left a drawer open');
  assert.deepEqual(hidden(page), ['true', true], 'the drawer holds the page inert');
  assert.equal(active(), dr.querySelector('[data-drawer-close]'),
    'and the reader is in the drawer the command opened, not on <body>');
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
