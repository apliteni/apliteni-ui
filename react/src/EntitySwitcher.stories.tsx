import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { EntitySwitcher } from './EntitySwitcher';

const entities = [
  { id: 'north', name: 'North Studio', description: 'Design services' },
  { id: 'west', name: 'West Studio', description: 'History through 2025', archived: true },
];

const meta: Meta<typeof EntitySwitcher> = {
  title: 'React/EntitySwitcher',
  component: EntitySwitcher,
  args: { entities, value: 'north' },
  render: (args) => {
    const [value, setValue] = useState(args.value);
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-start', minHeight: 220, maxWidth: 420 }}>
        <EntitySwitcher {...args} value={value} onChange={setValue} />
      </div>
    );
  },
};
export default meta;
type Story = StoryObj<typeof EntitySwitcher>;

export const Closed: Story = {};
export const Open: Story = { args: { defaultOpen: true } };
export const Archived: Story = { args: { value: 'west', defaultOpen: true } };
export const Hover: Story = {
  args: { defaultOpen: true },
  parameters: { docs: { description: { story: 'Hover a row to see its highlight.' } } },
};
export const Hidden: Story = {
  render: () => {
    const canSwitchEntity = false;
    return <header>
      <h1>Entity overview</h1>
      {canSwitchEntity && <EntitySwitcher entities={entities} value="north" onChange={() => {}} />}
    </header>;
  },
};
