import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { icon, themeIcon, transitionMs } from '@apliteni/apliteni-ui';
import { useIsoLayoutEffect } from './dialog';
import { Dropdown, type DropdownItem } from './Dropdown';
import { Avatar } from './primitives/Avatar';
import { useThemeChoice, type Theme } from './ThemeToggle';
import type { AppShellProps } from './AppShell';

const THEMES: [Theme, string][] = [['auto', 'Auto'], ['light', 'Light'], ['dark', 'Dark']];
const glyph = (svg: string, className: string) => <span className={className} aria-hidden="true" dangerouslySetInnerHTML={{ __html: svg }} />;

/* The account menu. With the theme, its Theme row opens a submenu of the three choices
   (#736): a flyout beside the panel on the rail, or in place of the rows, under a back
   row, in the phone drawer. The flyout goes onto <body>, clear of the rail's overflow
   clip. Right and Enter open it; Left and Escape close it onto the Theme row. A choice
   applies at once and the menu stays open. */
export function AccountMenu({ account, items, onSelect, withTheme, inPlace, away }: {
  account: AppShellProps['account']; items: DropdownItem[]; onSelect: (value: string | number | undefined) => void;
  withTheme: boolean; inPlace: boolean; away?: RefObject<HTMLElement | null>;
}) {
  const theme = useThemeChoice();
  const [open, setOpen] = useState(false);
  const [sub, setSub] = useState(false);
  const block = useRef<HTMLDivElement>(null);
  const themeRow = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const flyout = useRef<HTMLDivElement>(null);
  const refocus = useRef(false);
  const close = () => { refocus.current = true; setSub(false); };

  // The flyout's first row sits level with the Theme row, one panel pad clear of the
  // panel's right edge, or of the edge that clips the panel.
  useIsoLayoutEffect(() => {
    if (!sub || inPlace) return;
    const place = () => {
      const row = themeRow.current; const fly = flyout.current;
      const panel = row?.closest('.ui-dropdown__panel');
      if (!row || !fly || !panel) return;
      let right = panel.getBoundingClientRect().right;
      for (let el = panel.parentElement; el; el = el.parentElement) {
        if (getComputedStyle(el).overflowX !== 'visible') { right = Math.min(right, el.getBoundingClientRect().right); break; }
      }
      const style = getComputedStyle(fly);
      const pad = parseFloat(style.paddingTop) + parseFloat(style.borderTopWidth);
      const top = Math.min(row.getBoundingClientRect().top - pad, window.innerHeight - fly.offsetHeight - parseFloat(style.paddingTop));
      fly.style.left = `${right + parseFloat(style.paddingLeft)}px`;
      fly.style.top = `${Math.max(0, top)}px`;
    };
    // A panel still settling its entrance moves the row, so place again when it lands.
    // The timer stands in for an end event that never comes, as in a cancelled transition.
    const panel = themeRow.current?.closest<HTMLElement>('.ui-dropdown__panel');
    place();
    window.addEventListener('resize', place);
    panel?.addEventListener('transitionend', place);
    const landed = panel ? setTimeout(place, transitionMs(panel)) : undefined;
    return () => { window.removeEventListener('resize', place); panel?.removeEventListener('transitionend', place); clearTimeout(landed); };
  }, [sub, inPlace]);
  // A view that crosses to the phone breakpoint hides the sidebar, and the menu with it.
  // The menu and its submenu close, and focus goes to `away`, the band's Menu button (#736).
  useEffect(() => {
    if (!open || !away) return;
    const gone = () => {
      if (block.current?.getClientRects().length) return;
      const el = document.activeElement;
      const held = !el || el === document.body || block.current?.contains(el) || flyout.current?.contains(el);
      setSub(false);
      setOpen(false);
      if (held) away.current?.focus();
    };
    window.addEventListener('resize', gone);
    return () => window.removeEventListener('resize', gone);
  }, [open, away]);
  useEffect(() => {
    if (sub) list.current?.querySelector<HTMLElement>('[role="menuitemradio"]')?.focus();
    else if (refocus.current) { refocus.current = false; themeRow.current?.focus(); }
  }, [sub]);

  const subKeys = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    const rows = [...e.currentTarget.querySelectorAll<HTMLElement>('.ui-dropdown__item')];
    const i = rows.indexOf(document.activeElement as HTMLElement);
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') rows[(i + (e.key === 'ArrowDown' ? 1 : rows.length - 1)) % rows.length]?.focus();
    else if (e.key === 'Home' || e.key === 'End') rows[e.key === 'Home' ? 0 : rows.length - 1]?.focus();
    else if (e.key === 'Enter' || e.key === ' ') rows[i]?.click();
    else if (e.key === 'ArrowLeft' || e.key === 'Escape') close();
    else {
      // Tab leaves from the Theme row, and the menu's own Tab closes the menu.
      if (e.key === 'Tab' && !inPlace) themeRow.current?.focus();
      return;
    }
    e.preventDefault();
    e.stopPropagation();
  };
  const choices = <div ref={list} role="menu" aria-label="Theme" className="ui-dropdown__sub"
    onKeyDown={subKeys} onClick={(e) => e.stopPropagation()}>
    {inPlace && <div role="menuitem" tabIndex={-1} className="ui-dropdown__item" aria-label="Back from Theme" onClick={close}>
      {glyph(icon('chevronLeft'), 'ui-dropdown__ic')}
      <span className="ui-dropdown__main"><span className="ui-dropdown__label">Theme</span></span>
    </div>}
    {THEMES.map(([value, label]) => <div key={value} role="menuitemradio" aria-checked={theme.theme === value} tabIndex={-1}
      className={`ui-dropdown__item${theme.theme === value ? ' is-selected' : ''}`} onClick={() => { theme.set(value); close(); }}>
      {glyph(themeIcon(value), 'ui-dropdown__ic')}
      <span className="ui-dropdown__main"><span className="ui-dropdown__label">{label}</span></span>
      {glyph(icon('check'), 'ui-dropdown__tick')}
    </div>)}
  </div>;

  return <div ref={block} className="ui-app__user"><Dropdown variant="menu"
    direction="up" align="start" chevron open={open}
    ariaLabel={`Signed in as ${account.name}, ${account.email}`}
    triggerClass="ui-app__user-trigger" panelClass={`ui-app__user-panel${sub && inPlace ? ' is-sub' : ''}`}
    onOpenChange={(next) => { setOpen(next); if (!next) setSub(false); }}
    triggerContent={<><span className="ui-app__av" aria-hidden="true">
      <Avatar personKey={account.email || account.name} name={account.name} size={32} />
    </span><span className="ui-app__who"><b>{account.name}</b><span>{account.email}</span></span></>}
    items={[...items, ...(withTheme ? [{ label: 'Theme', value: 'theme' }, '---' as const] : []), { label: 'Sign out', value: 'sign-out', icon: 'logout', danger: true }]}
    row={(item, props) => item.value === 'theme' ? <>
      <div {...props} ref={themeRow} aria-haspopup="menu" aria-expanded={sub}
        onClick={() => setSub((open) => !open)}
        onKeyDown={(e) => { if (e.key === 'ArrowRight') { e.preventDefault(); e.stopPropagation(); setSub(true); } }}>
        {glyph(themeIcon(theme.theme), 'ui-dropdown__ic')}
        <span className="ui-dropdown__main"><span className="ui-dropdown__label">Theme</span></span>
        <span className="ui-dropdown__aside">{theme.label}</span>
        {glyph(icon('chevronRight'), 'ui-dropdown__more')}
      </div>
      {sub && (inPlace ? choices : createPortal(<div ref={flyout}
        className="ui-dropdown__panel ui-dropdown__panel--portal ui-dropdown__panel--sub is-open">{choices}</div>, document.body))}
    </> : props.href ? <a {...props} /> : <div {...props} />}
    onSelect={onSelect} />
  </div>;
}
