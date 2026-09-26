import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Timeline, type TimelineEvent } from './Timeline';
import { Modal } from './Modal';
import { Button } from './primitives/Button';

const meta: Meta<typeof Timeline> = { title: 'React/Timeline', component: Timeline, id: 'react-timeline' };
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
    const [confirm, setConfirm] = useState(false);
    const [undone, setUndone] = useState(false);
    const history = undone ? [...events, reversal] : events.map(event => event.id === 'manual'
      ? { ...event, undo: { label: 'Undo batch DEMO-13', onUndo: () => setConfirm(true) } } : event);
    return <>
      <Timeline aria-label="Record history" events={history} />
      <Modal open={confirm} title="Undo batch DEMO-13?" onClose={() => setConfirm(false)} footer={<>
        <Button variant="ghost" onClick={() => setConfirm(false)}>Cancel</Button>
        <Button variant="danger" onClick={() => { setUndone(true); setConfirm(false); }}>Undo batch DEMO-13</Button>
      </>}>
        <p>This batch changed a finalized record. Undo reverses the whole batch and adds a new history event.</p>
      </Modal>
    </>;
  },
};
export const Reversed: StoryObj = {
  render: () => <Timeline aria-label="Record history" events={[...events, reversal]} />,
};
export const Narrow: StoryObj = {
  render: () => <div style={{ maxWidth: 280 }}><Timeline aria-label="Record history" events={events} /></div>,
};
