import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SelectedRows } from './SelectedRows';

const row = (name: string) => screen.getByRole('checkbox', { name: `Select ${name}` }).closest('tr') as HTMLElement;

// DOM only: what the table holds after each action. A browser measures the layout.
it('applies a pick to the selected rows at once and keeps them selected', async () => {
  render(<SelectedRows />);
  await userEvent.click(screen.getByRole('button', { name: 'Status' }));
  await userEvent.click(screen.getByRole('menuitem', { name: 'Archived' }));
  expect(within(row('Field guide')).getByText('Archived')).toBeInTheDocument();
  expect(within(row('Release notes')).getByText('Archived')).toBeInTheDocument();
  expect(within(row('Access checklist')).queryByText('Archived')).toBeNull();
  expect(screen.getByRole('checkbox', { name: 'Select Field guide' })).toBeChecked();
  expect(screen.getByRole('region', { name: 'Selected documents' })).toHaveTextContent('2 selected');
});

it('archives only the selected rows with one button', async () => {
  render(<SelectedRows />);
  await userEvent.click(screen.getByRole('button', { name: 'Archive' }));
  expect(within(row('Release notes')).getByText('Archived')).toBeInTheDocument();
  expect(within(row('Access checklist')).queryByText('Archived')).toBeNull();
  expect(screen.getByRole('checkbox', { name: 'Select Release notes' })).toBeChecked();
});

it('clears with Escape and sends the focus to Select all', async () => {
  render(<SelectedRows />);
  screen.getByRole('button', { name: 'Clear' }).focus();
  await userEvent.keyboard('{Escape}');
  expect(screen.queryByRole('region', { name: 'Selected documents' })).toBeNull();
  expect(document.activeElement).toBe(document.querySelector('thead input[type="checkbox"]'));
  expect(screen.getByRole('status', { name: '' })).toHaveTextContent('No documents selected');
});
