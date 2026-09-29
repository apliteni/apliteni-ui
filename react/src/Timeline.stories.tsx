import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Timeline, type TimelineEvent } from './Timeline';
import { Card } from './primitives/Card';
import { Button } from './primitives/Button';

const meta: Meta<typeof Timeline> = {
  title: 'React/Timeline', component: Timeline, id: 'react-timeline',
  decorators: [Story => <Card><Story /></Card>],
};
export default meta;

const events: readonly TimelineEvent[] = [
  { id: 'created', actor: 'Demo operator', dateTime: '2026-09-01T09:00:00Z', timestamp: '1 Sep, 09:00 UTC', description: 'Created the record in Unassigned.' },
  { id: 'rule', actor: 'Category rule', dateTime: '2026-09-01T09:05:00Z', timestamp: '1 Sep, 09:05 UTC', description: 'Moved the record from Unassigned to Software.', meta: 'Batch DEMO-12' },
  { id: 'manual', actor: 'Demo reviewer', dateTime: '2026-09-01T10:00:00Z', timestamp: '1 Sep, 10:00 UTC', description: 'Corrected the category from Software to Services.', meta: 'Batch DEMO-13' },
];
const reversal: TimelineEvent = {
  id: 'reversal', actor: 'Demo reviewer', dateTime: '2026-09-01T11:00:00Z', timestamp: '1 Sep, 11:00 UTC',
  description: 'Reversed batch DEMO-13; moved the record from Services back to Software.', meta: 'Batch DEMO-14',
};

export const ReadOnly: StoryObj = {
  render: () => <Timeline aria-label="Record history" events={events} />,
};
export const Privileged: StoryObj = {
  render: function PrivilegedStory() {
    const [undone, setUndone] = useState(false);
    const history = undone ? [...events, reversal] : events.map(event => event.id === 'manual'
      ? { ...event, undo: { label: 'Undo batch DEMO-13', onUndo: () => setUndone(true) } } : event);
    return <Timeline aria-label="Record history" events={history} />;
  },
};
export const Reversed: StoryObj = {
  render: () => <Timeline aria-label="Record history" events={[...events, reversal]} />,
};
export const Narrow: StoryObj = {
  render: () => <div style={{ maxWidth: 'var(--panel-sm)' }}><Timeline aria-label="Record history" events={events} /></div>,
};

const withKinds: readonly TimelineEvent[] = events.map((event, index) => ({
  ...event, relativeTimestamp: index === events.length - 1 ? 'just now' : undefined, kind: event.id === 'rule' ? 'rule' : 'person',
}));
export const WithKinds: StoryObj = {
  render: () => <Timeline aria-label="Record history" events={[...withKinds, { ...reversal, kind: 'reversal', relativeTimestamp: 'just now' }]} />,
};
export const Mixed: StoryObj = {
  render: () => <Timeline aria-label="Record history" events={[events[0], ...withKinds.slice(1)]} />,
};
const mixedReversal: readonly TimelineEvent[] = [
  events[0], withKinds[1], withKinds[2], { ...reversal, kind: 'reversal' },
  { ...events[2], id: 'reviewed', dateTime: '2026-09-01T11:05:00Z', timestamp: '1 Sep, 11:05 UTC',
    description: 'Reviewed the corrected category.', meta: undefined, relativeTimestamp: 'just now' },
];
export const MixedReversal: StoryObj = {
  render: () => <Timeline aria-label="Record history" events={mixedReversal.map((event, index) =>
    index === mixedReversal.length - 1 ? { ...event, kind: 'person' } : event)} />,
};
export const NewestUntyped: StoryObj = {
  render: () => <Timeline aria-label="Record history" events={mixedReversal} />,
};
export const NewEvent: StoryObj = {
  render: function NewEventStory() {
    const [arrived, setArrived] = useState(false);
    return <div style={{ display: 'grid', gap: 'var(--space-6)' }}>
      <Timeline aria-label="Record history" events={arrived ? [...withKinds, { ...reversal, kind: 'reversal', relativeTimestamp: 'just now' }] : withKinds} />
      <div><Button variant="ghost" disabled={arrived} onClick={() => setArrived(true)}>Add reversal event</Button></div>
    </div>;
  },
};
