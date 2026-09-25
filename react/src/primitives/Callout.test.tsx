import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { callout } from '@apliteni/apliteni-ui';
import { Callout, type CalloutVariant } from './Callout';
import { Button } from './Button';
import { classesOf, classesOfEl } from '../test/classlist';

it.each<CalloutVariant>(['neutral', 'info', 'success', 'warn', 'danger'])('matches vanilla classes for %s and announces only danger', variant => {
  const { container } = render(<Callout variant={variant}><b>Incomplete.</b> Check the period.</Callout>);
  const root = container.firstElementChild!;
  expect(classesOfEl(root)).toEqual(classesOf(callout({ variant, body: 'Check the period.' })));
  expect(root.getAttribute('role')).toBe(variant === 'danger' ? 'alert' : null);
  expect(root.querySelector('.ui-callout__icon')).toHaveAttribute('aria-hidden', 'true');
  expect(root.querySelector('b')).toHaveTextContent('Incomplete.');
});

it('matches the unmodified vanilla default and permits an icon override', () => {
  const { container, rerender } = render(<Callout>Saved.</Callout>);
  expect(classesOfEl(container.firstElementChild!)).toEqual(classesOf(callout({ body: 'Saved.' })));
  const defaultGlyph = container.querySelector('svg')!.innerHTML;
  rerender(<Callout icon="check">Saved.</Callout>);
  expect(container.querySelector('svg')!.innerHTML).not.toBe(defaultGlyph);
  expect(container.querySelector('.ui-callout__icon')).toHaveAttribute('aria-hidden', 'true');
});

it('keeps body links and action buttons in normal keyboard order', async () => {
  const user = userEvent.setup();
  const action = vi.fn();
  const { getByRole } = render(
    <Callout actions={<Button size="sm" onClick={action}>Review period</Button>}>
      <b>Incomplete.</b> Read the <a href="#period">period notes</a>.
    </Callout>,
  );
  await user.tab();
  expect(getByRole('link')).toHaveFocus();
  await user.tab();
  expect(getByRole('button', { name: 'Review period' })).toHaveFocus();
  await user.keyboard('{Enter}');
  expect(action).toHaveBeenCalledOnce();
});
