import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { Icon } from './primitives/Icon';
import './KeyValueList.css';

export type KeyValueRow = {
  label: string;
  value?: ReactNode;
  redacted?: boolean;
};

export type KeyValueListProps = Omit<ComponentPropsWithoutRef<'dl'>, 'children'> & {
  rows: readonly KeyValueRow[];
  columns?: 1 | 2;
};

function detail({ value, redacted }: KeyValueRow) {
  if (redacted) return <span className="ui-kv__hidden"><Icon name="eyeOff" />Hidden</span>;
  if (value == null || typeof value === 'boolean' || (typeof value === 'string' && !value.trim())) return '—';
  return value;
}

export function KeyValueList({ rows, columns = 1, className, ...rest }: KeyValueListProps) {
  return (
    <dl {...rest} className={['ui-drawer__rows', 'ui-kv', columns === 2 && 'ui-kv--two-columns', className].filter(Boolean).join(' ')}>
      {rows.map((row, index) => (
        <div className="ui-drawer__row" key={index}>
          <dt>{row.label}</dt>
          <dd>{detail(row)}</dd>
        </div>
      ))}
    </dl>
  );
}

export type DrawerSectionProps = Omit<ComponentPropsWithoutRef<'section'>, 'title'> & {
  title?: ReactNode;
  headingLevel?: 2 | 3 | 4 | 5 | 6;
};

export function DrawerSection({ title, headingLevel = 3, className, children, ...rest }: DrawerSectionProps) {
  const Heading = `h${headingLevel}` as const;
  return (
    <section {...rest} className={['ui-drawer__section', className].filter(Boolean).join(' ')}>
      {title != null && <Heading className="ui-drawer__section-title">{title}</Heading>}
      {children}
    </section>
  );
}
