import { useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Button } from './primitives/Button';
import { dismissOnScrim, useDialog, usePresence } from './dialog';
import './Modal.css';

export type ModalProps = {
  open: boolean; title: string; onClose: () => void; footer?: ReactNode; children?: ReactNode;
};

// Focus, Escape, the Tab trap, the inert page and the enter/exit motion live in
// ./dialog, shared with Drawer. `is-open` on the scrim is what Modal.css transitions on.
export function Modal({ open, title, onClose, footer, children }: ModalProps) {
  const root = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const { mounted, shown } = usePresence(open, root, panel);
  useDialog(shown, { root, panel, body }, onClose);

  if (!mounted) return null;
  return createPortal(
    <div className={shown ? 'rx-scrim is-open' : 'rx-scrim'} ref={root} onMouseDown={dismissOnScrim(onClose)}>
      <div className="rx-modal" role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={panel}>
        <div className="rx-modal__head">
          <div className="rx-modal__title">{title}</div>
          <Button variant="ghost" size="sm" iconOnly icon="x" aria-label="Close" onClick={onClose} />
        </div>
        <div className="rx-modal__body" ref={body}>{children}</div>
        {footer && <div className="rx-modal__foot">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
