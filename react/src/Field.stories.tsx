import type { Meta, StoryObj } from '@storybook/react';
import { Field, TextField, TextArea, SelectField, FileField } from './Field';

import { Icon } from './primitives/Icon';

const meta: Meta = { title: 'React/Fields', decorators: [(Story, context) => context.name === 'Text Fields' ? <Story /> : <div style={{ maxWidth: 'var(--panel-md)' }}><Story /></div>] };
export default meta;

export const Text: StoryObj = { render: () => <TextField label="Project name" placeholder="Example project" hint="Use a name your team knows." required /> };
export const Number: StoryObj = { render: () => <TextField label="Weight" type="number" unit="kg" defaultValue={12} /> };
export const Email: StoryObj = { render: () => <TextField label="Email" type="email" placeholder="name@example.com" /> };
export const Multiline: StoryObj = { render: () => <TextArea label="Notes" hint="Add details for your team." /> };
export const Select: StoryObj = { render: () => <SelectField label="Currency"><option>EUR</option><option>USD</option></SelectField> };
export const File: StoryObj = { render: () => <FileField label="Attachment" accept=".pdf" hint="PDF, up to 5 MB. The application checks the file before upload." /> };
export const Invalid: StoryObj = { render: () => <div style={{ display: 'grid', gap: 20 }}>
  <TextField label="Project name" error="Enter a project name." required />
  <TextArea label="Notes" error="Enter a note." />
  <SelectField label="Currency" error="Choose a currency."><option value="">Choose…</option><option>EUR</option></SelectField>
  <FileField label="Attachment" error="Choose a PDF smaller than 5 MB." />
</div> };
export const Disabled: StoryObj = { render: () => <div style={{ display: 'grid', gap: 20 }}>
  <TextField label="Project name" defaultValue="Example project" disabled />
  <TextArea label="Notes" defaultValue="Draft" disabled />
  <SelectField label="Currency" disabled><option>EUR</option></SelectField>
  <FileField label="Attachment" disabled />
</div> };
export const Hover: StoryObj = { ...Text };
export const Focus: StoryObj = { render: () => <TextField label="Project name" autoFocus /> };
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

export const Password: StoryObj = { render: () => <TextField label="Password" type="password" autoComplete="current-password" leadingIcon={<Icon name="lock" />} required /> };
export const Search: StoryObj = { render: () => <TextField label="Search components" type="search" placeholder="Search components…" leadingIcon={<Icon name="search" />} /> };
export const Composed: StoryObj = { render: () => <Field label="Due date" hint="Use the delivery date." required>{control => <input {...control} className="ui-input" type="date" />}</Field> };

// Keep the reference gallery's spacing for the removal review.
export const TextFields: StoryObj = { parameters: { layout: 'fullscreen' }, render: () => <div style={{ padding: 'var(--space-10)', minHeight: '100vh' }}><div style={{ maxWidth: 'var(--panel-md)', display: 'flex', flexDirection: 'column', gap: 22 }}>
  <TextField label="Work email" type="email" placeholder="you@example.com" leadingIcon={<Icon name="mail" />} required hint="Use your work email address." />
  <TextField label="Agent name" placeholder="e.g. Research bot" />
  <TextField label="Password" type="password" defaultValue="demo123" leadingIcon={<Icon name="lock" />} required />
  <TextField label="API token" defaultValue="demo-revoked-token" error="This token has already been revoked." />
  <TextField label="Disabled" placeholder="Read only" disabled />
</div></div> };
export const AdornedStates: StoryObj = { render: () => <div style={{ display: 'grid', gap: 'var(--space-5)' }}>
  <TextField label="Search components" type="search" leadingIcon={<Icon name="search" />} placeholder="Search components…" />
  <TextField label="Unavailable search" type="search" leadingIcon={<Icon name="search" />} defaultValue="Buttons" disabled />
  <TextField label="Password" type="password" leadingIcon={<Icon name="lock" />} hint="Use your account password." error="Enter your password." required />
  <TextField label="Weight" type="number" leadingIcon={<Icon name="cube" />} unit="kg" defaultValue={12} />
</div> };
