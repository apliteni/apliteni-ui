import { useEffect, useId, useMemo, useRef, useState, type ComponentPropsWithoutRef, type ReactNode } from 'react';
import { prism } from '@apliteni/apliteni-ui';
import { paletteHotkey } from './lib/palette-hotkey';
import { railCollapsed, storeRailCollapsed } from './lib/rail';
import { SidebarNav } from './SidebarNav';
import { BackLink } from './BackLink';
import { Breadcrumbs, type BreadcrumbItem } from './Breadcrumbs';
import { CommandPalette, type CommandPaletteProps } from './CommandPalette';
import { Drawer } from './Drawer';
import { Dropdown } from './Dropdown';
import { Button } from './primitives/Button';
import { Icon } from './primitives/Icon';
import { Avatar } from './primitives/Avatar';
import { ThemeToggle } from './ThemeToggle';
import './AppShell.css';

export type AppShellSection = { href: string; label: string; icon: string; count?: number };
export type AppShellProps = {
  sections: AppShellSection[];
  /** The vanilla rail layout, or the existing band layout. */
  layout?: 'rail' | 'topbar';
  /** Current router pathname; the longest matching section wins. */
  pathname: string;
  title: string;
  children?: ReactNode;
  word?: string;
  brand?: ReactNode;
  brandHref?: string;
  width?: 'centered' | 'wide';
  back?: { href: string; label: string };
  crumbs?: readonly BreadcrumbItem[];
  lede?: string;
  actions?: ReactNode;
  bandControl?: ReactNode;
  /** The band trigger's words and its name at every width. Below 560px the trigger shows
   *  only its glyph (#729), and the words stay its accessible name. */
  searchLabel?: string;
  /** @deprecated Not drawn since #729: the phone trigger shows only its glyph. */
  searchShortLabel?: string;
  account: { name: string; email: string };
  onSignOut: () => void;
  /** Server-read fold preference. The browser restores the shared rail cookie. */
  defaultCollapsed?: boolean;
  palette?: Omit<CommandPaletteProps, 'open' | 'onClose'>;
  /** Spread linkProps onto the router link, including children and onClick. */
  renderLink?: (section: AppShellSection, linkProps: ComponentPropsWithoutRef<'a'>) => ReactNode;
};

