// Confirm — the kit's confirmation dialog: a question the page stops for.
//
//   container.innerHTML = confirm({ title, body, confirmLabel, cancelLabel });
//   wireConfirm(container);   // scrim/Esc/answers + focus trap
//
// A page trigger opens it by id:  <button data-confirm-open="ID">…</button>
// (or call openConfirm(rootEl) directly). Pass `open: true` to render it already
// open, or `specimen: true` for a picture of one on a documentation page.
//
// Answering is the caller's job: both answers close the dialog, and a listener
// on [data-confirm-accept] is where the destructive work goes. Focus opens on
// the SAFE answer, never the destructive one, so a reader who hits Enter out of
// habit keeps what they have.
//
// Inertness, Escape and the focus trap come from ./overlay.js — one stack for
// every overlay on the page, so a confirm over a drawer never has to guess which
// of the two the keyboard belongs to.
import { button, esc } from './index.js';
import { OVERLAY_LAYER, adoptOverlay, focusablesIn, popOverlay, pushOverlay, returnFocus, syncOverlays } from './overlay.js';

const cx = (...a) => a.filter(Boolean).join(' ');

// Module counter (never Date/random) → stable, unique ids for aria-labelledby.
let _uid = 0;
const nextId = (p = 'confirm') => `${p}-${++_uid}`;

// The public factory. Returns an HTML string; wire it with wireConfirm().
//   title         the question — also the dialog's accessible name
//   body          the consequence — the dialog's accessible description
//   confirmLabel  the destructive answer (default 'Confirm')
//   cancelLabel   the safe answer (default 'Cancel')
//   variant       'danger' (default) | 'primary' — which button the answer is
//   open          render already-open, as a real dialog: wireConfirm() adopts it
//                 onto the overlay stack, so the page behind it goes inert, Tab
//                 is trapped in the panel and Escape closes it
//   specimen      render open as a *picture* of the dialog: same markup, minus
//                 the data-confirm hook and aria-modal, so no wiring and no key
//                 handler can reach it. A documentation page shows several at
//                 once and none of them owns the page or answers Escape — an
//                 answered specimen would erase itself with nothing to bring it
//                 back, and three modal dialogs on one page trap the reader in
//                 the first. `open` is the one to use when the dialog is real.
//   id            root id — a [data-confirm-open="id"] trigger targets it
export function confirm({
  title = 'Are you sure?', body = '', confirmLabel = 'Confirm', cancelLabel = 'Cancel',
  variant = 'danger', id, open = false, specimen = false,
} = {}) {
  const titleId = nextId('confirm-title');
  const bodyId = body ? nextId('confirm-body') : null;
  const describedBy = bodyId ? ` aria-describedby="${bodyId}"` : '';

  // The safe answer comes FIRST in the DOM, so the trap's first stop and the
  // reader's first Tab both land on the answer that changes nothing.
  const cancelBtn = button({ label: cancelLabel, variant: 'ghost' })
    .replace('<button ', '<button data-confirm-cancel ');
  const acceptBtn = button({ label: confirmLabel, variant })
    .replace('<button ', '<button data-confirm-accept ');

  const rootCls = cx('ui-confirm', (open || specimen) && 'is-open');
  return `<div class="${rootCls}"${specimen ? '' : ' data-confirm'}${id ? ` id="${esc(id)}"` : ''}>`
    + `<div class="ui-confirm__scrim" data-confirm-scrim></div>`
    + `<div class="ui-confirm__panel" role="alertdialog"${specimen ? '' : ' aria-modal="true"'}`
    + ` aria-labelledby="${titleId}"${describedBy} tabindex="-1" data-confirm-panel>`
    + `<h2 class="ui-confirm__title" id="${titleId}">${esc(title)}</h2>`
    + (bodyId ? `<p class="ui-confirm__body" id="${bodyId}">${esc(body)}</p>` : '')
    + `<div class="ui-confirm__acts">${cancelBtn}${acceptBtn}</div>`
    + `</div></div>`;
}

// ---- Shared behaviour ----------------------------------------------------
// Per-instance handlers are attached once (guarded by a flag on the node);
// the [data-confirm-open] delegation is attached once per document. Safe to
// call repeatedly (Storybook re-renders).

export function openConfirm(root, returnFocusTo) {
  if (!root || root.classList.contains('is-open')) return;
  root.__confirmReturn = returnFocusTo
    || (document.activeElement instanceof HTMLElement ? document.activeElement : null);
  root.classList.add('is-open');
  const panel = root.querySelector('[data-confirm-panel]');
  pushOverlay(root, panel, () => closeConfirm(root), OVERLAY_LAYER.confirm);
  // The safe answer, else the first control, else the panel itself. Asked for by
  // name and not by position: DOM order puts the safe answer first today, and a
  // preference that only agrees with the order proves nothing about either.
  const safe = panel && (panel.querySelector('[data-confirm-cancel]') || focusablesIn(panel)[0]);
  (safe || panel)?.focus();
}

export function closeConfirm(root) {
  if (!root || !root.classList.contains('is-open')) return;
  root.classList.remove('is-open');
  popOverlay(root);
  const back = root.__confirmReturn;
  root.__confirmReturn = null;
  // The destructive work a caller hangs off [data-confirm-accept] usually deletes
  // the row the trigger stood in, so the trigger can be detached by now — and
  // focus() on a detached node is a silent no-op that strands the reader.
  returnFocus(back, root.ownerDocument);
}

export function wireConfirm(scope = document) {
  const root = scope === document ? document : scope;
  root.querySelectorAll('[data-confirm]').forEach((cf) => {
    if (cf.__confirmWired) return;
    cf.__confirmWired = true;

    cf.querySelector('[data-confirm-scrim]')?.addEventListener('click', () => closeConfirm(cf));
    cf.querySelectorAll('[data-confirm-cancel],[data-confirm-accept]').forEach((btn) =>
      btn.addEventListener('click', () => closeConfirm(cf)));

    // Rendered with `open: true`, so nothing called openConfirm() and nothing
    // put it on the stack. Adopting it here is what makes its aria-modal true.
    adoptOverlay(cf, cf.querySelector('[data-confirm-panel]'), () => closeConfirm(cf), OVERLAY_LAYER.confirm);
  });

  const doc = scope === document ? document : (scope.ownerDocument || document);
  if (!doc.__confirmGlobalWired) {
    doc.__confirmGlobalWired = true;
    // Any [data-confirm-open="ID"] trigger opens the matching dialog.
    doc.addEventListener('click', (e) => {
      const opener = e.target.closest?.('[data-confirm-open]');
      if (!opener) return;
      e.preventDefault();
      const target = doc.getElementById(opener.getAttribute('data-confirm-open'));
      if (target) openConfirm(target, opener);
    });
  }
  // This runs on every re-render, which is the moment to notice that an overlay
  // was destroyed while it was open and hand the page back.
  syncOverlays(doc);
}
