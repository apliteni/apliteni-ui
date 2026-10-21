import { Fragment, type ComponentPropsWithoutRef, type ReactNode } from 'react';
import { prism, safeUrl, icon, ACCOUNT_NAV } from '@apliteni/apliteni-ui';
import { Dropdown, type DropdownEntry } from './Dropdown';

export type TopBarProps = Omit<ComponentPropsWithoutRef<'header'>, 'children'> & {
  /** The lockup. Left out, the bar draws the Apliteni mark and `word`. */
  brand?: ReactNode;
  /** The product word beside the mark, when `brand` is left out. */
  word?: string;
  brandHref?: string;
  /** A `ViewSwitch`, or nothing. */
  view?: ReactNode;
  /** A `VersionSwitcher`, or nothing. */
  version?: ReactNode;
  /** A `ThemeToggle`, or nothing. */
  theme?: ReactNode;
  /** An `AccountMenu`. Left out, the bar is the signed-out bar. */
  account?: ReactNode;
};

/** The band: brand first, the controls after the spacer. Each control is a slot. */
export function TopBar({
  brand, word = 'Strategy', brandHref = '/', view, version, theme, account, className, ...rest
}: TopBarProps) {
  return (
    <header {...rest} className={['topbar', className].filter(Boolean).join(' ')}>
      <div className="topbar__in">
        {brand ?? (
          <a className="brand" href={safeUrl(brandHref)} aria-label={`Apliteni ${word}`}>
            <span aria-hidden="true" dangerouslySetInnerHTML={{ __html: prism('tb-mark', 22) }} />
            <span>{word}</span>
          </a>
        )}
        {view}
        <span className="spacer" />
        {version}
        {theme}
        {account}
      </div>
    </header>
  );
}

export type ViewSwitchItem = { id: string; label: string; href?: string; target?: string };
export type ViewSwitchProps = {
  items: readonly ViewSwitchItem[];
  active: string;
  /** Names the group. */
  label?: string;
  /** Spread linkProps onto the router link, including children. */
  renderLink?: (item: ViewSwitchItem, linkProps: ComponentPropsWithoutRef<'a'>) => ReactNode;
};

/** The Deck and Text switch: links between views of one page, the current one filled. */
export function ViewSwitch({ items, active, label = 'View', renderLink }: ViewSwitchProps) {
  return (
    <div className="dtsw on" role="group" aria-label={label}>
      {items.map((item) => {
        const current = item.id === active;
        const linkProps: ComponentPropsWithoutRef<'a'> = {
          className: current ? 'cur' : undefined,
          href: safeUrl(item.href || `#${item.id}`),
          target: item.target,
          'aria-current': current ? 'page' : undefined,
          children: item.label,
        };
        return <Fragment key={item.id}>{renderLink ? renderLink(item, linkProps) : <a {...linkProps} />}</Fragment>;
      })}
    </div>
  );
}

export type Version = {
  value: string;
  label: string;
  /** The line under the name, such as a date. */
  meta?: string;
  badge?: 'live' | 'archive';
};
export type VersionSwitcherProps = {
  versions: readonly Version[];
  value: string;
  onChange?: (value: string) => void;
  /** Names the list and the button. */
  label?: string;
  defaultOpen?: boolean;
};

const BADGE = { live: 'Live', archive: 'Archive' } as const;

/** The version menu: the button shows the chosen name, the open list ticks it. */
export function VersionSwitcher({ versions, value, onChange, label = 'Version', defaultOpen }: VersionSwitcherProps) {
  const current = versions.find((v) => v.value === value);
  return (
    <div className="vsw">
      <Dropdown variant="select" align="start" triggerClass="vsw__btn" panelClass="vsw__menu"
        selectedValue={value} chevron={false} defaultOpen={defaultOpen}
        ariaLabel={`${label} — ${current?.label ?? ''}`}
        triggerContent={<><span className="cur">{current?.label}</span><span className="car" aria-hidden="true" /></>}
        items={versions.map((v) => ({
          label: v.label, value: v.value, description: v.meta,
          badge: BADGE[v.badge ?? 'archive'], selected: v.value === value,
        }))}
        row={(item, props) => <div {...props} className={`${props.className} vopt`}>
          <span><div className="vname">{item.label}</div><div className="vmeta">{item.description}</div></span>
          <span className={`vbadge ${item.badge === 'Live' ? 'live' : 'arch'}`}>{String(item.badge)}</span>
          <span className="vtick" aria-hidden="true" dangerouslySetInnerHTML={{ __html: icon('check') }} />
        </div>}
        onSelect={(picked) => { if (picked != null) onChange?.(String(picked)); }} />
    </div>
  );
}

export type AccountMenuProps = {
  name: string;
  email: string;
  /** The rows above Sign out. Left out, the kit's account pages. */
  items?: DropdownEntry[];
  /** The current account page. One menu row takes the accent ink. */
  current?: string;
  signOutHref?: string;
  onSignOut?: () => void;
  onSelect?: (value: string | number | undefined) => void;
  defaultOpen?: boolean;
};

const initialsOf = (name: string, email: string) => {
  const from = name.trim() || email.split('@')[0] || '';
  return (from.split(/[\s._-]+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('') || '?').toUpperCase();
};

const ACCOUNT_ITEMS: DropdownEntry[] = ACCOUNT_NAV.map((item: { id: string; icon: string; label: string }) => ({
  label: item.label, icon: item.icon, value: item.id, href: `#${item.id}`,
}));

/** The avatar and its menu. */
export function AccountMenu({
  name, email, items = ACCOUNT_ITEMS, current = 'prefs', signOutHref, onSignOut, onSelect, defaultOpen,
}: AccountMenuProps) {
  const mark = initialsOf(name, email);
  return (
    <div className="acct on">
      <Dropdown variant="menu" align="end" chevron={false} triggerClass="avatar" panelClass="amenu" defaultOpen={defaultOpen}
        ariaLabel="Account"
        triggerContent={mark}
        header={<div className="ahead"><span className="avatar">{mark}</span><span className="aw"><span className="anm">{name}</span><span className="aem" title={email}>{email}</span></span></div>}
        items={[...items, '---', { label: 'Sign out', icon: 'logout', value: 'sign-out', href: signOutHref }]}
        row={(item, props) => <a {...props} href={item.href ? safeUrl(item.href)
          : item.value === 'sign-out' && onSignOut ? undefined : safeUrl(item.value === 'sign-out' ? '#logout' : `#${item.value}`)}
          className={[props.className.replace(/\bui-dropdown__item\b/, '').trim(), item.value === current && 'cur', item.value === 'sign-out' && 'aout'].filter(Boolean).join(' ')}>
          {item.icon && <span aria-hidden="true" dangerouslySetInnerHTML={{ __html: icon(item.icon) }} />}
          {item.label}
        </a>}
        onSelect={(value, item) => {
          if (item.value === 'sign-out') onSignOut?.();
          else onSelect?.(value);
        }} />
    </div>
  );
}
