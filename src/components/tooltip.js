// Tooltip — the readout that shows a value while a pointer rests on the mark
// holding it. An overlay in every state: one element, rendered once inside its
// host and absolutely placed there, so showing it moves nothing on the page.
//
//   <div class="ui-tip-host" data-tip-host>
//     <svg>… <rect data-tip-label="Mar 2026" data-tip-value="€48,210" …/> …</svg>
//     ${tooltip()}
//   </div>
//   wireTooltip(container);
//
// A mark carries `data-tip-value`, with `data-tip-label` and `data-tip-detail`;
// a `[data-tip-anchor]` inside it is where the readout opens.
// why: docs/specification.md#the-hover-readout
import { esc } from './index.js';

const cx = (...a) => a.filter(Boolean).join(' ');
const PARTS = ['label', 'value', 'detail'];
const px = (n) => (typeof n === 'number' && Number.isFinite(n) ? `${n}px` : null);
let seq = 0;

/**
 * The readout. Render it once inside a `[data-tip-host]`; wireTooltip() fills it.
 *
 * @param {object} [o]
 * @param {string} [o.label]     which point — a date, a category, a series
 * @param {string} [o.value]     the number, already formatted
 * @param {string} [o.detail]    at most one comparison, such as "+4.2% on February"
 * @param {string} [o.placement] 'top' (default) | 'bottom' — the side it prefers; the wiring flips it when clipped
 * @param {boolean} [o.open]     render it shown, as a picture; its host leaves off `data-tip-host` so no wiring takes it down
 * @param {number} [o.x]         with `open`: the mark's centre, px from the host's left
 * @param {number} [o.y]         with `open`: the mark's top edge (its bottom for 'bottom'), px from the host's top
 * @param {string} [o.id]
 * @returns {string} html
 */
export function tooltip({
  label = '', value = '', detail = '', placement = 'top', open = false, x, y, id,
} = {}) {
  const text = { label, value, detail };
  const named = value != null && String(value) !== '';
  const pos =[['--ui-tip-x', px(x)], ['--ui-tip-y', px(y)]]
    .filter(([, v]) => v).map(([k, v]) => `${k}:${v}`).join(';');
  // A tooltip with nothing in it has no name, so an empty readout — the one a
  // chart renders before any mark is hovered — takes the role with its first value.
  const attrs = [
    `class="${cx('ui-tip', placement === 'bottom' && 'is-below', open && 'is-open')}"`,
    named ? 'role="tooltip"' : '',
    'data-tip',
    id ? `id="${esc(id)}"` : '',
    pos ? `style="${pos}"` : '',
  ].filter(Boolean).join(' ');
  const spans = PARTS.map((k) => {
    const t = text[k] == null ? '' : String(text[k]);
    return `<span class="ui-tip__${k}"${t ? '' : ' hidden'}>${esc(t)}</span>`;
  }).join('');
  return `<div ${attrs}>${spans}</div>`;
}

// ---- Placement -----------------------------------------------------------

// The mark-to-readout distance is --ui-tip-gap in src/styles/tooltip.css. This is
// the fallback for a document that has not loaded the sheet;
// src/components/tooltip.test.js pins the two to each other.
const TIP_GAP = 8;

function tipGap(tip) {
  const declared = parseFloat(getComputedStyle(tip).getPropertyValue('--ui-tip-gap'));
  return Number.isFinite(declared) ? declared : TIP_GAP;
}

// Hosts nest. A mark or a readout belongs to the nearest [data-tip-host] above it,
// so one mark opens one readout, and an outer host is never handed an inner one's.
function holds(host, el) {
  const nearest = el.parentElement?.closest('[data-tip-host]') ?? null;
  return host.contains(el) && (nearest === host || !host.contains(nearest));
}

const tipOf = (host) => [...host.querySelectorAll('[data-tip]')].find((tip) => holds(host, tip)) ?? null;
const clips = (cs) => [cs.overflow, cs.overflowX, cs.overflowY].some((v) => v && v !== 'visible');

// What the readout has to stay inside: the viewport less its scrollbars, cut
// down by the host and every ancestor whose overflow clips. <body> is left out —
// its overflow is the viewport's, and its box can be shorter than the page.
function clipBox(host) {
  const view = host.ownerDocument.documentElement;
  const box = { top: 0, left: 0, right: view.clientWidth, bottom: view.clientHeight };
  for (let el = host; el && el !== document.body && el !== document.documentElement; el = el.parentElement) {
    if (!clips(getComputedStyle(el))) continue;
    const r = el.getBoundingClientRect();
    box.top = Math.max(box.top, r.top);
    box.left = Math.max(box.left, r.left);
    box.right = Math.min(box.right, r.right);
    box.bottom = Math.min(box.bottom, r.bottom);
  }
  return box;
}

