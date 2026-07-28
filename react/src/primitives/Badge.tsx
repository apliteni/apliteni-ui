import type { ReactNode } from 'react';

export function Badge({ variant = 'neutral', children }: { variant?: string; children: ReactNode }) {
  const cls = ['ui-badge', variant !== 'neutral' && `ui-badge--${variant}`].filter(Boolean).join(' ');
  return <span className={cls}>{children}</span>;
}
