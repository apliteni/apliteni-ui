// JSDOM checks semantics and input behavior; browser evidence covers paint and focus rings.
import { createRef, useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderToString } from 'react-dom/server';
import { wireTopbar } from '@apliteni/apliteni-ui';
import { AccentPicker, type Accent } from './AccentPicker';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

it('names the group and all four choices, exposing exactly one pressed button', () => {
  render(<AccentPicker value="default" onChange={() => {}} />);
  expect(screen.getByRole('group', { name: 'Accent' })).toBeVisible();
  for (const name of ['Default', 'Phoenix', 'Ocean', 'Emerald']) {
    const button = screen.getByRole('button', { name: `${name} accent` });
    expect(button).toHaveAttribute('type', 'button');
    expect(button).toHaveAttribute('title', name);
  }
  expect(screen.getAllByRole('button', { pressed: true })).toHaveLength(1);
  expect(screen.getByRole('button', { pressed: true })).toHaveAccessibleName('Default accent');
});

it('reports choices and only changes selection when the host supplies a new value', () => {
  const onChange = vi.fn();
  const { rerender } = render(<AccentPicker value="default" onChange={onChange} />);
  fireEvent.click(screen.getByRole('button', { name: 'Ocean accent' }));
  expect(onChange).toHaveBeenCalledExactlyOnceWith('ocean');
  expect(screen.getByRole('button', { pressed: true })).toHaveAccessibleName('Default accent');
  rerender(<AccentPicker value="ocean" onChange={onChange} />);
  expect(screen.getByRole('button', { pressed: true })).toHaveAccessibleName('Ocean accent');
  expect(screen.getByRole('button', { pressed: true })).toHaveClass('is-active');
  expect(screen.getByRole('button', { name: 'Default accent' })).not.toHaveClass('is-active');
});

it('supports Tab, Shift+Tab, Enter and Space while retaining focus and avoiding form submission', async () => {
  const user = userEvent.setup();
  const submit = vi.fn();
  function Host() {
    const [value, setValue] = useState<Accent>('default');
    return <form onSubmit={submit}><AccentPicker value={value} onChange={setValue} /><button>Save</button></form>;
  }
  render(<Host />);
  await user.tab();
  expect(screen.getByRole('button', { name: 'Default accent' })).toHaveFocus();
  await user.tab();
  await user.keyboard('{Enter}');
  expect(screen.getByRole('button', { name: 'Phoenix accent', pressed: true })).toHaveFocus();
  await user.tab();
  await user.keyboard(' ');
  expect(screen.getByRole('button', { name: 'Ocean accent', pressed: true })).toHaveFocus();
  await user.tab({ shift: true });
  expect(screen.getByRole('button', { name: 'Phoenix accent' })).toHaveFocus();
  expect(submit).not.toHaveBeenCalled();
});

it('keeps the supplied option order and supports a value outside the available subset', () => {
  const { rerender } = render(<AccentPicker value="ocean" options={['emerald', 'ocean']} onChange={() => {}} />);
  expect(screen.getAllByRole('button').map(button => button.title)).toEqual(['Emerald', 'Ocean']);
  rerender(<AccentPicker value="default" options={['emerald', 'ocean']} onChange={() => {}} />);
  expect(screen.queryByRole('button', { pressed: true })).toBeNull();
});

it('forwards the group ref, attributes and class and accepts an empty option list', () => {
  const ref = createRef<HTMLDivElement>();
  render(<AccentPicker ref={ref} id="palette" className="host" aria-label="Report accent" options={[]} value="default" onChange={() => {}} />);
  expect(ref.current).toBe(screen.getByRole('group', { name: 'Report accent' }));
  expect(ref.current).toHaveClass('ui-accent-picker', 'host');
  expect(ref.current).toHaveAttribute('id', 'palette');
  expect(screen.queryByRole('button')).toBeNull();
});

it('leaves page accent and persistence to the host', () => {
  const before = document.documentElement.getAttribute('data-accent');
  const read = vi.spyOn(Storage.prototype, 'getItem');
  const write = vi.spyOn(Storage.prototype, 'setItem');
  const { unmount } = render(<AccentPicker value="default" onChange={() => {}} />);
  fireEvent.click(screen.getByRole('button', { name: 'Emerald accent' }));
  unmount();
  expect(document.documentElement.getAttribute('data-accent')).toBe(before);
  expect(read).not.toHaveBeenCalled();
  expect(write).not.toHaveBeenCalled();
});

// The measured bug this component is shaped against: wireTopbar(root = document)
// binds its own handler to every [data-accent-pick] in the document, applies the
// accent and persists it. A half-migrated page must call it to wire its vanilla
// footer, and React never repairs the DOM it owns afterwards because `value`
// never changed. Dropdown and Drawer omit their hooks for the same reason.
it('is not adopted by wireTopbar on a half-migrated page', () => {
  const before = document.documentElement.getAttribute('data-accent');
  const write = vi.spyOn(Storage.prototype, 'setItem');
  const onChange = vi.fn();
  render(<AccentPicker value="ocean" onChange={onChange} />);
  wireTopbar(document);
  fireEvent.click(screen.getByRole('button', { name: 'Emerald accent' }));
  expect(onChange).toHaveBeenCalledExactlyOnceWith('emerald');
  expect(document.documentElement.getAttribute('data-accent')).toBe(before);
  expect(write).not.toHaveBeenCalled();
  // The host ignored onChange, so the pressed swatch must still be the one the
  // `value` prop names — not whichever one a vanilla handler last clicked.
  expect(screen.getByRole('button', { pressed: true })).toHaveAccessibleName('Ocean accent');
  expect(screen.getByRole('button', { name: 'Emerald accent' })).not.toHaveClass('is-active');
});

it('renders on the server', () => {
  expect(renderToString(<AccentPicker value="ocean" onChange={() => {}} />)).toContain('Ocean accent');
});

it.each(['default', 'phoenix', 'ocean', 'emerald'] as const)('has no axe violations with %s selected', async value => {
  const { default: axe } = await import('axe-core');
  const { container } = render(<AccentPicker value={value} onChange={() => {}} />);
  expect((await axe.run(container, { rules: { 'color-contrast': { enabled: false } } })).violations).toEqual([]);
});
