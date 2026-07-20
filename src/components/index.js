// apliteni-ui component factories — each returns an HTML string, matching the
// viz/ server-render idiom so the portal can adopt them with no framework.
import { icon } from '../assets/icons.js';

const cx = (...a) => a.filter(Boolean).join(' ');
export const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ---- Button --------------------------------------------------------------
export function button({
  label = 'Button', variant = 'secondary', size = 'md', icon: ic, iconRight,
  block = false, disabled = false, busy = false, type = 'button', href, iconOnly = false,
} = {}) {
  const cls = cx(
    'ui-btn',
    variant && `ui-btn--${variant}`,
    size !== 'md' && `ui-btn--${size}`,
    block && 'ui-btn--block',
    iconOnly && 'ui-btn--icon',
  );
  const inner = `${ic ? icon(ic) : ''}${iconOnly ? '' : `<span>${esc(label)}</span>`}${iconRight ? icon(iconRight) : ''}`;
  const attrs = `class="${cls}"${disabled ? ' disabled aria-disabled="true"' : ''}${busy ? ' aria-busy="true"' : ''}${iconOnly ? ` aria-label="${esc(label)}"` : ''}`;
  return href
    ? `<a href="${href}" ${attrs}>${inner}</a>`
    : `<button type="${type}" ${attrs}>${inner}</button>`;
}

// ---- Badge / Pill --------------------------------------------------------
export function badge(label, variant = 'neutral') {
  const v = variant === 'neutral' ? '' : `ui-badge--${variant}`;
  return `<span class="${cx('ui-badge', v)}">${esc(label)}</span>`;
}
export function pill(label, variant) {
  return `<span class="${cx('ui-pill', variant && `ui-pill--${variant}`)}">${esc(label)}</span>`;
}
export function statusDot(live = false) {
  return `<span class="${cx('ui-dot', live && 'is-live')}"></span>`;
}

// ---- Card ----------------------------------------------------------------
export function card({ title, sub, body = '', variant, pad, icon: ic } = {}) {
  const cls = cx('ui-card', variant && `ui-card--${variant}`, pad && `ui-card--pad-${pad}`);
  // title/sub are trusted markup (may carry a badge/icon) — not escaped.
  const head = title
    ? `<div class="ui-card__title">${ic ? `<span class="ui-card__icon">${icon(ic)}</span>` : ''}${title}</div>${sub ? `<div class="ui-card__sub">${sub}</div>` : ''}`
    : '';
  return `<div class="${cls}">${head}${body}</div>`;
}

// ---- Segmented control ---------------------------------------------------
export function segmented({ options = [], active = 0, size, block, name = 'seg' } = {}) {
  const cls = cx('ui-seg', size && `ui-seg--${size}`, block && 'ui-seg--block');
  const btns = options.map((o, i) => {
    const label = typeof o === 'string' ? o : o.label;
    const val = typeof o === 'string' ? o : (o.value ?? o.label);
    const on = i === active;
    return `<button type="button" role="tab" aria-selected="${on}" data-value="${esc(val)}"${on ? ' class="is-active"' : ''}>${esc(label)}</button>`;
  }).join('');
  return `<div class="${cls}" role="tablist" data-seg="${name}">${btns}</div>`;
}

// ---- Accent picker -------------------------------------------------------
const ACCENT_SWATCH = {
  default: 'linear-gradient(135deg,#9b5dff,#6a2dcc)',
  phoenix: 'linear-gradient(135deg,#ff8a5c,#ff6a3d)',
  ocean: 'linear-gradient(135deg,#5ab0ff,#3b9dff)',
  emerald: 'linear-gradient(135deg,#3ad9a0,#16c98a)',
};
export function accentPicker({ active = 'default', options = ['default', 'phoenix', 'ocean', 'emerald'] } = {}) {
  return `<div class="ui-accent-picker" data-accent-group>${options.map((o) =>
    `<button type="button" data-accent-pick="${o}"${o === active ? ' class="is-active"' : ''} style="--swatch:${ACCENT_SWATCH[o]}" aria-label="${o} accent" title="${o[0].toUpperCase() + o.slice(1)}"></button>`).join('')}</div>`;
}

