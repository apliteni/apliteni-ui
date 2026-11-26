import type { Meta, StoryObj } from '@storybook/react';
import { useEffect, useRef, useState } from 'react';
import { CommandPalette, type CommandGroup } from './CommandPalette';
import { Confirm } from './Confirm';
import { Toast, useToast } from './Toast';
import { Button } from './primitives/Button';

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

// Shows one toast for each new `done`. A story's render sits above its Toast
// provider, so it reports through this child, not through useToast itself.
function Done({ done }: { done: { title: string } | null }) {
  const push = useToast();
  const shown = useRef(done);
  useEffect(() => {
    if (!done || shown.current === done) return;
    shown.current = done;
    push({ title: done.title, compact: true });
  }, [done, push]);
  return null;
}

// A command that ran is something that happened, so it reports in a toast.
// guidelines/component-choice.md: Show lasting conditions.
export const Playground: StoryObj<typeof CommandPalette> = {
  render: () => {
    const [open, setOpen] = useState(true);
    const [ran, setRan] = useState<{ title: string } | null>(null);
    return (
      <Toast>
        <Button variant="secondary" onClick={() => setOpen(true)}>Search or run a command</Button>
        <Done done={ran} />
        <CommandPalette
          open={open}
          groups={GROUPS}
          onClose={() => setOpen(false)}
          onSelect={(item) => setRan({ title: `Ran ${item.label}` })}
        />
      </Toast>
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
// was never asked about. The first opens a confirm over the palette.
export const Destructive: StoryObj<typeof CommandPalette> = {
  render: () => {
    const [open, setOpen] = useState(true);
    const [asked, setAsked] = useState(false);
    const [deleted, setDeleted] = useState<{ title: string } | null>(null);
    return (
      <Toast>
        <Button variant="secondary" onClick={() => setOpen(true)}>Open</Button>
        <Done done={deleted} />
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
        <Confirm
          open={asked}
          danger
          title="Delete workspace Nebula?"
          body="Everything in Nebula goes with it. You cannot restore the workspace."
          confirmLabel="Delete workspace"
          cancelLabel="Keep the workspace"
          onCancel={() => setAsked(false)}
          onConfirm={() => { setAsked(false); setOpen(false); setDeleted({ title: 'Workspace deleted' }); }}
        />
      </Toast>
    );
  },
};
