import { useEffect, useId, useState, type ComponentPropsWithoutRef, type ReactNode } from 'react';
import { applyTheme, paletteHotkey, prism, railCollapsed, themeIcon, themeName } from '@apliteni/apliteni-ui';
import { BackLink } from './BackLink';
import { CommandPalette, type CommandPaletteProps } from './CommandPalette';
import { Drawer } from './Drawer';
import { Dropdown } from './Dropdown';
import { Icon } from './primitives/Icon';
import './AppShell.css';

export type AppShellSection = { href: string; label: string; icon: string; count?: number };
export type AppShellProps = {
  sections: AppShellSection[];
  /** Current router pathname; the longest matching section wins. */
  pathname: string;
  title: string;
  children?: ReactNode;
  word?: string;
  brand?: ReactNode;
  brandHref?: string;
  width?: 'centered' | 'wide';
  back?: { href: string; label: string };
  lede?: string;
  actions?: ReactNode;
  bandControl?: ReactNode;
  account: { name: string; email: string };
  onSignOut: () => void;
  /** Server-read fold preference. The browser restores the shared rail cookie. */
  defaultCollapsed?: boolean;
  palette?: Omit<CommandPaletteProps, 'open' | 'onClose'>;
  /** Spread linkProps onto the router link, including children and onClick. */
  renderLink?: (section: AppShellSection, linkProps: ComponentPropsWithoutRef<'a'>) => ReactNode;
};

