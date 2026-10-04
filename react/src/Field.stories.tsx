import type { Meta, StoryObj } from '@storybook/react';
import type { ReactNode } from 'react';
import { Field, TextField, TextArea, SelectField, FileField } from './Field';
import { Card } from './primitives/Card';

// Every specimen sits on the card, for the reason the vanilla Inputs gallery gives
// since #556: a field's own paint IS --surface, so on the page ground an inert one
// has nothing left to show, and the Disabled story below read as empty space. On the
// card the edge is what draws it; react/src/field-ground.test.tsx records that edge.
//
// The card is in each render rather than in the decorator on purpose. That gate calls
// renders and not decorators, so a surface left in a decorator would be unmeasured.
const onCard = (body: ReactNode) => <Card>{body}</Card>;

// The decorator carries width only. The card's own padding is --space-6 a side, so
// the panel width is widened by both of them and the field keeps the measure it had.
const meta: Meta = { title: 'React/Fields', decorators: [(Story, context) => context.parameters.layout === 'fullscreen' ? <Story /> : <div style={{ maxWidth: 'calc(var(--panel-md) + var(--space-6) * 2)' }}><Story /></div>] };
export default meta;

export const Text: StoryObj = { render: () => onCard(<TextField label="Project name" placeholder="Example project" hint="Use a name your team knows." required />) };
export const Number: StoryObj = { render: () => onCard(<TextField label="Weight" type="number" unit="kg" defaultValue={12} />) };
export const Email: StoryObj = { render: () => onCard(<TextField label="Email" type="email" placeholder="name@example.com" />) };
export const Multiline: StoryObj = { render: () => onCard(<TextArea label="Notes" hint="Add details for your team." />) };
export const Select: StoryObj = { render: () => onCard(<SelectField label="Currency"><option>EUR</option><option>USD</option></SelectField>) };
export const File: StoryObj = { render: () => onCard(<FileField label="Attachment" accept=".pdf" hint="PDF, up to 5 MB. The application checks the file before upload." />) };
export const Invalid: StoryObj = { render: () => onCard(<div style={{ display: 'grid', gap: 20 }}>
  <TextField label="Project name" error="Enter a project name." required />
  <TextArea label="Notes" error="Enter a note." />
  <SelectField label="Currency" error="Choose a currency."><option value="">Choose…</option><option>EUR</option></SelectField>
  <FileField label="Attachment" error="Choose a PDF smaller than 5 MB." />
</div>) };
export const Disabled: StoryObj = { render: () => onCard(<div style={{ display: 'grid', gap: 20 }}>
  <TextField label="Project name" defaultValue="Example project" disabled />
  <TextArea label="Notes" defaultValue="Draft" disabled />
  <SelectField label="Currency" disabled><option>EUR</option></SelectField>
  <FileField label="Attachment" disabled />
</div>) };
export const Hover: StoryObj = { ...Text };
export const Focus: StoryObj = { render: () => onCard(<TextField label="Project name" autoFocus />) };
export const DragOver: StoryObj = { ...File, play: async ({ canvasElement }) => {
  canvasElement.querySelector('.ui-file')!.dispatchEvent(new Event('dragover', { bubbles: true, cancelable: true }));
} };
export const HasFile: StoryObj = { ...File, play: async ({ canvasElement }) => {
  const input = canvasElement.querySelector('input')!;
  const transfer = new DataTransfer();
  transfer.items.add(new globalThis.File(['Example'], 'example.pdf', { type: 'application/pdf' }));
  input.files = transfer.files;
  input.dispatchEvent(new Event('change', { bubbles: true }));
} };

export const Password: StoryObj = { render: () => onCard(<TextField label="Password" type="password" autoComplete="current-password" icon="lock" required />) };
export const Search: StoryObj = { render: () => onCard(<TextField label="Search components" type="search" placeholder="Search components…" icon="search" />) };
export const Composed: StoryObj = { render: () => onCard(<Field label="Due date" hint="Use the delivery date." required>{control => <input {...control} className="ui-input" type="date" />}</Field>) };

export const TextFields: StoryObj = { parameters: { layout: 'fullscreen' }, render: () => <div style={{ padding: 'var(--space-10)', minHeight: '100vh' }}><div style={{ maxWidth: 'calc(var(--panel-md) + var(--space-6) * 2)' }}>{onCard(<div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
  <TextField label="Work email" type="email" placeholder="you@example.com" icon="mail" required hint="Use your work email address." />
  <TextField label="Agent name" placeholder="e.g. Research bot" />
  <TextField label="Password" type="password" defaultValue="demo123" icon="lock" required />
  <TextField label="API token" defaultValue="demo-revoked-token" error="This token has already been revoked." />
  <TextField label="Disabled" placeholder="Read only" disabled />
</div>)}</div></div> };
export const AdornedStates: StoryObj = { render: () => onCard(<div style={{ display: 'grid', gap: 'var(--space-5)' }}>
  <TextField label="Search components" type="search" icon="search" placeholder="Search components…" />
  <TextField label="Unavailable search" type="search" icon="search" defaultValue="Buttons" disabled />
  <TextField label="Password" type="password" icon="lock" hint="Use your account password." error="Enter your password." required />
  <TextField label="Weight" type="number" icon="cube" unit="kg" defaultValue={12} />
</div>) };
