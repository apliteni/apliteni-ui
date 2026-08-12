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
// The scrim + focus trap are shared with confirm(): both are "content over a
// scrim, focus-trapped, Esc-dismissable", and they import one implementation
// from ./overlay.js so the two can never disagree about what Tab does.
import { esc, icon } from './index.js';
import { focusablesIn, inertOutside, trapTab } from './overlay.js';

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
        trapTab(dr.querySelector('[data-drawer-panel]'), e);
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
