import { useId, type ReactNode } from 'react';
import { Icon } from './Icon';

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
  direction?: 'up' | 'down' | 'flat';
  none?: string;
}

export interface StatFigure {
  label: string;
  value: ReactNode;
  delta?: StatDelta;
  trend?: ReactNode;
}

export interface StatBandProps {
  stats: StatFigure[];
  variant?: StatVariant;
  basis?: string;
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

function Delta({ delta, basisId }: { delta: StatDelta; basisId?: string }) {
  if (!hasChange(delta)) {
    return <dd className="ui-stat__delta ui-stat__delta--none">{delta.none || 'No earlier figure'}</dd>;
  }
  const dir = delta.direction && GLYPH[delta.direction] ? delta.direction : directionOf(delta.value);
  return (
    <dd className="ui-stat__delta" aria-describedby={!delta.basis && basisId ? basisId : undefined}>
      <Icon name={GLYPH[dir]} />
      <span className="ui-stat__change">{delta.value}</span>
      {delta.basis ? <>{' '}<span className="ui-stat__basis">{delta.basis}</span></> : null}
    </dd>
  );
}

export function StatBand({ stats, variant = 'band', basis, label, id }: StatBandProps) {
  const auto = useId();
  const v: StatVariant = ['band', 'tiles', 'open'].includes(variant) ? variant : 'band';
  const basisId = basis ? `${id || auto}-basis` : undefined;
  const root = ['ui-stats', `ui-stats--${v}`, v === 'band' && 'ui-card'].filter(Boolean).join(' ');
  return (
    <div className={root} role={label ? 'group' : undefined} aria-label={label || undefined}>
      <dl className="ui-stats__list">
        {stats.map((s, i) => {
          const tone = hasChange(s.delta) && (s.delta.tone === 'good' || s.delta.tone === 'bad') ? s.delta.tone : '';
          const cls = ['ui-stat', tone && `ui-stat--${tone}`, v === 'tiles' && 'ui-card ui-card--pad-sm']
            .filter(Boolean).join(' ');
          return (
            <div className={cls} key={`${s.label}-${i}`}>
              <dt className="ui-stat__label">{s.label}</dt>
              <dd className="ui-stat__value">{s.value}</dd>
              {s.delta ? <Delta delta={s.delta} basisId={basisId} /> : null}
              {s.trend ? <dd className="ui-stat__trend">{s.trend}</dd> : null}
            </div>
          );
        })}
      </dl>
      {basis ? <p className="ui-stats__basis" id={basisId}>{basis}</p> : null}
    </div>
  );
}
