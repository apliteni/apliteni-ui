// The kit's one page shell. `appShell()` is a full-height rail — brand, the
// kit's own sidebarNav(), the signed-in reader — beside one <main> that opens
// with a breadcrumb trail the caller owns. `accountShell()` is a thin preset
// over it that keeps the topbar, so the published /account API still works.
// Call wireTopbar() once after mounting to wire the account menu + theme toggle.
// why: docs/adr/0001-one-page-shell.md
import { topbar as productTopbar } from './topbar.js';
import { esc } from './index.js';
import { sidebarNav, breadcrumbs } from './nav.js';
import { prism } from '../assets/brand.js';

// The one account navigation definition: nav.js item objects. Labels are raw
// text — every nav primitive escapes, so a pre-escaped `&amp;` would come out
// as `&amp;amp;`. `key` means credentials; `plug` means integration.
export const ACCOUNT_NAV = [
  { id: 'overview', icon: 'chart', label: 'Overview' },
  { id: 'prefs', icon: 'gear', label: 'Preferences' },
  { id: 'access', icon: 'key', label: 'Access & agents' },
];

// accountShell() has always taken its nav as [id, icon, label, href?, target?].
// Accept that shape and nav.js's object shape side by side, so a consumer's
// existing tuples and the exported ACCOUNT_NAV both work.
const toItem = (n) => (Array.isArray(n)
  ? { id: n[0], icon: n[1], label: n[2], href: n[3], target: n[4] }
  : n);

// topbar()'s account menu still speaks tuples, and it interpolates the label
// raw — so escape here rather than sending it two different strings.
const toMenuTuple = (it) => [it.id, it.icon, esc(it.label || ''), it.href, it.target];

const initials = (name = '', email = '') => {
  const from = name.trim() || (email.split('@')[0] || '');
  const parts = from.split(/[\s._-]+/).filter(Boolean).map((w) => w[0]);
  return (parts.slice(0, 2).join('') || '?').toUpperCase();
};

// The rail footer: who is signed in. Empty when nobody is — a shell must not
// invent an identity for a reader it does not know.
function railUser({ name, email } = {}) {
  if (!name && !email) return '';
  return `<div class="ui-app__user">` +
    `<span class="ui-app__av" aria-hidden="true">${esc(initials(name, email))}</span>` +
    `<span class="ui-app__who">` +
    (name ? `<b>${esc(name)}</b>` : '') +
    (email ? `<span>${esc(email)}</span>` : '') +
    `</span></div>`;
}

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
  topbar = null,
  maxWidth = '860px',
} = {}) {
  const rail = sidebarNav({
    sections: [{ label: navLabel, items: nav.map(toItem) }],
    active,
    ariaLabel: navLabel,
    footer: railUser(account),
    id: 'app-rail',
  });
  const grid = `<div class="ui-app">
    <aside class="ui-app__rail">
      <a class="ui-app__brand" href="${esc(brandHref)}">${prism('appb', 24)}<span>${esc(word)}</span></a>
      ${rail}
    </aside>
    <main class="ui-app__main" style="--ui-app-main: ${esc(maxWidth)}">
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
    topbar: {
      word,
      view: 'text',
      showSwitch,
      versions,
      account: { ...account, active, nav: items.map(toMenuTuple) },
    },
  });
}
