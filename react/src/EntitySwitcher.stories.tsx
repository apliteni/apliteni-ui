import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { Dropdown, type DropdownItem } from './Dropdown';

const entities: DropdownItem[] = [
  { value: 'studio', label: 'Northwind Studio', description: 'Design and production' },
  { value: 'trading', label: 'Northwind Trading', description: 'Wholesale orders' },
  { value: 'archive', label: 'Northwind Archive', description: 'Closed in 2024', badge: { text: 'Archived', tone: 'state' } },
];

const meta = {
  title: 'Showcases/Entity switcher',
  id: 'apps-entity-switcher',
  parameters: { layout: 'padded' },
} satisfies Meta;
export default meta;

// The app owns permissions, URL updates and request scope. Archived periods stay read-only in the app.
export const EntitySwitcher: StoryObj<typeof meta> = {
  name: 'Open',
  render: () => {
    const [entity, setEntity] = useState('studio');
    return (
      <div style={{ minHeight: 300 }}>
        <Dropdown
          label="Entity:"
          ariaLabel="Entity"
          variant="select"
          items={entities.map((item) => ({ ...item, selected: item.value === entity }))}
          onSelect={(value) => setEntity(String(value))}
          defaultOpen
        />
      </div>
    );
  },
};

export const ArchivedChosen: StoryObj<typeof meta> = {
  render: () => {
    const [entity, setEntity] = useState('archive');
    return (
      <div style={{ minHeight: 300 }}>
        <Dropdown
          label="Entity:"
          ariaLabel="Entity"
          variant="select"
          items={entities.map((item) => ({ ...item, selected: item.value === entity }))}
          onSelect={(value) => setEntity(String(value))}
          defaultOpen
        />
      </div>
    );
  },
};

export const Closed: StoryObj<typeof meta> = {
  render: () => {
    const [entity, setEntity] = useState('studio');
    return (
      <div style={{ minHeight: 300 }}>
        <Dropdown
          label="Entity:"
          ariaLabel="Entity"
          variant="select"
          items={entities.map((item) => ({ ...item, selected: item.value === entity }))}
          onSelect={(value) => setEntity(String(value))}
        />
      </div>
    );
  },
};
