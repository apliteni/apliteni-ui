import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, vi } from 'vitest';
import axe from 'axe-core';
import { field, input, textarea, select } from '@apliteni/apliteni-ui';
import { TextField, TextArea, SelectField, FileField } from './Field';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it('keeps the vanilla field and control classes', () => {
  for (const [react, vanilla] of [
    [<TextField label="Name" hint="Help" />, field({ label: 'Name', hint: 'Help', control: input() })],
    [<TextArea label="Notes" />, field({ label: 'Notes', control: textarea() })],
    [<SelectField label="Currency"><option>EUR</option></SelectField>, field({ label: 'Currency', control: select({ options: ['EUR'] }) })],
  ] as const) {
    const { container, unmount } = render(react);
    const reference = document.createElement('div'); reference.innerHTML = vanilla;
    const classes = (root: Element) => Array.from(root.querySelectorAll('[class]'), el => el.className.trim());
    expect(classes(container)).toEqual(classes(reference));
    unmount();
  }
});

it('generates unique stable ids and replaces help with a linked error', () => {
  const { rerender } = render(<><TextField label="Name" hint="Help" required /><TextField label="Other" /></>);
  const control = screen.getByRole('textbox', { name: 'Name' });
  const id = control.id;
  expect(id).not.toBe(screen.getByLabelText('Other').id);
  expect(control).toBeRequired();
  expect(control).toHaveAccessibleDescription('Help');
  expect(document.querySelector('.ui-field__req')).toHaveAttribute('aria-hidden', 'true');
  rerender(<><TextField label="Name" hint="Help" error="Enter a name." required /><TextField label="Other" /></>);
  expect(control.id).toBe(id);
  expect(control).toHaveAttribute('aria-invalid', 'true');
  expect(control).toHaveAccessibleDescription('Enter a name.');
  expect(screen.queryByText('Help')).toBeNull();
  expect(document.querySelector('.ui-field__error svg')).not.toBeNull();
});

it('forwards native values, change events and number keyboard hints', async () => {
  const change = vi.fn();
  render(<><TextField label="Weight" type="number" unit="kg" onChange={change} /><TextArea label="Notes" defaultValue="Draft" /><SelectField label="Currency" defaultValue="USD"><option>EUR</option><option>USD</option></SelectField></>);
  const number = screen.getByLabelText('Weight');
  expect(number).toHaveAttribute('inputmode', 'decimal');
  expect(number).toHaveAccessibleDescription('kg');
  await userEvent.type(number, '12');
  expect(number).toHaveValue(12);
  expect(change).toHaveBeenCalled();
  expect(screen.getByLabelText('Notes')).toHaveValue('Draft');
  expect(screen.getByLabelText('Currency')).toHaveValue('USD');
});

it('chooses and replaces a file using the focusable native input', async () => {
  const change = vi.fn();
  render(<FileField label="Attachment" hint="PDF, up to 5 MB." accept=".pdf" onFileChange={change} required />);
  const control = screen.getByLabelText(/Attachment/) as HTMLInputElement;
  const user = userEvent.setup();
  await user.tab(); expect(control).toHaveFocus();
  expect(control).toBeRequired();
  expect(control).toHaveAccessibleDescription('PDF, up to 5 MB.');
  const first = new File(['first'], 'first.pdf', { type: 'application/pdf' });
  const next = new File(['next'], 'next.pdf', { type: 'application/pdf' });
  await user.upload(control, first);
  expect(change).toHaveBeenLastCalledWith(first);
  expect(screen.getByText('Replace file')).toBeInTheDocument();
  await user.upload(control, next);
  expect(control.files?.[0]).toBe(next);
  expect(screen.queryByText('first.pdf')).toBeNull();
  expect(screen.getByText('next.pdf')).toBeInTheDocument();
});

// JSDOM cannot open a system picker or supply a native DataTransfer.
it('handles drag feedback, single-file drops and disabled drops', () => {
  const change = vi.fn();
  const file = new File(['demo'], 'demo.pdf');
  class Transfer { files: File[] = []; items = { add: (item: File) => this.files.push(item) }; }
  vi.stubGlobal('DataTransfer', Transfer);
  const { container, rerender } = render(<FileField label="Attachment" onFileChange={change} />);
  const control = screen.getByLabelText('Attachment');
  Object.defineProperty(control, 'files', { writable: true, value: [] });
  const zone = container.querySelector('.ui-file')!;
  fireEvent.dragOver(zone); expect(zone).toHaveClass('is-dragging');
  fireEvent.dragLeave(zone); expect(zone).not.toHaveClass('is-dragging');
  fireEvent.drop(zone, { dataTransfer: { files: [file, new File([], 'ignored.pdf')] } });
  expect(change).toHaveBeenCalledExactlyOnceWith(file);
  expect((control as HTMLInputElement).files).toEqual([file]);
  expect(zone).toHaveClass('has-file');
  rerender(<FileField label="Attachment" disabled onFileChange={change} />);
  fireEvent.dragOver(zone); expect(zone).not.toHaveClass('is-dragging');
  fireEvent.drop(zone, { dataTransfer: { files: [file] } });
  expect(change).toHaveBeenCalledTimes(1);
  expect(control).toBeDisabled();
});

it('has no axe violations across the field variants', async () => {
  const { container } = render(<><TextField label="Name" required error="Enter a name." /><TextArea label="Notes" hint="Optional" /><SelectField label="Currency"><option>EUR</option></SelectField><FileField label="Attachment" hint="PDF, up to 5 MB." /></>);
  expect((await axe.run(container, { rules: { 'color-contrast': { enabled: false } } })).violations).toEqual([]);
});

it('clears the selected-file display when its native form resets', async () => {
  const { container } = render(<form><FileField label="Attachment" /><button type="reset">Reset</button></form>);
  const user = userEvent.setup();
  await user.upload(screen.getByLabelText('Attachment'), new File(['demo'], 'demo.pdf'));
  expect(screen.getByText('demo.pdf')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Reset' }));
  expect(screen.getByText('Choose file')).toBeInTheDocument();
  expect(container.querySelector('.ui-file')).not.toHaveClass('has-file');
});
