import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { SelectionBar, type SelectionBarAction } from './SelectionBar';

// Padded, as a page is: the bar reads its room's width, and a centred canvas shrinks the room to the bar.
const meta: Meta<typeof SelectionBar> = { title: 'React/SelectionBar', component: SelectionBar, id: 'react-selectionbar', parameters: { layout: 'padded' } };
export default meta;

const values = (...labels: string[]) => labels.map(label => ({ label }));
const PEOPLE = values('Avery', 'Blair', 'Casey', 'Dana', 'Emery', 'Finley', 'Harper', 'Jordan', 'Kendall', 'Logan');
const actions: SelectionBarAction[] = [
  { id: 'status', label: 'Status', items: values('Draft', 'Ready', 'Archived') },
  { id: 'owner', label: 'Owner', items: PEOPLE },
  { id: 'tags', label: 'Tags', items: values('Guide', 'Release', 'Review') },
  { id: 'archive', label: 'Archive' },
];

// A bar the story answers: Clear empties it, and a pick changes nothing but the count line.
function Bar({ start = 2, ...rest }: { start?: number; actions?: SelectionBarAction[]; place?: 'centre' | 'start' }) {
  const [count, setCount] = useState(start);
  return <SelectionBar count={count} actions={rest.actions ?? actions} place={rest.place} onAction={() => {}} onClear={() => setCount(0)} />;
}

export const Selected: StoryObj = { render: () => <Bar /> };
export const OneAction: StoryObj = { render: () => <Bar actions={[actions[0]]} /> };
export const Start: StoryObj = { render: () => <Bar place="start" /> };
// The room is a phone's: Status stands, and the rest go into More.
export const Narrow: StoryObj = { render: () => <div style={{ maxWidth: '358px' }}><Bar /></div> };
