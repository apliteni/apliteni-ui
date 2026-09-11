// Tooltip — the readout that shows a value while a pointer rests on the mark
// holding it: a bar, a point on a sparkline, any surface whose value is read by
// pointing at it.
//
// It is an overlay in every state. The readout is one element, rendered once
// inside its host and absolutely placed there, so showing it moves nothing on
// the page. The wiring fills and places that element; it never inserts one.
//
//   <div class="ui-tip-host" data-tip-host>
//     <svg>… <rect data-tip-label="Mar 2026" data-tip-value="€48,210" …/> …</svg>
//     ${tooltip()}
//   </div>
//   wireTooltip(container);
//
// A mark is any element carrying `data-tip-value`; `data-tip-label` and
// `data-tip-detail` sit beside it. The readout opens above the mark, or above a
// `[data-tip-anchor]` inside it — a sparkline's dot inside a full-height slice.
// Values are written as text, never as markup.
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
 * @param {boolean} [o.open]     render it shown, for a specimen or a screenshot
 * @param {number} [o.x]         with `open`: the mark's centre, px from the host's left
 * @param {number} [o.y]         with `open`: the mark's top edge (its bottom for 'bottom'), px from the host's top
 * @param {string} [o.id]
 * @returns {string} html
 */
export function tooltip({
  label = '', value = '', detail = '', placement = 'top', open = false, x, y, id,
} = {}) {
  const text = { label, value, detail };
  const pos = [['--ui-tip-x', px(x)], ['--ui-tip-y', px(y)]]
    .filter(([, v]) => v).map(([k, v]) => `${k}:${v}`).join(';');
  // A tooltip with nothing in it has no name, so an empty readout — the one a
  // chart renders before any mark is hovered — takes the role with its first value.
  const attrs = [
    `class="${cx('ui-tip', placement === 'bottom' && 'is-below', open && 'is-open')}"`,
    value ? 'role="tooltip"' : '',
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

const tipOf = (host) => host.querySelector('[data-tip]');
const clips = (cs) => [cs.overflow, cs.overflowX, cs.overflowY].some((v) => v && v !== 'visible');

// What the readout has to stay inside: the viewport, cut down by the host and
// every ancestor whose overflow clips. <body> is left out — its overflow is the
// viewport's, and its box can be shorter than the page.
function clipBox(host) {
  const box = { top: 0, left: 0, right: window.innerWidth, bottom: window.innerHeight };
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
// so a readout that fits nowhere still opens where its author said. Then slide
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

/** Show the host's readout for one mark. For a chart that does its own hit-testing. */
export function showTooltip(host, mark) {
  const tip = tipOf(host);
  if (!tip || !mark) return;
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
  tip.classList.add('is-open');
}

function releaseMark(host) {
  const mark = host.__tipMark;
  if (mark?.__tipDescribed) { mark.removeAttribute('aria-describedby'); mark.__tipDescribed = false; }
  host.__tipMark = null;
}

/** Hide the host's readout. */
export function hideTooltip(host) {
  releaseMark(host);
  tipOf(host)?.classList.remove('is-open');
}

// Escape dismisses whatever readout is showing without the pointer having to
// move — the reader it covers something for. The mark stays current, so the
// readout returns on the next mark rather than on the one it was dismissed from.
function wireEscape(doc) {
  if (doc.__tipEscapeWired) return;
  doc.__tipEscapeWired = true;
  doc.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    doc.querySelectorAll('[data-tip].is-open').forEach((tip) => tip.classList.remove('is-open'));
  });
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
    if (!tipOf(host)) host.insertAdjacentHTML('beforeend', tooltip());
    const markOf = (t) => {
      const mark = t?.closest?.('[data-tip-value]');
      return mark && host.contains(mark) ? mark : null;
    };
    host.addEventListener('pointerover', (e) => {
      const mark = markOf(e.target);
      if (!mark) hideTooltip(host);
      else if (mark !== host.__tipMark) showTooltip(host, mark);
    });
    host.addEventListener('pointerleave', () => hideTooltip(host));
    host.addEventListener('focusin', (e) => {
      const mark = markOf(e.target);
      if (mark) showTooltip(host, mark);
    });
    host.addEventListener('focusout', (e) => { if (!markOf(e.relatedTarget)) hideTooltip(host); });
  });
  wireEscape(root.ownerDocument || root);
}
