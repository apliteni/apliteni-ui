// Topbar factory + client behaviours. Composes the canonical strategy topbar
// (brand, Deck/Text, theme toggle, version switcher, account menu).
import { brand } from '../assets/brand.js';
import { icon, sun, moon } from '../assets/icons.js';
import { esc } from './index.js';
import { wireDropdown } from './dropdown.js';

const THEME_KEY = 'apliteni-strategy-theme';

export function themeToggle() {
  // Single icon-only switch (sun in dark, moon in light). Icon pre-filled so it
  // renders before applyTheme() runs; aria-label carries the accessible name.
  return `<button class="toggle" data-theme-toggle aria-label="Toggle theme" title="Toggle light / dark"><span class="ic" data-theme-icon>${sun}</span></button>`;
}

export function deckTextSwitch(active = 'deck') {
  return `<div class="dtsw on" role="group" aria-label="View">` +
    `<a${active === 'deck' ? ' class="cur" aria-current="page"' : ''} href="#deck">Deck</a>` +
    `<a${active === 'text' ? ' class="cur" aria-current="page"' : ''} href="#text">Text</a></div>`;
}

// Thin consumer of the shared dropdown wiring (wireDropdown): keeps its own
// bespoke .vsw/.vopt classes for a pixel-identical look, but emits the generic
// [data-dropdown] hooks so there's ONE open/close/keyboard implementation.
export function versionSwitcher(versions = [], activeIdx = 0) {
  const cur = versions[activeIdx]?.label || '';
  const opts = versions.map((v, i) =>
    `<div class="vopt" role="option" data-dd-item tabindex="-1" aria-selected="${i === activeIdx}" data-active="${i === activeIdx ? '1' : '0'}">` +
    `<span><div class="vname">${v.label}</div><div class="vmeta">${v.meta || ''}</div></span>` +
    `<span class="vbadge ${v.badge === 'live' ? 'live' : 'arch'}">${v.badge || 'archive'}</span></div>`).join('');
  return `<div class="vsw" data-dropdown><button type="button" class="vsw__btn" data-dropdown-trigger aria-haspopup="listbox" aria-expanded="false" aria-label="Version — ${esc(cur)}">` +
    `<span class="lbl">version:</span><span class="cur">${cur}</span><span class="car"></span></button>` +
    `<div class="vsw__menu" data-dropdown-panel role="listbox" aria-label="Version">${opts}</div></div>`;
}

