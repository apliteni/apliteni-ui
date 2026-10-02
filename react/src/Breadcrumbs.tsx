import { forwardRef, type ComponentPropsWithoutRef, type ReactNode } from 'react';
import { icon, safeUrl } from '@apliteni/apliteni-ui';

export type BreadcrumbItem = {
  label: string;
  href?: string;
  target?: string;
  icon?: string;
};
export type BreadcrumbsProps = Omit<ComponentPropsWithoutRef<'nav'>, 'children'> & {
  items: readonly BreadcrumbItem[];
  /** Spread linkProps onto the router link, including children. */
  renderLink?: (item: BreadcrumbItem, linkProps: ComponentPropsWithoutRef<'a'>) => ReactNode;
};

export const Breadcrumbs = forwardRef<HTMLElement, BreadcrumbsProps>(function Breadcrumbs({
  items, renderLink, className, 'aria-label': ariaLabel = 'Breadcrumb', ...rest
}, ref) {
  return (
    <nav {...rest} ref={ref}
      className={['ui-nav', 'ui-nav--crumbs', className].filter(Boolean).join(' ')} aria-label={ariaLabel}>
      <ol className="ui-nav__crumbs">
        {items.map((item, index) => {
          const current = index === items.length - 1;
          const inner = <>
            {item.icon && <span className="ui-nav__ic" dangerouslySetInnerHTML={{ __html: icon(item.icon) }} />}
            <span className="ui-nav__crumb-label">{item.label}</span>
          </>;
          const linkProps: ComponentPropsWithoutRef<'a'> | null = !current && item.href
            ? { className: 'ui-nav__crumb', href: safeUrl(item.href), target: item.target, children: inner }
            : null;
          return <li key={index} className="ui-nav__crumb-item">{linkProps
            ? (renderLink ? renderLink(item, linkProps) : <a {...linkProps} />)
            : <span className={['ui-nav__crumb', current && 'is-current'].filter(Boolean).join(' ')}
                aria-current={current ? 'page' : undefined}>{inner}</span>}
          </li>;
        })}
      </ol>
    </nav>
  );
});
