import type { ReactNode } from 'react';
import { calloutIcons, icon as kitIcon } from '@apliteni/apliteni-ui';

export type CalloutVariant = 'neutral' | 'info' | 'success' | 'warn' | 'danger';

export interface CalloutProps {
  variant?: CalloutVariant;
  icon?: string;
  children: ReactNode;
  actions?: ReactNode;
}

export function Callout({ variant, icon = calloutIcons[variant ?? 'neutral'], children, actions }: CalloutProps) {
  return (
    <div className={`ui-callout${variant && variant !== 'neutral' ? ` ui-callout--${variant}` : ''}`} role={variant === 'danger' ? 'alert' : undefined}>
      <span className="ui-callout__icon" dangerouslySetInnerHTML={{ __html: kitIcon(icon) }} />
      <div className="ui-callout__body">
        {children}
        {actions != null && (
          <div className="ui-toolbar ui-callout__actions">{actions}</div>
        )}
      </div>
    </div>
  );
}