// ---- Field / input -------------------------------------------------------
export function field({ label, hint, error, control } = {}) {
  return `<div class="ui-field">${label ? `<label class="ui-field__label">${esc(label)}</label>` : ''}${control || ''}${error ? `<div class="ui-field__error">${icon('alert')}${esc(error)}</div>` : hint ? `<div class="ui-field__hint">${esc(hint)}</div>` : ''}</div>`;
}
export function input({ type = 'text', placeholder = '', value = '', icon: ic, invalid, disabled, name } = {}) {
  const el = `<input class="${cx('ui-input', invalid && 'is-invalid')}" type="${type}" placeholder="${esc(placeholder)}" value="${esc(value)}"${name ? ` name="${name}"` : ''}${disabled ? ' disabled' : ''}>`;
  if (!ic) return el;
  return `<div class="ui-input-group"><span class="ui-input-group__icon">${icon(ic)}</span>${el}</div>`;
}
export function textarea({ placeholder = '', value = '', rows = 4 } = {}) {
  return `<textarea class="ui-textarea" rows="${rows}" placeholder="${esc(placeholder)}">${esc(value)}</textarea>`;
}
export function checkbox({ label, checked, type = 'checkbox', name } = {}) {
  return `<label class="ui-check"><input type="${type}"${name ? ` name="${name}"` : ''}${checked ? ' checked' : ''}><span>${label}</span></label>`;
}
export function switchToggle({ checked = false, disabled = false, name } = {}) {
  return `<label class="ui-switch"><input type="checkbox"${name ? ` name="${name}"` : ''}${checked ? ' checked' : ''}${disabled ? ' disabled' : ''}><span class="ui-switch__track"></span></label>`;
}

// ---- Callout / toast / success ------------------------------------------
export function callout({ variant, icon: ic = 'info', body } = {}) {
  return `<div class="${cx('ui-callout', variant && `ui-callout--${variant}`)}"><span class="ui-callout__icon">${icon(ic)}</span><div>${body}</div></div>`;
}
export function toast({ variant = 'success', title, body, icon: ic = 'check' } = {}) {
  return `<div class="${cx('ui-toast', `ui-toast--${variant}`)}"><span class="ui-toast__icon">${icon(ic)}</span><div class="ui-toast__body">${title ? `<div class="ui-toast__title">${esc(title)}</div>` : ''}${body ? `<div>${esc(body)}</div>` : ''}</div><button class="ui-toast__close" aria-label="Dismiss">${icon('x')}</button></div>`;
}
export function successPanel({ title = 'Done', sub = '' } = {}) {
  return `<div class="ui-success"><div class="ui-success__check">${icon('check')}</div><div class="ui-success__title">${esc(title)}</div>${sub ? `<div class="ui-success__sub">${esc(sub)}</div>` : ''}</div>`;
}

// ---- Snippet -------------------------------------------------------------
export function snippet({ label = 'shell', code = '', reveal = false, copy = true } = {}) {
  return `<div class="${cx('ui-snippet', reveal && 'ui-snippet--reveal')}"><div class="ui-snippet__bar"><span>${esc(label)}</span>${copy ? `<button class="ui-snippet__copy">${icon('copy')}Copy</button>` : ''}</div><pre>${code}</pre></div>`;
}

// Tiny shell highlighter: escapes first, then wraps comments/strings/URLs/flags/command.
// Matches the class names in styles/code.css (.k .f .s .u .c). Ported from viz/account.mjs.
export const hlShell = (raw) =>
  esc(raw).replace(
    /(#[^\n]*)|(&quot;(?:[^&]|&(?!quot;))*&quot;|'[^']*')|(https?:\/\/[^\s"'&]+)|(\B--?[A-Za-z][\w-]*)|(^[a-z][\w.-]*)/gm,
    (m, c, s, u, f, cmd) =>
      c ? `<span class="c">${c}</span>`
        : s ? `<span class="s">${s}</span>`
        : u ? `<span class="u">${u}</span>`
        : f ? `<span class="f">${f}</span>`
        : cmd ? `<span class="k">${cmd}</span>`
        : m,
  );

export { icon };
