// The kit's one page shell. `appShell()` is a full-height rail — brand, the
// kit's own sidebarNav(), the signed-in reader — beside one <main> that opens
// with a breadcrumb trail the caller owns. `accountShell()` is a thin preset
// over it that keeps the topbar, so the published /account API still works.
// Call wireTopbar() once after mounting to wire the account menu + theme toggle.
// why: docs/adr/0006-one-page-shell-built-from-the-kits-own-nav.md
import { topbar as productTopbar } from './topbar.js';
import { esc, icon } from './index.js';
import { sidebarNav, breadcrumbs } from './nav.js';
import { prism } from '../assets/brand.js';
import { ACCOUNT_NAV, toMenuTuple, initials } from './account-nav.js';

// The one account navigation definition lives in account-nav.js, because
// topbar.js needs it too and this file already imports topbar.js. Re-exported
// here so the published name docs/library.md documents keeps working.
export { ACCOUNT_NAV };

const str = (v) => (v == null ? '' : String(v));
const isRecord = (v) => typeof v === 'object' && v !== null;

// ---- the options bag, settled once --------------------------------------
//
// Every option below carries a shape, and a default parameter covers
// `undefined` and nothing else — so `nav: null` from an /auth/me, a `maxWidth`
// out of tenant config, a `crumbs` string written by somebody reading the
// migration note all arrived as they were. A shell that throws mid-render takes
// the page with it, so each is settled here, before the first sink sees it, and
// a parameter is protected by being declared rather than by what it crashes
// into. Adding one to appShell() means adding it to SHAPES or deciding in the
// open that it needs nothing.

// accountShell() has always taken its nav as [id, icon, label, href?, target?].
// Accept that shape and nav.js's object shape side by side, so a consumer's
// existing tuples and the exported ACCOUNT_NAV both work. A nav that is not a
// list at all falls back to the default; an entry inside one that is neither
// shape is dropped, because sideItem() reads `.items` off whatever it is given.
// An empty list is an answer, not a mistake — it stays empty.
const toItems = (nav) => (Array.isArray(nav) ? nav : ACCOUNT_NAV)
  .filter(isRecord)
  .map((n) => (Array.isArray(n)
    ? { id: n[0], icon: n[1], label: n[2], href: n[3], target: n[4] }
    : n));

// The trail is the caller's, and `crumbs` is the one option whose shape changed
// in this release: the old API was `crumb: 'Payouts'`, a string, and the new one
// is `crumbs: [{ label }]`. One letter apart. A value that is not a list is not
// read as a one-crumb trail — that would draw a plausible page and hide the
// migration mistake — so it is no trail at all, which is the visible answer. A
// crumb with no label would draw an empty cell, so it goes too.
const toCrumbs = (crumbs) => (Array.isArray(crumbs) ? crumbs : [])
  .filter((c) => isRecord(c) && !Array.isArray(c) && str(c.label) !== '');

// The reader, as two strings. railUser() and initials() both read them, and an
// /auth/me answering `account: null` or a numeric display name reached both.
const toReader = (a) => (isRecord(a) ? { name: str(a.name), email: str(a.email) } : { name: '', email: '' });

// ---- the topbar, which interpolates where the rail escapes ----------------
//
// brand() writes `word` straight into its markup and accountMenu() does the
// same with the reader's name, address and menu entries. So the escaping is
// here, on the one path into productTopbar(), and not in each caller:
// accountShell() escaped for itself and the `topbar` option underneath it
// escaped for nobody. The caller passes text either way.

// The reader the menu draws. Both fields are always written, empty when the
// caller gave none — accountMenu()'s own defaults are a demo identity, and a
// key dropped here is a key its default fills in, which is how a consumer's
// page came to name its own reader in the rail and the kit's fixture beside it.
//
// `initials` travels with them because it is derived, and a derived value comes
// from what the caller passed, not from the entities made of it: `<Ada>` and
// `&lt;Ada&gt;` do not start with the same character. The entries land in the
// same sink and toMenuTuple() is what escapes them; it reads item objects, so
// tuples go through toItems() first. A nav nobody passed stays unpassed, and
// accountMenu() falls back to its own derived default rather than to nothing.
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

// `maxWidth` lands inside a style attribute, which is a declaration list: esc()
// stops a quote closing the attribute, and `;` is the character that matters
// there. So a length is all this accepts — a number and a unit the reading
// column can use, or `none`. Anything else falls back to the default rather
// than throwing, because a shell that throws mid-render takes the page with it.
const MAIN_MAX = '860px';
const LENGTH = /^(?:\d+|\d*\.\d+)(?:px|rem|em|ch|%|vw)$/;
const mainMax = (v) => {
  const s = str(v).trim();
  return s === 'none' || LENGTH.test(s) ? s : MAIN_MAX;
};

