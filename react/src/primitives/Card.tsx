import type { ReactNode } from 'react';
import { icon as kitIcon } from '@apliteni/apliteni-ui';

type Level = 2 | 3 | 4 | 5 | 6;

export type CardProps = {
  title?: ReactNode;
  sub?: ReactNode;
  level?: Level;
  /** `accent` tints the card with the accent and `live` with green. */
  variant?: 'accent' | 'live';
  /** `sm` trims the vertical padding. `lg` is the centred landing card. */
  pad?: 'sm' | 'lg';
  /** Glyph name for the chip before the title. Needs a `title`. */
  icon?: string;
  /** Makes the whole card a link. Its title is then a plain block, because a link holds no heading. */
  href?: string;
  className?: string;
  children?: ReactNode;
};

// The title is a heading one level under the page's h1 unless `level` says
// otherwise. why: docs/foundations.md#labels-and-titles
// A caller's `className` is merged with the kit class rather than replacing it, the way
// Button merges one, so a page can mark one card without losing `.ui-card`.
export function Card({ title, sub, level = 2, variant, pad, icon, href, className, children }: CardProps) {
  const n = Number(level);
  const Heading = (href != null ? 'div' : `h${[2, 3, 4, 5, 6].includes(n) ? n : 2}`) as 'h2';
  const titled = title != null && title !== false && title !== '';
  const classes = ['ui-card', variant && `ui-card--${variant}`, pad && `ui-card--pad-${pad}`, href != null && 'ui-card--interactive', className]
    .filter(Boolean).join(' ');
  const inner = <>
    {titled && <Heading className="ui-card__title">
      {icon && <span className="ui-card__icon" aria-hidden="true" dangerouslySetInnerHTML={{ __html: kitIcon(icon) }} />}
      {title}
    </Heading>}
    {sub != null && <div className="ui-card__sub">{sub}</div>}
    {children}
  </>;
  return href != null
    ? <a className={classes} href={href}>{inner}</a>
    : <div className={classes}>{inner}</div>;
}