// Flip only when the preferred side is too tight AND the other side is roomier,
// so a readout that fits on neither side opens on the roomier one. Then slide
// it along the mark's edge, no further than it takes to stay inside the box.
function place(host, tip, mark) {
  const m = (mark.querySelector('[data-tip-anchor]') || mark).getBoundingClientRect();
  const h = host.getBoundingClientRect();
  const clip = clipBox(host);
  const need = tip.offsetHeight + tipGap(tip);
  const above = m.top - clip.top;
  const below = clip.bottom - m.bottom;
  const prefersBelow = tip.__tipPrefersBelow;
  const flip = prefersBelow ? below < need && above > below : above < need && below > above;
  const isBelow = prefersBelow !== flip;
  tip.classList.toggle('is-below', isBelow);

  const centre = m.left + m.width / 2;
  const ideal = centre - tip.offsetWidth / 2;
  const left = Math.max(clip.left, Math.min(ideal, clip.right - tip.offsetWidth));
  // An absolute box is measured from the host's padding edge and rides its scroll.
  const s = tip.style;
  s.setProperty('--ui-tip-x', `${centre - h.left - host.clientLeft + host.scrollLeft}px`);
  s.setProperty('--ui-tip-y', `${(isBelow ? m.bottom : m.top) - h.top - host.clientTop + host.scrollTop}px`);
  s.setProperty('--ui-tip-shift', `${left - ideal}px`);
}

function fill(tip, mark) {
  tip.setAttribute('role', 'tooltip');
  for (const k of PARTS) {
    const el = tip.querySelector(`.ui-tip__${k}`);
    if (!el) continue;
    const t = mark.getAttribute(`data-tip-${k}`) || '';
    el.textContent = t;
    el.hidden = !t;
  }
}

// ---- Behaviour -----------------------------------------------------------

/**
 * Show the host's readout for one mark, until hideTooltip() or Escape. For a chart that does its own
 * hit-testing; its host needs `.ui-tip-host`. After Escape it shows nothing for the dismissed mark
 * until another mark shows or hideTooltip() is called, so a chart may call it on every pointer sample.
 */
export function showTooltip(host, mark) {
  const tip = tipOf(host);
  if (!tip || !mark || mark === host.__tipDismissed) return;
  if (tip.__tipPrefersBelow == null) tip.__tipPrefersBelow = tip.classList.contains('is-below');
  if (!tip.id) tip.id = `ui-tip-${++seq}`;
  releaseMark(host);
  fill(tip, mark);
  place(host, tip, mark);
  // Described only while shown, and only a mark that carried no description of its own.
  if (!mark.hasAttribute('aria-describedby')) {
    mark.setAttribute('aria-describedby', tip.id);
    mark.__tipDescribed = true;
  }
  host.__tipMark = mark;
  host.__tipDismissed = null;
  tip.__tipHost = host;
  tip.classList.add('is-open');
  wireEscape(host.ownerDocument);
}

function releaseMark(host) {
  const mark = host.__tipMark;
  if (mark?.__tipDescribed) { mark.removeAttribute('aria-describedby'); mark.__tipDescribed = false; }
  host.__tipMark = null;
}

function close(host) {
  releaseMark(host);
  tipOf(host)?.classList.remove('is-open');
}

/** Hide the host's readout: the pointer has left, so the mark Escape dismissed may show again. */
export function hideTooltip(host) {
  close(host);
  host.__tipDismissed = null;
}

// Escape dismisses every readout the kit is showing without the pointer having
// to move — the reader it covers something for. One rendered open and never
// shown is a picture, and stays. The dismissed mark is remembered until another
// mark shows or the pointer leaves, so crossing the gap between marks and coming
// back does not return the readout to the mark it was dismissed from.
function wireEscape(doc) {
  if (doc.__tipEscapeWired) return;
  doc.__tipEscapeWired = true;
  doc.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    doc.querySelectorAll('[data-tip].is-open').forEach((tip) => {
      const host = tip.__tipHost;
      if (!host) return;
      const mark = host.__tipMark;
      close(host);
      host.__tipDismissed = mark;
    });
  });
}

// The readout is placed in px from its host, so the host has to be the box it is
// positioned against. .ui-tip-host makes it one; a host without it is given the same.
// A host outside the document has no computed style to read, so it waits until it is in one.
function anchorHost(host) {
  if (host.__tipAnchored || !host.isConnected) return;
  host.__tipAnchored = true;
  if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
}

/**
 * Wire every `[data-tip-host]` under root: a pointer resting on a mark, or focus
 * landing on one, shows the readout; leaving the marks hides it. A host with no
 * readout of its own is given one here, once, never on hover. Safe to call again.
 */
export function wireTooltip(root = document) {
  const hosts = [...root.querySelectorAll('[data-tip-host]')];
  if (root.matches?.('[data-tip-host]')) hosts.unshift(root);
  hosts.forEach((host) => {
    if (host.__tipWired) return;
    host.__tipWired = true;
    anchorHost(host);
    if (!tipOf(host)) host.insertAdjacentHTML('beforeend', tooltip());
    const markOf = (t) => {
      const mark = t?.closest?.('[data-tip-value]');
      return mark && holds(host, mark) ? mark : null;
    };
    host.addEventListener('pointerover', (e) => {
      anchorHost(host);
      const mark = markOf(e.target);
      if (!mark) close(host);
      else if (mark !== host.__tipMark) showTooltip(host, mark);
    });
    host.addEventListener('pointerleave', () => hideTooltip(host));
    host.addEventListener('focusin', (e) => {
      anchorHost(host);
      const mark = markOf(e.target);
      if (mark) showTooltip(host, mark);
    });
    host.addEventListener('focusout', (e) => { if (!markOf(e.relatedTarget)) hideTooltip(host); });
  });
}
