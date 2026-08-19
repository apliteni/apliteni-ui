// The kit's one page shell. `appShell()` is a full-height rail — brand, the
// kit's own sidebarNav(), the signed-in reader — beside one <main> that opens
// with a breadcrumb trail the caller owns. `accountShell()` is a thin preset
// over it that keeps the topbar, so the published /account API still works.
// Call wireTopbar() once after mounting to wire the account menu + theme toggle.
// why: docs/specification.md#the-page-shell
import { topbar as productTopbar } from './topbar.js';
import { esc, icon } from './index.js';
import { sidebarNav, breadcrumbs } from './nav.js';
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

// The one pass. Each key names the function that settles it; nothing else in
// this file re-checks a value that has been through here.
const SHAPES = {
  nav: toItems, crumbs: toCrumbs, account: toReader, maxWidth: mainMax, topbar: toTopbar,
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

// Signing out is a navigation action, so it belongs in the rail nav's footer slot.
// Opt-in: rendering it unasked puts a dead link on a page with no session behind it.
const signOut = (href) =>
  `<a class="ui-nav__item is-danger" href="${esc(href)}" aria-label="Sign out">` +
  `<span class="ui-nav__ic">${icon('logout')}</span>` +
  `<span class="ui-nav__label">Sign out</span></a>`;

// Who is signed in. A sibling of the <nav>, not its footer: a name and address are not
// navigation, and inside the landmark a screen reader announces the address as an entry.
// Empty when nobody is. The initials carry the name and the spelled-out half is
// aria-hidden, because the narrow rail folds `.ui-app__who` out of view and a name that
// lived only there left nothing in the accessibility tree.
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
  // The topbar already says the product word, so the rail head steps aside when there is
  // one. The word is the link's only text and the narrow rail folds it out of view, so
  // the name is written out — the mark itself is aria-hidden.
  const brand = topbar ? '' : `<a class="ui-app__brand" href="${esc(brandHref)}" aria-label="${esc(word)}">`
    + `${prism(`appb-${++_shellUid}`, 24)}<span>${esc(word)}</span></a>`;
  // A <div>, not an <aside>: <aside> is the `complementary` landmark, and this holds the
  // page's primary navigation and the signed-in reader. The <nav> inside it is already
  // the landmark that names the menu.
  const grid = `<div class="ui-app">
    <div class="ui-app__rail">
      ${brand}
      ${rail}
      ${railUser(account)}
    </div>
    <main class="ui-app__main"${maxWidth ? ` style="--ui-app-main: ${maxWidth}"` : ''}>
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
    topbar: {
      word,
      view: 'text',
      showSwitch,
      versions,
      account: { ...(isRecord(account) ? account : {}), active, nav: items },
    },
  });
}