// The one pass. Each key names the function that settles it; nothing else in
// this file re-checks a value that has been through here.
const SHAPES = {
  nav: toItems, crumbs: toCrumbs, account: toReader, maxWidth: mainMax, topbar: toTopbar,
};
function settle(options) {
  const out = { ...options };
  for (const key of Object.keys(SHAPES)) out[key] = SHAPES[key](out[key]);
  return out;
}

// Signing out is a navigation action, so it belongs in the rail nav's footer
// slot. Opt-in: a shell that renders it unasked puts a dead link on a page with
// no session behind it.
const signOut = (href) =>
  `<a class="ui-nav__item is-danger" href="${esc(href)}" aria-label="Sign out">` +
  `<span class="ui-nav__ic">${icon('logout')}</span>` +
  `<span class="ui-nav__label">Sign out</span></a>`;

// Who is signed in. A sibling of the <nav>, not its footer: a reader's name and
// address are not navigation, and inside the landmark a screen reader announces
// the address as an entry. Empty when nobody is — a shell must not invent an
// identity for a reader it does not know.
//
// The initials carry the name, and the spelled-out half is aria-hidden. The
// narrow rail folds `.ui-app__who` out of view, so a name that lived only there
// left the initials on screen with nothing at all in the accessibility tree.
// Naming the mark instead makes the two agree at every width, and says it once.
function railUser({ name, email }) {
  if (!name && !email) return '';
  const who = [name, email].filter(Boolean).join(', ');
  return `<div class="ui-app__user">` +
    `<span class="ui-app__av" role="img" aria-label="Signed in as ${esc(who)}">` +
    `${esc(initials(name, email))}</span>` +
    `<span class="ui-app__who" aria-hidden="true">` +
    (name ? `<b>${esc(name)}</b>` : '') +
    (email ? `<span>${esc(email)}</span>` : '') +
    `</span></div>`;
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
    title = '',
    sub = '',
    body = '',
    account,
    signOutHref = '',
    topbar,
    maxWidth,
  } = settle(options);
  const rail = sidebarNav({
    sections: [{ label: navLabel, items: nav }],
    active,
    ariaLabel: navLabel,
    footer: signOutHref ? signOut(signOutHref) : '',
  });
  // The topbar already says the product word. Two lockups on one screen is one
  // product word too many, so the rail head steps aside when there is a topbar.
  // The word is the link's only text and the narrow rail folds it out of view,
  // so the name is written out — the mark itself is aria-hidden.
  const brand = topbar ? '' : `<a class="ui-app__brand" href="${esc(brandHref)}" aria-label="${esc(word)}">`
    + `${prism(`appb-${++_shellUid}`, 24)}<span>${esc(word)}</span></a>`;
  // A <div>, not an <aside>: <aside> is the `complementary` landmark — content
  // related to the page but separable from it — and this holds the page's
  // primary navigation and the reader who is signed in. The <nav> inside it is
  // already the landmark that names the menu.
  const grid = `<div class="ui-app">
    <div class="ui-app__rail">
      ${brand}
      ${rail}
      ${railUser(account)}
    </div>
    <main class="ui-app__main" style="--ui-app-main: ${maxWidth}">
      ${crumbs.length ? breadcrumbs({ items: crumbs }) : ''}
      ${title ? `<h1>${title}</h1>` : ''}
      ${sub ? `<p class="ui-app__sub">${sub}</p>` : ''}
      <div class="ui-app__body">${body}</div>
    </main>
  </div>`;
  return topbar ? `<div class="ui-app-page">${productTopbar(topbar)}${grid}</div>` : grid;
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
} = {}) {
  // The same normaliser appShell() runs, called once here so the rail and the
  // topbar menu are handed one list rather than two readings of `nav`.
  const items = toItems(nav);
  const trail = [{ label: cap }, { label: crumb || title }];
  // The preset hands the topbar the caller's text, exactly as it hands the rail
  // the caller's text. toTopbar() is what escapes for the menu's raw sinks, and
  // it runs once inside appShell() — escaping here as well would reach the menu
  // as entities, and escaping nowhere is what the public `topbar` option used
  // to do.
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
    topbar: {
      word,
      view: 'text',
      showSwitch,
      versions,
      account: { ...(isRecord(account) ? account : {}), active, nav: items },
    },
  });
}
