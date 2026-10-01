import { createRef, useState } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, vi } from 'vitest';
import axe from 'axe-core';
import { Checkbox } from './Checkbox';

afterEach(cleanup);

// JSDOM verifies native wiring and user-event keyboard behavior, not browser paint or spoken output.
it('labels a checkbox and supports pointer, Space and controlled updates', async () => {
  const change = vi.fn();
  function Example() {
    const [checked, setChecked] = useState(false);
    return <Checkbox label="Read the strategy deck" checked={checked} onChange={event => {
      setChecked(event.currentTarget.checked); change(event.currentTarget.checked);
    }} />;
  }
  render(<Example />);
  const input = screen.getByRole('checkbox', { name: 'Read the strategy deck' });
  const user = userEvent.setup();
  await user.click(screen.getByText('Read the strategy deck'));
  expect(input).toBeChecked();
  await user.keyboard(' ');
  expect(input).not.toBeChecked();
  expect(change.mock.calls).toEqual([[true], [false]]);
});

it('forwards a native ref, attributes, description and form value', () => {
  const ref = createRef<HTMLInputElement>();
  const { container } = render(<form><Checkbox ref={ref} id="read" label="Read" name="scope" value="read" required
    defaultChecked aria-describedby="hint" className="consumer-control" /><p id="hint">Read access only.</p></form>);
  const input = screen.getByRole('checkbox', { name: 'Read' });
  expect(ref.current).toBe(input);
  ref.current?.focus();
  expect(input).toHaveFocus();
  expect(input).toBeRequired();
  expect(input).toHaveAccessibleDescription('Read access only.');
  expect(input).toHaveClass('consumer-control');
  expect(input.closest('label')).toHaveClass('ui-check');
  expect(new FormData(container.querySelector('form')!).get('scope')).toBe('read');
});

it('resets uncontrolled state with its form and skips disabled controls', async () => {
  const change = vi.fn();
  render(<form><Checkbox label="Read" defaultChecked /><Checkbox label="Unavailable" disabled onChange={change} />
    <button type="reset">Reset</button></form>);
  const user = userEvent.setup();
  await user.tab(); expect(screen.getByLabelText('Read')).toHaveFocus();
  await user.keyboard(' '); expect(screen.getByLabelText('Read')).not.toBeChecked();
  await user.tab(); expect(screen.getByRole('button')).toHaveFocus();
  await user.click(screen.getByText('Unavailable'));
  expect(change).not.toHaveBeenCalled();
  expect(screen.getByLabelText('Unavailable')).not.toBeChecked();
  await user.click(screen.getByRole('button'));
  expect(screen.getByLabelText('Read')).toBeChecked();
});

it('keeps a controlled radio group exclusive and navigates past disabled options', async () => {
  function Example() {
    const [value, setValue] = useState('read');
    return <fieldset><legend>Scope</legend>{['read', 'comment', 'full'].map(option =>
      <Checkbox key={option} type="radio" name="scope" value={option} label={option} disabled={option === 'comment'}
        checked={value === option} onChange={event => setValue(event.currentTarget.value)} />)}</fieldset>;
  }
  render(<Example />);
  const user = userEvent.setup();
  await user.tab(); expect(screen.getByLabelText('read')).toHaveFocus();
  await user.keyboard('{ArrowRight}');
  expect(screen.getByLabelText('full')).toHaveFocus();
  expect(screen.getByLabelText('full')).toBeChecked();
  expect(screen.getByLabelText('read')).not.toBeChecked();
  await user.keyboard('{ArrowRight}'); expect(screen.getByLabelText('read')).toBeChecked();
  await user.click(screen.getByText('full')); expect(screen.getByLabelText('full')).toBeChecked();
});

it('leaves differently named radio groups independent', async () => {
  render(<><Checkbox type="radio" label="First" name="one" defaultChecked />
    <Checkbox type="radio" label="Second" name="two" /><Checkbox type="radio" label="Third" name="two" /></>);
  await userEvent.click(screen.getByLabelText('Second'));
  expect(screen.getByLabelText('First')).toBeChecked();
  expect(screen.getByLabelText('Second')).toBeChecked();
  await userEvent.click(screen.getByLabelText('Third'));
  expect(screen.getByLabelText('First')).toBeChecked();
  expect(screen.getByLabelText('Second')).not.toBeChecked();
});

// Contrast is measured by the story walk; axe here checks semantics and names.
it('has no axe violations for checkbox, radio and disabled states', async () => {
  const { container } = render(<><Checkbox label="Read" /><Checkbox label="Selected" defaultChecked disabled />
    <fieldset><legend>Scope</legend><Checkbox type="radio" name="scope" label="Read only" defaultChecked />
      <Checkbox type="radio" name="scope" label="Full access" /></fieldset></>);
  expect((await axe.run(container, { rules: { 'color-contrast': { enabled: false } } })).violations).toEqual([]);
});
