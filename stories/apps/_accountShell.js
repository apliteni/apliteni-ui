import { topbar } from '../../src/components/topbar.js';
import { icon } from '../../src/components/index.js';

const NAV = [
  ['prefs', 'gear', 'Preferences'],
  ['access', 'key', 'Access &amp; agents'],
  ['feedback', 'chat', 'Feedback'],
];

const sidebar = (active) =>
  `<nav class="ui-side"><div class="cap">Account</div>` +
  NAV.map(([id, ic, label]) => `<a href="#${id}"${id === active ? ' class="on"' : ''}>${icon(ic)}${label}</a>`).join('') +
  `<div class="ssep"></div><a class="out" href="#logout">${icon('logout')}Sign out</a></nav>`;

// Full account page: topbar + glow + sidebar + page body.
export const accountShell = ({ active, crumb, title, sub, body, prefix = 'ac' }) => `
  <div style="position:relative;overflow:hidden;min-height:100vh">
    <span class="ui-glow ui-glow--purple" style="top:-120px;right:6%;opacity:.35"></span>
    ${topbar({ word: 'Strategy', view: 'text', versions: [{ label: 'phoenix.2026.002', meta: 'Product units', badge: 'live' }], account: { name: 'Ada Lovelace', email: 'ada@apliteni.com', active } })}
    <div class="ui-shell">
      ${sidebar(active)}
      <div class="ui-shell__page">
        <div class="ui-shell__crumbs">Account · <b>${crumb}</b></div>
        <h1>${title}</h1>
        <div class="sub">${sub}</div>
        <div class="ui-card-stack">${body}</div>
      </div>
    </div>
  </div>`;
