import type { ReactNode } from 'react';

export function Card({ title, sub, children }: { title?: ReactNode; sub?: ReactNode; children?: ReactNode }) {
  return (
    <div className="ui-card">
      {title != null && <div className="ui-card__title">{title}</div>}
      {sub != null && <div className="ui-card__sub">{sub}</div>}
      {children}
    </div>
  );
}
