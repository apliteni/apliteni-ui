import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { AppShell } from './AppShell';
import { Dropdown, type DropdownItem } from './Dropdown';
import { KeyValueList } from './KeyValueList';
import { Card } from './primitives/Card';

const entities: DropdownItem[] = [
  { value: 'studio', label: 'Studio', description: 'Design and production' },
  { value: 'trading', label: 'Trading', description: 'Wholesale orders' },
  { value: 'archive', label: 'Archive', description: 'Closed in 2024', badge: { text: 'Archived', tone: 'state' } },
];

function Example({ initialEntity = 'studio', defaultOpen = false }) {
  const [entity, setEntity] = useState(initialEntity);
  const selected = entities.find((item) => item.value === entity)!;
  return (
    <AppShell
      word="Northwind"
      title="Overview"
      lede="Review the selected entity’s activity."
      sections={[{ href: '/overview', label: 'Overview', icon: 'home' }]}
      pathname="/overview"
      account={{ name: 'Demo User', email: 'demo@example.com' }}
      onSignOut={() => {}}
      actions={<div style={{ marginLeft: 'auto' }}><Dropdown
        label="Entity:"
        ariaLabel="Entity"
        variant="select"
        align="end"
        items={entities.map((item) => ({ ...item, selected: item.value === entity }))}
        onSelect={(value) => setEntity(String(value))}
        defaultOpen={defaultOpen}
      /></div>}
    >
      <Card title={`${selected.label} activity`}>
        <KeyValueList rows={[
          { label: 'Business', value: selected.description },
          { label: 'Access', value: entity === 'archive' ? 'Read-only · closed in 2024' : 'Active' },
        ]} />
      </Card>
    </AppShell>
  );
}

const meta = {
  title: 'Showcases/Entity switcher',
  id: 'apps-entity-switcher',
  parameters: { layout: 'fullscreen' },
} satisfies Meta;
export default meta;

// The app owns permissions, URL updates and request scope. Archived periods stay read-only in the app.
export const Open: StoryObj<typeof meta> = {
  render: () => <Example defaultOpen />,
};

export const ArchivedChosen: StoryObj<typeof meta> = {
  render: () => <Example initialEntity="archive" defaultOpen />,
};

export const Closed: StoryObj<typeof meta> = {
  render: () => <Example />,
};
