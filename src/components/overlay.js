// Overlay primitives — the focus trap the kit's modal surfaces share.
//
// Drawer and Confirm are the same problem twice: content over a scrim that owns
// the keyboard until it is answered. One implementation, imported by both, so
// the two can never disagree about what Tab does. Internal — not re-exported
// from src/index.js.

const FOCUSABLE = [
  'a[href]', 'button:not([disabled])', 'input:not([disabled])',
  'select:not([disabled])', 'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

// An overlay root of any kind — these are skipped when marking siblings inert,
// so one overlay never hides another.
const isOverlayRoot = (el) => el.hasAttribute('data-drawer') || el.hasAttribute('data-confirm');

// Focusable controls inside the panel, in DOM order. Scoped to the panel, so
// nothing outside the trap is returned; hidden closed overlays are never
// queried (we only call this while open).
export function focusablesIn(panel) {
  return Array.from(panel.querySelectorAll(FOCUSABLE));
}

// Hide everything *outside* the overlay from AT + tab order: walk root→body and
// mark each ancestor's other children inert + aria-hidden, remembering prior
// state so close can restore it exactly. The scrim + panel live inside the root,
// so they stay interactive.
export function inertOutside(root, on) {
  if (on) {
    const touched = [];
    let node = root;
    while (node && node.parentElement && node !== document.body) {
      for (const sib of node.parentElement.children) {
        if (sib === node || isOverlayRoot(sib)) continue;
        touched.push([sib, sib.getAttribute('aria-hidden'), sib.hasAttribute('inert')]);
        sib.setAttribute('aria-hidden', 'true');
        sib.setAttribute('inert', '');
        sib.inert = true;
      }
      node = node.parentElement;
    }
    root.__overlayInert = touched;
  } else {
    (root.__overlayInert || []).forEach(([el, ariaHidden, hadInert]) => {
      if (ariaHidden == null) el.removeAttribute('aria-hidden');
      else el.setAttribute('aria-hidden', ariaHidden);
      if (!hadInert) { el.removeAttribute('inert'); el.inert = false; }
    });
    root.__overlayInert = null;
  }
}

// Trap Tab within the panel while open; wrap at both ends.
export function trapTab(panel, e) {
  if (e.key !== 'Tab' || !panel) return;
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
