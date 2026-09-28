import { useEffect, useRef, type ComponentPropsWithoutRef, type ReactNode } from 'react';
import { playEntrance, prefersReducedMotion } from '@apliteni/apliteni-ui/motion';
import { Icon } from './primitives/Icon';
import { Button } from './primitives/Button';
import './Timeline.css';

export type TimelineEventKind = 'person' | 'rule' | 'reversal';

const kindIcons = { person: 'user', rule: 'bolt', reversal: 'refresh' } as const;

export type TimelineEvent = {
  id: string;
  kind?: TimelineEventKind;
  actor: string;
  dateTime: string;
  timestamp: string;
  description: string;
  meta?: ReactNode;
  undo?: {
    label: string;
    onUndo: () => void;
  };
};

export type TimelineProps = Omit<ComponentPropsWithoutRef<'ol'>, 'children' | 'reversed' | 'start'> & {
  events: readonly TimelineEvent[];
};

export function Timeline({ events, className, ...rest }: TimelineProps) {
  const previousIds = useRef(new Set(events.map(event => event.id)));
  const rows = useRef(new Map<string, HTMLLIElement>());
  useEffect(() => {
    if (!prefersReducedMotion()) {
      for (const event of events) {
        if (previousIds.current.has(event.id)) continue;
        const row = rows.current.get(event.id);
        if (!row) continue;
        playEntrance(row);
        playEntrance(row.querySelector('.ui-timeline__marker'));
      }
    }
    previousIds.current = new Set(events.map(event => event.id));
  }, [events]);

  return (
    <ol {...rest} role="list" className={['ui-timeline', events.some(event => event.kind) && 'ui-timeline--kinds', className].filter(Boolean).join(' ')}>
      {events.map(event => (
        <li className="ui-timeline__event" key={event.id}
          ref={row => { if (row) rows.current.set(event.id, row); else rows.current.delete(event.id); }}>
          <span aria-hidden="true" className={['ui-timeline__marker', event.kind && 'ui-timeline__marker--kind',
            event.kind === 'reversal' && 'ui-timeline__marker--reversal'].filter(Boolean).join(' ')}>
            {event.kind && <Icon name={kindIcons[event.kind]} />}
          </span>
          <div className="ui-timeline__head">
            <span className="ui-timeline__actor">{event.actor}</span>
            <time dateTime={event.dateTime}>{event.timestamp}</time>
          </div>
          <p className="ui-timeline__description">{event.description}</p>
          {(event.meta != null || event.undo) && <div className="ui-timeline__meta">
            {event.meta != null && <span>{event.meta}</span>}
            {event.undo && <Button variant="ghost" size="xs" className="ui-btn ui-btn--ghost ui-btn--xs ui-timeline__undo" aria-label={event.undo.label} onClick={event.undo.onUndo}>Undo</Button>}
          </div>}
        </li>
      ))}
    </ol>
  );
}
