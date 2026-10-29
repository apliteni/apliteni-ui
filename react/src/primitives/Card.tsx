import { createContext, useCallback, useMemo, useState, type ReactNode } from 'react';
import { icon as kitIcon, safeUrl } from '@apliteni/apliteni-ui';

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
  /** Controls at the end of the title row, such as an icon-only menu. Needs a `title`. */
  tools?: ReactNode;
  className?: string;
  children?: ReactNode;
};

/** The title row's tools slot, offered to one child that claims it. A Chart
 *  claims it for its "Chart options" button. Null outside a titled card. */
export type CardToolsSlot = { slot: HTMLElement | null; owner: string | null; claim: (id: string) => () => void };
export const CardTools = createContext<CardToolsSlot | null>(null);

// The title is a heading one level under the page's h1 unless `level` says
// otherwise. why: docs/foundations.md#labels-and-titles
// A caller's `className` is merged with the kit class rather than replacing it, the way
// Button merges one, so a page can mark one card without losing `.ui-card`.
export function Card({ title, sub, level = 2, variant, pad, icon, href, tools, className, children }: CardProps) {
  const [claims, setClaims] = useState<string[]>([]);
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  // The first child to claim the slot keeps it, so two charts draw one button between them.
  // When it leaves, the next child in the queue takes the slot.
  const claim = useCallback((id: string) => {
    setClaims((held) => (held.includes(id) ? held : [...held, id]));
    return () => setClaims((held) => held.filter((h) => h !== id));
  }, []);
  const owner = claims[0] ?? null;
  const offer = useMemo(() => ({ slot, owner, claim }), [slot, owner, claim]);
  const n = Number(level);
  const Heading = (href != null ? 'div' : `h${[2, 3, 4, 5, 6].includes(n) ? n : 2}`) as 'h2';
  const titled = title != null && title !== false && title !== '';
  const classes = ['ui-card', variant && `ui-card--${variant}`, pad && `ui-card--pad-${pad}`, href != null && 'ui-card--interactive', className]
    .filter(Boolean).join(' ');
  // A link holds no button, so a link card offers no tools.
  const withTools = titled && href == null;
  const heading = titled && <Heading className="ui-card__title">
    {icon && <span className="ui-card__icon" aria-hidden="true" dangerouslySetInnerHTML={{ __html: kitIcon(icon) }} />}
    {title}
  </Heading>;
  const inner = <>
    {withTools && (tools != null || owner != null)
      ? <div className="ui-card__head">{heading}<div className="ui-card__tools" ref={setSlot}>{tools}</div></div>
      : heading}
    {sub != null && <div className="ui-card__sub">{sub}</div>}
    {children}
  </>;
  return href != null
    ? <a className={classes} href={safeUrl(href)}>{inner}</a>
    : <div className={classes}>{withTools ? <CardTools.Provider value={offer}>{inner}</CardTools.Provider> : inner}</div>;
}
