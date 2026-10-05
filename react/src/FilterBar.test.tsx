import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState, type ReactNode } from 'react';
import { vi } from 'vitest';
import { FilterBar, type Filter } from './FilterBar';

const filters: Filter[] = ['Region', 'Status'].map(label => ({ id: label, label, value: 'All', items: [{ label: 'All', value: 'all' }, { label: 'Active', value: 'active' }] }));
const callbacks = () => ({ onRemove: vi.fn(), onClear: vi.fn(), onChange: vi.fn() });
// DOM behavior only; Dropdown owns keyboard coverage and these tests do not measure appearance.
it('requests changes and preserves controlled filters', async () => {
  const props = callbacks();
  render(<FilterBar filters={filters} {...props} />);
  await userEvent.click(screen.getByRole('button', { name: 'Region: All' }));
  await userEvent.keyboard('{End}{Enter}');
  expect(props.onChange).toHaveBeenCalledWith('Region', 'active');
  await userEvent.click(screen.getByRole('button', { name: 'Remove Region filter' }));
  expect(props.onRemove).toHaveBeenCalledWith('Region');
  expect(screen.getByRole('button', { name: 'Region: All' })).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Clear all filters' }));
  expect(props.onClear).toHaveBeenCalledTimes(1);
});
// DOM only: which control is rendered, not how it looks.
it('offers the clear action only once there is something to clear', () => {
  const props = callbacks();
  const { rerender } = render(<FilterBar filters={[]} {...props} />);
  expect(screen.queryByRole('button', { name: 'Clear all filters' })).not.toBeInTheDocument();
  rerender(<FilterBar filters={filters} {...props} />);
  const clear = screen.getByRole('button', { name: 'Clear all filters' });
  expect(clear).toBeEnabled();
  // The bordered skin, as the vanilla factory writes it; the class, not the colour.
  expect(clear).toHaveClass('ui-btn--secondary');
  expect(clear).not.toHaveClass('ui-btn--ghost');
});
// DOM text and names only; these do not measure appearance.
it('prints the chosen value alone and names the field it filters', () => {
  const props = callbacks();
  render(<FilterBar filters={[{ id: 'status', label: 'Status', value: 'Active', items: [] }, { id: 'region', label: 'Region', items: [] }]} {...props} />);
  expect(screen.getByRole('button', { name: 'Status: Active' })).toHaveTextContent(/^Active$/);
  expect(screen.getByRole('button', { name: 'Region: any' })).toHaveTextContent(/^Region$/);
  expect(document.querySelector('.ui-dropdown__pre')).toBeNull();
});
// The class the sheet paints with --muted; appearance itself is not measured here.
it('marks the valueless chip so the sheet can give it the placeholder ink', () => {
  const props = callbacks();
  render(<FilterBar filters={[{ id: 'status', label: 'Status', value: 'Active', items: [] }, { id: 'region', label: 'Region', items: [] }]} {...props} />);
  const marked = document.querySelectorAll('.ui-dropdown__value.is-placeholder');
  expect(marked).toHaveLength(1);
  expect(marked[0]).toHaveTextContent('Region');
});
// A bar beside the caller's own action, which is how both showcases compose it.
// `between` stands something else in the gap, to be walked past.
function Example({ start = filters, between }: { start?: Filter[]; between?: ReactNode }) {
  const [items, setItems] = useState(start);
  return <><FilterBar filters={items} onRemove={id => setItems(items.filter(f => f.id !== id))} onClear={() => setItems([])} onChange={() => setItems(items.map(f => ({ ...f, value: 'Active' })))} />
    {between}<button type="button">Add filter</button></>;
}
it('preserves focused controls across updates and moves focus after removal', async () => {
  render(<Example />);
  await userEvent.click(screen.getByRole('button', { name: 'Remove Region filter' }));
  expect(screen.getByRole('button', { name: 'Status: All' })).toHaveFocus();
  // Which control holds the focus, not whether it draws a box: JSDOM has no
  // layout. The emptied fieldset measuring 0 high is measured in a browser and
  // reported in the pull request.
  await userEvent.click(screen.getByRole('button', { name: 'Remove Status filter' }));
  expect(screen.getByRole('button', { name: 'Add filter' })).toHaveFocus();
});
it('hands the focus to the action beside it when clearing empties the bar', async () => {
  render(<Example />);
  await userEvent.click(screen.getByRole('button', { name: 'Clear all filters' }));
  expect(screen.queryByRole('button', { name: 'Clear all filters' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Add filter' })).toHaveFocus();
});
// Each of these leaves a tab stop in the document, with a box a browser can still
// measure, that refuses `focus()`. Handed the focus it drops the request silently
// and the focus ends on BODY — no ring on anything, the next Tab starting over at
// the top of the page — with Add filter standing there available the whole time.
const OUT_OF_REACH: Record<string, ReactNode> = {
  'hidden itself': <fieldset><button type="button" hidden>Export</button></fieldset>,
  'inside a hidden ancestor': <fieldset hidden><button type="button">Export</button></fieldset>,
  'visibility: hidden': <fieldset><button type="button" style={{ visibility: 'hidden' }}>Export</button></fieldset>,
  'inside a visibility: hidden ancestor': <fieldset style={{ visibility: 'hidden' }}><button type="button">Export</button></fieldset>,
  'display: none': <fieldset><button type="button" style={{ display: 'none' }}>Export</button></fieldset>,
  inert: <fieldset><button type="button" inert>Export</button></fieldset>,
  'inside an inert ancestor': <fieldset inert><button type="button">Export</button></fieldset>,
  disabled: <fieldset><button type="button" disabled>Export</button></fieldset>,
  'inside a disabled fieldset': <fieldset disabled><button type="button">Export</button></fieldset>,
  'out of the tab order': <fieldset><button type="button" tabIndex={-1}>Export</button></fieldset>,
};
it.each(Object.keys(OUT_OF_REACH))('walks past a next control that is %s', async how => {
  render(<Example between={OUT_OF_REACH[how]} />);
  await userEvent.click(screen.getByRole('button', { name: 'Clear all filters' }));
  expect(screen.getByRole('button', { name: 'Add filter' })).toHaveFocus();
});
// The belt the list above is the braces for. `focus()` is a request: a control can
// be visible, enabled, in the tab order and still not take it, and nothing throws
// when it does not. So the bar checks where the focus actually landed.
it('passes over a control that is asked for the focus and does not take it', async () => {
  render(<Example between={<button type="button">Export</button>} />);
  const refuses = screen.getByRole('button', { name: 'Export' });
  Object.defineProperty(refuses, 'focus', { value: () => {} });
  await userEvent.click(screen.getByRole('button', { name: 'Clear all filters' }));
  expect(screen.getByRole('button', { name: 'Add filter' })).toHaveFocus();
});
// The other end of it: with nothing reachable beside the bar there is nothing to
// hand the focus to, and the emptied 0-high fieldset is still not a substitute.
it('keeps the ring off its own empty box when nothing reachable stands beside it', async () => {
  const props = callbacks();
  const beside = (items: Filter[]) => <><FilterBar filters={items} {...props} />
    <button type="button" style={{ visibility: 'hidden' }}>Export</button></>;
  const { rerender } = render(beside(filters));
  screen.getByRole('button', { name: 'Region: All' }).focus();
  rerender(beside([]));
  expect(document.body).toHaveFocus();
  expect(screen.getByRole('group', { name: 'Filters' })).not.toHaveFocus();
});
it('keeps the ring on the bar while it still holds chips', async () => {
  render(<FilterBar filters={filters} disabled {...callbacks()} />);
  const chip = screen.getByRole('button', { name: 'Region: All' });
  expect(chip).toBeDisabled();
  // The fieldset still draws a box around two chips, so it may hold the ring.
  expect(screen.getByRole('group', { name: 'Filters' })).toBeInTheDocument();
});
it.each(['busy', 'disabled'] as const)('blocks controls and open panels when %s', async flag => {
  const props = callbacks();
  render(<FilterBar filters={filters.map(f => ({ ...f, open: true }))} {...props} {...{ [flag]: true }} />);
  expect(screen.getByRole('button', { name: 'Region: All' })).toBeDisabled();
  await userEvent.click(screen.getByRole('button', { name: 'Remove Region filter' }));
  expect(props.onRemove).not.toHaveBeenCalled();
  expect(document.querySelector('.ui-dropdown.open')).toBeNull();
});
it('keeps DOM identity and focus when labels update', () => {
  const props = callbacks();
  const { rerender } = render(<FilterBar filters={filters} {...props} />);
  const remove = screen.getByRole('button', { name: 'Remove Region filter' });
  remove.focus();
  rerender(<FilterBar filters={filters.map(f => ({ ...f, label: `${f.label} updated` }))} {...props} />);
  expect(screen.getByRole('button', { name: 'Remove Region updated filter' })).toBe(remove);
  expect(remove).toHaveFocus();
});
it('responds to open prop changes after interaction', async () => {
  const props = callbacks();
  const one = [{ ...filters[0], open: false }];
  const { rerender } = render(<FilterBar filters={one} {...props} />);
  const trigger = screen.getByRole('button', { name: 'Region: All' });
  await userEvent.click(trigger);
  await userEvent.keyboard('{Escape}');
  expect(trigger).toHaveAttribute('aria-expanded', 'false');
  rerender(<FilterBar filters={[{ ...one[0], open: true }]} {...props} />);
  expect(trigger).toHaveAttribute('aria-expanded', 'true');
  rerender(<FilterBar filters={one} {...props} />);
  expect(trigger).toHaveAttribute('aria-expanded', 'false');
});
it('restores focus after consecutive externally controlled removals', () => {
  const props = callbacks();
  const beside = (items: Filter[]) => <><FilterBar filters={items} {...props} /><button type="button">Add filter</button></>;
  const { rerender } = render(beside(filters));
  screen.getByRole('button', { name: 'Region: All' }).focus();
  rerender(beside([filters[1]]));
  expect(screen.getByRole('button', { name: 'Status: All' })).toHaveFocus();
  rerender(beside([]));
  expect(screen.getByRole('button', { name: 'Add filter' })).toHaveFocus();
});
// An empty bar is not a fallback: the ring would sit on a line with no height.
// With nothing beside it to take the focus, the focus goes nowhere instead.
it('does not park the ring on an empty bar when nothing stands beside it', () => {
  const props = callbacks();
  const { rerender } = render(<FilterBar filters={filters} {...props} />);
  screen.getByRole('button', { name: 'Region: All' }).focus();
  rerender(<FilterBar filters={[]} {...props} />);
  expect(screen.getByRole('group', { name: 'Filters' })).not.toHaveFocus();
});

it('chooses the next enabled chip even when an earlier chip is disabled', () => {
  const props = callbacks();
  const items = [
    { ...filters[0], id: 'disabled', disabled: true },
    { ...filters[0], id: 'remove' },
    { ...filters[1], id: 'next' },
    { ...filters[1], id: 'last', label: 'Last' },
  ];
  const { rerender } = render(<FilterBar filters={items} {...props} />);
  screen.getAllByRole('button', { name: 'Region: All' })[1].focus();
  rerender(<FilterBar filters={items.filter(f => f.id !== 'remove')} {...props} />);
  expect(screen.getByRole('button', { name: 'Status: All' })).toHaveFocus();
});

// DOM only: the class and the mark React writes on the chosen row. The paint —
// the wash, its ratio over the panel and what each state may not take away —
// is stories/filter-selected-mark.test.js, which reads the one kit declaration
// both faces load.
it('marks the row the chip is showing, with no `selected` from the consumer', async () => {
  const props = callbacks();
  const marked: Filter[] = [{ id: 'Region', label: 'Region', value: 'active',
    items: [{ label: 'All', value: 'all' }, { label: 'Active', value: 'active' }] }];
  const { rerender } = render(<FilterBar filters={marked} {...props} />);
  await userEvent.click(screen.getByRole('button', { name: 'Region: active' }));
  const rows = () => screen.getAllByRole('option');
  expect(rows().map(el => el.classList.contains('is-selected'))).toEqual([false, true]);
  expect(rows().map(el => el.getAttribute('aria-selected'))).toEqual(['false', 'true']);
  // The non-colour cue travels with the class: the kit's check, in the trailing slot.
  expect(rows()[1].querySelector('.ui-dropdown__tick')).toBeTruthy();

  // Nothing chosen: no row is marked, because a wash on the first row would
  // state a filter the bar is not applying.
  rerender(<FilterBar filters={[{ ...marked[0], value: undefined }]} {...props} />);
  expect(rows().some(el => el.classList.contains('is-selected'))).toBe(false);

  // A value no row carries is the same answer. `value` is display text, so a
  // consumer whose rows hold codes answers with the row's label.
  rerender(<FilterBar filters={[{ ...marked[0], value: 'Active' }]} {...props} />);
  expect(rows().some(el => el.classList.contains('is-selected'))).toBe(false);
});

/* DOM only, and the state a single render cannot reach: the chip's value moves and
 * the menu is reopened. The consumer's items are written once and keep the mark
 * they were written with, so a chip whose value has moved on had two ways to
 * contradict itself here — the consumer's own flag, and <Dropdown>'s memory of the
 * row this reader last picked. Both had to stop deciding. #550 */
it('drops the row it marked once the chip\'s value moves', async () => {
  const props = callbacks();
  // `All` is marked by the consumer, the way a consumer writes a default.
  const items = [{ label: 'All', value: 'All', selected: true },
    { label: 'Europe', value: 'Europe' }, { label: 'Asia', value: 'Asia' }];
  const chip = (value?: string): Filter[] => [{ id: 'Region', label: 'Region', value, items }];
  const { rerender } = render(<FilterBar filters={chip('All')} {...props} />);
  /* Read from both marks at once: a row the sheet washes and a row a reader hears
   * are two attributes, and either one left behind is the contradiction. */
  const marked = () => screen.getAllByRole('option')
    .filter(el => el.classList.contains('is-selected') || el.getAttribute('aria-selected') === 'true')
    .map(el => el.querySelector('.ui-dropdown__label')?.textContent);
  const open = async (name: string) => {
    await userEvent.click(screen.getByRole('button', { name: `Region: ${name}` }));
  };
  const shut = async () => { await userEvent.keyboard('{Escape}'); };

  await open('All');
  expect(marked()).toEqual(['All']);

  // The reader picks the last row. The consumer is what answers, and here it
  // answers with a different value — a bar that normalises a pick, or one whose
  // request lost a race, both arrive here.
  await userEvent.keyboard('{End}{Enter}');
  expect(props.onChange).toHaveBeenCalledWith('Region', 'Asia');
  rerender(<FilterBar filters={chip('Europe')} {...props} />);
  await open('Europe');
  expect(marked()).toEqual(['Europe']);
  await shut();

  // A value in no row marks no row, rather than leaving the consumer's default
  // standing in for a filter the bar is not applying.
  rerender(<FilterBar filters={chip('Africa')} {...props} />);
  await open('Africa');
  expect(marked()).toEqual([]);
  await shut();

  // Cleared, the chip prints its field's name again and still marks nothing.
  rerender(<FilterBar filters={chip(undefined)} {...props} />);
  await open('any');
  expect(marked()).toEqual([]);
  expect(items.map(it => it.selected)).toEqual([true, undefined, undefined]);
});
