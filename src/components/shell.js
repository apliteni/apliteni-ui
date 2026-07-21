// Account page shell — topbar + sticky sidebar + page body. Drop it into any
// product to reuse the exact /account layout: pass the product `word`, the
// signed-in `account`, the current nav `active` id, and the page `title`/`body`.
// Call wireTopbar() once after mounting to wire the account menu + theme toggle.
import { topbar } from './topbar.js';
import { icon } from './index.js';

// Default account navigation: [id, icon, label, href?, target?]. Override with
// the `nav` option. href defaults to `#{id}` — pass your real route (and an
// optional target) to make each item a working link.
export const ACCOUNT_NAV = [
  ['prefs', 'gear', 'Preferences'],
  ['access', 'key', 'Access &amp; agents'],
];

const sidebar = (nav, active, cap = 'Account') =>
  `<nav class="ui-side"><div class="cap">${cap}</div>` +
  nav.map(([id, ic, label, href, target]) =>
    `<a href="${href || '#' + id}"${target ? ` target="${target}"` : ''}${id === active ? ' class="on"' : ''}>${icon(ic)}${label}</a>`).join('') +
  `<div class="ssep"></div><a class="out" href="#logout">${icon('logout')}Sign out</a></nav>`;

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
  return `<div style="position:relative;overflow:hidden;min-height:100vh">
    <span class="ui-glow ui-glow--purple" style="top:-120px;right:6%;opacity:.35"></span>
    ${topbar({ word, view: 'text', showSwitch, versions, account: { ...account, active, nav } })}
    <div class="ui-shell">
      ${sidebar(nav, active, cap)}
      <div class="ui-shell__page">
        <div class="ui-shell__crumbs">${cap} / <b>${crumb || title}</b></div>
        <h1>${title}</h1>
        <div class="sub">${sub}</div>
        <div class="ui-card-stack">${body}</div>
      </div>
    </div>
  </div>`;
}
