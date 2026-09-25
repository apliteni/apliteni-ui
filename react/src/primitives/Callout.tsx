import type { ReactNode } from 'react';
import { Icon } from './Icon';

export type CalloutVariant = 'neutral' | 'info' | 'success' | 'warn' | 'danger';

export interface CalloutProps {
  variant?: CalloutVariant;
  icon?: string;
  children: ReactNode;
  actions?: ReactNode;
}

export function Callout({ variant, icon = 'info', children, actions }: CalloutProps) {
  return (
    <div className={`ui-callout${variant ? ` ui-callout--${variant}` : ''}`} role={variant === 'danger' ? 'alert' : undefined}>
      <span className="ui-callout__icon" aria-hidden="true"><Icon name={icon} /></span>
      <div style={{ minWidth: 0, overflowWrap: 'anywhere' }}>
        {children}
        {actions != null && (
          <div className="ui-toolbar" style={{ marginTop: 'var(--space-3)' }}>{actions}</div>
        )}
      </div>
    </div>
  );
}
