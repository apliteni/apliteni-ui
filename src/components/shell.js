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

// The one account navigation definition: nav.js item objects. Labels are raw
// text — every nav primitive escapes, so a pre-escaped `&amp;` would come out
// as `&amp;amp;`. `key` means credentials; `plug` means integration. These two
// are the kit's default, so each is a live link on a consumer's /account page —
// a screen the kit does not ship belongs in the caller's own nav, not here.
export const ACCOUNT_NAV = [
  { id: 'prefs', icon: 'gear', label: 'Preferences' },
  { id: 'access', icon: 'key', label: 'Access & agents' },
];

// accountShell() has always taken its nav as [id, icon, label, href?, target?].
// Accept that shape and nav.js's object shape side by side, so a consumer's
// existing tuples and the exported ACCOUNT_NAV both work.
const toItem = (n) => (Array.isArray(n)
  ? { id: n[0], icon: n[1], label: n[2], href: n[3], target: n[4] }
  : n);

// topbar()'s account menu still speaks tuples, and it interpolates every field
// raw — the label, the href and the target alike. Escape all three here rather
// than sending the menu a string the rail would have escaped.
const toMenuTuple = (it) => [
  esc(it.id ?? ''), it.icon, esc(it.label || ''),
  it.href ? esc(it.href) : it.href,
  it.target ? esc(it.target) : it.target,
];

const str = (v) => (v == null ? '' : String(v));

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
    sections: [{ label: navLabel, items: nav.map(toItem) }],
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
  const grid = `<div class="ui-app">
    <aside class="ui-app__rail">
      ${brand}
      ${rail}
      ${railUser(account)}
    </aside>
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
  const items = nav.map(toItem);
  const trail = [{ label: cap }, { label: crumb || title }].filter((c) => c.label);
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
      account: { ...account, active, nav: items.map(toMenuTuple) },
    },
  });
}
