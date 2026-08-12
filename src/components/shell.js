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
import { ACCOUNT_NAV, toMenuTuple } from './account-nav.js';

// The one account navigation definition lives in account-nav.js, because
// topbar.js needs it too and this file already imports topbar.js. Re-exported
// here so the published name docs/library.md documents keeps working.
export { ACCOUNT_NAV };

// accountShell() has always taken its nav as [id, icon, label, href?, target?].
// Accept that shape and nav.js's object shape side by side, so a consumer's
// existing tuples and the exported ACCOUNT_NAV both work. A nav that is not a
// list at all falls back to the default, for the same reason `account: null`
// and an unparseable `maxWidth` do: a shell that throws mid-render takes the
// page with it. An empty list is an answer, not a mistake — it stays empty.
const toItems = (nav) => (Array.isArray(nav) ? nav : ACCOUNT_NAV).map((n) => (Array.isArray(n)
  ? { id: n[0], icon: n[1], label: n[2], href: n[3], target: n[4] }
  : n));

const str = (v) => (v == null ? '' : String(v));

// The reader, escaped for accountMenu()'s raw sinks. Only the keys the caller
// actually sent are rewritten: accountMenu()'s own parameter defaults stay the
// one place the demo identity is written down. A key that arrived null is
// dropped rather than passed on, because a default parameter covers `undefined`
// alone — an /auth/me answering `email: null` otherwise reached the menu's
// `email.split('@')` and took the page down with it.
const escReader = (a) => {
  const out = { ...a };
  for (const key of ['name', 'email']) {
    if (out[key] == null) delete out[key];
    else out[key] = esc(str(out[key]));
  }
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

const initials = (name, email) => {
  const from = str(name).trim() || (str(email).split('@')[0] || '');
  const parts = from.split(/[\s._-]+/).filter(Boolean).map((w) => w[0]);
  return (parts.slice(0, 2).join('') || '?').toUpperCase();
};

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
function railUser(user) {
  const name = str(user && user.name);
  const email = str(user && user.email);
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

export function appShell({
  word = 'apliteni-ui',
  brandHref = '#',
  nav = ACCOUNT_NAV,
  active,
  navLabel = 'Account',
  crumbs = [],
  title = '',
  sub = '',
  body = '',
  account = {},
  signOutHref = '',
  topbar = null,
  maxWidth = MAIN_MAX,
} = {}) {
  const rail = sidebarNav({
    sections: [{ label: navLabel, items: toItems(nav) }],
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
    <main class="ui-app__main" style="--ui-app-main: ${mainMax(maxWidth)}">
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
  const items = toItems(nav);
  const trail = [{ label: cap }, { label: crumb || title }].filter((c) => c.label);
  // The topbar's sinks interpolate raw where the rail's escape: brand() writes
  // `word` straight into its markup and accountMenu() does the same with the
  // reader's name and address. So the topbar path gets its own escaped copy —
  // escaping them before appShell() sees them would come out as entities in the
  // rail, which escapes for itself. Same reasoning as toMenuTuple().
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
      word: esc(word),
      view: 'text',
      showSwitch,
      versions,
      account: { ...escReader(account), active, nav: items.map(toMenuTuple) },
    },
  });
}
