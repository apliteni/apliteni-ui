// apliteni-ui component factories — each returns an HTML string, matching the
// viz/ server-render idiom so the portal can adopt them with no framework.
import { icon } from '../assets/icons.js';
import { illo } from '../assets/illustrations.js';

const cx = (...a) => a.filter(Boolean).join(' ');
export const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ---- Button --------------------------------------------------------------
// `iconSvg` is a raw leading-icon SVG string (trusted markup, not escaped) for
// branded glyphs the kit's icon set doesn't own — e.g. a Google "G". It takes
// the leading slot; `icon` is the named-icon shorthand for kit glyphs. This is
// what lets third-party buttons go through button() instead of hand-rolled markup.
//
// `iconOnly` drops the visible text, and kit glyphs are aria-hidden — so `label`
// stops being decoration and becomes the control's ONLY accessible name. It is
// mirrored into aria-label + title, and an empty label falls back to the icon
// name rather than shipping a nameless button.
export function button({
  label = 'Button', variant = 'secondary', size = 'md', icon: ic, iconSvg, iconRight,
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
  const lead = iconSvg || (ic ? icon(ic) : '');
  const inner = `${lead}${iconOnly ? '' : `<span>${esc(label)}</span>`}${iconRight ? icon(iconRight) : ''}${bars}`;
  // busy ⇒ disabled (not clickable while it works)
  const name = String(label == null ? '' : label).trim() || ic || 'Button';
  const named = iconOnly ? ` aria-label="${esc(name)}" title="${esc(name)}"` : '';
  const attrs = `class="${cls}"${disabled || busy ? ' disabled aria-disabled="true"' : ''}${busy ? ' aria-busy="true"' : ''}${named}`;
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
// Swatches have no text and no glyph at all — the aria-label is the whole
// accessible name, and aria-pressed carries which one is on.
export function accentPicker({ active = 'default', options = ['default', 'phoenix', 'ocean', 'emerald'] } = {}) {
  const title = (o) => o.charAt(0).toUpperCase() + o.slice(1);
  return `<div class="ui-accent-picker" data-accent-group role="group" aria-label="Accent">${options.map((o) =>
    `<button type="button" data-accent-pick="${esc(o)}"${o === active ? ' class="is-active"' : ''}`
    + ` style="--swatch:${ACCENT_SWATCH[o] || 'transparent'}" aria-pressed="${o === active ? 'true' : 'false'}"`
    + ` aria-label="${esc(title(o))} accent" title="${esc(title(o))}"></button>`).join('')}</div>`;
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
// Default icon per status — overridable with `icon`.
const TOAST_ICON = { success: 'check', danger: 'x', warn: 'alert', info: 'info', neutral: 'bolt' };
// A toast carries a status (colour) and a style (surface). Everything visual is
// token-driven: the status modifier sets --toast-accent/-glow/-on, the style
// modifier consumes them. `action` adds a trailing button ("Undo"/"Retry"),
// `timer` adds an auto-dismiss progress bar (true → default 5s, or a number of
// seconds), `compact` drops the body for a single-line toast.
export function toast({
  variant = 'success', style = 'soft', title, body, icon: ic,
  action, timer = false, compact = false, dismissible = true,
} = {}) {
  const cls = cx('ui-toast', `ui-toast--${variant}`, `ui-toast--${style}`, compact && 'ui-toast--compact');
  const actLabel = typeof action === 'string' ? action : action && action.label;
  const actBtn = actLabel ? `<button class="ui-toast__action" type="button">${esc(actLabel)}</button>` : '';
  // Icon-only: the glyph is aria-hidden, so aria-label IS the accessible name.
  const closeBtn = dismissible ? `<button type="button" class="ui-toast__close" aria-label="Dismiss">${icon('x')}</button>` : '';
  const bodyHtml = compact || !body ? '' : `<div class="ui-toast__text">${esc(body)}</div>`;
  const dur = typeof timer === 'number' ? ` style="--toast-dur:${timer}s"` : '';
  const timerBar = timer ? '<span class="ui-toast__timer" data-toast-timer></span>' : '';
  return `<div class="${cls}" role="status" aria-live="polite"${dur}>`
    + `<span class="ui-toast__icon">${icon(ic || TOAST_ICON[variant] || 'info')}</span>`
    + `<div class="ui-toast__body">${title ? `<div class="ui-toast__title">${esc(title)}</div>` : ''}${bodyHtml}</div>`
    + `${actBtn}${closeBtn}${timerBar}</div>`;
}
export function successPanel({ title = 'Done', sub = '' } = {}) {
  return `<div class="ui-success"><div class="ui-success__check">${icon('check')}</div><div class="ui-success__title">${esc(title)}</div>${sub ? `<div class="ui-success__sub">${esc(sub)}</div>` : ''}</div>`;
}

// ---- Empty state ---------------------------------------------------------
// The placeholder for an empty list/table/page. Pass `art` as an illustration
// name (see illustrations.js) or raw <svg> markup; a legacy line `icon` name is
// also accepted. `actions` is trusted button markup (e.g. button({…})).
export function emptyState({ art, icon: ic, title, sub, actions } = {}) {
  const artHtml = art
    ? `<div class="ui-empty__art">${/<svg/.test(art) ? art : illo(art)}</div>`
    : ic ? `<div class="ui-empty__icon">${icon(ic)}</div>` : '';
  return `<div class="ui-empty">${artHtml}`
    + `${title ? `<div class="ui-empty__title">${esc(title)}</div>` : ''}`
    + `${sub ? `<div class="ui-empty__sub">${esc(sub)}</div>` : ''}`
    + `${actions ? `<div class="ui-empty__actions">${actions}</div>` : ''}`
    + `</div>`;
}

// ---- Snippet -------------------------------------------------------------
// `copyLabel` is both the visible text and the accessible name of the copy
// button. wireTopbar() swaps that text to "✓ Copied" and back, so the button is
// never left nameless — the glyph beside it is decorative (aria-hidden).
// `type="button"`: without it a snippet dropped inside a <form> submits the form.
export function snippet({ label = 'shell', code = '', reveal = false, copy = true, copyLabel = 'Copy' } = {}) {
  const copyBtn = copy
    ? `<button type="button" class="ui-snippet__copy" data-orig="${esc(copyLabel)}">${icon('copy')}${esc(copyLabel)}</button>`
    : '';
  return `<div class="${cx('ui-snippet', reveal && 'ui-snippet--reveal')}"><div class="ui-snippet__bar"><span>${esc(label)}</span>${copyBtn}</div><pre>${code}</pre></div>`;
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
export { illo, illoNames } from '../assets/illustrations.js';
