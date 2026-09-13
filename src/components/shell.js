// The kit's one page shell: a full-height rail beside one <main>. accountShell()
// is a thin preset over it that keeps the topbar. wireShell() once after mounting
// wires the fold, the nav's groups and the reader's menu.
// why: docs/specification.md#the-page-shell
import { topbar as productTopbar } from './topbar.js';
import { esc, icon } from './index.js';
import { sidebarNav, breadcrumbs, wireNav } from './nav.js';
import { dropdown, wireDropdown } from './dropdown.js';
import { backLink } from './back.js';
import { prism } from '../assets/brand.js';
import { ACCOUNT_NAV, toMenuTuple, initials } from './account-nav.js';

// The one account navigation definition lives in account-nav.js because topbar.js needs
// it too; re-exported here so the name docs/library.md publishes keeps working.
export { ACCOUNT_NAV };

const str = (v) => (v == null ? '' : String(v));
const isRecord = (v) => typeof v === 'object' && v !== null;

// ---- the options bag, settled once --------------------------------------
//
// A default parameter covers `undefined` and nothing else, so `nav: null` from an
// /auth/me and a `crumbs` string from somebody reading the migration note both arrived
// as they were. A shell that throws mid-render takes the page with it, so each option is
// settled here, before the first sink sees it. Adding one to appShell() means adding it
// to SHAPES or deciding in the open that it needs nothing.

// accountShell()'s tuple nav — [id, icon, label, href?, target?] — and nav.js's object
// shape are accepted side by side. A nav that is not a list falls back to the default;
// an entry that is neither shape is dropped. An empty list is an answer and stays.
const toItems = (nav) => (Array.isArray(nav) ? nav : ACCOUNT_NAV)
  .filter(isRecord)
  .map((n) => (Array.isArray(n)
    ? { id: n[0], icon: n[1], label: n[2], href: n[3], target: n[4] }
    : n));

// The trail is the caller's, and `crumbs` changed shape this release: `crumb: 'Payouts'`
// became `crumbs: [{ label }]`, one letter apart. A non-list is NOT read as a one-crumb
// trail — that hides the migration mistake — so it is no trail at all, which shows. A
// crumb with no label would draw an empty cell, so it goes too.
const toCrumbs = (crumbs) => (Array.isArray(crumbs) ? crumbs : [])
  .filter((c) => isRecord(c) && !Array.isArray(c) && str(c.label) !== '');

// A back link replaces the trail rather than joining it: the two would name the same parent
// twice. Anything but a record is no back link; its fields go through as given, so a back
// backLink() refuses leaves the trail standing. why: docs/specification.md#the-back-link
const toBack = (b) => (isRecord(b) && !Array.isArray(b) ? { href: b.href, label: b.label } : null);

// The reader, as two strings. railUser() and initials() both read them, and an
// /auth/me answering `account: null` or a numeric display name reached both.
const toReader = (a) => (isRecord(a) ? { name: str(a.name), email: str(a.email) } : { name: '', email: '' });

// ---- the topbar, which interpolates where the rail escapes ----------------
//
// brand() writes `word` straight into its markup and accountMenu() does the same with
// the reader's name, address and menu entries, so the escaping is here on the one path
// into productTopbar() rather than in each caller. The caller passes text either way.

// The reader the menu draws. Both fields are always written, empty when the caller gave
// none: accountMenu()'s defaults are a demo identity, so a key dropped here is a key its
// fixture fills in. `initials` is derived from what the caller passed rather than from
// the entities made of it — `<Ada>` and `&lt;Ada&gt;` do not start with the same
// character. toMenuTuple() escapes the entries and reads item objects, so tuples go
// through toItems() first; a nav nobody passed stays unpassed.
const toMenuReader = (a) => {
  const { name, email } = toReader(a);
  const rest = isRecord(a) && !Array.isArray(a) ? a : {};
  const out = { ...rest, name: esc(name), email: esc(email), initials: esc(initials(name, email)) };
  if (out.nav != null) out.nav = toItems(out.nav).map(toMenuTuple);
  return out;
};

const toTopbar = (t) => {
  if (!isRecord(t) || Array.isArray(t)) return null;
  const out = { ...t };
  if (out.word != null) out.word = esc(str(out.word));
  if (out.account != null) out.account = toMenuReader(out.account);
  return out;
};

// `maxWidth` lands inside a style attribute, so a length is all this accepts — a number
// and a unit, or `none`. Anything else yields '' and the caller writes no style
// attribute, falling through to --measure. It must REMOVE the property rather than pass
// a bad value on: a custom property accepts any token stream, so garbage is a valid
// declaration that drops the column to `none`, the full track.
// why: docs/specification.md#widths
const LENGTH = /^(?:\d+|\d*\.\d+)(?:px|rem|em|ch|%|vw)$/;
const mainMax = (v) => {
  const s = str(v).trim();
  return s === 'none' || LENGTH.test(s) ? s : '';
};

