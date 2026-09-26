import type { Meta, StoryObj } from '@storybook/react';
import { useEffect, useState } from 'react';
import { Dropdown } from './Dropdown';

const entities = [
  { value: 'studio', label: 'Northwind Studio', description: 'Design and production' },
  { value: 'trading', label: 'Northwind Trading', description: 'Wholesale orders' },
  { value: 'archive', label: 'Northwind Archive', description: 'Closed in 2024', badge: 'Archived' },
];

const meta = {
  title: 'Showcases/Entity switcher',
  id: 'apps-entity-switcher',
  args: { theme: 'preview', canSwitchEntity: true },
  argTypes: {
    theme: { control: 'select', options: ['preview', 'light', 'dark'] },
    canSwitchEntity: { control: 'boolean' },
  },
  parameters: {
    layout: 'padded',
    docs: { description: { story: 'The app owns permissions, URL updates and request scope. Archived periods stay read-only in the app.' } },
  },
} satisfies Meta<{ theme: string; canSwitchEntity: boolean }>;
export default meta;

export const EntitySwitcher: StoryObj<typeof meta> = {
  render: ({ theme, canSwitchEntity }, context) => {
    const [entity, setEntity] = useState('studio');
    const shownTheme = theme === 'preview' ? context.globals.theme || 'dark' : theme;
    useEffect(() => {
      const root = document.documentElement;
      const previous = root.getAttribute('data-theme');
      root.setAttribute('data-theme', shownTheme);
      return () => {
        if (previous === null) root.removeAttribute('data-theme');
        else root.setAttribute('data-theme', previous);
      };
    }, [shownTheme]);
    return (
      <div
        style={{ minHeight: 300, padding: 24, display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-start' }}
      >
        {canSwitchEntity && (
          <Dropdown
            label="Entity:"
            ariaLabel="Entity"
            variant="select"
            align="end"
            items={entities.map((item) => ({ ...item, selected: item.value === entity }))}
            onSelect={(value) => setEntity(String(value))}
          />
        )}
      </div>
    );
  },
};
