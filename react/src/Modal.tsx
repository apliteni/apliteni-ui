import { useEffect, useRef, type MouseEvent as ReactMouseEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Button } from './primitives/Button';
import './Modal.css';

export type ModalProps = {
  open: boolean; title: string; onClose: () => void; footer?: ReactNode; children?: ReactNode;
};

// The candidates, in DOM order — `tabbable` below decides which of them Tab reaches. A
// disclosure's summary is focusable to the browser without matching any of the others.
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), '
  + 'textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), details > summary:first-of-type';

// In the *browser's* sequential tab order, not merely matching the selector. A field
// folded inside a closed disclosure, a hidden subtree or an inert one is skipped by that
// order, and focus() on one is a silent no-op — a dialog that opens onto one leaves the
// reader on <body>, outside it. Tab is the stricter of the two questions and it is the one
// asked here, because the same list decides where the dialog opens and where the trap
// wraps: opening on a control Tab cannot reach strands the reader at the first keystroke.
// The vanilla overlay asks a narrower version of the same question —
// src/components/overlay.js:32 `function reachable(el)` — and the React layer could not
// reuse it in any case: it is internal to the kit and no export reaches it.
function tabbable(el: HTMLElement) {
  // A negative tabindex is focusable to a script and skipped by Tab, whatever the element,
  // and `disabled` on an ancestor fieldset disables a control without the attribute ever
  // reaching it — except inside that fieldset's first legend, which stays enabled and
  // which `:disabled` already knows about.
  const tabindex = el.getAttribute('tabindex');
  if (tabindex !== null && Number(tabindex) < 0) return false;
  if (el.matches(':disabled')) return false;
  for (let node: HTMLElement | null = el; node; node = node.parentElement) {
    if (node.inert || node.hasAttribute('inert') || node.hasAttribute('hidden')) return false;
    const holder: HTMLElement | null = node.parentElement;
    const folded = holder?.tagName === 'DETAILS' && !(holder as HTMLDetailsElement).open;
    if (folded && node !== holder.querySelector(':scope > summary')) return false;
  }
  // Browsers can answer the rest properly; jsdom has no layout and no such method.
  // `visibilityProperty` and not the vanilla's second option: a skipped
  // `content-visibility: auto` subtree reads as invisible there and Tab still reaches
  // it, because the browser un-skips it to put focus inside.
  return typeof el.checkVisibility !== 'function'
    || el.checkVisibility({ visibilityProperty: true });
}

const tabbablesIn = (root: HTMLElement) =>
  Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(tabbable);

// A click on the scrim and nowhere else dismisses. preventDefault is what makes the
// opener keep the focus the dialog hands back: mousedown's own default action moves
// focus to the nearest focusable ancestor of what was hit — nothing, here — and it runs
// after this handler has already closed the dialog and restored the opener, so without
// it a complete click ends on <body> and only a synthetic mousedown looks correct.
const dismissOnScrim = (onClose: () => void) => (e: ReactMouseEvent) => {
  if (e.target !== e.currentTarget) return;
  e.preventDefault();
  onClose();
};

export function Modal({ open, title, onClose, footer, children }: ModalProps) {
  const panel = useRef<HTMLDivElement>(null);

  // Esc closes, Tab is trapped. A dialog that lets Tab wander into the page
  // behind it is a dialog only in looks — the reader leaves and never comes back.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key !== 'Tab' || !panel.current) return;
      const items = tabbablesIn(panel.current);
      if (items.length === 0) { e.preventDefault(); panel.current.focus(); return; }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (!panel.current.contains(active)) { e.preventDefault(); first.focus(); return; }
      if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
      else if (e.shiftKey && (active === first || active === panel.current)) {
        e.preventDefault(); last.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Hide the rest of the page from assistive tech while the dialog is up, and
  // give focus back to whatever opened it on the way out.
  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    const portalRoot = panel.current?.closest('.rx-scrim');
    const muted = (Array.from(document.body.children) as HTMLElement[])
      .filter((el) => el !== portalRoot && !el.hasAttribute('inert'));
    muted.forEach((el) => el.setAttribute('inert', ''));
    return () => {
      muted.forEach((el) => el.removeAttribute('inert'));
      if (opener && document.contains(opener)) opener.focus();
    };
  }, [open]);

  // Focus the first control in the body that Tab can reach, not the header Close button —
  // and never a field a closed disclosure folds over or a fieldset locks, which focus()
  // would leave on <body> in silence. That is where #262 landed.
  useEffect(() => {
    if (!open) return;
    const body = panel.current?.querySelector<HTMLElement>('.rx-modal__body');
    const target = (body ? tabbablesIn(body) : [])[0] || panel.current;
    target?.focus();
  }, [open]);

  if (!open) return null;
  return createPortal(
    <div className="rx-scrim" onMouseDown={dismissOnScrim(onClose)}>
      <div className="rx-modal" role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={panel}>
        <div className="rx-modal__head">
          <div className="rx-modal__title">{title}</div>
          <Button variant="ghost" size="sm" iconOnly icon="x" aria-label="Close" onClick={onClose} />
        </div>
        <div className="rx-modal__body">{children}</div>
        {footer && <div className="rx-modal__foot">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