// ---- the fold, and where the reader's choice is kept ---------------------
//
// A cookie rather than localStorage, because a server can read one and paint the
// rail at the width the reader left it. why: docs/specification.md#the-page-shell
export const RAIL_COOKIE = 'apliteni-ui-rail';
const RAIL_MAX_AGE = 60 * 60 * 24 * 365;
const RAIL_VALUE = new RegExp(`(?:^|;\\s*)${RAIL_COOKIE}=(collapsed|expanded)(?:;|$)`);

// A sandboxed frame throws on document.cookie; it has no stored choice.
const cookieOf = (doc) => {
  try { return doc ? doc.cookie : ''; } catch (e) { return ''; }
};

/** The reader's stored choice — true, false, or null when there is none. With no
 *  argument it reads `document.cookie`; handed a Cookie header, only that. */
export function railCollapsed(cookies) {
  const src = arguments.length ? cookies : cookieOf(typeof document === 'undefined' ? null : document);
  const m = RAIL_VALUE.exec(String(src ?? ''));
  return m ? m[1] === 'collapsed' : null;
}

// The name says what the press will do, and aria-expanded says what the rail is.
const railName = (collapsed) => (collapsed ? 'Expand sidebar' : 'Collapse sidebar');

// A frame that holds still and a seam that crosses it. Only the two nodes are
// written here — a seam that travels has to be a child a stylesheet can reach —
// and they are spliced into icon()'s own wrapper rather than a copy of it.
// why: docs/specification.md#the-page-shell
const MARK = '<rect x="3" y="3" width="18" height="18" rx="2"/>'
  + '<path class="ui-app__fold-seam" d="M9 3v18"/>';
const railMark = () => icon('').replace('></svg>', `>${MARK}</svg>`);

// The rail's own skin, outside the <nav>: folding the rail is not a place to go.
// It stands in the head band under the wordmark, and its name is written out
// rather than put in a tooltip, because the name IS the chip layout.css lands
// beside the glyph — at both widths. why: docs/specification.md#the-page-shell
const railToggle = (collapsed) =>
  `<div class="ui-app__fold-row">`
  + `<button type="button" class="ui-nav__item ui-app__fold" data-rail-toggle`
  + ` aria-expanded="${collapsed ? 'false' : 'true'}" aria-label="${railName(collapsed)}">`
  + `<span class="ui-nav__ic">${railMark()}</span>`
  + `<span class="ui-nav__label">${railName(collapsed)}</span></button></div>`;

// The one pass. Each key names the function that settles it; nothing else in
// this file re-checks a value that has been through here.
const SHAPES = {
  nav: toItems, crumbs: toCrumbs, back: toBack, account: toReader, maxWidth: mainMax, topbar: toTopbar,
  // Drawn by default; `collapsible: false` is the way out, for a page that will
  // never call wireShell(). why: docs/specification.md#the-page-shell
  collapsible: (v) => v !== false,
  // A boolean is the caller's answer. Anything else leaves it to the reader.
  collapsed: (v) => (typeof v === 'boolean' ? v : null),
};

// The text options settle by the same argument. `body: null` from a record with no
// description drew the word "null" on the page and `word: null` left the brand link with
// no accessible name; dropping the key is what lets the declared default apply.
const TEXT = ['word', 'brandHref', 'navLabel', 'title', 'sub', 'body', 'signOutHref', 'active'];

function settle(options) {
  const out = { ...options };
  for (const key of Object.keys(SHAPES)) out[key] = SHAPES[key](out[key]);
  for (const key of TEXT) if (out[key] == null) delete out[key];
  return out;
}

// The face of the reader block: the initials, and the two lines beside them that
// the fold takes away. `named` is the accessible name when nothing else carries
// one; under the menu trigger it is null, because the button is named by the words
// inside it. why: docs/specification.md#the-page-shell
const readerFace = (name, email, named) =>
  `<span class="ui-app__av"${named ? ` role="img" aria-label="Signed in as ${esc(named)}"` : ' aria-hidden="true"'}>`
  + `${esc(initials(name, email))}</span>`
  + `<span class="ui-app__who"${named ? ' aria-hidden="true"' : ''}>`
  + (name ? `<b>${esc(name)}</b>` : '')
  + (email ? `<span>${esc(email)}</span>` : '')
  + `</span>`;

