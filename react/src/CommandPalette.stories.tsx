import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { CommandPalette, type CommandGroup } from './CommandPalette';
import { Button } from './primitives/Button';
import { Callout } from './primitives/Callout';

const meta: Meta<typeof CommandPalette> = { title: 'React/Command palette', component: CommandPalette };
export default meta;

const GROUPS: CommandGroup[] = [
  {
    label: 'Actions',
    items: [
      { id: 'new-invoice', label: 'New invoice', description: 'Draft one for a client', icon: 'plus', shortcut: ['n'] },
      { id: 'invite', label: 'Invite a teammate', description: 'They get a read-only seat', icon: 'user' },
      { id: 'export', label: 'Export rows as CSV', description: 'The current filter, all pages', icon: 'download', shortcut: ['⌘', 'E'] },
    ],
  },
  {
    label: 'Go to',
    items: [
      { id: 'reports', label: 'Reports', description: 'Revenue, payouts and fees', icon: 'chart', href: '#reports' },
      { id: 'transactions', label: 'Transactions', description: '4,812 rows this month', icon: 'table', href: '#transactions' },
      { id: 'settings', label: 'Settings', description: 'Billing, members, API keys', icon: 'gear', keywords: ['preferences'], href: '#settings' },
    ],
  },
  {
    label: 'Recent',
    items: [
      { id: 'inv-4812', label: 'INV-4812', description: 'Nebula Ltd · €2,480 · unpaid', icon: 'doc', badge: 'Unpaid', href: '#inv-4812' },
      { id: 'inv-4809', label: 'INV-4809', description: 'Orbit GmbH · €960 · paid', icon: 'doc', href: '#inv-4809' },
    ],
  },
];

export const Playground: StoryObj<typeof CommandPalette> = {
  render: () => {
    const [open, setOpen] = useState(true);
    const [ran, setRan] = useState<string | null>(null);
    return (
      <>
        <div className="ui-stack">
          <Button variant="secondary" onClick={() => setOpen(true)}>Search or run a command</Button>
          {ran && <Callout>Ran: {ran}</Callout>}
        </div>
        <CommandPalette
          open={open}
          groups={GROUPS}
          onClose={() => setOpen(false)}
          onSelect={(item) => setRan(item.label)}
        />
      </>
    );
  },
};

export const Roomy: StoryObj<typeof CommandPalette> = {
  render: () => {
    const [open, setOpen] = useState(true);
    return (
      <>
        <Button variant="secondary" onClick={() => setOpen(true)}>Open</Button>
        <CommandPalette open={open} density="roomy" groups={GROUPS} onClose={() => setOpen(false)} />
      </>
    );
  },
};

// A destructive row that has a question to ask, beside one that has none. The
// second is rendered disabled: the component refuses to run a delete the reader
// was never asked about.
export const Destructive: StoryObj<typeof CommandPalette> = {
  render: () => {
    const [open, setOpen] = useState(true);
    const [asked, setAsked] = useState(false);
    return (
      <>
        <div className="ui-stack">
          <Button variant="secondary" onClick={() => setOpen(true)}>Open</Button>
          {asked && <Callout variant="info">The confirm would be up now.</Callout>}
        </div>
        <CommandPalette
          open={open}
          hint={false}
          groups={[{
            label: 'Danger zone',
            items: [
              { id: 'del', label: 'Delete workspace…', description: 'Nebula · 42 API keys', icon: 'trash', danger: true, onConfirm: () => setAsked(true) },
              { id: 'revoke', label: 'Revoke every API key', description: 'They stop working at once', icon: 'key', danger: true },
            ],
          }]}
          onClose={() => setOpen(false)}
        />
      </>
    );
  },
};
