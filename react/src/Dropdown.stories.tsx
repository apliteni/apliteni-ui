import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { Dropdown, type DropdownEntry } from './Dropdown';

const meta: Meta<typeof Dropdown> = { title: 'React/Dropdown', component: Dropdown };
export default meta;

const ACTIONS: DropdownEntry[] = [
  { label: 'Rename', icon: 'edit' },
  { label: 'Duplicate', icon: 'copy' },
  '---',
  { label: 'Export', description: 'CSV, the rows as filtered' },
  { label: 'Archive', disabled: true },
  { label: 'Delete', danger: true },
];

const VERSIONS: DropdownEntry[] = [
  { label: 'v1.2.0', value: '1.2.0', selected: true, badge: 'Live' },
  { label: 'v1.1.0', value: '1.1.0' },
  { label: 'v1.0.0', value: '1.0.0', description: 'Last year’s release', badge: { text: 'EOL', tone: 'accent' } },
];

// Room under the trigger for the panel, which is absolutely placed.
const Stage = ({ children }: { children: React.ReactNode }) => (
  <div style={{ minHeight: 320 }}>{children}</div>
);

// The action menu a table row opens. Open on arrival, which is the state worth looking at.
export const Menu: StoryObj<typeof Dropdown> = {
  render: () => (
    <Stage>
      <Dropdown items={ACTIONS} ariaLabel="Row actions" triggerContent="Actions" defaultOpen />
    </Stage>
  ),
};

// The select flavour: a listbox, the pick written into the trigger, a tick beside it.
export const Select: StoryObj<typeof Dropdown> = {
  render: () => {
    const [version, setVersion] = useState('1.2.0');
    return (
      <Stage>
        <Dropdown
          label="version:"
          ariaLabel="Version"
          variant="select"
          items={VERSIONS.map((it) => (typeof it === 'string' || 'separator' in it ? it
            : { ...it, selected: it.value === version }))}
          onSelect={(value) => setVersion(String(value))}
          defaultOpen
        />
      </Stage>
    );
  },
};

// The case #304 was opened for: every row is a router link, and the arrows still move.
// A plain <a> with a prop of its own stands in for the router's <Link>.
const Link = ({ to, ...rest }: { to: string } & React.ComponentPropsWithoutRef<'a'>) => (
  <a data-to={to} href={to} {...rest} />
);

export const RowsAreLinks: StoryObj<typeof Dropdown> = {
  render: () => (
    <Stage>
      <Dropdown
        ariaLabel="Go to"
        triggerContent="Jump to…"
        sections={[
          { label: 'This project', items: [
            { label: 'Settings', href: '/settings', icon: 'gear' },
            { label: 'Members', href: '/members', icon: 'user' },
          ] },
          { label: 'Account', items: [
            { label: 'Billing', href: '/billing', badge: 'New' },
            { label: 'Sign out', href: '/sign-out', danger: true },
          ] },
        ]}
        row={(item, props) => <Link to={item.href!} {...props} />}
        defaultOpen
      />
    </Stage>
  ),
};

// A long list, capped and scrolling, with a status badge on the row that has one.
export const Scrolling: StoryObj<typeof Dropdown> = {
  render: () => (
    <Stage>
      <Dropdown
        variant="select"
        label="region:"
        ariaLabel="Region"
        scroll={220}
        items={[
          { label: 'Amsterdam', value: 'ams', selected: true, badge: 'Live' },
          { label: 'Frankfurt', value: 'fra' },
          { label: 'London', value: 'lhr' },
          { label: 'New York', value: 'nyc' },
          { label: 'Singapore', value: 'sin', badge: { text: 'Beta', tone: 'accent' } },
          { label: 'São Paulo', value: 'gru' },
          { label: 'Sydney', value: 'syd' },
        ]}
      />
    </Stage>
  ),
};

// Closed, so the trigger itself is the subject — and the end edge, for a menu that
// would otherwise run off the right of its column.
export const Closed: StoryObj<typeof Dropdown> = {
  render: () => (
    <Stage>
      <div style={{ display: 'flex', gap: 12 }}>
        <Dropdown items={ACTIONS} ariaLabel="Row actions" triggerContent="Actions" />
        <Dropdown items={ACTIONS} ariaLabel="More" triggerContent="More" align="end" />
      </div>
    </Stage>
  ),
};
