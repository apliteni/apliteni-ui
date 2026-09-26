import type { Meta, StoryObj } from '@storybook/react';
import { TextField, TextArea, SelectField, FileField } from './Field';

const meta: Meta = { title: 'React/Fields', decorators: [Story => <div style={{ maxWidth: 420 }}><Story /></div>] };
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
