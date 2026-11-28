import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SelectedRows } from './SelectedRows';
import { vi } from 'vitest';
afterEach(() => { vi.restoreAllMocks(); });

const row = (name: string) => screen.getByRole('checkbox', { name: `Select ${name}` }).closest('tr') as HTMLElement;

// DOM only: what the table holds after each action, and the notice that says so. A browser
// measures the layout.
it('applies a pick to the selected rows at once, keeps them selected and says what changed', async () => {
  render(<SelectedRows />);
  await userEvent.click(screen.getByRole('button', { name: 'Status' }));
  await userEvent.click(screen.getByRole('menuitem', { name: 'Archived' }));
  expect(within(row('Field guide')).getByText('Archived')).toBeInTheDocument();
  expect(within(row('Release notes')).getByText('Archived')).toBeInTheDocument();
  expect(within(row('Access checklist')).queryByText('Archived')).toBeNull();
  expect(screen.getByRole('checkbox', { name: 'Select Field guide' })).toBeChecked();
  expect(screen.getByRole('region', { name: 'Selected documents' })).toHaveTextContent('2 selected');
  const notice = screen.getByText('Status: Archived').closest('[role="status"]');
  expect(notice).toHaveAttribute('aria-live', 'polite');
  expect(notice).toHaveTextContent('Updated 2 documents.');
});

it('archives only the selected rows with one button', async () => {
  render(<SelectedRows />);
  await userEvent.click(screen.getByRole('button', { name: 'Archive' }));
  expect(within(row('Release notes')).getByText('Archived')).toBeInTheDocument();
  expect(within(row('Access checklist')).queryByText('Archived')).toBeNull();
  expect(screen.getByRole('checkbox', { name: 'Select Release notes' })).toBeChecked();
  expect(screen.getByText('Archived 2 documents.').closest('[role="status"]')).toHaveAttribute('aria-live', 'polite');
});

it('clears with Escape and sends the focus to Select all', async () => {
  render(<SelectedRows />);
  screen.getByRole('button', { name: 'Clear' }).focus();
  await userEvent.keyboard('{Escape}');
  expect(screen.queryByRole('region', { name: 'Selected documents' })).toBeNull();
  expect(document.activeElement).toBe(document.querySelector('thead input[type="checkbox"]'));
  expect(screen.getByRole('status', { name: '' })).toHaveTextContent('No documents selected');
});

// On a short page the bar stands under the last row, above the bottom of the view, so the
// notices stand on the top of its room and not on the room's height. jsdom lays nothing out,
// so the room's top is given.
it('stands the notices on the top of the bar\'s room, wherever the room stands', async () => {
  const box = HTMLElement.prototype.getBoundingClientRect;
  let top = innerHeight - 80;
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    return this.classList.contains('ui-selection-room') ? ({ top, bottom: top + 80, height: 80, width: 300, left: 0, right: 300, x: 0, y: top, toJSON: () => ({}) } as DOMRect) : box.call(this);
  });
  render(<SelectedRows />);
  await userEvent.click(screen.getByRole('button', { name: 'Archive' }));
  const stack = () => screen.getByText('Archived 2 documents.').closest('.ui-toast-stack') as HTMLElement;
  expect(stack().style.bottom).toBe('80px');
  top = innerHeight - 300;
  act(() => { dispatchEvent(new Event('scroll')); });
  expect(stack().style.bottom).toBe('300px');
});
