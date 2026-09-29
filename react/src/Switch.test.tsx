import { createRef, useState } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, vi } from 'vitest';
import axe from 'axe-core';
import { Switch } from './Switch';

afterEach(cleanup);

// JSDOM checks semantics and events; the browser evidence covers the track and focus ring.
it('uses a labelled native checkbox with controlled pointer and keyboard changes', async () => {
  function Example() {
    const [checked, setChecked] = useState(false);
    return <Switch label="Email notifications" checked={checked} onChange={event => setChecked(event.currentTarget.checked)} />;
  }
  const { container } = render(<Example />);
  const input = screen.getByRole('checkbox', { name: 'Email notifications' });
  const user = userEvent.setup();
  await user.click(container.querySelector('.ui-switch__track')!);
  expect(input).toBeChecked();
  input.focus();
  await user.keyboard(' ');
  expect(input).not.toBeChecked();
});

it('forwards its ref and native attributes and supports form submission and reset', async () => {
  const ref = createRef<HTMLInputElement>();
  const { container } = render(<form><Switch ref={ref} label="Notifications" name="email" value="weekly" defaultChecked
    required aria-describedby="hint" /><p id="hint">Weekly digest.</p><button type="reset">Reset</button></form>);
  const input = screen.getByLabelText('Notifications');
  expect(ref.current).toBe(input);
  expect(input).toBeRequired();
  expect(input).toHaveAccessibleDescription('Weekly digest.');
  expect(new FormData(container.querySelector('form')!).get('email')).toBe('weekly');
  const user = userEvent.setup();
  await user.tab(); expect(input).toHaveFocus();
  await user.keyboard(' '); expect(input).not.toBeChecked();
  await user.click(screen.getByRole('button')); expect(input).toBeChecked();
});

it('blocks disabled activation and omits disabled inputs from focus and form data', async () => {
  const change = vi.fn();
  const { container } = render(<form><Switch label="Off" name="off" disabled onChange={change} />
    <Switch label="On" name="on" defaultChecked disabled onChange={change} /><button>Next</button></form>);
  const user = userEvent.setup();
  await user.tab(); expect(screen.getByRole('button')).toHaveFocus();
  for (const track of container.querySelectorAll('.ui-switch__track')) await user.click(track);
  expect(screen.getByLabelText('Off')).not.toBeChecked();
  expect(screen.getByLabelText('On')).toBeChecked();
  expect(change).not.toHaveBeenCalled();
  expect([...new FormData(container.querySelector('form')!).keys()]).toEqual([]);
});

// Colour contrast and real screen-reader speech are outside this axe check.
it('has no axe violations in on, off and disabled states', async () => {
  const { container } = render(<><Switch label="Off" /><Switch label="On" defaultChecked />
    <Switch label="Off, disabled" disabled /><Switch label="On, disabled" defaultChecked disabled /></>);
  expect((await axe.run(container, { rules: { 'color-contrast': { enabled: false } } })).violations).toEqual([]);
});
