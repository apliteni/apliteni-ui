import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { DatePicker } from './DatePicker';
import { Tabs } from './Tabs';

const meta: Meta<typeof Tabs> = { title: 'React/Tabs', component: Tabs, parameters: { viewport: { options: {
  phone: { name: 'Phone', styles: { width: '390px', height: '844px' }, type: 'mobile' },
} } } };
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

function WithMonthControl() {
  const [value, onChange] = useState('overview');
  return <Tabs label="Unit view" value={value} onChange={onChange} tools={<DatePicker ariaLabel="Month" defaultValue="2026-09" align="end" />}
    items={[
      { value: 'overview', label: 'Overview', panel: <p>Unit overview</p> },
      { value: 'activity', label: 'Activity', panel: <p>Unit activity</p> },
      { value: 'settings', label: 'Settings', panel: <p>Unit settings</p> },
    ]} />;
}

export const WithPageControl: StoryObj<typeof Tabs> = { render: () => <WithMonthControl /> };
export const WithPageControlPhone: StoryObj<typeof Tabs> = {
  globals: { viewport: { value: 'phone', isRotated: false } }, render: () => <WithMonthControl />,
};