// `nav` ([id, icon, label, href?, target?][]) mirrors the account sidebar so the
// dropdown and the sidebar stay in sync; falls back to the default two items.
export function accountMenu({ name = 'Ada Lovelace', email = 'ada@apliteni.com', active = 'prefs', nav } = {}) {
  const ini = (email.split('@')[0].split(/[._-]+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join('') || '?').toUpperCase();
  const items = nav && nav.length ? nav : [['prefs', 'gear', 'Preferences'], ['access', 'key', 'Access &amp; agents']];
  const it = ([id, ic, label, href, target]) =>
    `<a href="${href || '#' + id}"${target ? ` target="${target}"` : ''} data-dd-item tabindex="-1"${active === id ? ' class="cur"' : ''} role="menuitem">${icon(ic)}${label}</a>`;
  // `on` so the menu is visible in Storybook / standalone use (no /auth/me gate).
  // Consumes the shared dropdown wiring via the generic [data-dropdown] hooks.
  return `<div class="acct on" data-dropdown>` +
    `<button class="avatar" data-dropdown-trigger aria-haspopup="menu" aria-expanded="false" aria-label="Account">${ini}</button>` +
    `<div class="amenu" data-dropdown-panel role="menu">` +
    `<div class="ahead"><span class="avatar">${ini}</span><span class="aw"><span class="anm">${name}</span><span class="aem" title="${email}">${email}</span></span></div>` +
    items.map(it).join('') +
    `<div class="asep"></div><a class="aout" href="#logout" data-dd-item tabindex="-1" role="menuitem">${icon('logout')}Sign out</a>` +
    `</div></div>`;
}

// Full topbar. Pass which pieces to include.
export function topbar({
  word = 'Strategy', view = 'deck', versions, versionIdx = 0,
  account, theme = true, showSwitch = true,
} = {}) {
  return `<header class="topbar"><div class="topbar__in">` +
    brand({ word }) +
    (showSwitch ? deckTextSwitch(view) : '') +
    `<span class="spacer"></span>` +
    (versions ? versionSwitcher(versions, versionIdx) : '') +
    (theme ? themeToggle() : '') +
    (account ? accountMenu(account) : '') +
    `</div></header>`;
}

// ---- Behaviours (call once after markup mounts) --------------------------
export function applyTheme(t, root = document.documentElement) {
  root.setAttribute('data-theme', t);
  root.querySelectorAll('[data-theme-toggle]').forEach((btn) => {
    const ic = btn.querySelector('[data-theme-icon]');
    const lbl = btn.querySelector('[data-theme-label]');
    if (ic) ic.innerHTML = t === 'dark' ? sun : moon;
    if (lbl) lbl.textContent = t === 'dark' ? 'Light' : 'Dark';
  });
  try { localStorage.setItem(THEME_KEY, t); } catch (e) { /* no-op */ }
}

const ACCENT_KEY = 'apliteni-strategy-accent';
export const ACCENTS = ['default', 'phoenix', 'ocean', 'emerald'];

export function applyAccent(name, root = document.documentElement) {
  if (!name || name === 'default') root.removeAttribute('data-accent');
  else root.setAttribute('data-accent', name);
  try { localStorage.setItem(ACCENT_KEY, name || 'default'); } catch (e) { /* no-op */ }
}

export function wireTopbar(root = document) {
  // Theme toggle
  root.querySelectorAll('[data-theme-toggle]').forEach((btn) => {
    const html = document.documentElement;
    const cur = html.getAttribute('data-theme') || 'dark';
    applyTheme(cur, html);
    btn.addEventListener('click', () => applyTheme(html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark', html));
  });
  // Deck/Text view switch (.dtsw) — switch the active pill on click
  root.querySelectorAll('.dtsw').forEach((sw) => {
    sw.addEventListener('click', (e) => {
      const a = e.target.closest('a');
      if (!a || !sw.contains(a)) return;
      e.preventDefault();
      sw.querySelectorAll('a').forEach((x) => { x.classList.remove('cur'); x.removeAttribute('aria-current'); });
      a.classList.add('cur');
      a.setAttribute('aria-current', 'page');
    });
  });
  // Segmented controls (.ui-seg) — visual toggle
  root.querySelectorAll('.ui-seg').forEach((seg) => {
    seg.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b || !seg.contains(b)) return;
      seg.querySelectorAll('button').forEach((x) => { x.classList.remove('is-active'); x.setAttribute('aria-selected', 'false'); });
      b.classList.add('is-active');
      b.setAttribute('aria-selected', 'true');
    });
  });
  // Version switcher + account menu — the shared dropdown wiring (open/close +
  // click-outside + Esc + keyboard nav). One implementation for the whole kit.
  wireDropdown(root);
  // Accent pickers
  root.querySelectorAll('[data-accent-pick]').forEach((chip) => {
    chip.addEventListener('click', () => {
      applyAccent(chip.getAttribute('data-accent-pick'), document.documentElement);
      const group = chip.closest('[data-accent-group]') || root;
      group.querySelectorAll('[data-accent-pick]').forEach((c) => c.classList.toggle('is-active', c === chip));
    });
  });
  // Copy buttons
  root.querySelectorAll('.ui-snippet__copy').forEach((btn) => {
    btn.addEventListener('click', () => {
      const pre = btn.closest('.ui-snippet')?.querySelector('pre');
      if (pre) { navigator.clipboard?.writeText(pre.innerText); btn.innerHTML = '✓ Copied'; setTimeout(() => { btn.innerHTML = btn.dataset.orig || 'Copy'; }, 1400); }
    });
  });
}
