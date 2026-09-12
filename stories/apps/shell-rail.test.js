/* Rule: the reader folds the rail, and it stays the way they left it (#277).
 *
 * shell.test.js gates the markup and shell-states.test.js the cascade; this file
 * presses the toggle. It mounts the shell in a JSDOM with a URL, because a cookie
 * needs an origin — a page below the root, so a cookie that forgot `path=/`
 * would not reach the rest of the site — and wires it with wireShell(), the call
 * the Storybook preview makes. Then it reads back the rail, the toggle, focus,
 * the names a folded rail's rows answer to, the cookie and the `ui-rail` event.
 *
 * What it does not reach: Enter and Space, which are the browser's on a native
 * <button> — a press here is a click; the chip a folded row gives its name back
 * in, which is CSS and is gated in shell-states.test.js; and Tab order, which is
 * layout's.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM, VirtualConsole } from 'jsdom';

// An error thrown inside a listener never reaches the caller of click(), so it
// is collected here and asserted on rather than lost.
const errors = [];
const virtualConsole = new VirtualConsole();
virtualConsole.on('jsdomError', (e) => errors.push(e));
const dom = new JSDOM('<!doctype html><html lang="en"><body></body></html>', {
  url: 'http://localhost/app/page', pretendToBeVisual: true, virtualConsole,
});
for (const key of ['window', 'document', 'Node', 'Element', 'HTMLElement', 'Event', 'MouseEvent']) {
  Object.defineProperty(globalThis, key, { value: dom.window[key] ?? dom.window, configurable: true, writable: true });
}

const { appShell, wireShell, railCollapsed, RAIL_COOKIE } = await import('../../src/components/shell.js');

const doc = dom.window.document;
const forget = () => { doc.cookie = `${RAIL_COOKIE}=; path=/; max-age=0`; };
const store = (v) => { doc.cookie = `${RAIL_COOKIE}=${v}; path=/`; };

const NAV = [
  { id: 'overview', icon: 'chart', label: 'Overview' },
  { icon: 'card', label: 'Payouts', items: [{ id: 'pending', icon: 'clock', label: 'Pending', badge: 3 }] },
];
const page = (opts = {}) => appShell({
  nav: NAV, active: 'pending', title: 'Pending', signOutHref: '#logout', collapsible: true, ...opts,
});

function mount(html, opts) {
  const host = doc.createElement('div');
  host.innerHTML = html;
  doc.body.replaceChildren(host);
  wireShell(host, opts);
  return { host, app: host.querySelector('.ui-app'), btn: host.querySelector('[data-rail-toggle]') };
}

const folded = (app) => app.classList.contains('is-collapsed');
const rows = (app) => [...app.querySelectorAll('.ui-app__rail .ui-nav__item')];

test('a press folds the rail and the toggle says so, and a second press opens it', () => {
  forget();
  const { app, btn } = mount(page({ collapsed: false }));
  btn.click();
  assert.equal(folded(app), true, 'the toggle was pressed and the rail did not fold');
  assert.equal(btn.getAttribute('aria-expanded'), 'false', 'the rail folded and the toggle still announces it open');
  assert.equal(btn.getAttribute('aria-label'), 'Expand sidebar');
  assert.equal(btn.querySelector('.ui-nav__label').textContent, 'Expand sidebar', 'the label says the old name');
  btn.click();
  assert.equal(folded(app), false);
  assert.equal(btn.getAttribute('aria-expanded'), 'true');
  assert.equal(btn.getAttribute('aria-label'), 'Collapse sidebar');
  assert.deepEqual(errors, []);
});

test('focus stays on the toggle through both presses — nothing moves it or holds it', () => {
  forget();
  const { btn } = mount(page({ collapsed: false }));
  btn.focus();
  btn.click();
  assert.equal(doc.activeElement, btn, 'folding the rail took focus off the control that folded it');
  btn.click();
  assert.equal(doc.activeElement, btn, 'opening the rail took focus off the control that opened it');
});

test('a fold writes no tooltip attribute — the name on screen is the row\'s own label', () => {
  forget();
  const { app, btn } = mount(page({ collapsed: false }));
  btn.click();
  assert.ok(rows(app).length >= 5, 'the fixture stopped carrying a leaf, a group, its child, sign out and the toggle');
  // `title` showed the name to a pointer and to nobody else, and it was a second
  // copy of a string the row already carried. The folded rail gives the label
  // itself back beside the glyph instead, on hover and on keyboard focus — CSS,
  // gated in shell-states.test.js, so there is nothing here to keep in step.
  assert.deepEqual(
    rows(app).filter((r) => r.hasAttribute('title')).map((r) => r.getAttribute('aria-label')), [],
    'a folded row carries a `title` as well as its label, so a pointer resting on it gets the name twice',
  );
  btn.click();
  assert.deepEqual(rows(app).filter((r) => r.hasAttribute('title')).map((r) => r.getAttribute('aria-label')), []);
});

test('a folded row keeps the count in the name it answers to', () => {
  forget();
  const { app } = mount(page({ collapsed: true }));
  const badged = rows(app).find((r) => r.querySelector('.ui-nav__badge'));
  assert.ok(badged, 'the fixture stopped carrying a row with a counter on it');
  assert.equal(
    badged.getAttribute('aria-label'), 'Pending 3',
    'the counter fades out with the words, so a name that did not spell it in loses it — a reader hears '
    + '"Pending" over a row the sighted rail says has three things waiting',
  );
});

test('a press is kept in the cookie, both ways', () => {
  forget();
  const { btn } = mount(page({ collapsed: false }));
  btn.click();
  assert.equal(railCollapsed(), true, `the fold was not written down — the cookie reads "${doc.cookie}"`);
  btn.click();
  assert.equal(railCollapsed(), false, 'opening the rail again left the old choice in the cookie');
});

test('the cookie outlives the session and reaches every page on the site', () => {
  forget();
  mount(page({ collapsed: false })).btn.click();
  const [cookie] = dom.cookieJar.getCookiesSync('http://localhost/elsewhere').filter((c) => c.key === RAIL_COOKIE);
  assert.ok(cookie, 'a page elsewhere on the site does not see the choice — the cookie is not path=/');
  assert.equal(cookie.maxAge, 60 * 60 * 24 * 365, 'without max-age the choice ends with the browser session');
  assert.equal(String(cookie.sameSite).toLowerCase(), 'lax');
});

test('the next page draws the rail the way the reader left it', () => {
  forget();
  mount(page({ collapsed: false })).btn.click();
  // A client-rendered route change draws the shell again and wires it again.
  const next = mount(page());
  assert.equal(folded(next.app), true, 'the reader folded the rail and the next page drew it open');
  assert.equal(next.btn.getAttribute('aria-expanded'), 'false');
  // A server handed the request's Cookie header paints it folded before any script.
  assert.match(
    page({ collapsed: railCollapsed(doc.cookie) }), /class="ui-app is-collapsed"/,
    'a server reading the same cookie paints the rail open',
  );
});

test('a caller\'s boolean is left alone; a shell that left it open takes the stored choice', () => {
  forget();
  store('collapsed');
  assert.equal(folded(mount(page({ collapsed: false })).app), false, 'wireShell() overrode a caller who said open');
  store('expanded');
  assert.equal(folded(mount(page({ collapsed: true })).app), true, 'wireShell() overrode a caller who said folded');
  store('collapsed');
  const { app, btn } = mount(page());
  assert.equal(folded(app), true, 'a shell that left the choice to the reader was not given it');
  assert.equal(btn.getAttribute('aria-label'), 'Expand sidebar', 'the rail folded and the toggle kept the old name');
});

test('railCollapsed reads a Cookie header the way a server hands it over', () => {
  assert.equal(railCollapsed(`theme=dark; ${RAIL_COOKIE}=collapsed; lang=en`), true);
  assert.equal(railCollapsed(`${RAIL_COOKIE}=expanded`), false);
  assert.equal(railCollapsed('theme=dark'), null);
  assert.equal(railCollapsed(''), null);
  assert.equal(railCollapsed(`${RAIL_COOKIE}=sideways`), null, 'a value the kit never writes is not a choice');
  assert.equal(railCollapsed(`${RAIL_COOKIE}=collapsedly`), null, 'a value that only starts with ours is not ours');
  assert.equal(railCollapsed(`x${RAIL_COOKIE}=collapsed`), null, 'another cookie whose name ends in ours was read as ours');
  forget();
  store('collapsed');
  assert.equal(
    railCollapsed(undefined), null,
    'a request with no Cookie header was answered from this document\'s cookie — on a server that is another reader\'s',
  );
});

// ---- persist: false ---------------------------------------------------------

test('persist: false holds for its root against a later default wireShell() of the document', () => {
  forget();
  const { host, app, btn } = mount(page({ collapsed: false }), { persist: false });
  wireShell(doc);
  btn.click();
  assert.equal(folded(app), true);
  assert.equal(railCollapsed(), null, 'a later wireShell(document) undid the opt-out, and the press wrote the cookie');
  // A shell drawn under the opted-out root afterwards is covered too.
  host.insertAdjacentHTML('beforeend', page({ collapsed: false }));
  host.querySelectorAll('[data-rail-toggle]')[1].click();
  assert.equal(railCollapsed(), null, 'a shell drawn under an opted-out root after wiring wrote the cookie');
});

test('persist: false leaves the stored choice unapplied, even through a later wireShell() of an ancestor', () => {
  forget();
  store('collapsed');
  const { app } = mount(page(), { persist: false });
  assert.equal(folded(app), false, 'a consumer that keeps the choice itself had its first paint overridden by the cookie');
  wireShell(doc);
  assert.equal(folded(app), false, 'a later wireShell(document) folded an opted-out shell from the cookie');
});

test('persist: false in one container does not reach a sibling', () => {
  forget();
  const host = doc.createElement('div');
  host.innerHTML = `<section id="a">${page({ collapsed: false })}</section><section id="b">${page({ collapsed: false })}</section>`;
  doc.body.replaceChildren(host);
  wireShell(host.querySelector('#a'), { persist: false });
  wireShell(host.querySelector('#b'));
  host.querySelector('#b [data-rail-toggle]').click();
  assert.equal(railCollapsed(), true, 'the shell that kept the default did not write the cookie');
});

test('a press says what the rail is now, to anyone listening', () => {
  forget();
  const { host, btn } = mount(page({ collapsed: false }), { persist: false });
  const heard = [];
  host.addEventListener('ui-rail', (e) => heard.push(e.detail.collapsed));
  btn.click();
  btn.click();
  assert.deepEqual(heard, [true, false], 'a consumer keeping the choice itself is not told what happened');
});

// ---- what a press reaches ---------------------------------------------------

test('a press folds its own shell and no other on the page', () => {
  forget();
  const host = doc.createElement('div');
  host.innerHTML = page({ collapsed: false }) + page({ collapsed: false });
  doc.body.replaceChildren(host);
  wireShell(host);
  const [a, b] = host.querySelectorAll('.ui-app');
  a.querySelector('[data-rail-toggle]').click();
  assert.equal(folded(a), true);
  assert.equal(folded(b), false, 'one press folded two shells');
});

test('a [data-rail-toggle] that is not a rail\'s own folds nothing', () => {
  forget();
  const { app } = mount(appShell({ title: 'T', body: '<button type="button" data-rail-toggle id="stray">x</button>' }));
  doc.getElementById('stray').click();
  assert.equal(folded(app), false, 'a button in the page body folded a shell that has no toggle to open it again');
  assert.equal(railCollapsed(), null, 'a button in the page body wrote the reader\'s choice');
});

test('wiring the document and a container beneath it does not answer one press twice', () => {
  forget();
  const { host, app, btn } = mount(page({ collapsed: false }));
  wireShell(doc);
  wireShell(host);
  btn.click();
  assert.equal(folded(app), true, 'two listeners each toggled the rail, and the press undid itself');
});

test('a shell in a frame is wired in its own document, and reads its own cookie', () => {
  forget();
  store('collapsed');
  const frame = doc.createElement('iframe');
  doc.body.replaceChildren(frame);
  const inner = frame.contentDocument;
  inner.body.innerHTML = page();
  wireShell(inner.body);
  const app = inner.querySelector('.ui-app');
  assert.equal(folded(app), false, 'a frame was given the page\'s cookie rather than its own');
  inner.querySelector('[data-rail-toggle]').click();
  assert.equal(folded(app), true, 'the toggle inside a frame is dead');
  assert.deepEqual(errors, []);
});

test('a shell inside an open shadow root folds', () => {
  forget();
  const host = doc.createElement('div');
  doc.body.replaceChildren(host);
  const shadow = host.attachShadow({ mode: 'open' });
  shadow.innerHTML = page({ collapsed: false });
  wireShell(shadow);
  shadow.querySelector('[data-rail-toggle]').click();
  assert.equal(folded(shadow.querySelector('.ui-app')), true, 'a press inside a shadow root was not found');
});

test('wireShell() wires the rail\'s groups too, so a shell in the page needs one call', () => {
  forget();
  const { host } = mount(page({ collapsed: true }));
  const group = host.querySelector('[data-nav-toggle]');
  const before = group.getAttribute('aria-expanded');
  group.click();
  assert.notEqual(group.getAttribute('aria-expanded'), before, 'the group inside a wired shell does not open or close');
});

test('a document that refuses cookies still folds, and says nothing is stored', () => {
  forget();
  const refuse = () => { throw new dom.window.DOMException('sandboxed', 'SecurityError'); };
  Object.defineProperty(doc, 'cookie', { configurable: true, get: refuse, set: refuse });
  try {
    assert.equal(railCollapsed(), null);
    const { app, btn } = mount(page());
    btn.click();
    assert.equal(folded(app), true, 'a sandboxed frame cannot fold the rail');
    assert.deepEqual(errors, [], 'the press threw inside its listener');
  } finally {
    delete doc.cookie;
  }
});
