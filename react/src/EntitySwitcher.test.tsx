// Checks the wrapper and inherited keyboard behavior; browser evidence covers appearance.
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { EntitySwitcher } from './EntitySwitcher';
import { Dropdown } from './Dropdown';

afterEach(cleanup);
const entities = [
  { id: 'north', name: 'North Studio', description: 'Design services' },
  { id: 'west', name: 'West Studio', description: 'History through 2025', archived: true },
];

it('uses the select dropdown shape and state badge', () => {
  const { container } = render(<EntitySwitcher entities={entities} value="west" onChange={() => {}} />);
  expect(screen.getByRole('button', { name: /Entity.*West Studio/ })).toHaveAttribute('aria-haspopup', 'listbox');
  expect(container.querySelector('.ui-dropdown__panel')).toHaveClass('is-end');
  expect(screen.getByRole('option', { name: /West Studio.*History through 2025.*Archived/ })).toHaveAttribute('aria-selected', 'true');
  expect(screen.getByText('Archived')).toHaveClass('ui-dropdown__badge', 'is-state');
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
});

it('reports an entity id and reflects the next value', () => {
  const onChange = vi.fn();
  const { rerender } = render(<EntitySwitcher entities={entities} value="north" onChange={onChange} />);
  fireEvent.click(screen.getByRole('button'));
  fireEvent.click(screen.getByRole('option', { name: /West Studio/ }));
  expect(onChange).toHaveBeenCalledExactlyOnceWith('west');
  rerender(<EntitySwitcher entities={entities} value="west" onChange={onChange} />);
  expect(screen.getByRole('button')).toHaveTextContent('West Studio');
  expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'false');
});

it('inherits arrows, Enter, Escape, focus return and Tab', () => {
  const onChange = vi.fn();
  render(<EntitySwitcher entities={entities} value="north" onChange={onChange} />);
  const trigger = screen.getByRole('button');
  trigger.focus();
  fireEvent.keyDown(trigger, { key: 'ArrowDown' });
  expect(screen.getByRole('option', { name: /North Studio/ })).toHaveFocus();
  fireEvent.keyDown(document.activeElement!, { key: 'ArrowDown' });
  fireEvent.keyDown(document.activeElement!, { key: 'Enter' });
  expect(onChange).toHaveBeenCalledWith('west');
  expect(trigger).toHaveFocus();
  fireEvent.keyDown(trigger, { key: 'ArrowDown' });
  fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
  expect(trigger).toHaveFocus();
  expect(trigger).toHaveAttribute('aria-expanded', 'false');
  fireEvent.keyDown(trigger, { key: 'ArrowDown' });
  fireEvent.keyDown(document.activeElement!, { key: 'Tab' });
  expect(trigger).toHaveAttribute('aria-expanded', 'false');
});

it('closes another dropdown when opened', () => {
  render(<><Dropdown triggerContent="Other" defaultOpen items={[{ label: 'One' }]} />
    <EntitySwitcher entities={entities} value="north" onChange={() => {}} /></>);
  fireEvent.click(screen.getByRole('button', { name: /Entity/ }));
  expect(screen.getByRole('button', { name: 'Other' })).toHaveAttribute('aria-expanded', 'false');
});
