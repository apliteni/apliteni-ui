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
  const bars = busy ? '<span class="ui-btn__bars"><i></i><i></i></span>' : '';
  const inner = `${ic ? icon(ic) : ''}${iconOnly ? '' : `<span>${esc(label)}</span>`}${iconRight ? icon(iconRight) : ''}${bars}`;
  // busy ⇒ disabled (not clickable while it works)
  const attrs = `class="${cls}"${disabled || busy ? ' disabled aria-disabled="true"' : ''}${busy ? ' aria-busy="true"' : ''}${iconOnly ? ` aria-label="${esc(label)}"` : ''}`;
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

// ---- Aurora — ambient warm backdrop --------------------------------------
// Layered blurred glow "blobs" + optional paper grain. Colours default to the
// accent glow tokens, so the field re-themes with the sub-theme. Drop it as the
// first child of a positioned wrapper (or use fixed: true for full-bleed) and
// give the real content a normal stacking context — it sits on top.
const AURORA_PRESET = [
  { tone: 'accent', x: '22%', y: '12%', size: '64%', delay: '0s' },
  { tone: 'teal',   x: '84%', y: '24%', size: '56%', delay: '-9s' },
  { tone: 'warm',   x: '54%', y: '92%', size: '70%', delay: '-17s' },
];
export function aurora({ blobs = AURORA_PRESET, grain = false, fixed = false, animated = true, className = '' } = {}) {
  const items = blobs.map((b) => {
    const tone = b.tone || 'accent';
    const style = `--au-x:${b.x ?? '50%'};--au-y:${b.y ?? '50%'};--au-size:${b.size ?? '60%'}`
      + (b.delay != null ? `;--au-delay:${b.delay}` : '');
    return `<span class="ui-aurora__blob ui-aurora__blob--${tone}" style="${style}"></span>`;
  }).join('');
  const grainEl = grain ? '<span class="ui-aurora__grain"></span>' : '';
  const cls = cx('ui-aurora', animated && 'ui-aurora--animated', fixed && 'ui-aurora--fixed', className);
  return `<div class="${cls}" aria-hidden="true">${items}${grainEl}</div>`;
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
// Auto-generated ids let field() tie its <label for> to the control it wraps.
// A module counter (never Date/random) keeps ids unique within a rendered page.
let _uid = 0;
const nextId = (p = 'ui') => `${p}-${++_uid}`;
// Give the first form control in `html` an id (or reuse one it already carries)
// so a <label> can point at it. Returns { html, id }; id is null if there's no
// form element to name.
function withControlId(html) {
  const existing = html.match(/<(?:input|textarea|select)\b[^>]*\bid="([^"]+)"/);
  if (existing) return { html, id: existing[1] };
  let id = null;
  const out = html.replace(/<(input|textarea|select)\b/, (m) => { id = nextId('field'); return `${m} id="${id}"`; });
  return { html: out, id };
}

export function field({ label, hint, error, control = '', id } = {}) {
  let ctl = control;
  let forId = id;
  if (label && control) {
    const r = withControlId(control);
    ctl = r.html;
    forId = id || r.id;
  }
  const lab = label
    ? `<label class="ui-field__label"${forId ? ` for="${forId}"` : ''}>${esc(label)}</label>`
    : '';
  const foot = error
    ? `<div class="ui-field__error">${icon('alert')}${esc(error)}</div>`
    : hint ? `<div class="ui-field__hint">${esc(hint)}</div>` : '';
  return `<div class="ui-field">${lab}${ctl}${foot}</div>`;
}
// `ariaLabel` gives a standalone control (no wrapping field) an accessible name.
export function input({ type = 'text', placeholder = '', value = '', icon: ic, invalid, disabled, name, id, ariaLabel } = {}) {
  const attrs = `${id ? ` id="${esc(id)}"` : ''}${name ? ` name="${name}"` : ''}${ariaLabel ? ` aria-label="${esc(ariaLabel)}"` : ''}${disabled ? ' disabled' : ''}`;
  const el = `<input class="${cx('ui-input', invalid && 'is-invalid')}" type="${type}" placeholder="${esc(placeholder)}" value="${esc(value)}"${attrs}>`;
  if (!ic) return el;
  return `<div class="ui-input-group"><span class="ui-input-group__icon">${icon(ic)}</span>${el}</div>`;
}
export function textarea({ placeholder = '', value = '', rows = 4, name, id, ariaLabel } = {}) {
  return `<textarea class="ui-textarea" rows="${rows}" placeholder="${esc(placeholder)}"${id ? ` id="${esc(id)}"` : ''}${name ? ` name="${name}"` : ''}${ariaLabel ? ` aria-label="${esc(ariaLabel)}"` : ''}>${esc(value)}</textarea>`;
}
// Native <select>. Pass a `label` via field() or an `ariaLabel` for a bare one —
// a select with neither has no accessible name.
export function select({ options = [], value, name, id, ariaLabel, disabled } = {}) {
  const opts = options.map((o) => {
    const label = typeof o === 'string' ? o : o.label;
    const val = typeof o === 'string' ? o : (o.value ?? o.label);
    const sel = value != null && String(val) === String(value);
    return `<option value="${esc(val)}"${sel ? ' selected' : ''}>${esc(label)}</option>`;
  }).join('');
  return `<select class="ui-select"${id ? ` id="${esc(id)}"` : ''}${name ? ` name="${name}"` : ''}${ariaLabel ? ` aria-label="${esc(ariaLabel)}"` : ''}${disabled ? ' disabled' : ''}>${opts}</select>`;
}
export function checkbox({ label, checked, type = 'checkbox', name } = {}) {
  return `<label class="ui-check"><input type="${type}"${name ? ` name="${name}"` : ''}${checked ? ' checked' : ''}><span>${label}</span></label>`;
}
// `label` becomes the input's accessible name (a bare switch has no visible text,
// so it needs one). Defaults to "Toggle" so a control is never left unlabelled.
export function switchToggle({ checked = false, disabled = false, name, label = 'Toggle' } = {}) {
  return `<label class="ui-switch"><input type="checkbox"${name ? ` name="${name}"` : ''}${checked ? ' checked' : ''}${disabled ? ' disabled' : ''} aria-label="${esc(label)}"><span class="ui-switch__track"></span></label>`;
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
