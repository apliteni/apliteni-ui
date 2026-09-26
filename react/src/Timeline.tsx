import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { Button } from './primitives/Button';
import './Timeline.css';

export type TimelineEvent = {
  id: string;
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
  return (
    <ol {...rest} role="list" className={['ui-timeline', className].filter(Boolean).join(' ')}>
      {events.map(event => (
        <li className="ui-timeline__event" key={event.id}>
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