// Who is signed in, and the one action on the session. A sibling of the <nav>, not
// its footer: a name and address are not navigation. Given a sign-out href the block
// is the trigger of the kit's own dropdown(), with Sign out inside it; without one
// there is no menu, and with nobody signed in there is no block.
// `portal: true` and `direction: 'up'` are what the rail asks of a panel at its foot.
// why: docs/specification.md#the-page-shell
function railUser({ name, email }, signOutHref) {
  if (!name && !email) return '';
  const who = [name, email].filter(Boolean).join(', ');
  if (!signOutHref) {
    return `<div class="ui-app__user">${readerFace(name, email, who)}</div>`;
  }
  // The head says who the menu belongs to — and on a folded rail it is the only place
  // a sighted reader can read the address. why: docs/specification.md#the-page-shell
  const head = `<div class="ui-dropdown__head">`
    + (name ? `<b>${esc(name)}</b>` : '')
    + (email ? `<span>${esc(email)}</span>` : '')
    + `</div>`;
  return `<div class="ui-app__user">${dropdown({
    variant: 'menu',
    portal: true,
    direction: 'up',
    triggerClass: 'ui-app__user-trigger',
    triggerContent: readerFace(name, email, null),
    panelClass: 'ui-app__user-panel',
    header: head,
    items: [{ label: 'Sign out', icon: 'logout', href: signOutHref, danger: true }],
  })}</div>`;
}

// Unique-per-render suffix for the brand mark's clip id — the same reason
// nav.js keeps a module counter. Two shells on one page must not collide.
let _shellUid = 0;

export function appShell(options = {}) {
  // Everything in SHAPES arrives settled; the rest is text, and a text default
  // is what a default parameter is for.
  const {
    word = 'apliteni-ui',
    brandHref = '#',
    nav,
    active,
    navLabel = 'Account',
    crumbs,
    back,
    title = '',
    sub = '',
    body = '',
    account,
    signOutHref = '',
    topbar,
    maxWidth,
    collapsible,
    collapsed,
  } = settle(options);
  const up = back ? backLink(back) : '';
  // No footer slot: the nav is places to go, and the one thing that was in it —
  // sign out — is in the reader's menu at the rail's foot.
  const rail = sidebarNav({
    sections: [{ label: navLabel, items: nav }],
    active,
    activeIs: up ? 'section' : 'page',
    ariaLabel: navLabel,
  });
  // The topbar already says the product word, so the rail head steps aside when there is
  // one. The word is the link's only text and the narrow rail folds it out of view, so
  // the name is written out — the mark itself is aria-hidden.
  const brand = topbar ? '' : `<a class="ui-app__brand" href="${esc(brandHref)}" aria-label="${esc(word)}">`
    + `${prism(`appb-${++_shellUid}`, 24)}<span>${esc(word)}</span></a>`;
  // A <div>, not an <aside>: <aside> is the `complementary` landmark, and this holds the
  // page's primary navigation and the signed-in reader. The <nav> inside it is already
  // the landmark that names the menu.
  // A fold needs the toggle that undoes it. `data-rail="auto"` marks a shell whose
  // caller left the choice to the reader; wireShell() applies the stored one there.
  const folded = collapsible && collapsed === true;
  const auto = collapsible && collapsed === null ? ' data-rail="auto"' : '';
  // The head band: the product's mark and the rail's own control, under one rule.
  // Either may be absent — a shell with a topbar says the word up there, and
  // `collapsible: false` draws no toggle — so the band itself goes when both are.
  const head = brand || collapsible
    ? `<div class="ui-app__head">${brand}${collapsible ? railToggle(folded) : ''}</div>`
    : '';
  const grid = `<div class="ui-app${folded ? ' is-collapsed' : ''}"${auto}>
    <div class="ui-app__rail">
      ${head}
      ${rail}
      ${railUser(account, signOutHref)}
    </div>
    <main class="ui-app__main"${maxWidth ? ` style="--ui-app-main: ${maxWidth}"` : ''}>
      ${up || (crumbs.length ? breadcrumbs({ items: crumbs }) : '')}
      ${title ? `<h1>${title}</h1>` : ''}
      ${sub ? `<p class="ui-app__sub">${sub}</p>` : ''}
      <div class="ui-app__body">${body}</div>
    </main>
  </div>`;
  return topbar ? `<div class="ui-app-page">${productTopbar(topbar)}${grid}</div>` : grid;
}

// ---- Behaviour -----------------------------------------------------------
// One click listener per document, so a shell rendered after wiring folds too
// and a frame is wired in its own document. wireShell(root, { persist: false })
// keeps every shell under root out of the cookie, shells drawn there later
// included; only `persist: true` on that root turns it back on.
const _wiredDocs = new WeakSet();
const _unpersisted = new WeakSet();

