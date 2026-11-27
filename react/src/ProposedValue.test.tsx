import { useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import axe from 'axe-core';
import { ProposedValue, type ProposedValueProps } from './ProposedValue';
import { Field } from './Field';

// JSDOM holds the states, the acts, the names and the focus. The gradient's contrast is
// measured in src/styles/gradient-ink.test.js, and the layout in a browser.
afterEach(cleanup);

// Fabricated demo data.
const CATEGORIES = ['Groceries', 'Transport', 'Utilities'].map((label) => ({ label, value: label.toLowerCase() }));

function Harness(props: Partial<ProposedValueProps> & { start?: string; inField?: boolean }) {
  const { start, inField, ...rest } = props;
  const [value, setValue] = useState<string | number | undefined>(start);
  const control = (wiring: { id?: string } = {}) => (
    <ProposedValue items={CATEGORIES} value={value} onChange={setValue} ariaLabel={inField ? undefined : 'Category for Luz del Sur'}
      {...wiring} {...rest} />
  );
  return inField ? <Field label="Category">{(wiring) => control(wiring)}</Field> : control();
}

const trigger = () => document.querySelector<HTMLButtonElement>('[data-dropdown-trigger]');

it('set: a ghost select shows the value and nothing is proposed', () => {
  render(<Harness start="transport" proposed="utilities" />);
  expect(trigger()).toHaveClass('ui-dropdown__trigger', 'ui-dropdown__trigger--ghost');
  expect(trigger()).toHaveTextContent('Transport');
  expect(document.querySelector('.ui-proposed')).toBeNull();
});

it('empty: a ghost select shows None', () => {
  render(<Harness />);
  expect(trigger()).toHaveClass('ui-dropdown__trigger--ghost');
  expect(trigger()).toHaveTextContent('None');
});

it('proposed: the value in the gradient, then the check, then the dismiss mark, each named', () => {
  render(<Harness proposed="groceries" />);
  expect(trigger()).toBeNull();
  const group = screen.getByRole('group', { name: 'Category for Luz del Sur, suggested' });
  expect(group.querySelector('.ui-proposed__text')).toHaveTextContent('Groceries');
  const buttons = Array.from(group.querySelectorAll('button'));
  expect(buttons.map((b) => b.getAttribute('aria-label'))).toEqual(['Apply Groceries', 'Dismiss Groceries']);
  expect(buttons.map((b) => b.getAttribute('title'))).toEqual(['Apply Groceries', 'Dismiss Groceries']);
  expect(buttons[0].querySelector('svg path')?.getAttribute('d')).toBe('M20 6L9 17l-5-5');
});

it('the check sets the value, opens no menu and gives the select the focus', () => {
  const onChange = vi.fn();
  function Spy() {
    const [value, setValue] = useState<string | number | undefined>();
    return <ProposedValue items={CATEGORIES} value={value} proposed="groceries" ariaLabel="Category"
      onChange={(v) => { onChange(v); setValue(v); }} />;
  }
  render(<Spy />);
  fireEvent.click(screen.getByRole('button', { name: 'Apply Groceries' }));
  expect(onChange).toHaveBeenCalledExactlyOnceWith('groceries');
  expect(trigger()).toHaveTextContent('Groceries');
  expect(trigger()).toHaveAttribute('aria-expanded', 'false');
  expect(document.querySelector('.ui-dropdown')).not.toHaveClass('open');
  expect(trigger()).toHaveFocus();
});

it('the dismiss mark sets the field to None, changes no value and gives the select the focus', () => {
  const onChange = vi.fn();
  const onDismiss = vi.fn();
  render(<Harness proposed="groceries" onChange={onChange} onDismiss={onDismiss} />);
  fireEvent.click(screen.getByRole('button', { name: 'Dismiss Groceries' }));
  expect(onDismiss).toHaveBeenCalledOnce();
  expect(onChange).not.toHaveBeenCalled();
  expect(document.querySelector('.ui-proposed')).toBeNull();
  expect(trigger()).toHaveTextContent('None');
  expect(trigger()).toHaveAttribute('aria-expanded', 'false');
  expect(trigger()).toHaveFocus();
  // Outside a field the select reads its name and then its value, not its value alone.
  expect(screen.getByRole('button', { name: 'Category for Luz del Sur: None' })).toBe(trigger());
});

it('a new proposal after a dismissed one shows again', () => {
  const { rerender } = render(<ProposedValue items={CATEGORIES} proposed="groceries" ariaLabel="Category" onChange={() => {}} />);
  fireEvent.click(screen.getByRole('button', { name: 'Dismiss Groceries' }));
  rerender(<ProposedValue items={CATEGORIES} proposed="utilities" ariaLabel="Category" onChange={() => {}} />);
  expect(screen.getByRole('button', { name: 'Apply Utilities' })).toBeInTheDocument();
});

it('a dismissed proposal that comes back after another shows again', () => {
  const props = { items: CATEGORIES, ariaLabel: 'Category', onChange: () => {} };
  const { rerender } = render(<ProposedValue {...props} proposed="groceries" />);
  fireEvent.click(screen.getByRole('button', { name: 'Dismiss Groceries' }));
  rerender(<ProposedValue {...props} proposed="utilities" />);
  rerender(<ProposedValue {...props} proposed="groceries" />);
  expect(screen.getByRole('button', { name: 'Apply Groceries' })).toBeInTheDocument();
});

it('a proposal that no enabled option has shows the empty field', () => {
  const onChange = vi.fn();
  const items = CATEGORIES.map((it) => (it.value === 'utilities' ? { ...it, disabled: true } : it));
  for (const proposed of ['rent', 'utilities']) {
    const { unmount } = render(<Harness items={items} proposed={proposed} onChange={onChange} />);
    expect(document.querySelector('.ui-proposed')).toBeNull();
    expect(trigger()).toHaveTextContent('None');
    unmount();
  }
  expect(onChange).not.toHaveBeenCalled();
});

it('the None row clears a set value', () => {
  const onChange = vi.fn();
  render(<Harness start="transport" onChange={onChange} />);
  fireEvent.click(trigger()!);
  fireEvent.click(screen.getByRole('option', { name: 'None' }));
  expect(onChange).toHaveBeenCalledExactlyOnceWith(undefined);
});

it('a long value keeps its full words in the pointer title', () => {
  const long = 'Professional services and subscriptions';
  render(<ProposedValue items={[{ label: long, value: 'pro' }]} proposed="pro" ariaLabel="Category" onChange={() => {}} />);
  expect(document.querySelector('.ui-proposed__value')).toHaveAttribute('title', long);
  expect(screen.getByRole('button', { name: `Apply ${long}` })).toBeInTheDocument();
});

it('in a field the label names the group and the select, and the buttons are md', () => {
  render(<Harness inField proposed="groceries" />);
  expect(screen.getByRole('group', { name: 'Category suggested' })).toHaveClass('ui-proposed');
  expect(screen.getByRole('button', { name: 'Apply Groceries' })).not.toHaveClass('ui-btn--sm');
  fireEvent.click(screen.getByRole('button', { name: 'Apply Groceries' }));
  expect(trigger()).toHaveAccessibleName('Category Groceries');
});

it('outside a field the buttons are sm, the size of the row select', () => {
  render(<Harness proposed="groceries" />);
  expect(screen.getByRole('button', { name: 'Apply Groceries' })).toHaveClass('ui-btn--sm', 'ui-btn--secondary');
  expect(screen.getByRole('button', { name: 'Dismiss Groceries' })).toHaveClass('ui-btn--sm', 'ui-btn--ghost');
});

it('applyVariant="ghost" draws the check with no outline, as the dismiss mark is drawn', () => {
  render(<Harness proposed="groceries" applyVariant="ghost" />);
  const check = screen.getByRole('button', { name: 'Apply Groceries' });
  expect(check).toHaveClass('ui-btn--sm', 'ui-btn--ghost');
  expect(check).not.toHaveClass('ui-btn--secondary');
});

it('an invalid field keeps its invalid state while it is proposed', () => {
  render(<Harness proposed="groceries" aria-invalid />);
  expect(screen.getByRole('group')).toHaveAttribute('aria-invalid', 'true');
  fireEvent.click(screen.getByRole('button', { name: 'Dismiss Groceries' }));
  expect(trigger()).toHaveAttribute('aria-invalid', 'true');
});

it('each state passes axe', async () => {
  for (const props of [{ start: 'transport' }, {}, { proposed: 'groceries' }, { proposed: 'groceries', applyVariant: 'ghost' as const }, { proposed: 'groceries', 'aria-invalid': true }]) {
    const { container, unmount } = render(<Harness inField {...props} />);
    const result = await axe.run(container);
    expect(result.violations.map((v) => v.id)).toEqual([]);
    unmount();
  }
});
