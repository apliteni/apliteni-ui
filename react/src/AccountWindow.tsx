import { useEffect, useId, useRef, useState, type ComponentPropsWithoutRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { revealFocusedNav } from '@apliteni/apliteni-ui';
import { Avatar } from './primitives/Avatar';
import { Button } from './primitives/Button';
import { NavTabs } from './NavTabs';
import { SidebarNav } from './SidebarNav';
import { tabKeyIndex } from './Tabs';
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
// window, not a route, so each rail row is a button with aria-current, and the phone row is
// Tabs' tablist over the pane. The pane remounts on a change, so a half-filled form does not
// follow the reader to the next section.
export function AccountWindow({
  open, onClose, reader, sections, section, defaultSection, onSectionChange, label = 'Account',
}: AccountWindowProps) {
  const titleId = useId();
  const root = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const tabs = useRef<HTMLElement>(null);
  const [own, setOwn] = useState(defaultSection ?? sections[0]?.id);
  const { mounted, shown } = usePresence(open, root, panel);
  const scope = useDialog(shown, { root, panel, body }, onClose);
  const currentId = section ?? own;
  // NavTabs reveals an aria-current="page" route, and a tab carries aria-selected, so the
  // window brings the open section into the phone row on open and on each change.
  useEffect(() => {
    const nav = tabs.current;
    if (nav) revealFocusedNav(nav, nav.querySelector('[aria-selected="true"]'));
  }, [mounted, currentId]);

  if (!mounted) return null;
  const current = sections.find(s => s.id === currentId) ?? sections[0];
  const select = (id: string) => { if (section === undefined) setOwn(id); onSectionChange?.(id); };
  const asButton = (id: string, { href: _href, target: _target, ...props }: ComponentPropsWithoutRef<'a'>) =>
    <button {...props as ComponentPropsWithoutRef<'button'>} type="button"
      aria-current={id === current?.id ? 'true' : undefined} onClick={() => select(id)} />;
  const tabId = (i: number) => `${titleId}-tab-${i}`;
  const asTab = (i: number, { href: _href, target: _target, 'aria-current': _current, ...props }: ComponentPropsWithoutRef<'a'>) => {
    const selected = sections[i].id === current?.id;
    return <button {...props as ComponentPropsWithoutRef<'button'>} type="button" role="tab" id={tabId(i)}
      aria-selected={selected} aria-controls={`${titleId}-panel`} tabIndex={selected ? 0 : -1}
      onClick={() => select(sections[i].id)} onKeyDown={event => {
        const next = tabKeyIndex(event.key, i, sections.length);
        if (next === undefined) return;
        event.preventDefault();
        document.getElementById(tabId(next))?.focus();
        select(sections[next].id);
      }} />;
  };
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
            <NavTabs className="rx-account__tabs" role="tablist" aria-label={label} items={items}
              active={current?.id} ref={tabs} renderLink={(item, props) => asTab(sections.findIndex(s => s.id === item.id), props)} />
          </div>
          <div className="rx-account__pane">
            <div className="rx-modal__head rx-account__head">
              <h2 className="rx-account__title" id={titleId}>{current?.label}</h2>
              {close}
            </div>
            <div className="rx-modal__body rx-account__body" ref={body} key={current?.id} id={`${titleId}-panel`}
              role="tabpanel" aria-labelledby={tabId(sections.findIndex(s => s.id === current?.id))}>
              {current?.content}
            </div>
          </div>
        </div>
      </div>
    </DialogScope.Provider>,
    document.body,
  );
}
