import type { ReactNode } from 'react';

type Level = 2 | 3 | 4 | 5 | 6;

// The title is a heading one level under the page's h1 unless `level` says
// otherwise. why: docs/foundations.md#labels-and-titles
// A caller's `className` is merged with the kit class rather than replacing it, the way
// Button merges one, so a page can mark one card without losing `.ui-card`.
export function Card({ title, sub, level = 2, className, children }: { title?: ReactNode; sub?: ReactNode; level?: Level; className?: string; children?: ReactNode }) {
  const n = Number(level);
  const Heading = `h${[2, 3, 4, 5, 6].includes(n) ? n : 2}` as 'h2';
  const titled = title != null && title !== false && title !== '';
  return (
    <div className={['ui-card', className].filter(Boolean).join(' ')}>
      {titled && <Heading className="ui-card__title">{title}</Heading>}
      {sub != null && <div className="ui-card__sub">{sub}</div>}
      {children}
    </div>
  );
}
