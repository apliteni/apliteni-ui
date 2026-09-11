import { useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './primitives/Icon';
import { dismissOnScrim, useDialog, usePresence } from './dialog';

export type DrawerProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  side?: 'right' | 'left' | 'top' | 'bottom';
  size?: 'sm' | 'md' | 'lg';
  footer?: ReactNode;
  children?: ReactNode;
  closeLabel?: string;
};

// The vanilla drawer() markup, class for class, so src/styles/drawer.css styles it and
// moves it. The factory's data-drawer* hooks are left off on purpose: they are what
// wireDrawer() looks for, and a vanilla wiring pass over this page must not take a
// drawer React owns. Focus, Escape, the Tab trap, the inert page and the enter/exit
// wait are ./dialog's, shared with Modal.
export function Drawer({
  open, title, onClose, side = 'right', size = 'md', footer, children, closeLabel = 'Close',
}: DrawerProps) {
  const root = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const { mounted, shown } = usePresence(open, root, panel);
  useDialog(shown, { root, panel, body }, onClose);

  if (!mounted) return null;
  const cls = ['ui-drawer', `ui-drawer--${side}`, `ui-drawer--${size}`, shown && 'is-open']
    .filter(Boolean).join(' ');
  return createPortal(
    <div className={cls} ref={root}>
      <div className="ui-drawer__scrim" onMouseDown={dismissOnScrim(onClose)} />
      <aside className="ui-drawer__panel" role="dialog" aria-modal="true" aria-labelledby={titleId}
        tabIndex={-1} ref={panel}>
        <header className="ui-drawer__header">
          <h2 className="ui-drawer__title" id={titleId}>{title}</h2>
          <button type="button" className="ui-drawer__close" aria-label={closeLabel} onClick={onClose}>
            <Icon name="x" />
          </button>
        </header>
        <div className="ui-drawer__body" ref={body}>{children}</div>
        {footer && <footer className="ui-drawer__footer">{footer}</footer>}
      </aside>
    </div>,
    document.body,
  );
}
