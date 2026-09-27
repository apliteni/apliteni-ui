import type { ReactNode } from 'react';
import { icon as kitIcon, illo } from '@apliteni/apliteni-ui';

export type EmptyStateVariant = 'first-run' | 'no-matches' | 'not-found' | 'not-yet-built';
export type EmptyStateProps = {
  variant?: EmptyStateVariant;
  title?: string;
  sub?: string;
  icon?: string;
  art?: ReactNode;
  actions?: ReactNode;
};

const cases = {
  'first-run': { title: 'Nothing needs you yet', sub: 'New items will appear here when they need your attention.', icon: 'check' },
  'no-matches': { title: 'No results in this view', sub: 'Try another search or clear your filters.', icon: 'search' },
  'not-found': { title: "We can't find that page", sub: 'Check the address or return to the home page.', icon: 'folder' },
  'not-yet-built': { title: 'This ships later', sub: 'This screen is not available yet. Check back later.', icon: 'clock' },
};

export function EmptyState({ variant = 'first-run', title, sub, icon, art, actions }: EmptyStateProps) {
  const preset = cases[variant];
  const heading = title ?? preset.title;
  const guidance = sub ?? preset.sub;
  const glyph = icon ?? preset.icon;
  return (
    <div className="ui-empty">
      {art ? typeof art === 'string'
        ? <div className="ui-empty__art" dangerouslySetInnerHTML={{ __html: /<svg/.test(art) ? art : illo(art) }} />
        : <div className="ui-empty__art" aria-hidden="true">{art}</div>
        : glyph ? <div className="ui-empty__icon" dangerouslySetInnerHTML={{ __html: kitIcon(glyph) }} /> : null}
      {heading && <div className="ui-empty__title">{heading}</div>}
      {guidance && <div className="ui-empty__sub">{guidance}</div>}
      {actions && <div className="ui-empty__actions">{actions}</div>}
    </div>
  );
}
