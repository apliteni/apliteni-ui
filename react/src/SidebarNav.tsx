import { forwardRef, useEffect, useId, useState, type ComponentPropsWithoutRef, type ReactNode } from 'react';
import { Icon } from './primitives/Icon';

export type SidebarNavBadge = string | number | { text: string | number; tone?: 'neutral' | 'accent' | 'live' | 'danger' };
export type SidebarNavItem = {
  id: string;
  label: string;
  href?: string;
  target?: string;
  icon?: string;
  leading?: ReactNode;
  badge?: SidebarNavBadge;
  disabled?: boolean;
  danger?: boolean;
  items?: SidebarNavItem[];
  defaultOpen?: boolean;
};
export type SidebarNavSection = { label?: string; items: SidebarNavItem[] };
export type SidebarNavProps = Omit<ComponentPropsWithoutRef<'nav'>, 'children'> & {
  items?: SidebarNavItem[];
  sections?: SidebarNavSection[];
  active?: string;
  activeIs?: 'page' | 'section';
  collapsed?: boolean;
  footer?: ReactNode;
  /** Spread all link props onto the router link to retain its name and current state. */
  renderLink?: (item: SidebarNavItem, props: ComponentPropsWithoutRef<'a'>) => ReactNode;
};

type RowProps = Pick<SidebarNavProps, 'active' | 'activeIs' | 'collapsed' | 'renderLink'> & { item: SidebarNavItem; sub?: boolean };
const contains = (items: SidebarNavItem[], active?: string): boolean => items.some(item => item.id === active || !!item.items && contains(item.items, active));
const badgeText = (badge?: SidebarNavBadge) => typeof badge === 'object' ? badge.text : badge;

function Row({ item, active, activeIs, collapsed, renderLink, sub }: RowProps) {
  const uid = useId();
  const group = !!item.items?.length;
  const childActive = group && contains(item.items!, active);
  const [expanded, setExpanded] = useState<boolean | undefined>();
  const open = expanded ?? item.defaultOpen ?? childActive;
  const [entering, setEntering] = useState(false);
  useEffect(() => {
    if (!entering) return;
    // Hidden lists and interrupted animations may never emit animationend.
    const timer = setTimeout(() => setEntering(false), 1000);
    return () => clearTimeout(timer);
  }, [entering]);
  const count = badgeText(item.badge);
  const name = `${item.label}${count == null || count === '' ? '' : ` ${count}`}`;
  const isActive = !group && item.id === active;
  const className = ['ui-nav__item', sub && 'ui-nav__item--sub', group && 'ui-nav__toggle',
    isActive && 'is-active', childActive && 'is-current', item.disabled && 'is-disabled', item.danger && 'is-danger'].filter(Boolean).join(' ');
  const children = <>{(item.leading ?? item.icon) && <span className="ui-nav__ic">{item.leading ?? <Icon name={item.icon!} />}</span>}
    <span className="ui-nav__label">{item.label}</span>
    {count != null && count !== '' && <span className={`ui-nav__badge is-${typeof item.badge === 'object' ? item.badge.tone ?? 'neutral' : 'neutral'}`}>{count}</span>}
    {group && <span className="ui-nav__caret" aria-hidden="true" />}</>;
  const common = { className, 'aria-label': name, title: collapsed ? name : undefined, children };
  if (group) return <li className={`ui-nav__group${open ? ' is-open' : ''}`}>
    <button {...common} type="button" disabled={item.disabled} aria-expanded={open} aria-controls={uid}
      onClick={() => { setExpanded(!open); setEntering(!open); }} />
    <ul id={uid} className={`ui-nav__sub${entering ? ' is-entering' : ''}`} hidden={!open} onAnimationEnd={() => setEntering(false)}>
      {item.items!.map(child => <Row key={child.id} item={child} active={active} activeIs={activeIs} collapsed={collapsed} renderLink={renderLink} sub />)}
    </ul>
  </li>;
  if (item.disabled) return <li><span {...common} role="link" aria-disabled="true" /></li>;
  const props: ComponentPropsWithoutRef<'a'> = { ...common, href: item.href ?? `#${item.id}`, target: item.target,
    'aria-current': isActive ? activeIs === 'section' ? 'true' : 'page' : undefined };
  return <li>{renderLink ? renderLink(item, props) : <a {...props} />}</li>;
}

function Section({ section, ...props }: Omit<RowProps, 'item' | 'sub'> & { section: SidebarNavSection }) {
  const uid = useId();
  return <div className="ui-nav__section">
    {section.label && <div className="ui-nav__cap" id={uid} aria-hidden={props.collapsed || undefined}>{section.label}</div>}
    <ul className="ui-nav__list" aria-labelledby={section.label ? uid : undefined}>
      {section.items.map(item => <Row key={item.id} item={item} {...props} />)}
    </ul>
  </div>;
}

export const SidebarNav = forwardRef<HTMLElement, SidebarNavProps>(function SidebarNav({
  items = [], sections, active, activeIs = 'page', collapsed = false, footer, renderLink, className, 'aria-label': label = 'Sidebar', ...rest
}, ref) {
  return <nav {...rest} ref={ref} aria-label={label} className={['ui-nav', 'ui-nav--side', collapsed && 'is-collapsed', className].filter(Boolean).join(' ')}>
    {(sections?.length ? sections : [{ items }]).map((section, index) => <Section key={index} section={section}
      active={active} activeIs={activeIs} collapsed={collapsed} renderLink={renderLink} />)}
    {footer && <div className="ui-nav__foot">{footer}</div>}
  </nav>;
});
