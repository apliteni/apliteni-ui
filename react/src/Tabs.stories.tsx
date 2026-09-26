import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Tabs } from './Tabs';

const meta: Meta<typeof Tabs> = { title: 'React/Tabs', component: Tabs };
export default meta;

function Example({ counts = false, initial = 'overview' }) {
  const [value, onChange] = useState(initial);
  return <Tabs label="Account sections" value={value} onChange={onChange} items={[
    { value: 'overview', label: 'Overview', panel: <p>Account overview</p> },
    { value: 'activity', label: 'Activity', count: counts ? 3 : undefined, panel: <p>Recent activity</p> },
    { value: 'settings', label: 'Settings', count: counts ? 0 : undefined, panel: <p>Account settings</p> },
  ]} />;
}

export const Default: StoryObj<typeof Tabs> = { render: () => <Example /> };
export const WithCounts: StoryObj<typeof Tabs> = { render: () => <Example counts /> };
export const Active: StoryObj<typeof Tabs> = { render: () => <Example initial="activity" /> };
export const Hover: StoryObj<typeof Tabs> = {
  render: () => <Example />,
  parameters: { docs: { description: { story: 'Hover a tab to see its hover state.' } } },
};
