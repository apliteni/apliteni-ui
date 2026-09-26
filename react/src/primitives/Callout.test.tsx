import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { callout, icon } from '@apliteni/apliteni-ui';
import { Callout, type CalloutVariant } from './Callout';
import { Button } from './Button';

function expectSameSubtree(root: Element, html: string, variant?: CalloutVariant) {
  const template = document.createElement('template');
  template.innerHTML = html;
  const expected = template.content.firstElementChild!;
  expect(expected.hasAttribute('role')).toBe(false);
  // The only allowed difference is React's documented danger-root announcement.
  if (variant === 'danger') expected.setAttribute('role', 'alert');
  root = root.cloneNode(true) as Element;
  root.normalize();
  template.content.normalize();
  expect(root.isEqualNode(template.content.firstElementChild)).toBe(true);
}

it.each<CalloutVariant>(['neutral', 'info', 'success', 'warn', 'danger'])('matches the whole vanilla subtree for %s and announces only danger', variant => {
  const { container } = render(<Callout variant={variant}><b>Incomplete.</b> Check the period.</Callout>);
  const root = container.firstElementChild!;
  expectSameSubtree(root, callout({ variant, body: '<b>Incomplete.</b> Check the period.' }), variant);
  expect(root.getAttribute('role')).toBe(variant === 'danger' ? 'alert' : null);
  expect(root.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  expect(root.querySelector('b')).toHaveTextContent('Incomplete.');
});

it('matches the unmodified vanilla default and permits an icon override', () => {
  const { container, rerender } = render(<Callout>Saved.</Callout>);
  expectSameSubtree(container.firstElementChild!, callout({ body: 'Saved.' }));
  const defaultGlyph = container.querySelector('svg')!.innerHTML;
  rerender(<Callout icon="check">Saved.</Callout>);
  expect(container.querySelector('svg')!.innerHTML).not.toBe(defaultGlyph);
  expectSameSubtree(container.firstElementChild!, callout({ icon: 'check', body: 'Saved.' }));
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

it.each<[CalloutVariant, string]>([
  ['neutral', 'info'], ['info', 'info'], ['success', 'check'], ['warn', 'alert'], ['danger', 'alert'],
])('uses the %s tone glyph and shares vanilla actions markup', (variant, glyph) => {
  const { container } = render(
    <Callout variant={variant} actions={<button type="button">Review period</button>}>
      Read the <a href="#period">period notes</a>.
    </Callout>,
  );
  expectSameSubtree(container.firstElementChild!, callout({
    variant,
    body: 'Read the <a href="#period">period notes</a>.',
    actions: '<button type="button">Review period</button>',
  }), variant);
  expectSameSubtree(container.querySelector('svg')!, icon(glyph));
});

it.each([
  ['unexpected root role', 'info', '.ui-callout', 'role', 'alert'],
  ['wrong danger role', 'danger', '.ui-callout', 'role', 'status'],
  ['missing danger role', 'danger', '.ui-callout', 'role', null],
  ['unexpected root attribute', 'danger', '.ui-callout', 'aria-live', 'polite'],
  ['unexpected descendant role', 'danger', '.ui-callout__body', 'role', 'alert'],
] as const)('rejects %s in the parity comparison', (_name, variant, selector, attribute, value) => {
  const { container } = render(<Callout variant={variant}>Saved.</Callout>);
  const element = container.querySelector(selector)!;
  if (value === null) element.removeAttribute(attribute);
  else element.setAttribute(attribute, value);
  expect(() => expectSameSubtree(container.firstElementChild!, callout({ variant, body: 'Saved.' }), variant)).toThrow();
});
