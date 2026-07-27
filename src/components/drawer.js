// Drawer — the kit's edge-anchored overlay panel (a.k.a. Sheet / Slide-over): a
// panel that slides in from any screen edge over a scrim. Header (title + close)
// / scrollable body / footer actions. Sizes sm|md|lg — full-height for
// left|right, full-width for top|bottom.
//
//   container.innerHTML = drawer({ side: 'right', title: 'Filters', body });
//   wireDrawer(container);   // scrim/Esc/close-button + focus trap
//
// A page trigger opens it by id:  <button data-drawer-open="ID">…</button>
// (or call openDrawer(rootEl) directly). Pass `open: true` to render it already
// open — handy for specimens/screenshots.
//
// This deliberately shares its scrim + focus-trap concept with a future Modal /
// Dialog: both are "content over a scrim, focus-trapped, Esc-dismissable". The
// data hooks ([data-drawer]/[data-drawer-scrim]/[data-drawer-close]) and the
// wireDrawer trap below are the primitive a Modal would reuse (centered instead
// of edge-anchored). Kept as one component for now per issue #34.
import { esc, icon } from './index.js';

const cx = (...a) => a.filter(Boolean).join(' ');

// Module counter (never Date/random) → stable, unique ids for aria-labelledby.
let _uid = 0;
const nextId = (p = 'drawer') => `${p}-${++_uid}`;

// The public factory. Returns an HTML string; wire it with wireDrawer().
//   side        'right' (default) | 'left' | 'top' | 'bottom' — the edge it hugs
//   size        'sm' | 'md' (default) | 'lg' — panel extent along the slide axis
//   title       header heading (also the dialog's accessible name)
//   body        scrollable body HTML (trusted markup)
//   footer      pinned footer actions HTML (trusted markup)
//   open        render already-open (specimens / screenshots)
//   id          root id — a [data-drawer-open="id"] trigger targets it
//   ariaLabel   accessible name when there's no visible title
//   dismissible show the close button + allow scrim/Esc dismiss (default true)
//   closeLabel  accessible name for the close button (default 'Close')
export function drawer({
  side = 'right', size = 'md', title, body = '', footer = '',
  open = false, id, ariaLabel, dismissible = true, closeLabel = 'Close',
} = {}) {
  const titleId = title ? nextId('drawer-title') : null;
  const nameAttr = titleId
    ? `aria-labelledby="${titleId}"`
    : `aria-label="${esc(ariaLabel || 'Dialog')}"`;

  const closeBtn = dismissible
    ? `<button type="button" class="ui-drawer__close" data-drawer-close aria-label="${esc(closeLabel)}">${icon('x')}</button>`
    : '';
  const header = (title || dismissible)
    ? `<header class="ui-drawer__header">`
      + (title ? `<h2 class="ui-drawer__title" id="${titleId}">${esc(title)}</h2>` : '<span></span>')
      + `${closeBtn}</header>`
    : '';
  const bodyEl = `<div class="ui-drawer__body">${body}</div>`;
  const footEl = footer ? `<footer class="ui-drawer__footer">${footer}</footer>` : '';

  const rootCls = cx('ui-drawer', `ui-drawer--${side}`, `ui-drawer--${size}`, open && 'is-open');
  return `<div class="${rootCls}" data-drawer data-drawer-side="${esc(side)}"`
    + `${dismissible ? '' : ' data-drawer-static'}${id ? ` id="${esc(id)}"` : ''}>`
    + `<div class="ui-drawer__scrim" data-drawer-scrim></div>`
    + `<aside class="ui-drawer__panel" role="dialog" aria-modal="true" ${nameAttr} tabindex="-1" data-drawer-panel>`
    + `${header}${bodyEl}${footEl}`
    + `</aside></div>`;
}

// ---- Shared behaviour ----------------------------------------------------
// One open/close/scrim/Esc/focus-trap implementation for every drawer in the
// kit. Per-instance handlers are attached once (guarded by a flag on the node);
// document-level Esc + the [data-drawer-open] delegation are attached once per
// document (guarded by a flag on the document node, so multiple documents each
// get their own). Safe to call repeatedly (Storybook re-renders).

