import { useId, useRef, useState, type ComponentPropsWithoutRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Avatar } from './primitives/Avatar';
import { Button } from './primitives/Button';
import { NavTabs } from './NavTabs';
import { SidebarNav } from './SidebarNav';
import { DialogScope, dismissOnScrim, useDialog, usePresence } from './dialog';
import './Modal.css';
import './AccountWindow.css';

export type AccountSection = { id: string; label: string; icon?: string; content: ReactNode };
export type AccountReader = { name: string; email: string; personKey?: string | number; avatarSrc?: string };
export type AccountWindowProps = {
  open: boolean;
  onClose: () => void;
  reader: AccountReader;
  sections: AccountSection[];
  /** The open section. Leave it out and the window keeps its own, from `defaultSection`. */
  section?: string;
  defaultSection?: string;
  onSectionChange?: (id: string) => void;
  /** The dialog's name. The section title is its heading. */
  label?: string;
};

// Modal's shell and ./dialog's behaviour, with SidebarNav as the rail and NavTabs as the
// phone row. Both navs render, and AccountWindow.css shows one. A section is a place in the
// window, not a route, so each row is a button with aria-current. The pane remounts on a
// change, so a half-filled form does not follow the reader to the next section.
export function AccountWindow({
  open, onClose, reader, sections, section, defaultSection, onSectionChange, label = 'Account',
}: AccountWindowProps) {
  const titleId = useId();
  const root = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const [own, setOwn] = useState(defaultSection ?? sections[0]?.id);
  const { mounted, shown } = usePresence(open, root, panel);
  const scope = useDialog(shown, { root, panel, body }, onClose);

  if (!mounted) return null;
  const currentId = section ?? own;
  const current = sections.find(s => s.id === currentId) ?? sections[0];
  const select = (id: string) => { if (section === undefined) setOwn(id); onSectionChange?.(id); };
  const asButton = (id: string, { href: _href, target: _target, ...props }: ComponentPropsWithoutRef<'a'>) =>
    <button {...props as ComponentPropsWithoutRef<'button'>} type="button"
      aria-current={id === current?.id ? 'true' : undefined} onClick={() => select(id)} />;
  // One close for each layout. AccountWindow.css shows one, and a hidden one takes no focus.
  const close = <Button variant="ghost" size="sm" iconOnly icon="x" aria-label="Close" onClick={onClose} />;
  const items = sections.map(({ id, label, icon }) => ({ id, label, icon }));
  return createPortal(
    <DialogScope.Provider value={scope}>
      <div className={shown ? 'rx-scrim is-open' : 'rx-scrim'} ref={root} onMouseDown={dismissOnScrim(onClose)}>
        <div className="rx-modal rx-account" role="dialog" aria-modal="true" aria-label={label}
          tabIndex={-1} ref={panel}>
          <div className="rx-account__rail">
            <div className="rx-account__who">
              <span className="rx-account__av"><Avatar personKey={reader.personKey} name={reader.name} src={reader.avatarSrc} size={32} /></span>
              <span className="ui-app__who"><b>{reader.name}</b><span>{reader.email}</span></span>
              {close}
            </div>
            <SidebarNav className="rx-account__side" aria-label={label} items={items} active={current?.id}
              activeIs="section" renderLink={(item, props) => asButton(item.id, props)} />
            <NavTabs className="rx-account__tabs" aria-label={label} items={items} active={current?.id}
              renderLink={(item, props) => asButton(item.id, props)} />
          </div>
          <div className="rx-account__pane">
            <div className="rx-modal__head rx-account__head">
              <h2 className="rx-account__title" id={titleId}>{current?.label}</h2>
              {close}
            </div>
            <div className="rx-modal__body rx-account__body" ref={body} key={current?.id}>
              {current?.content}
            </div>
          </div>
        </div>
      </div>
    </DialogScope.Provider>,
    document.body,
  );
}
