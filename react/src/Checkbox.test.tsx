import { createRef, useState } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, vi } from 'vitest';
import axe from 'axe-core';
import { Checkbox, CheckList } from './Checkbox';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
// The floor's arithmetic and size, shared from plain JS outside this workspace's tsconfig.
// @ts-expect-error -- untyped JS module, deliberately shared with the accessibility-floor gate.
import { STYLE_FILES } from '../../stories/lib/contrast.js';
// @ts-expect-error -- untyped JS module, deliberately shared with the accessibility-floor gate.
import { decomment, probeGeometry, boxOf, glyphOf, windowFor } from '../../stories/lib/target-geometry.js';
// @ts-expect-error -- untyped JS module, deliberately shared with the accessibility-floor gate.
import { TARGET_MIN } from '../../stories/guidelines/_accessibility-floor.js';

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

it('links a hint to its box and keeps the label as the name', () => {
  render(<Checkbox label="Invoices" hint="A message when an invoice is paid." aria-describedby="extra" />);
  const input = screen.getByRole('checkbox', { name: 'Invoices' });
  expect(input).toHaveAccessibleDescription(/A message when an invoice is paid\./);
  const hint = screen.getByText('A message when an invoice is paid.');
  expect(hint).toHaveClass('ui-check__hint');
  expect(input.getAttribute('aria-describedby')).toBe(`extra ${hint.id}`);
  expect(input.closest('label')).not.toContainElement(hint);
});

it('adds no wrapper and no description when there is no hint', () => {
  const { container } = render(<Checkbox label="Read" />);
  expect(container.firstElementChild).toHaveClass('ui-check');
  expect(screen.getByRole('checkbox')).not.toHaveAttribute('aria-describedby');
});

it('groups boxes in a fieldset under a legend and passes disabled to the group', async () => {
  const change = vi.fn();
  render(<CheckList legend="Notify me about" disabled>
    <Checkbox label="Invoices" hint="When one is paid." onChange={change} />
    <Checkbox label="News" />
  </CheckList>);
  const group = screen.getByRole('group', { name: 'Notify me about' });
  expect(group.tagName).toBe('FIELDSET');
  expect(group.querySelector('legend')).toHaveClass('ui-field__label');
  expect(screen.getByLabelText('Invoices')).toBeDisabled();
  await userEvent.click(screen.getByText('Invoices'));
  expect(change).not.toHaveBeenCalled();
});

it('keeps a disabled box and its hint disabled together', () => {
  render(<Checkbox label="Alerts" hint="Always on." defaultChecked disabled />);
  const input = screen.getByRole('checkbox', { name: 'Alerts' });
  expect(input).toBeDisabled();
  expect(input).toBeChecked();
  expect(input).toHaveAccessibleDescription('Always on.');
  expect(input.closest('.ui-check-item')).toContainElement(screen.getByText('Always on.'));
});

it('has no axe violations for a list with hints', async () => {
  const { container } = render(<CheckList legend="Notify me about">
    <Checkbox label="Invoices" hint="When one is paid." defaultChecked />
    <Checkbox label="Alerts" hint="Always on." disabled />
  </CheckList>);
  expect((await axe.run(container, { rules: { 'color-contrast': { enabled: false } } })).violations).toEqual([]);
});

// Limits: JSDOM resolves no pixels, so this reads the overlay's declared size through the
// floor gate's probe, and a hint's own height is not part of the target. The vanilla walk
// in stories/guidelines/accessibility-floor.test.js keeps one control per tag and class list,
// so a list with hints is measured here, on the markup React renders, in each theme.
const readLocal = (rel: string) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');
const kitSheet = () => decomment(STYLE_FILES.map((rel: string) => readLocal('../../' + rel)).join('\n'));

for (const theme of ['dark', 'light']) {
  it(`reaches ${TARGET_MIN}px on every box in a list with hints in ${theme}`, () => {
    const { container } = render(<CheckList legend="Notify me about">
      <Checkbox label="Invoices" hint="A message when an invoice is paid." defaultChecked />
      <Checkbox label="Weekly summary" hint="Totals for the week." />
      <Checkbox label="Product news" />
      <Checkbox label="Security alerts" hint="Always on." defaultChecked disabled />
    </CheckList>);
    // React sets checked and disabled as properties, so write them as the attributes a page carries.
    container.querySelectorAll('input').forEach((input) => {
      if (input.checked) input.setAttribute('checked', '');
      if (input.disabled) input.setAttribute('disabled', '');
    });
    const win = windowFor(theme, probeGeometry(kitSheet()));
    win.document.body.innerHTML = container.innerHTML;
    const boxes = [...win.document.body.querySelectorAll('fieldset .ui-check input')] as HTMLInputElement[];
    expect(boxes.length, 'the list lost a box, so the measurement covers fewer than it claims').toBe(4);
    expect(win.document.body.querySelectorAll('.ui-check__hint').length).toBeGreaterThanOrEqual(3);
    for (const el of boxes) {
      const box = boxOf(el, win.getComputedStyle(el), glyphOf(el, win));
      const name = el.closest('label')!.textContent;
      expect(box.unreadable, `${name}: an overlay this gate cannot read`).toEqual([]);
      expect(box.height, `${name}: ${box.height}px high`).toBeGreaterThanOrEqual(TARGET_MIN);
      expect(box.width, `${name}: ${box.width}px wide`).toBeGreaterThanOrEqual(TARGET_MIN);
      expect(box.drawn.height, `${name}: the drawn box already reaches the floor, so the overlay is not what is measured`).toBeLessThan(TARGET_MIN);
    }
  });
}
