import { useEffect, useId, useRef, useState, type ComponentPropsWithoutRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Avatar } from './primitives/Avatar';
import { Button } from './primitives/Button';
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

// Modal's shell and ./dialog's behaviour, with SidebarNav as the rail. A section is a place
// in the window, not a route, so each rail row is a button with aria-current. The pane
// remounts on a change, so a half-filled form does not follow the reader to the next section.
// On a phone the window shows one screen: the section, or the rail as the screen of
// sections. `view` names it, and AccountWindow.css shows it. Wider, both show and `view`
// changes nothing.
export function AccountWindow({
  open, onClose, reader, sections, section, defaultSection, onSectionChange, label = 'Account',
}: AccountWindowProps) {
  const titleId = useId();
  const root = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const rail = useRef<HTMLDivElement>(null);
  const back = useRef<HTMLButtonElement>(null);
  const moved = useRef(false);
  const [own, setOwn] = useState(defaultSection ?? sections[0]?.id);
  const [view, setView] = useState<'section' | 'sections'>('section');
  // Each open starts on the section.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) { setWasOpen(open); if (open) setView('section'); }
  const { mounted, shown } = usePresence(open, root, panel);
  const scope = useDialog(shown, { root, panel, body }, onClose);
  const currentId = section ?? own;
  // A screen change moves focus to the new screen: the marked section, or the back button
  // at the head of the section. A hidden one takes no focus, so wider the press keeps it.
  useEffect(() => {
    if (!moved.current) return;
    moved.current = false;
    if (view === 'sections') rail.current?.querySelector<HTMLElement>('[aria-current="true"]')?.focus();
    else back.current?.focus();
  }, [view, currentId]);

  if (!mounted) return null;
  const current = sections.find(s => s.id === currentId) ?? sections[0];
  const show = (next: typeof view) => { moved.current = true; setView(next); };
  const select = (id: string) => { if (section === undefined) setOwn(id); onSectionChange?.(id); show('section'); };
  const asButton = (id: string, { href: _href, target: _target, ...props }: ComponentPropsWithoutRef<'a'>) =>
    <button {...props as ComponentPropsWithoutRef<'button'>} type="button"
      aria-current={id === current?.id ? 'true' : undefined} onClick={() => select(id)} />;
  // One close for each screen. AccountWindow.css shows one, and a hidden one takes no focus.
  const close = <Button variant="ghost" size="sm" iconOnly icon="x" aria-label="Close" onClick={onClose} />;
  const items = sections.map(({ id, label, icon }) => ({ id, label, icon }));
  return createPortal(
    <DialogScope.Provider value={scope}>
      <div className={shown ? 'rx-scrim is-open' : 'rx-scrim'} ref={root} onMouseDown={dismissOnScrim(onClose)}>
        <div className="rx-modal rx-account" role="dialog" aria-modal="true" aria-label={label}
          data-view={view} tabIndex={-1} ref={panel}>
          <div className="rx-account__rail" ref={rail}>
            <div className="rx-account__who">
              <span className="rx-account__av"><Avatar personKey={reader.personKey} name={reader.name} src={reader.avatarSrc} size={32} /></span>
              <span className="ui-app__who"><b>{reader.name}</b><span>{reader.email}</span></span>
              {close}
            </div>
            <SidebarNav className="rx-account__side" aria-label={label} items={items} active={current?.id}
              activeIs="section" renderLink={(item, props) => asButton(item.id, props)} />
          </div>
          <div className="rx-account__pane">
            <div className="rx-modal__head rx-account__head">
              <Button className="rx-account__back" variant="ghost" size="sm" iconOnly icon="chevronLeft"
                aria-label="Sections" ref={back} onClick={() => show('sections')} />
              <h2 className="rx-account__title" id={titleId}>{current?.label}</h2>
              {close}
            </div>
            <div className="rx-modal__body rx-account__body" ref={body} key={current?.id}
              role="region" aria-labelledby={titleId}>
              {current?.content}
            </div>
          </div>
        </div>
      </div>
    </DialogScope.Provider>,
    document.body,
  );
}
