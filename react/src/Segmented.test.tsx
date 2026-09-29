import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import axe from 'axe-core';
import { Segmented, type SegmentedProps } from './index';

const options = [
  { label: 'EN', value: 'en', ariaLabel: 'English' },
  { label: 'RU', value: 'ru', disabled: true },
  { label: 'ES', value: 'es', ariaLabel: 'Spanish' },
];
const props: SegmentedProps = { label: 'Language', options, value: 'en', onChange: () => {} };
// DOM semantics and interaction only; browser captures measure shared CSS sizing and colour.
it('preserves the default presentation and exposes both size and width modifiers', () => {
  const { rerender } = render(<Segmented {...props} />);
  const toolbar = screen.getByRole('toolbar', { name: 'Language' });
  expect(toolbar).toHaveAttribute('class', 'ui-seg');
  rerender(<Segmented {...props} size="sm" block appearance="underline" />);
  expect(toolbar).toHaveClass('ui-seg--sm', 'ui-seg--block', 'ui-seg--underline');
  rerender(<Segmented {...props} />);
  expect(toolbar).toHaveAttribute('class', 'ui-seg');
});

it.each([
  {}, { size: 'sm' }, { block: true }, { size: 'sm', block: true },
  { appearance: 'underline', size: 'sm', block: true },
] satisfies Partial<SegmentedProps>[])('keeps controlled selection, keyboard focus and disabled skipping with %j', async presentation => {
  function Example() {
    const [value, onChange] = useState('en');
    return <Segmented {...props} {...presentation} value={value} onChange={onChange} />;
  }
  render(<Example />);
  const user = userEvent.setup();
  const english = screen.getByRole('button', { name: 'English' });
  const spanish = screen.getByRole('button', { name: 'Spanish' });
  await user.tab();
  expect(english).toHaveFocus();
  expect(english).toHaveTextContent('EN');
  await user.keyboard('{ArrowRight}');
  expect(spanish).toHaveFocus();
  expect(spanish).toHaveAttribute('aria-pressed', 'true');
  expect(english).toHaveAttribute('tabindex', '-1');
  await user.keyboard('{ArrowRight}');
  expect(english).toHaveFocus();
  await user.keyboard('{ArrowLeft}');
  expect(spanish).toHaveFocus();
  await user.keyboard('{Home}');
  expect(english).toHaveFocus();
  await user.keyboard('{End}');
  expect(spanish).toHaveFocus();
  await user.click(english);
  expect(english).toHaveAttribute('aria-pressed', 'true');
  expect(spanish).toHaveAttribute('aria-pressed', 'false');
  await user.tab();
  expect(document.body).toHaveFocus();
});

it('reports a choice without changing the value owned by the caller or submitting a form', async () => {
  const onChange = vi.fn();
  const onSubmit = vi.fn(e => e.preventDefault());
  render(<form onSubmit={onSubmit}><Segmented {...props} size="sm" block onChange={onChange} /></form>);
  await userEvent.click(screen.getByRole('button', { name: 'Spanish' }));
  expect(onChange).toHaveBeenCalledExactlyOnceWith('es');
  expect(screen.getByRole('button', { name: 'English' })).toHaveAttribute('aria-pressed', 'true');
  expect(onSubmit).not.toHaveBeenCalled();
});

it('prevents clicks and tab entry when the whole control is disabled', async () => {
  const onChange = vi.fn();
  render(<Segmented {...props} size="sm" block disabled onChange={onChange} />);
  for (const button of screen.getAllByRole('button')) {
    expect(button).toBeDisabled();
    await userEvent.click(button);
  }
  await userEvent.tab();
  expect(document.body).toHaveFocus();
  expect(onChange).not.toHaveBeenCalled();
});

it.each(['ru', 'missing'])('makes the first enabled choice tabbable when selected value is %s', value => {
  render(<Segmented {...props} size="sm" block value={value} />);
  expect(screen.getByRole('button', { name: 'English' })).toHaveAttribute('tabindex', '0');
  expect(screen.getAllByRole('button').filter(button => button.tabIndex === 0)).toHaveLength(1);
});

it.each([{ options: [] }, { options: options.map(option => ({ ...option, disabled: true })) }])('allows no enabled options without adding a tab stop', ({ options }) => {
  render(<Segmented {...props} options={options} size="sm" block />);
  expect(screen.queryAllByRole('button').filter(button => button.tabIndex === 0)).toHaveLength(0);
});

it('has accessible toolbar and pressed-button semantics in the small block presentation', async () => {
  const { container } = render(<Segmented {...props} size="sm" block />);
  // axe in jsdom cannot measure colour contrast or pointer target geometry.
  const result = await axe.run(container, { rules: { 'color-contrast': { enabled: false } } });
  expect(result.violations).toEqual([]);
});
