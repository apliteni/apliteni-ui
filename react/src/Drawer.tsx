import { useId, useRef, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './primitives/Icon';
import { DialogScope, dismissOnScrim, useDialog, usePresence } from './dialog';

export type DrawerProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  side?: 'right' | 'left' | 'top' | 'bottom';
  size?: 'sm' | 'md' | 'lg';
  footer?: ReactNode;
  /** Controls in the header, between the title and the close button. */
  headerActions?: ReactNode;
  children?: ReactNode;
  closeLabel?: string;
  initialFocusRef?: RefObject<HTMLElement | null>;
};

// The vanilla drawer() markup, class for class, so src/styles/drawer.css styles it and
// moves it. The factory's data-drawer* hooks are left off on purpose: they are what
// wireDrawer() looks for, and a vanilla wiring pass over this page must not take a
// drawer React owns. Focus, Escape, the Tab trap, the inert page, the stack of open
// dialogs and the enter/exit wait are ./dialog's, shared with Modal; the scope tells a
// dialog rendered inside this one that it sits above it.
export function Drawer({
  open, title, onClose, side = 'right', size = 'md', footer, headerActions, children, closeLabel = 'Close', initialFocusRef,
}: DrawerProps) {
  const root = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const { mounted, shown } = usePresence(open, root, panel);
  const scope = useDialog(shown, { root, panel, body, initialFocus: initialFocusRef }, onClose);

  if (!mounted) return null;
  const cls = ['ui-drawer', `ui-drawer--${side}`, `ui-drawer--${size}`, shown && 'is-open']
    .filter(Boolean).join(' ');
  return createPortal(
    <DialogScope.Provider value={scope}>
      <div className={cls} ref={root}>
        <div className="ui-drawer__scrim" onMouseDown={dismissOnScrim(onClose)} />
        <div className="ui-drawer__panel" role="dialog" aria-modal="true" aria-labelledby={titleId}
          tabIndex={-1} ref={panel}>
          <header className="ui-drawer__header">
            <h2 className="ui-drawer__title" id={titleId}>{title}</h2>
            {headerActions && <div className="ui-drawer__actions">{headerActions}</div>}
            <button type="button" className="ui-drawer__close" aria-label={closeLabel} onClick={onClose}>
              <Icon name="x" />
            </button>
          </header>
          <div className="ui-drawer__body" ref={body}>{children}</div>
          {footer && <footer className="ui-drawer__footer">{footer}</footer>}
        </div>
      </div>
    </DialogScope.Provider>,
    document.body,
  );
}
