import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { Icon } from './primitives/Icon';
import './FreshnessChip.css';

export type FreshnessTone = 'fresh' | 'late' | 'failing';
export type FreshnessChipProps = {
  source: string;
  tone: FreshnessTone;
  /** Last successful delivery, formatted by the caller. */
  date: string;
  /** Machine-readable date for the time element. */
  dateTime: string;
  detail: string;
  href?: string;
};

const tones = { fresh: 'success', late: 'warn', failing: 'danger' } as const;
const glyphs = { fresh: 'database', late: 'clock', failing: 'alert' } as const;

export function FreshnessChip({ source, tone, date, dateTime, detail, href }: FreshnessChipProps) {
  const id = useId();
  const host = useRef<HTMLSpanElement>(null);
  const tip = useRef<HTMLSpanElement>(null);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const open = (hovered || focused) && !dismissed;
  const [position, setPosition] = useState({ left: 0, top: 0 });

  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const anchor = host.current?.getBoundingClientRect();
      const panel = tip.current?.getBoundingClientRect();
      if (!anchor || !panel) return;
      const gap = parseFloat(getComputedStyle(tip.current!).getPropertyValue('--ui-tip-gap')) || 8;
      setPosition({
        left: Math.max(gap, Math.min(anchor.left, window.innerWidth - panel.width - gap)),
        top: anchor.bottom + panel.height + gap <= window.innerHeight
          ? anchor.bottom + gap : Math.max(gap, anchor.top - panel.height - gap),
      });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open, detail]);

  useEffect(() => {
    if (!open) return;
    const dismiss = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDismissed(true);
    };
    document.addEventListener('keydown', dismiss);
    return () => document.removeEventListener('keydown', dismiss);
  }, [open]);

  const Tag = href ? 'a' : 'span';
  return (
    <span ref={host} className="ui-freshness" onMouseEnter={() => { setHovered(true); setDismissed(false); }}
      onMouseLeave={() => setHovered(false)} onKeyDown={event => {
        if (event.key === 'Escape' && open) { setDismissed(true); event.stopPropagation(); }
      }}>
      <Tag href={href} tabIndex={0} className={`ui-badge ui-badge--${tones[tone]} ui-freshness__chip ui-focusable`}
        aria-label={`${source}, ${tone}, as of ${date}`} aria-describedby={id}
        onFocus={() => { setFocused(true); setDismissed(false); }} onBlur={() => setFocused(false)}>
        <Icon name={glyphs[tone]} />
        <strong>{source}</strong>
        <span>as of <time dateTime={dateTime}>{date}</time></span>
      </Tag>
      <span ref={tip} id={id} role="tooltip"
        className={`ui-tip ui-freshness__detail${open ? ' is-open' : ''}`} style={position}>
        {detail}
      </span>
    </span>
  );
}

export type FreshnessRowProps = {
  label: string;
  /** Already scoped and ordered by the caller. */
  sources: readonly (FreshnessChipProps & { id: string })[];
};

export function FreshnessRow({ label, sources }: FreshnessRowProps) {
  return <ul className="ui-freshness-row" aria-label={label} role="list">
    {sources.map(({ id, ...source }) => <li key={id}><FreshnessChip {...source} /></li>)}
  </ul>;
}
