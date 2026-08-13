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
// open, or `specimen: true` for a picture of one on a documentation page.
//
// Inertness, Escape and the focus trap are shared with confirm(): both are
// "content over a scrim, focus-trapped, Esc-dismissable", and they push onto one
// stack in ./overlay.js so the two can never disagree about which of them the
// keyboard currently belongs to.
import { esc, icon } from './index.js';
import { OVERLAY_LAYER, adoptOverlay, focusablesIn, popOverlay, pushOverlay, returnFocus, syncOverlays } from './overlay.js';

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
//   open        render already-open, as a real panel: wireDrawer() adopts it onto
//               the overlay stack, so the page behind it goes inert, Tab is
//               trapped in the panel and Escape closes it
//   specimen    render open as a *picture* of the panel: same markup, minus the
//               data-drawer hook and aria-modal, so no wiring and no key handler
//               can reach it. See confirm() for why a documentation page wants
//               that; `open` is the one to use when the drawer is real.
//   id          root id — a [data-drawer-open="id"] trigger targets it
//   ariaLabel   accessible name when there's no visible title
//   dismissible show the close button + allow scrim/Esc dismiss (default true)
//   closeLabel  accessible name for the close button (default 'Close')
export function drawer({
  side = 'right', size = 'md', title, body = '', footer = '',
  open = false, specimen = false, id, ariaLabel, dismissible = true, closeLabel = 'Close',
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

  const rootCls = cx('ui-drawer', `ui-drawer--${side}`, `ui-drawer--${size}`, (open || specimen) && 'is-open');
  return `<div class="${rootCls}"${specimen ? '' : ' data-drawer'} data-drawer-side="${esc(side)}"`
    + `${dismissible ? '' : ' data-drawer-static'}${id ? ` id="${esc(id)}"` : ''}>`
    + `<div class="ui-drawer__scrim" data-drawer-scrim></div>`
    + `<aside class="ui-drawer__panel" role="dialog"${specimen ? '' : ' aria-modal="true"'} ${nameAttr} tabindex="-1" data-drawer-panel>`
    + `${header}${bodyEl}${footEl}`
    + `</aside></div>`;
}

// ---- Shared behaviour ----------------------------------------------------
// One open/close/scrim/close-button implementation for every drawer in the kit;
// inertness, Escape and Tab belong to the overlay stack. Per-instance handlers
// are attached once (guarded by a flag on the node); the [data-drawer-open]
// delegation is attached once per document (guarded by a flag on the document
// node, so multiple documents each get their own). Safe to call repeatedly
// (Storybook re-renders).

export function openDrawer(root, returnFocusTo) {
  if (!root || root.classList.contains('is-open')) return;
  root.__drawerReturn = returnFocusTo
    || (document.activeElement instanceof HTMLElement ? document.activeElement : null);
  root.classList.add('is-open');
  const panel = root.querySelector('[data-drawer-panel]');
  const dismissible = !root.hasAttribute('data-drawer-static');
  pushOverlay(root, panel, dismissible ? () => closeDrawer(root) : null, OVERLAY_LAYER.drawer);
  // Focus the first focusable control, else the panel itself.
  const first = panel && focusablesIn(panel)[0];
  (first || panel)?.focus();
}

export function closeDrawer(root) {
  if (!root || !root.classList.contains('is-open')) return;
  root.classList.remove('is-open');
  popOverlay(root);
  const back = root.__drawerReturn;
  root.__drawerReturn = null;
  // The trigger can be gone by now — focus() on a detached node does nothing at
  // all, which leaves the reader with no place on the page.
  returnFocus(back, root.ownerDocument);
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

    // Rendered with `open: true`, so nothing called openDrawer() and nothing put
    // it on the stack. Adopting it here is what makes its aria-modal true.
    adoptOverlay(dr, dr.querySelector('[data-drawer-panel]'), dismissible ? () => closeDrawer(dr) : null,
      OVERLAY_LAYER.drawer);
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
  }
  // This runs on every re-render, which is the moment to notice that an overlay
  // was destroyed while it was open and hand the page back.
  syncOverlays(doc);
}
