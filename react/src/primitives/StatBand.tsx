import { useId, type ReactNode } from 'react';
import { Icon } from './Icon';
import { Tooltip } from '../Tooltip';

// The React face of statBand(). Same classes, same <dl>, same rules; the one
// difference is that `value` and `trend` take React nodes, so a figure can be a
// link to its drill-down and a trend can be an interactive chart.
// why: docs/specification.md#stat-bands

export type StatTone = 'good' | 'bad' | 'neutral';
export type StatVariant = 'band' | 'tiles' | 'open';

export interface StatDelta {
  value: string | null;
  tone?: StatTone;
  basis?: string;
  tooltip?: string;
  direction?: 'up' | 'down' | 'flat';
}

export interface StatFigure {
  label: string;
  value: ReactNode;
  /** Context that is not a change, such as "of revenue": no arrow, no tone. It
   *  takes the row a change would take, and leads that row beside one. A short
   *  phrase: the row is one line, and a longer caption is clipped. */
  caption?: string;
  delta?: StatDelta;
  trend?: ReactNode;
}

export interface StatBandProps {
  stats: StatFigure[];
  variant?: StatVariant;
  basis?: string;
  /** Existing caption before the figures; used when basis is omitted. */
  basisId?: string;
  label?: string;
  id?: string;
}

const GLYPH = { up: 'arrowUp', down: 'arrowDown', flat: 'minus' } as const;
// Read off the printed sign, as the factory does; the parity test holds the two together.
const directionOf = (text: string) => {
  const t = text.trim();
  return /^[-−–(]/.test(t) ? 'down' : /^\+/.test(t) ? 'up' : 'flat';
};
const hasChange = (d?: StatDelta): d is StatDelta & { value: string } => !!d && d.value != null && d.value !== '';

// The row under the value, as the factory builds it, in one line: the caption,
// the change, then what the change is measured against.
// why: docs/specification.md#stat-bands
function ContextRow({ caption, delta, basisId }: { caption?: string; delta?: StatDelta; basisId?: string }) {
  if (!hasChange(delta)) return caption ? <dd className="ui-stat__caption">{caption}</dd> : null;
  // The trailing space is read, where the gap beside it is only drawn.
  const lead = caption ? <><span className="ui-stat__caption">{caption}</span>{' '}</> : null;
  const dir = delta.direction && GLYPH[delta.direction] ? delta.direction : directionOf(delta.value);
  const own = delta.basis || '';
  return (
    <dd className="ui-stat__delta" aria-describedby={!own && basisId ? basisId : undefined}>
      {lead}
      <Icon name={GLYPH[dir]} />
      {delta.tooltip
        ? <Tooltip text={delta.tooltip}><span className="ui-stat__change">{delta.value}</span></Tooltip>
        : <span className="ui-stat__change">{delta.value}</span>}
      {own ? <>{' '}<span className="ui-stat__basis">{own}</span></> : null}
    </dd>
  );
}

export function StatBand({ stats, variant = 'tiles', basis, basisId: sharedBasisId, label, id }: StatBandProps) {
  const auto = useId();
  const v: StatVariant = ['band', 'tiles', 'open'].includes(variant) ? variant : 'tiles';
  const basisId = basis ? `${id || auto}-basis` : sharedBasisId;
  const root = ['ui-stats', `ui-stats--${v}`, v === 'band' && 'ui-card'].filter(Boolean).join(' ');
  return (
    <div className={root} role={label ? 'group' : undefined} aria-label={label || undefined}>
      {basis ? <p className="ui-stats__basis" id={basisId}>{basis}</p> : null}
      <dl className="ui-stats__list">
        {stats.map((s, i) => {
          const tone = hasChange(s.delta) && (s.delta.tone === 'good' || s.delta.tone === 'bad') ? s.delta.tone : '';
          const cls = ['ui-stat', tone && `ui-stat--${tone}`, v === 'tiles' && 'ui-card ui-card--pad-sm']
            .filter(Boolean).join(' ');
          return (
            <div className={cls} key={`${s.label}-${i}`}>
              <dt className="ui-stat__label">{s.label}</dt>
              <dd className="ui-stat__value">{s.value}</dd>
              <ContextRow caption={s.caption} delta={s.delta} basisId={basisId} />
              {s.trend ? <dd className="ui-stat__trend">{s.trend}</dd> : null}
            </div>
          );
        })}
      </dl>
    </div>
  );
}
