// Shared site chrome — ONE topbar, footer, and theme/accent script across every
// page (landing + changelog). build.mjs injects these via {{TOPBAR}} / {{FOOTER}} /
// {{CHROME_CSS}} / {{CHROME_JS}} placeholders, so the marketing shell has a single
// source of truth. Edit here, both pages follow. The topbar itself is the kit's own
// .topbar component — the site eats its own dog food.

const BRAND = `<a class="brand" href="/" aria-label="apliteni ui" style="text-decoration:none">
      <svg viewBox="0 0 32 32" width="23" height="23" aria-hidden="true"><defs><clipPath id="pr"><rect x="1" y="1" width="30" height="30" rx="9"/></clipPath></defs><g clip-path="url(#pr)"><rect x="1" y="1" width="15" height="15" fill="#9b5dff"/><rect x="16" y="1" width="15" height="15" fill="#ff6a3d"/><rect x="1" y="16" width="15" height="15" fill="#3b9dff"/><rect x="16" y="16" width="15" height="15" fill="#16c98a"/></g></svg>
      <span class="brand__word">apliteni<span style="color:var(--accent)">·</span>ui</span>
    </a>`;

// active: '' on the landing, 'changelog' on the changelog page (marks the nav link).
export function topbar(active = '') {
  const on = (k) => (active === k ? ' on' : '');
  return `<header class="topbar site-topbar">
  <div class="topbar__in">
    ${BRAND}
    <span class="ver">{{VERSION}}</span>
    <span class="spacer"></span>
    <a class="lk${on('changelog')}" href="/changelog/">Changelog</a>
    <a class="lk hide-sm" href="https://github.com/apliteni/apliteni-ui">GitHub</a>
    <button class="toggle" id="tgl" aria-label="Toggle theme"><span class="ic" id="tglIc"></span><span id="tglLb">Light</span></button>
  </div>
</header>`;
}

const ACCENTS = `<div class="accents" role="group" aria-label="Accent">
        <button data-acc="default" class="on" style="background:linear-gradient(135deg,#9b5dff,#6a2dcc)" title="Nebula" aria-label="Nebula accent"></button>
        <button data-acc="phoenix" style="background:linear-gradient(135deg,#ff8a5c,#ff6a3d)" title="Phoenix" aria-label="Phoenix accent"></button>
        <button data-acc="ocean" style="background:linear-gradient(135deg,#5ab0ff,#3b9dff)" title="Ocean" aria-label="Ocean accent"></button>
        <button data-acc="emerald" style="background:linear-gradient(135deg,#3ad9a0,#16c98a)" title="Emerald" aria-label="Emerald accent"></button>
      </div>`;

export function footer() {
  return `<footer class="site-footer">
  <div class="site-footer__in">
    <span>© Apliteni</span>
    <div style="display:flex;align-items:center;gap:11px">
      <span style="font-size:11.5px;letter-spacing:.06em;text-transform:uppercase">Accent · <span id="accName" style="color:var(--accent);font-weight:600">Nebula</span></span>
      ${ACCENTS}
    </div>
    <span style="display:flex;gap:22px">
      <a href="/storybook/">Storybook</a>
      <a href="https://github.com/apliteni/apliteni-ui">GitHub</a>
    </span>
  </div>
</footer>`;
}

// Chrome-only CSS (topbar + accents + footer). Page-specific styles stay in each page.
export const CHROME_CSS = `
  .site-topbar { position: sticky; top: 0; z-index: 20; height: 60px;
    background: color-mix(in srgb, var(--bg) 80%, transparent); backdrop-filter: blur(14px);
    border-bottom: 0; }
  .site-topbar .topbar__in { max-width: 1120px; padding: 0 clamp(18px, 4vw, 34px); gap: 15px; }
  .site-topbar .brand__word { font-size: 15px; letter-spacing: -0.01em; }
  .site-topbar .lk { color: var(--dim); font-size: 14px; text-decoration: none; transition: color .15s ease; }
  .site-topbar .lk:hover { color: var(--strong); }
  .site-topbar .lk.on { color: var(--strong); }
  .ver { font-size: 11px; font-weight: 600; letter-spacing: .03em; color: var(--muted); background: var(--surface-2); border-radius: 999px; padding: 3px 9px; }

  .accents { display: inline-flex; gap: 9px; }
  .accents button { width: 22px; height: 22px; border-radius: 50%; border: 0; cursor: pointer; box-shadow: 0 0 0 2px var(--bg); transition: transform .15s; }
  .accents button:hover { transform: scale(1.12); }
  .accents button.on { box-shadow: 0 0 0 2px var(--bg), 0 0 0 4px var(--accent); }

  .site-footer { border-top: 1px solid var(--border); padding: 34px 0; margin-top: 20px; }
  .site-footer__in { max-width: 1120px; margin: 0 auto; padding: 0 clamp(18px, 4vw, 34px);
    display: flex; justify-content: space-between; align-items: center; gap: 20px; flex-wrap: wrap;
    color: var(--muted); font-size: 13px; }
  .site-footer a { color: var(--muted); }
  @media (max-width: 560px) { .site-topbar .hide-sm { display: none; } }
`;

// Theme + accent behaviour. One localStorage namespace (apliteni-ui-*) so a choice
// on the landing carries over to the changelog and vice-versa.
export const CHROME_JS = `
  var root = document.documentElement;
  var SUN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
  var MOON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';
  function applyTheme(t){ root.setAttribute('data-theme', t); document.getElementById('tglIc').innerHTML = t==='dark'?SUN:MOON; document.getElementById('tglLb').textContent = t==='dark'?'Light':'Dark'; try{localStorage.setItem('apliteni-ui-theme',t);}catch(e){} }
  var savedT = null; try{ savedT = localStorage.getItem('apliteni-ui-theme'); }catch(e){}
  applyTheme(savedT || (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'));
  document.getElementById('tgl').addEventListener('click', function(){ applyTheme(root.getAttribute('data-theme')==='dark'?'light':'dark'); });

  var NAMES = { default:'Nebula', phoenix:'Phoenix', ocean:'Ocean', emerald:'Emerald' };
  function applyAccent(a){ if(a==='default') root.removeAttribute('data-accent'); else root.setAttribute('data-accent', a); var nm=document.getElementById('accName'); if(nm) nm.textContent = NAMES[a]; document.querySelectorAll('.accents button').forEach(function(b){ b.classList.toggle('on', b.getAttribute('data-acc')===a); }); try{localStorage.setItem('apliteni-ui-accent',a);}catch(e){} }
  var savedA = null; try{ savedA = localStorage.getItem('apliteni-ui-accent'); }catch(e){}
  if (savedA) applyAccent(savedA);
  document.querySelectorAll('.accents button').forEach(function(b){ b.addEventListener('click', function(){ applyAccent(b.getAttribute('data-acc')); }); });
`;
