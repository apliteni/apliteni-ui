import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Button } from './primitives/Button';
import './Modal.css';

export type ModalProps = {
  open: boolean; title: string; onClose: () => void; footer?: ReactNode; children?: ReactNode;
};

export function Modal({ open, title, onClose, footer, children }: ModalProps) {
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  useEffect(() => {
    if (!open) return;
    panel.current
      ?.querySelector<HTMLElement>('.rx-modal__body input, .rx-modal__body select, '
        + '.rx-modal__body textarea, .rx-modal__body button')
      ?.focus();
  }, [open]);
  if (!open) return null;
  return createPortal(
    <div className="rx-scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="rx-modal" role="dialog" aria-modal="true" aria-label={title} ref={panel}>
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
