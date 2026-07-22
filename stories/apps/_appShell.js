import { icon } from '../../src/components/index.js';
import { prism } from '../../src/assets/brand.js';

// Shared app shell for the Apps demo screens — the same sidebar language as the
// Landing docs-home, but with account nav. Self-contained (does not depend on
// the finance agent's _accountShell.js). Pass { active, crumb, title, sub, body }.

const NAV = [
  ['overview', 'chart', 'Overview'],
  ['prefs', 'gear', 'Preferences'],
  ['access', 'plug', 'Access & agents'],
];

export const appShell = ({ active = 'overview', crumb = '', title = '', sub = '', body = '' }) => `
  <style>
    .ax { display:grid; grid-template-columns:248px 1fr; min-height:100vh; background:var(--bg); color:var(--text);
      font-family:var(--font-sans); }
    .ax a { text-decoration:none; color:inherit; }
    .ax-side { border-right:1px solid var(--border); background:var(--bg-elevated); padding:22px 16px;
      display:flex; flex-direction:column; gap:22px; position:sticky; top:0; height:100vh; }
    .ax-brand { display:flex; align-items:center; gap:10px; font-weight:650; color:var(--strong);
      letter-spacing:-.01em; padding:2px 6px; }
    .ax-nav { display:flex; flex-direction:column; gap:3px; }
    .ax-item { display:flex; align-items:center; gap:11px; padding:9px 11px; border-radius:var(--radius-sm);
      color:var(--dim); font-size:14px; font-weight:500; transition:background .15s var(--ease), color .15s var(--ease); }
    .ax-item svg { width:17px; height:17px; opacity:.8; }
    .ax-item:hover { background:var(--surface); color:var(--text); }
    .ax-item.is-on { background:color-mix(in srgb, var(--accent) 14%, transparent); color:var(--accent); }
    .ax-item.is-on svg { opacity:1; }
    .ax-user { margin-top:auto; display:flex; align-items:center; gap:10px; padding:10px; border-top:1px solid var(--border); }
    .ax-user__av { width:30px; height:30px; border-radius:50%; background:linear-gradient(145deg,var(--accent),var(--accent-strong));
      color:#fff; display:grid; place-items:center; font:600 12px var(--font-sans); }
    .ax-user__meta { font-size:12.5px; line-height:1.3; }
    .ax-user__meta b { display:block; color:var(--strong); font-weight:600; }
    .ax-user__meta span { color:var(--muted); }

    .ax-main { padding:40px clamp(24px,4vw,56px) 72px; max-width:860px; }
    .ax-crumb { font-size:12.5px; color:var(--muted); margin-bottom:14px; }
    .ax-main h1 { font:700 30px/1.1 var(--font-sans); letter-spacing:-.025em; color:var(--strong); margin:0 0 8px; }
    .ax-main > p { color:var(--dim); font-size:15px; margin:0 0 32px; max-width:60ch; }
    .ax-body { display:flex; flex-direction:column; gap:18px; }
    @media (max-width:820px){ .ax { grid-template-columns:1fr; } .ax-side { display:none; } }
  </style>
  <div class="ax">
    <aside class="ax-side">
      <div class="ax-brand">${prism('axb', 24)}<span>apliteni-ui</span></div>
      <nav class="ax-nav">
        ${NAV.map(([id, ic, label]) => `
          <a class="ax-item ${id === active ? 'is-on' : ''}" href="#${id}">${icon(ic)}<span>${label}</span></a>`).join('')}
      </nav>
      <div class="ax-user">
        <span class="ax-user__av">AL</span>
        <div class="ax-user__meta"><b>Ada Lovelace</b><span>ada@apliteni.com</span></div>
      </div>
    </aside>
    <main class="ax-main">
      ${crumb ? `<div class="ax-crumb">${crumb}</div>` : ''}
      <h1>${title}</h1>
      ${sub ? `<p>${sub}</p>` : ''}
      <div class="ax-body">${body}</div>
    </main>
  </div>`;