const FOCUSABLE = [
  'a[href]', 'button:not([disabled])', 'input:not([disabled])',
  'select:not([disabled])', 'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

// Focusable controls inside the panel, in DOM order. Scoped to the panel, so
// nothing outside the trap is returned; hidden closed drawers are never queried
// (we only call this while open).
function focusablesIn(panel) {
  return Array.from(panel.querySelectorAll(FOCUSABLE));
}

// Hide everything *outside* the drawer from AT + tab order: walk root→body and
// mark each ancestor's other children inert + aria-hidden, remembering prior
// state so close can restore it exactly. The scrim + panel live inside the root,
// so they stay interactive. This is the focus-trap primitive a Modal reuses.
function inertOutside(root, on) {
  if (on) {
    const touched = [];
    let node = root;
    while (node && node.parentElement && node !== document.body) {
      for (const sib of node.parentElement.children) {
        if (sib === node || sib.hasAttribute('data-drawer')) continue;
        touched.push([sib, sib.getAttribute('aria-hidden'), sib.hasAttribute('inert')]);
        sib.setAttribute('aria-hidden', 'true');
        sib.setAttribute('inert', '');
        sib.inert = true;
      }
      node = node.parentElement;
    }
    root.__drawerInert = touched;
  } else {
    (root.__drawerInert || []).forEach(([el, ariaHidden, hadInert]) => {
      if (ariaHidden == null) el.removeAttribute('aria-hidden');
      else el.setAttribute('aria-hidden', ariaHidden);
      if (!hadInert) { el.removeAttribute('inert'); el.inert = false; }
    });
    root.__drawerInert = null;
  }
}

export function openDrawer(root, returnFocusTo) {
  if (!root || root.classList.contains('is-open')) return;
  root.__drawerReturn = returnFocusTo
    || (document.activeElement instanceof HTMLElement ? document.activeElement : null);
  root.classList.add('is-open');
  inertOutside(root, true);
  const panel = root.querySelector('[data-drawer-panel]');
  // Focus the first focusable control, else the panel itself.
  const first = panel && focusablesIn(panel)[0];
  (first || panel)?.focus();
}

export function closeDrawer(root) {
  if (!root || !root.classList.contains('is-open')) return;
  root.classList.remove('is-open');
  inertOutside(root, false);
  const back = root.__drawerReturn;
  root.__drawerReturn = null;
  if (back && typeof back.focus === 'function') back.focus();
}

// Trap Tab within the panel while open; wrap at both ends.
function trapTab(root, e) {
  if (e.key !== 'Tab') return;
  const panel = root.querySelector('[data-drawer-panel]');
  if (!panel) return;
  const items = focusablesIn(panel);
  if (!items.length) { e.preventDefault(); panel.focus(); return; }
  const first = items[0];
  const last = items[items.length - 1];
  const active = document.activeElement;
  if (e.shiftKey && (active === first || active === panel)) {
    e.preventDefault(); last.focus();
  } else if (!e.shiftKey && active === last) {
    e.preventDefault(); first.focus();
  }
}

// Topmost open drawer (last in document order) — Esc closes that one.
function topOpenDrawer(doc = document) {
  const open = doc.querySelectorAll('[data-drawer].is-open');
  return open.length ? open[open.length - 1] : null;
}

export function wireDrawer(root = document) {
  const scope = root === document ? document : root;
  scope.querySelectorAll('[data-drawer]').forEach((dr) => {
    if (dr.__drawerWired) return;
    dr.__drawerWired = true;
    const dismissible = !dr.hasAttribute('data-drawer-static');

    dr.querySelector('[data-drawer-scrim]')?.addEventListener('click', () => {
      if (dismissible) closeDrawer(dr);
    });
    dr.querySelectorAll('[data-drawer-close]').forEach((btn) =>
      btn.addEventListener('click', () => closeDrawer(dr)));

    dr.addEventListener('keydown', (e) => {
      if (!dr.classList.contains('is-open')) return;
      if (e.key === 'Escape' && dismissible) {
        e.preventDefault(); e.stopPropagation(); closeDrawer(dr);
      } else if (e.key === 'Tab') {
        trapTab(dr, e);
      }
    });
  });

  const doc = root === document ? document : (root.ownerDocument || document);
  if (!doc.__drawerGlobalWired) {
    doc.__drawerGlobalWired = true;
    // Any [data-drawer-open="ID"] trigger opens the matching drawer.
    doc.addEventListener('click', (e) => {
      const opener = e.target.closest?.('[data-drawer-open]');
      if (!opener) return;
      e.preventDefault();
      const target = doc.getElementById(opener.getAttribute('data-drawer-open'));
      if (target) openDrawer(target, opener);
    });
    // Esc closes the topmost open drawer even when focus escaped the panel.
    doc.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      const top = topOpenDrawer(doc);
      if (top && !top.hasAttribute('data-drawer-static')) { e.preventDefault(); closeDrawer(top); }
    });
  }
}
