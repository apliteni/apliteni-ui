// The pending and denied states of a SCREEN, not of one control.
//
// busyRegion() is one live region that outlives what it reports on; setBusy()
// swaps its body and writes a line into the sr-only node already inside it.
// Three things land in that body: skeleton() while it fetches, your markup once
// the rows arrive, deniedState() when the answer came back 403.
//
// why: docs/specification.md#pending-and-denied-states
import { icon } from '../assets/icons.js';
import { button, esc } from './index.js';

const cx = (...a) => a.filter(Boolean).join(' ');

// ---- Skeleton ------------------------------------------------------------
// The placeholder shape. `lines` is a count, or an array of widths when the
// varied ragged edge of real prose matters (['100%','92%','60%']). `height`
// makes it one solid block instead — a chart, a map, an avatar. The shimmer is
// .m-skeleton from the motion library, so there is one animation to own and it
// is already inside that library's reduced-motion net.
export function skeleton({ lines = 3, width, height, radius, className = '' } = {}) {
  const widths = Array.isArray(lines) ? lines : Array.isArray(width) ? width : null;
  const n = widths ? widths.length : Math.max(1, lines | 0);
  const styleFor = (i) => {
    const w = widths ? widths[i] : (typeof width === 'string' ? width : null);
    const bits = [w && `width:${w}`, height && `height:${height}`, radius && `border-radius:${radius}`];
    const s = bits.filter(Boolean).join(';');
    return s ? ` style="${esc(s)}"` : '';
  };
  const bars = Array.from({ length: n }, (_, i) =>
    `<span class="ui-skel__bar m-skeleton"${styleFor(i)}></span>`).join('');
  return `<div class="${cx('ui-skel', className)}" aria-hidden="true">${bars}</div>`;
}

// A table's worth of skeleton — `rows` × `cols` of bar, laid out on a grid so
// the placeholder has the column rhythm the real table will have. Screens that
// load a table are the common case, and hand-rolling this per screen is how
// four slightly different loading tables get shipped.
export function skeletonTable({ rows = 5, cols = 4, head = true } = {}) {
  const row = (cls) => `<div class="${cls}">`
    + Array.from({ length: Math.max(1, cols | 0) }, () => '<span class="ui-skel__bar m-skeleton"></span>').join('')
    + '</div>';
  const body = Array.from({ length: Math.max(1, rows | 0) }, () => row('ui-skel__row')).join('');
  return `<div class="ui-skel ui-skel--table" style="--skel-cols:${Math.max(1, cols | 0)}" aria-hidden="true">`
    + `${head ? row('ui-skel__row ui-skel__row--head') : ''}${body}</div>`;
}

// ---- The region ----------------------------------------------------------
// `label` is what is spoken while it works, `readyLabel` the fallback for when
// it finishes without the caller supplying a line. Both are parked on the
// element so setBusy() can find them and the caller never repeats itself.
//
// `body` overrides the default skeleton (pass your own placeholder, or the
// already-loaded content when the region starts ready).
export function busyRegion({
  label = 'Loading…', readyLabel = 'Loaded', busy = true,
  body, lines = 3, className = '',
} = {}) {
  const inner = body != null ? body : skeleton({ lines });
  return `<div class="${cx('ui-busy', className)}" data-busy`
    + ` data-busy-label="${esc(label)}" data-busy-ready="${esc(readyLabel)}"`
    + ` role="status" aria-live="polite" aria-busy="${busy ? 'true' : 'false'}">`
    + `<span class="ui-sr" data-busy-msg>${esc(busy ? label : readyLabel)}</span>`
    + `<div class="ui-busy__body" data-busy-body>${inner}</div>`
    + '</div>';
}

// Flip a region between busy and ready, and say so. Writing into
// [data-busy-msg] IS the announcement. Callers pass `message` for the specific
// line ("14 invoices", "You don't have access to this report"); the region's
// own labels are the fallback.
//
// Accepts the region, a selector, or any ancestor of it. Returns the region, or
// null when there is nothing to update — safe to call against a torn-down view.
export function setBusy(root, { busy = false, message, body } = {}) {
  const el = typeof root === 'string' ? document.querySelector(root) : root;
  if (!el || typeof el.querySelector !== 'function') return null;
  const region = el.matches && el.matches('[data-busy]') ? el : el.querySelector('[data-busy]');
  if (!region) return null;

  region.setAttribute('aria-busy', busy ? 'true' : 'false');
  if (body != null) {
    const slot = region.querySelector('[data-busy-body]');
    if (slot) slot.innerHTML = body;
  }
  const msg = region.querySelector('[data-busy-msg]');
  if (msg) {
    const fallback = busy
      ? (region.dataset.busyLabel || 'Loading…')
      : (region.dataset.busyReady || 'Loaded');
    msg.textContent = message == null ? fallback : String(message);
  }
  return region;
}

// ---- Permission denied ---------------------------------------------------
// The 403 screen. Same shape as emptyState() — a mark, a title, a line, some
// actions — because to a reader they are the same event: the thing you came for
// is not here. What separates them is that this one owes an explanation, so
// `need` is a first-class slot rather than something to bury in `sub`.
//
// `need` names the scope or role the reader is missing, verbatim, as code. A
// reader who can act on "you need reports.read" acts on it; "insufficient
// permissions" sends them to open a ticket to find out what to ask for.
//
// No role and no live region here — see the file header. When this lands as the
// answer to a fetch, put it inside a busyRegion() and the region announces it.
export function deniedState({
  title = 'You don’t have access',
  sub = '',
  need = '',
  actions = [],
  icon: ic = 'lock',
  className = '',
} = {}) {
  const needEl = need
    ? `<div class="ui-denied__need">Needs <code class="ui-code">${esc(need)}</code></div>`
    : '';
  const actionsEl = actions.length
    ? `<div class="ui-denied__actions">${actions.map((a) => button({ size: 'md', ...a })).join('')}</div>`
    : '';
  return `<div class="${cx('ui-denied', className)}">`
    + `<div class="ui-denied__seal" aria-hidden="true">${icon(ic)}</div>`
    + `<div class="ui-denied__title">${esc(title)}</div>`
    + `${sub ? `<div class="ui-denied__sub">${esc(sub)}</div>` : ''}`
    + `${needEl}${actionsEl}</div>`;
}
