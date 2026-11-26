import { useId, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './primitives/Icon';
import { DialogScope, dismissOnScrim, useDialog, usePresence } from './dialog';
import { Tooltip } from './Tooltip';

export type DrawerProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  side?: 'right' | 'left' | 'top' | 'bottom';
  size?: 'sm' | 'md' | 'lg';
  footer?: ReactNode;
  /** The state of the record, such as one Badge, directly after the title. */
  status?: ReactNode;
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
  open, title, onClose, side = 'right', size = 'md', footer, status, headerActions, children, closeLabel = 'Close', initialFocusRef,
}: DrawerProps) {
  const root = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const { mounted, shown } = usePresence(open, root, panel);
  const scope = useDialog(shown, { root, panel, body, initialFocus: initialFocusRef }, onClose);
  // A title cut by its ellipsis is a Tab stop that shows the whole title in a readout.
  // It is read again on each resize. Without a ResizeObserver the title has no readout.
  // A title that stops being cut leaves its readout, so React replaces the heading. If the
  // heading has the focus, the panel takes it first and the focus stays in the drawer.
  const heading = useRef<HTMLHeadingElement>(null);
  const [cut, setCut] = useState(false);
  useLayoutEffect(() => {
    const h = heading.current;
    if (!h || typeof ResizeObserver === 'undefined') return;
    const read = () => {
      const now = h.scrollWidth > h.clientWidth;
      if (!now && h === h.ownerDocument.activeElement) panel.current?.focus();
      setCut(now);
    };
    const observer = new ResizeObserver(read);
    observer.observe(h);
    read();
    return () => observer.disconnect();
  }, [mounted, title, cut]);

  if (!mounted) return null;
  const titleEl = <h2 className="ui-drawer__title" id={titleId} ref={heading} tabIndex={cut ? 0 : undefined}>{title}</h2>;
  const cls = ['ui-drawer', `ui-drawer--${side}`, `ui-drawer--${size}`, shown && 'is-open']
    .filter(Boolean).join(' ');
  return createPortal(
    <DialogScope.Provider value={scope}>
      <div className={cls} ref={root}>
        <div className="ui-drawer__scrim" onMouseDown={dismissOnScrim(onClose)} />
        <div className="ui-drawer__panel" role="dialog" aria-modal="true" aria-labelledby={titleId}
          tabIndex={-1} ref={panel}>
          <header className="ui-drawer__header">
            <div className="ui-drawer__lead">
              {cut
                ? <Tooltip text={title} placement="bottom" control>{titleEl}</Tooltip>
                : titleEl}
              {status && <span className="ui-drawer__status">{status}</span>}
            </div>
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
