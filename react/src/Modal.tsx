import { useId, useRef, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { Button } from './primitives/Button';
import { DialogScope, dismissOnScrim, useDialog, usePresence } from './dialog';
import './Modal.css';

export type ModalProps = {
  open: boolean; title: string; onClose: () => void; footer?: ReactNode; children?: ReactNode;
  role?: 'dialog' | 'alertdialog';
  initialFocusRef?: RefObject<HTMLElement | null>;
};

// Focus, Escape, the Tab trap, the inert page, the stack of open dialogs and the
// enter/exit motion live in ./dialog, shared with Drawer. The scope tells a dialog
// rendered inside this one that it sits above it. `is-open` on the scrim is what
// Modal.css transitions on.
export function Modal({ open, title, onClose, footer, children, initialFocusRef, role = 'dialog' }: ModalProps) {
  const id = useId();
  const titleId = `${id}-title`;
  const bodyId = `${id}-body`;
  const root = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const { mounted, shown } = usePresence(open, root, panel);
  const scope = useDialog(shown, { root, panel, body, initialFocus: initialFocusRef }, onClose);

  if (!mounted) return null;
  return createPortal(
    <DialogScope.Provider value={scope}>
      <div className={shown ? 'rx-scrim is-open' : 'rx-scrim'} ref={root} onMouseDown={dismissOnScrim(onClose)}>
        <div className="rx-modal" role={role} aria-modal="true" aria-labelledby={titleId}
          aria-describedby={role === 'alertdialog' ? bodyId : undefined} tabIndex={-1} ref={panel}>
          <div className="rx-modal__head">
            <div className="rx-modal__title" id={titleId}>{title}</div>
            <Button variant="ghost" size="sm" iconOnly icon="x" aria-label="Close" onClick={onClose} />
          </div>
          <div className="rx-modal__body" id={bodyId} ref={body}>{children}</div>
          {footer && <div className="rx-modal__foot">{footer}</div>}
        </div>
      </div>
    </DialogScope.Provider>,
    document.body,
  );
}