const path = (value: string) => value.split(/[?#]/)[0].replace(/\/+$/, '') || '/';

export function AppShell({ sections, pathname, title, children, word = 'apliteni-ui', brand,
  brandHref = '/', width = 'centered', back, lede, actions, bandControl, account, onSignOut,
  defaultCollapsed = false, palette, renderLink }: AppShellProps) {
  const uid = useId();
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [search, setSearch] = useState(false);
  const [more, setMore] = useState(false);
  const [theme, setTheme] = useState('dark');
  const current = path(pathname);
  const active = sections.filter((section) => current === path(section.href)
    || (path(section.href) !== '/' && current.startsWith(`${path(section.href)}/`)))
    .sort((a, b) => path(b.href).length - path(a.href).length)[0];

  useEffect(() => { setCollapsed(railCollapsed() ?? defaultCollapsed); }, [defaultCollapsed]);
  useEffect(() => { setMore(false); setSearch(false); }, [pathname]);
  useEffect(() => {
    const root = document.documentElement;
    const sync = () => setTheme(root.getAttribute('data-theme') === 'light' ? 'light' : 'dark');
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const hotkey = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.altKey || event.shiftKey || event.key.toLowerCase() !== 'k') return;
      const target = event.target as HTMLElement | null;
      if (target?.closest?.('input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="dialog"]')) return;
      event.preventDefault();
      setSearch(true);
    };
    document.addEventListener('keydown', hotkey);
    return () => document.removeEventListener('keydown', hotkey);
  }, []);

  const fold = () => {
    const next = !collapsed;
    setCollapsed(next);
    try { document.cookie = `apliteni-ui-rail=${next ? 'collapsed' : 'expanded'}; Max-Age=31536000; Path=/; SameSite=Lax`; } catch { /* Storage may be unavailable. */ }
  };
  const links = (items: AppShellSection[]) => items.map((section) => {
    const linkProps: ComponentPropsWithoutRef<'a'> = {
      href: section.href,
      className: `ui-nav__item${section === active ? ' is-active' : ''}`,
      'aria-current': section === active ? 'page' : undefined,
      'aria-label': `${section.label}${section.count == null ? '' : ` ${section.count}`}`,
      onClick: (event) => { if (!event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) setMore(false); },
      children: <><span className="ui-nav__ic"><Icon name={section.icon} /></span>
        <span className="ui-nav__label">{section.label}</span>
        {section.count != null && <span className="ui-nav__badge">{section.count}</span>}</>,
    };
    return <li key={section.href}>{renderLink ? renderLink(section, linkProps) : <a {...linkProps} />}</li>;
  });
  const foldLabel = collapsed ? 'Expand sidebar' : 'Collapse sidebar';
  const visible = sections.length > 4 ? sections.slice(0, 3) : sections;
  const remaining = sections.slice(visible.length);
  const initials = account.name.trim().split(/\s+/).map((part) => part[0]).slice(0, 2).join('');

  return <div className={`ui-app ui-app--topbar ui-react-app${collapsed ? ' is-collapsed' : ''}`}>
    <div className="ui-app__rail">
      <div className="ui-app__head"><a className="ui-app__brand" href={brandHref} aria-label={word}>
        {brand ?? <i aria-hidden="true" className="ui-react-app__mark" dangerouslySetInnerHTML={{ __html: prism(uid, 24) }} />}
        <span>{word}</span>
      </a></div>
      <nav className="ui-nav ui-nav--side" aria-label="Sections"><ul className="ui-nav__list">{links(sections)}</ul></nav>
      <div className="ui-app__foot"><div className="ui-app__fold-row">
        <button type="button" className="ui-nav__item ui-app__fold" aria-expanded={!collapsed} aria-label={foldLabel} onClick={fold}>
          <span className="ui-nav__ic"><svg className="ui-icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2" /><path className="ui-app__fold-seam" d="M9 3v18" /></svg></span><span className="ui-nav__label">{foldLabel}</span>
        </button>
      </div></div>
    </div>
    <div className="ui-app__well">
      <header className="ui-app__bar">
        <button type="button" className="ui-app__search" aria-haspopup="dialog" onClick={() => setSearch(true)}>
          <span className="ui-app__search-ic"><Icon name="search" /></span>
          <span className="ui-app__search-txt">Search or run a command…</span><kbd className="ui-cmdk__key">{paletteHotkey()}</kbd>
        </button>
        <span className="ui-app__bar-gap" />{bandControl}
        <button type="button" className="toggle" aria-label={themeName(theme)} title={themeName(theme)} onClick={() => applyTheme(theme === 'light' ? 'dark' : 'light')}>
          <span className="ic" aria-hidden="true" dangerouslySetInnerHTML={{ __html: themeIcon(theme) }} />
        </button>
        <div className="ui-app__user ui-app__user--bar"><Dropdown variant="menu" align="end" chevron={false}
          ariaLabel={`Signed in as ${account.name}, ${account.email}`} triggerClass="ui-app__user-trigger" panelClass="ui-app__user-panel"
          triggerContent={<span className="ui-app__av" aria-hidden="true">{initials}</span>}
          header={<div className="ui-dropdown__head"><b>{account.name}</b><span>{account.email}</span></div>}
          items={[{ label: 'Sign out', icon: 'logout', danger: true }]} onSelect={onSignOut} />
        </div>
      </header>
      <main className={`ui-app__main${width === 'wide' ? ' ui-app__main--wide' : ''}`}>
        {back && <BackLink {...back} />}<h1>{title}</h1>
        {lede && <p className="ui-app__sub">{lede}</p>}
        {actions && <div className="ui-react-app__actions">{actions}</div>}
        <div className="ui-app__body">{children}</div>
      </main>
    </div>
    <nav className="ui-nav ui-react-app__bottom" aria-label="Sections on mobile"><ul className="ui-nav__list">
      {links(visible)}{remaining.length > 0 && <li><button type="button" className={`ui-nav__item${active && remaining.includes(active) ? ' is-active' : ''}`}
        aria-haspopup="dialog" aria-expanded={more} onClick={() => setMore(true)}><span className="ui-nav__ic"><Icon name="moreHorizontal" /></span><span className="ui-nav__label">More</span></button></li>}
    </ul></nav>
    <Drawer open={more} onClose={() => setMore(false)} title="More sections" side="bottom">
      <nav className="ui-nav ui-nav--side" aria-label="More sections"><ul className="ui-nav__list">{links(remaining)}</ul></nav>
    </Drawer>
    <CommandPalette {...(palette ?? { groups: [{ items: sections.map((section) => ({ id: section.href, ...section })) }] })} open={search} onClose={() => setSearch(false)} />
  </div>;
}