// The toggle, addressed from the rail that owns it: the head band of a shell's own
// rail and nowhere else, so a stray [data-rail-toggle] in the page body folds nothing.
// The path is written once — the listener, the reflector and wireShell() all have to
// mean the same control, and the head band put one more step between them.
// why: docs/specification.md#the-page-shell
const FOLD_PATH = '.ui-app__head > .ui-app__fold-row > [data-rail-toggle]';
const RAIL_FOLD = `.ui-app__rail > ${FOLD_PATH}`;

// Under an opted-out root? Steps out of a shadow root through its host.
const optedOut = (node) => {
  for (let n = node; n; n = n.parentNode || n.host) if (_unpersisted.has(n)) return true;
  return false;
};

function setRail(app, collapsed) {
  app.classList.toggle('is-collapsed', collapsed);
  const rail = app.querySelector(':scope > .ui-app__rail');
  if (!rail) return;
  for (const btn of rail.querySelectorAll(`:scope > ${FOLD_PATH}`)) {
    btn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
    btn.setAttribute('aria-label', railName(collapsed));
    const label = btn.querySelector('.ui-nav__label');
    if (label) label.textContent = railName(collapsed);
  }
}

function listen(doc) {
  if (_wiredDocs.has(doc)) return;
  _wiredDocs.add(doc);
  doc.addEventListener('click', (e) => {
    // A shell's own toggle only, in the head of its own rail: a stray
    // [data-rail-toggle] in the page body folds nothing. composedPath() rather
    // than target, so a shell inside an open shadow root is found. closest()
    // rather than a chain of parents, which the head band made one link longer
    // and which said nothing about what it was walking through.
    const btn = e.composedPath().find((n) => n.nodeType === 1 && n.matches(RAIL_FOLD));
    const app = btn && btn.closest('.ui-app');
    if (!app) return;
    const next = !app.classList.contains('is-collapsed');
    setRail(app, next);
    if (!optedOut(app)) {
      try {
        doc.cookie = `${RAIL_COOKIE}=${next ? 'collapsed' : 'expanded'}; path=/; `
          + `max-age=${RAIL_MAX_AGE}; SameSite=Lax`;
      } catch (err) { /* a sandboxed frame: the fold works, nothing is kept */ }
    }
    // A document with no window (DOMParser, createHTMLDocument) has no CustomEvent to send.
    const view = doc.defaultView;
    if (view) {
      app.dispatchEvent(new view.CustomEvent('ui-rail', { bubbles: true, composed: true, detail: { collapsed: next } }));
    }
  });
}

export function wireShell(root = document, { persist } = {}) {
  wireNav(root);
  // The reader's menu is a dropdown() like any other, so it is wired like any
  // other. Idempotent, and a shell with no account draws none to find.
  wireDropdown(root);
  const doc = root.nodeType === 9 ? root : root.ownerDocument;
  listen(doc);
  if (persist === false) _unpersisted.add(root);
  else if (persist === true) _unpersisted.delete(root);
  const saved = railCollapsed(cookieOf(doc));
  const apps = [...root.querySelectorAll('.ui-app')];
  if (root.matches && root.matches('.ui-app')) apps.push(root);
  for (const app of apps) {
    if (!app.querySelector(`:scope > ${RAIL_FOLD}`)) continue;
    // The stored choice goes to a shell whose caller left it to the reader — a
    // paint late, where a server drew it without reading the cookie. Any other
    // shell keeps what it was drawn with, and gets its rows' titles if folded.
    const auto = saved != null && !optedOut(app) && app.getAttribute('data-rail') === 'auto';
    setRail(app, auto ? saved : app.classList.contains('is-collapsed'));
  }
}

// The /account preset: appShell() with the topbar switched on, and the old
// `cap` + `crumb` strings folded into the trail the caller now owns.
export function accountShell({
  word = 'Account',
  versions,
  account = {},
  nav = ACCOUNT_NAV,
  active = 'prefs',
  cap = 'Account',
  showSwitch = false,
  crumb,
  title = '',
  sub = '',
  body = '',
  signOutHref = '#logout',
  collapsible = true,
  collapsed,
} = {}) {
  // The same normaliser appShell() runs, called once here so the rail and the
  // topbar menu are handed one list rather than two readings of `nav`.
  const items = toItems(nav);
  const trail = [{ label: cap }, { label: crumb || title }];
  // The preset hands the topbar the caller's text, as it does the rail. toTopbar()
  // escapes for the menu's raw sinks and runs once inside appShell(); escaping here as
  // well would reach the menu as entities.
  return appShell({
    word,
    nav: items,
    active,
    navLabel: cap,
    crumbs: trail,
    title,
    sub,
    body,
    account,
    signOutHref,
    collapsible,
    collapsed,
    topbar: {
      word,
      view: 'text',
      showSwitch,
      versions,
      account: { ...(isRecord(account) ? account : {}), active, nav: items },
    },
  });
}
