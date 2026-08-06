import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Button } from './primitives/Button';
import './Modal.css';

export type ModalProps = {
  open: boolean; title: string; onClose: () => void; footer?: ReactNode; children?: ReactNode;
};

// Everything focusable inside the panel, in DOM order.
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), '
  + 'textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Modal({ open, title, onClose, footer, children }: ModalProps) {
  const panel = useRef<HTMLDivElement>(null);

  // Esc closes, Tab is trapped. A dialog that lets Tab wander into the page
  // behind it is a dialog only in looks — the reader leaves and never comes back.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key !== 'Tab' || !panel.current) return;
      const items = Array.from(panel.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (items.length === 0) { e.preventDefault(); panel.current.focus(); return; }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (!panel.current.contains(active)) { e.preventDefault(); first.focus(); return; }
      if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
      else if (e.shiftKey && active === first) { e.preventDefault(); last.focus(); }
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

  // Focus the first field in the body, not the header Close button.
  useEffect(() => {
    if (!open) return;
    const target = panel.current?.querySelector<HTMLElement>(
      '.rx-modal__body input, .rx-modal__body select, .rx-modal__body textarea, .rx-modal__body button',
    ) || panel.current;
    target?.focus();
  }, [open]);

  if (!open) return null;
  return createPortal(
    <div className="rx-scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
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
