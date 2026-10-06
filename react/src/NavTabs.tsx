import { Fragment, forwardRef, useEffect, useRef, useImperativeHandle, type ComponentPropsWithoutRef, type ReactNode } from 'react';
import { safeUrl, revealCurrentNav, revealFocusedNav } from '@apliteni/apliteni-ui';

export type NavTabBadge = string | number | {
  text: string | number;
  tone?: 'neutral' | 'accent' | 'live' | 'danger';
};
export type NavTabItem = {
  id: string;
  label: string;
  href?: string;
  target?: string;
  disabled?: boolean;
  badge?: NavTabBadge | null;
};
export type NavTabsProps = Omit<ComponentPropsWithoutRef<'nav'>, 'children'> & {
  items: readonly NavTabItem[];
  active?: string;
  variant?: 'underline' | 'pill';
  /** Spread linkProps onto the router link, including children. */
  renderLink?: (item: NavTabItem, linkProps: ComponentPropsWithoutRef<'a'>) => ReactNode;
};

export const NavTabs = forwardRef<HTMLElement, NavTabsProps>(function NavTabs({
  items, active, variant = 'underline', renderLink, className, onFocus,
  'aria-label': ariaLabel = 'Tabs', ...rest
}, ref) {
  const navRef = useRef<HTMLElement>(null);
  useImperativeHandle(ref, () => navRef.current!, []);
  // The item list, not the array holding it: an inline `items={[…]}` is a new
  // array on every parent render, and re-running this would rewrite scrollLeft
  // out from under a reader who had scrolled the row.
  const signature = items.map((item) => item.id).join('\u0000');
  // `variant` is in here with them because it changes the row's gaps and a tab's
  // padding, so it changes whether the links still fit — which is what decides
  // whether the row scrolls, and clips, at all.
  useEffect(() => {
    const reveal = () => { if (navRef.current) revealCurrentNav(navRef.current); };
    reveal();
    window.addEventListener('resize', reveal);
    return () => window.removeEventListener('resize', reveal);
  }, [active, signature, variant]);
  return (
    <nav {...rest} ref={navRef}
      className={['ui-nav', 'ui-nav--tabs', `is-${variant}`, className].filter(Boolean).join(' ')}
      aria-label={ariaLabel}
      // React's onFocus is focusin, so this is the one handler the row needs to keep
      // a focused link's ring clear of its scrolling edge. A caller's own onFocus
      // still runs; this scrolls the row and touches neither focus nor the route.
      onFocus={(event) => {
        if (navRef.current) revealFocusedNav(navRef.current, event.target);
        onFocus?.(event);
      }}>
      {items.map(item => {
        // `typeof null` is 'object', and a JavaScript caller's `counts.x ?? null`
        // arrives here — the vanilla factory drops it, so this must too.
        const badge = item.badge != null && typeof item.badge === 'object'
          ? item.badge : { text: item.badge, tone: undefined };
        const inner = <>
          <span className="ui-nav__tab-label">{item.label}</span>
          {badge.text != null && badge.text !== '' &&
            <span className={`ui-nav__badge is-${badge.tone || 'neutral'}`}>{badge.text}</span>}
        </>;
        if (item.disabled) return (
          <span key={item.id} className="ui-nav__tab is-disabled" aria-disabled="true">{inner}</span>
        );
        const current = item.id === active;
        const linkProps: ComponentPropsWithoutRef<'a'> = {
          className: ['ui-nav__tab', current && 'is-active'].filter(Boolean).join(' '),
          href: safeUrl(item.href || `#${item.id}`),
          target: item.target,
          'aria-current': current ? 'page' : undefined,
          children: inner,
        };
        return <Fragment key={item.id}>{renderLink ? renderLink(item, linkProps) : <a {...linkProps} />}</Fragment>;
      })}
    </nav>
  );
});
