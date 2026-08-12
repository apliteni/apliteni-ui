// Confirm — the kit's confirmation dialog: a question the page stops for.
//
//   container.innerHTML = confirm({ title, body, confirmLabel, cancelLabel });
//   wireConfirm(container);   // scrim/Esc/answers + focus trap
//
// A page trigger opens it by id:  <button data-confirm-open="ID">…</button>
// (or call openConfirm(rootEl) directly). Pass `open: true` to render it already
// open — handy for specimens/screenshots.
//
// Answering is the caller's job: both answers close the dialog, and a listener
// on [data-confirm-accept] is where the destructive work goes. Focus opens on
// the SAFE answer, never the destructive one, so a reader who hits Enter out of
// habit keeps what they have.
//
// The scrim and focus trap come from ./overlay.js — the same ones the drawer
// runs, so the kit has one trap and not two.
import { button, esc } from './index.js';
import { focusablesIn, inertOutside, trapTab } from './overlay.js';

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
//   open          render already-open (specimens / screenshots)
//   id            root id — a [data-confirm-open="id"] trigger targets it
export function confirm({
  title = 'Are you sure?', body = '', confirmLabel = 'Confirm', cancelLabel = 'Cancel',
  variant = 'danger', id, open = false,
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

  const rootCls = cx('ui-confirm', `ui-confirm--${variant}`, open && 'is-open');
  return `<div class="${rootCls}" data-confirm${id ? ` id="${esc(id)}"` : ''}>`
    + `<div class="ui-confirm__scrim" data-confirm-scrim></div>`
    + `<div class="ui-confirm__panel" role="alertdialog" aria-modal="true"`
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
  inertOutside(root, true);
  const panel = root.querySelector('[data-confirm-panel]');
  // The safe answer, else the first control, else the panel itself.
  const safe = panel && (panel.querySelector('[data-confirm-cancel]') || focusablesIn(panel)[0]);
  (safe || panel)?.focus();
}

export function closeConfirm(root) {
  if (!root || !root.classList.contains('is-open')) return;
  root.classList.remove('is-open');
  inertOutside(root, false);
  const back = root.__confirmReturn;
  root.__confirmReturn = null;
  if (back && typeof back.focus === 'function') back.focus();
}

// Topmost open confirm (last in document order) — Esc closes that one.
function topOpenConfirm(doc = document) {
  const open = doc.querySelectorAll('[data-confirm].is-open');
  return open.length ? open[open.length - 1] : null;
}

export function wireConfirm(scope = document) {
  const root = scope === document ? document : scope;
  root.querySelectorAll('[data-confirm]').forEach((cf) => {
    if (cf.__confirmWired) return;
    cf.__confirmWired = true;

    cf.querySelector('[data-confirm-scrim]')?.addEventListener('click', () => closeConfirm(cf));
    cf.querySelectorAll('[data-confirm-cancel],[data-confirm-accept]').forEach((btn) =>
      btn.addEventListener('click', () => closeConfirm(cf)));

    cf.addEventListener('keydown', (e) => {
      if (!cf.classList.contains('is-open')) return;
      if (e.key === 'Escape') {
        e.preventDefault(); e.stopPropagation(); closeConfirm(cf);
      } else if (e.key === 'Tab') {
        trapTab(cf.querySelector('[data-confirm-panel]'), e);
      }
    });
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
    // Esc closes the topmost open confirm even when focus escaped the panel.
    doc.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      const top = topOpenConfirm(doc);
      if (top) { e.preventDefault(); closeConfirm(top); }
    });
  }
}
