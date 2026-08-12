// Topbar factory + client behaviours. Composes the canonical strategy topbar
// (brand, Deck/Text, theme toggle, version switcher, account menu).
import { brand } from '../assets/brand.js';
import { icon, sun, moon } from '../assets/icons.js';
import { esc } from './index.js';
import { wireDropdown } from './dropdown.js';
import { accountMenuNav, initials, toMenuTuple } from './account-nav.js';

const THEME_KEY = 'apliteni-strategy-theme';

// A stateful control in this kit reports the state it is IN, never the state a
// click would produce — the same reading as segmented()'s aria-pressed, the
// Deck/Text switch's aria-current, and the accent chips. So: moon while dark,
// sun while light. Storybook's own toolbar toggle (.storybook/theme-toggle.jsx)
// reads the same way, and topbar stories render directly beneath it.
export const themeIcon = (t) => (t === 'light' ? sun : moon);

// The name carries both the state and what the click does, which is why there
// is no aria-pressed and no role="switch": dark and light are peers, not on and
// off, and an ARIA state on top of this name would announce the theme twice.
// The button is icon-only, so `title` is the only sighted reading of the same
// fact and carries the identical string — nothing for WCAG 2.5.3 to disagree
// with. Both are rewritten by applyTheme on every flip; a name that is right
// once and never again tells a screen-reader user nothing.
export const themeName = (t) =>
  (t === 'light' ? 'Theme: Light. Switch to dark.' : 'Theme: Dark. Switch to light.');

export function themeToggle(theme = 'dark') {
  // Single icon-only switch. Icon and name are pre-filled for `theme` so the
  // first paint is already truthful; applyTheme() keeps them so afterwards.
  const name = esc(themeName(theme));
  return `<button class="toggle" data-theme-toggle aria-label="${name}" title="${name}"><span class="ic" data-theme-icon>${themeIcon(theme)}</span></button>`;
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
// dropdown and the sidebar stay in sync. The fallback is derived from the one
// ACCOUNT_NAV definition rather than restated here: a second literal agreed
// with it by hand about the icon and disagreed about the encoding, which is the
// drift #127 was filed about. Every field below is interpolated raw, so what
// arrives has to arrive escaped — accountMenuNav() is what does that.
//
// `initials` is the avatar, for a caller that escapes on the way in. A mark is
// derived from the reader's name, and a derived value has to be derived before
// the escaping: `<Ada>` and `&lt;Ada&gt;` do not begin with the same character,
// so shell.js — which escapes both fields for this sink — computes the mark
// from the caller's own strings and passes it down beside them. Left out, it is
// computed here from `name` and `email`, exactly where it always came from.
export function accountMenu({
  name = 'Ada Lovelace', email = 'ada@apliteni.com', active = 'prefs', nav, initials: mark,
} = {}) {
  // initials() is shared with the rail's avatar — the two are the same reader
  // on the /account preset, and they used to disagree about who that was.
  const ini = mark == null ? initials(name, email) : mark;
  // ACCOUNT_NAV is published, and it is a list of item objects — so the shape a
  // consumer most naturally hands this option is the one that used to throw here.
  // Read either; toMenuTuple() escapes an object on the way, which a tuple that
  // arrives already escaped does not need.
  //
  // A list that is empty is an answer and stays empty, which is what the rail
  // does with the same value. Falling back on `.length` meant a caller who asked
  // for no entries got none in the rail and the kit's two in the menu — one nav,
  // two answers, which is the drift #127 exists to close.
  const items = (Array.isArray(nav) ? nav : accountMenuNav())
    .map((n) => (Array.isArray(n) ? n : toMenuTuple(n)));
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
  const name = themeName(t);
  root.querySelectorAll('[data-theme-toggle]').forEach((btn) => {
    const ic = btn.querySelector('[data-theme-icon]');
    if (ic) ic.innerHTML = themeIcon(t);
    // The announced name is the point of the control, so it moves with the
    // theme like the glyph does.
    btn.setAttribute('aria-label', name);
    btn.setAttribute('title', name);
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
  // Segmented controls (.ui-seg) — a toolbar of toggle buttons (see segmented()
  // in components/index.js). Click selects; ArrowLeft/ArrowRight move and wrap,
  // Home/End jump to the ends. The strip keeps ONE Tab stop: selecting an option
  // hands it the tabindex and takes it off the rest, so a page with three of
  // these costs three Tab presses, not nine.
  root.querySelectorAll('.ui-seg').forEach((seg) => {
    const btns = () => Array.prototype.slice.call(seg.querySelectorAll('button'));
    const select = (b, focus) => {
      btns().forEach((x) => {
        const on = x === b;
        x.classList.toggle('is-active', on);
        // Older hand-written .ui-seg markup carries aria-selected; segmented()
        // now emits aria-pressed. Keep whichever the button actually declares in
        // step, and never invent the other one.
        if (x.hasAttribute('aria-pressed')) x.setAttribute('aria-pressed', on ? 'true' : 'false');
        if (x.hasAttribute('aria-selected')) x.setAttribute('aria-selected', on ? 'true' : 'false');
        x.tabIndex = on ? 0 : -1;
      });
      if (focus) b.focus();
    };
    seg.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b || !seg.contains(b)) return;
      select(b);
    });
    seg.addEventListener('keydown', (e) => {
      const b = e.target.closest('button');
      if (!b || !seg.contains(b)) return;
      const all = btns();
      const i = all.indexOf(b);
      let n = null;
      if (e.key === 'ArrowRight') n = (i + 1) % all.length;
      else if (e.key === 'ArrowLeft') n = (i - 1 + all.length) % all.length;
      else if (e.key === 'Home') n = 0;
      else if (e.key === 'End') n = all.length - 1;
      if (n === null) return;
      e.preventDefault();
      select(all[n], true);
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
      group.querySelectorAll('[data-accent-pick]').forEach((c) => {
        c.classList.toggle('is-active', c === chip);
        // Keep the announced state in step with the visual one.
        if (c.hasAttribute('aria-pressed')) c.setAttribute('aria-pressed', c === chip ? 'true' : 'false');
      });
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
