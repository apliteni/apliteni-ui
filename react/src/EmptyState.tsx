import type { MouseEventHandler, ReactNode } from 'react';
import { Button } from './primitives/Button';
import { Icon } from './primitives/Icon';

export type EmptyStateVariant = 'first-run' | 'no-matches' | 'not-found' | 'not-yet-built';
export type EmptyStateAction =
  | { label: string; href: string; onClick?: MouseEventHandler<HTMLAnchorElement> }
  | { label: string; href?: never; onClick: MouseEventHandler<HTMLButtonElement>; disabled?: boolean };

export type EmptyStateProps = {
  variant?: EmptyStateVariant;
  title?: string;
  sub?: string;
  icon?: string;
  /** Decorative artwork replaces the icon tile. */
  illustration?: ReactNode;
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  primaryAction?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
  className?: string;
};

const cases = {
  'first-run': { title: 'Nothing needs you yet', sub: 'New items will appear here when they need your attention.', icon: 'check' },
  'no-matches': { title: 'No results in this view', sub: 'Try another search or clear your filters.', icon: 'search' },
  'not-found': { title: "We can't find that page", sub: 'Check the address or return to the home page.', icon: 'folder' },
  'not-yet-built': { title: 'This ships later', sub: 'This screen is not available yet. Check back later.', icon: 'clock' },
} satisfies Record<EmptyStateVariant, { title: string; sub: string; icon: string }>;

function Action({ action, variant }: { action: EmptyStateAction; variant: 'primary' | 'ghost' }) {
  if (action.href !== undefined) {
    return <a className={`ui-btn ui-btn--${variant}`} href={action.href} onClick={action.onClick}><span className="ui-btn__label-slot"><span className="ui-btn__label">{action.label}</span></span></a>;
  }
  return <Button variant={variant} onClick={action.onClick} disabled={action.disabled}>{action.label}</Button>;
}

export function EmptyState({
  variant = 'first-run', title, sub, icon, illustration, level,
  primaryAction, secondaryAction, className,
}: EmptyStateProps) {
  const preset = cases[variant];
  const Heading = `h${level ?? (variant === 'not-found' ? 1 : 2)}` as 'h1';
  return (
    <div className={['ui-empty', className].filter(Boolean).join(' ')}>
      {illustration != null ? (
        <div className="ui-empty__art" aria-hidden="true">{illustration}</div>
      ) : (
        <div className="ui-empty__icon ui-empty__icon--tile" aria-hidden="true"><Icon name={icon ?? preset.icon} /></div>
      )}
      <Heading className="ui-empty__title">{title ?? preset.title}</Heading>
      <p className="ui-empty__sub">{sub ?? preset.sub}</p>
      {(primaryAction || secondaryAction) && (
        <div className="ui-empty__actions">
          {primaryAction && <Action action={primaryAction} variant="primary" />}
          {secondaryAction && <Action action={secondaryAction} variant="ghost" />}
        </div>
      )}
    </div>
  );
}