const path = (value: string) => value.split(/[?#]/)[0].replace(/\/+$/, '') || '/';

export function AppShell({ sections, pathname, title, children, word = 'apliteni-ui', brand, layout = 'topbar',
  brandHref = '/', width = 'centered', back, crumbs, lede, actions, bandControl, account, onSignOut,
  searchLabel = 'Search or run a command…',
  defaultCollapsed = false, palette, renderLink }: AppShellProps) {
  const uid = useId();
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [search, setSearch] = useState(false);
  const [menu, setMenu] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  // The drawer opens on its first row, not on the band control above the rows (#732).
  const menuBody = useRef<HTMLDivElement>(null);
  const firstRow = useMemo(() => ({ get current() { return menuBody.current?.querySelector<HTMLElement>('.ui-nav__item') ?? null; } }), []);
  const current = path(pathname);
  const active = sections.filter((section) => current === path(section.href)
    || (path(section.href) !== '/' && current.startsWith(`${path(section.href)}/`)))
    .sort((a, b) => path(b.href).length - path(a.href).length)[0];

  useEffect(() => { setCollapsed(railCollapsed() ?? defaultCollapsed); }, [defaultCollapsed]);
  useEffect(() => { setMenu(false); setSearch(false); }, [pathname]);
  // A drawer left open while the window grows past the phone width would be hidden and
  // still hold the page inert, so it closes there. The menu button is not drawn above
  // that width, which is how the stylesheet's breakpoint is read without a second copy.
  useEffect(() => {
    if (!menu) return;
    const grown = () => {
      const button = menuButton.current;
      if (button && getComputedStyle(button).display === 'none') setMenu(false);
    };
    window.addEventListener('resize', grown);
    return () => window.removeEventListener('resize', grown);
  }, [menu]);
  useEffect(() => {
    if (layout === 'rail') return;
    const hotkey = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.altKey || event.shiftKey || event.key.toLowerCase() !== 'k') return;
      const target = event.target as HTMLElement | null;
      if (target?.closest?.('input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="dialog"]')) return;
      event.preventDefault();
      setSearch(true);
    };
    document.addEventListener('keydown', hotkey);
    return () => document.removeEventListener('keydown', hotkey);
  }, [layout]);

  const fold = () => {
    const next = !collapsed;
    setCollapsed(next);
    storeRailCollapsed(next);
  };
  // A back link means the page on screen sits below the active row, so the row reports
  // aria-current="true": "page" would announce the list as the page the reader is on.
  // shell.js does the same through sidebarNav()'s `activeIs`.
  // why: guidelines/going-back.md#keep-the-section-active
  const sidebar = (label: string) => <SidebarNav aria-label={label}
    items={sections.map(section => ({ ...section, id: section.href, badge: layout === 'rail' ? undefined : section.count }))} active={active?.href}
    activeIs={back ? 'section' : 'page'}
    renderLink={(item, props) => {
      const section = sections.find(section => section.href === item.id)!;
      const linkProps = { ...props, onClick: (event: React.MouseEvent<HTMLAnchorElement>) => {
        if (!event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) setMenu(false);
      } };
      return renderLink ? renderLink(section, linkProps) : <a {...linkProps} />;
    }} />;
  const foldLabel = collapsed ? 'Expand sidebar' : 'Collapse sidebar';
  // A section list is drawn when it has somewhere to go, at every width. One section
  // and no back link is the page already on screen: the list would mark that row
  // current on every page it reaches, spending the shell's one accent signal on a
  // control that goes nowhere. So the shell draws no section navigation and no fold
  // — the fold exists to close a list, and there is none to close. One section under
  // a child page is a different case: the row is that page's parent, a place the
  // reader can actually go, and it takes aria-current="true" rather than "page"
  // through activeIs above. why: guidelines/going-back.md#keep-the-section-active
  const navigable = sections.length > 1 || Boolean(back);
  // Written once and placed twice: with no list to head, the rail is a column of
  // brand, so the lockup moves to the band the page already has.
  const lockup = <a className="ui-app__brand" href={brandHref} aria-label={word}>
    {brand ?? <i aria-hidden="true" className="ui-react-app__mark" dangerouslySetInnerHTML={{ __html: prism(uid, 24) }} />}
    <span>{word}</span>
  </a>;

  const accountBlock = () => <div className="ui-app__user"><Dropdown variant="menu"
    direction="up" align="start" chevron
    ariaLabel={`Signed in as ${account.name}, ${account.email}`}
    triggerClass="ui-app__user-trigger" panelClass="ui-app__user-panel"
    triggerContent={<><span className="ui-app__av" aria-hidden="true">
      <Avatar personKey={account.email || account.name} name={account.name} size={32} />
    </span><span className="ui-app__who"><b>{account.name}</b><span>{account.email}</span></span></>}
    items={[{ label: 'Sign out', icon: 'logout', danger: true }]} onSelect={onSignOut} />
  </div>;
  const foldControl = <div className="ui-app__fold-row"><button type="button"
    className="ui-nav__item ui-app__fold" aria-expanded={!collapsed} aria-label={foldLabel} onClick={fold}>
    <span className="ui-nav__ic"><svg className="ui-icon" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2" /><path className="ui-app__fold-seam" d="M9 3v18" /><path className="ui-app__fold-arrow" d="m16 15-3-3 3-3" /></svg></span>
    <span className="ui-nav__label">{foldLabel}</span>
  </button></div>;
  const page = <main className={`ui-app__main${width === 'wide' ? ' ui-app__main--wide' : ''}`}>
    {back ? <BackLink {...back} /> : crumbs?.length ? <Breadcrumbs items={crumbs} /> : null}<h1>{title}</h1>
    {lede && <p className="ui-app__sub">{lede}</p>}
    {actions && <div className="ui-react-app__actions">{actions}</div>}
    <div className="ui-app__body">{children}</div>
  </main>;

  if (layout === 'rail') return <div className={`ui-app ui-react-app${collapsed ? ' is-collapsed' : ''}`}>
    <div className="ui-app__rail" role="region" aria-label="Sidebar">
      <div className="ui-app__head">{lockup}{foldControl}</div>
      {sidebar('Sections')}
      {accountBlock()}
    </div>
    <header className="ui-app__bar ui-app__bar--phone">
      <Button ref={menuButton} variant="ghost" icon="menu" iconOnly aria-label="Menu" className="ui-app__menu"
        aria-haspopup="dialog" aria-expanded={menu} onClick={() => setMenu(true)} />
      <a className="ui-app__brand ui-app__brand--band" href={brandHref} aria-label={word}>
        {brand ?? <i aria-hidden="true" className="ui-react-app__mark" dangerouslySetInnerHTML={{ __html: prism(`${uid}-band`, 24) }} />}
      </a>
    </header>
    {page}
    <Drawer open={menu} onClose={() => setMenu(false)} title={word}
      side="left" size="sm" footer={<div className="ui-app__drawer">{accountBlock()}</div>}>
      <div className="ui-app__drawer">{sidebar('Menu sections')}</div>
    </Drawer>
  </div>;

  // The sidebar holds the shell's own controls (#732): the band control under the head,
  // then the theme switch and the account at its foot. The phone band keeps the mark,
  // the page title, search and Menu. With no sidebar, the band keeps them all.
  const control = bandControl && <div className="ui-react-app__control" inert={collapsed}>{bandControl}</div>;
  const theme = <div className="ui-react-app__theme"><ThemeToggle labelled /></div>;
  return <div className={`ui-app ui-app--topbar ui-react-app${collapsed ? ' is-collapsed' : ''}`}>
    {navigable && <div className="ui-app__rail" role="region" aria-label="Sidebar">
      <div className="ui-app__head">{lockup}{foldControl}</div>
      {control}
      {sidebar('Sections')}
      {theme}
      {accountBlock()}
    </div>}
    <div className="ui-app__well">
      <header className="ui-app__bar">
        {navigable ? <>
          <a className="ui-app__brand ui-app__brand--band" href={brandHref} aria-label={word}>
            {brand ?? <i aria-hidden="true" className="ui-react-app__mark" dangerouslySetInnerHTML={{ __html: prism(`${uid}-band`, 24) }} />}
          </a>
          <span className="ui-react-app__title" aria-hidden="true">{title}</span>
        </> : lockup}
        <button type="button" className="ui-app__search" aria-haspopup="dialog" onClick={() => setSearch(true)}>
          <span className="ui-app__search-ic"><Icon name="search" /></span>
          <span className="ui-app__search-txt">{searchLabel}</span>
          <kbd className="ui-cmdk__key">{paletteHotkey()}</kbd>
        </button>
        <span className="ui-app__bar-gap" />
        {navigable ? <Button ref={menuButton} variant="ghost" icon="menu" iconOnly aria-label="Menu" className="ui-app__menu"
          aria-haspopup="dialog" aria-expanded={menu} onClick={() => setMenu(true)} /> : <>
          {bandControl && <span className="ui-react-app__band-control">{bandControl}</span>}
          <ThemeToggle />
          <div className="ui-app__user ui-app__user--bar"><Dropdown variant="menu" align="end" chevron={false}
            ariaLabel={`Signed in as ${account.name}, ${account.email}`} triggerClass="ui-app__user-trigger" panelClass="ui-app__user-panel"
            triggerContent={<span className="ui-app__av" aria-hidden="true"><Avatar personKey={account.email || account.name} name={account.name} size={32} /></span>}
            header={<div className="ui-dropdown__head"><b>{account.name}</b><span>{account.email}</span></div>}
            items={[{ label: 'Sign out', icon: 'logout', danger: true }]} onSelect={onSignOut} />
          </div>
        </>}
      </header>
      {page}
    </div>
    {navigable && <Drawer open={menu} onClose={() => setMenu(false)} title={word} side="left" size="sm" initialFocusRef={firstRow}
      footer={<div className="ui-app__drawer">{theme}{accountBlock()}</div>}>
      <div className="ui-react-app__menu" ref={menuBody}>{bandControl && <div className="ui-react-app__control">{bandControl}</div>}{sidebar('Menu sections')}</div>
    </Drawer>}
    <CommandPalette {...(palette ?? { groups: [{ items: sections.map((section) => ({ id: section.href, ...section })) }] })} open={search} onClose={() => setSearch(false)} />
  </div>;
}
