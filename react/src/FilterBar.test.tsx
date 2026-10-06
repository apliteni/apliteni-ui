import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState, type ReactNode } from 'react';
import { vi } from 'vitest';
import { nextFocusStop } from '@apliteni/apliteni-ui';
import { FilterBar, type AddFilter, type Filter } from './FilterBar';

const filters: Filter[] = ['Region', 'Status'].map(label => ({ id: label, label, value: 'All', items: [{ label: 'All', value: 'all' }, { label: 'Active', value: 'active' }] }));
const callbacks = () => ({ onRemove: vi.fn(), onClear: vi.fn(), onChange: vi.fn() });
// The catalogue the add menu offers: two filters, three values between them.
const catalogue: AddFilter[] = [
  { id: 'Month', label: 'Month', items: [{ label: 'March', value: 'March' }, { label: 'April', value: 'April' }] },
  { id: 'Unit', label: 'Unit', items: [{ label: 'EUR', value: 'EUR' }] },
];
// A consumer that answers onAdd in the same update, which is where focus on the new chip
// is measurable: a consumer that answers it a tick later owns where focus goes.
function Adding({ add = catalogue, onAdd, ...rest }: { add?: AddFilter[]; onAdd?: (id: string, value: string | undefined) => void; filters?: Filter[]; busy?: boolean; disabled?: boolean }) {
  const [items, setItems] = useState<Filter[]>(rest.filters ?? [filters[0]]);
  return <FilterBar {...rest} filters={items} add={add} onRemove={() => {}} onClear={() => {}} onChange={() => {}}
    onAdd={(id, value) => {
      onAdd?.(id, value);
      const entry = catalogue.find(f => f.id === id);
      if (entry) setItems(current => [...current, { ...entry, value: value ?? '' }]);
    }} />;
}
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
  await userEvent.click(screen.getByRole('button', { name: 'Clear all' }));
  expect(props.onClear).toHaveBeenCalledTimes(1);
});
// DOM only: which control is rendered, not how it looks.
it('offers the clear action only once there is something to clear', () => {
  const props = callbacks();
  const { rerender } = render(<FilterBar filters={[]} {...props} />);
  expect(screen.queryByRole('button', { name: 'Clear all' })).not.toBeInTheDocument();
  rerender(<FilterBar filters={filters} {...props} />);
  const clear = screen.getByRole('button', { name: 'Clear all' });
  expect(clear).toBeEnabled();
  // The class holds the text-button contract; browser evidence measures its paint.
  expect(clear).toHaveClass('ui-btn--ghost');
  expect(clear).not.toHaveClass('ui-btn--secondary');
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
// `between` stands something else in the gap, to be walked past. The neighbour is the
// CONSUMER's control, outside the bar and outside the frame that names the noun, so it
// keeps a wording the bar's own label drops. why: guidelines/labels-and-titles.md#say-the-noun-once
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
  await userEvent.click(screen.getByRole('button', { name: 'Clear all' }));
  expect(screen.queryByRole('button', { name: 'Clear all' })).not.toBeInTheDocument();
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
  await userEvent.click(screen.getByRole('button', { name: 'Clear all' }));
  expect(screen.getByRole('button', { name: 'Add filter' })).toHaveFocus();
});
// The belt the list above is the braces for. `focus()` is a request: a control can
// be visible, enabled, in the tab order and still not take it, and nothing throws
// when it does not. So the bar checks where the focus actually landed.
it('passes over a control that is asked for the focus and does not take it', async () => {
  render(<Example between={<button type="button">Export</button>} />);
  const refuses = screen.getByRole('button', { name: 'Export' });
  Object.defineProperty(refuses, 'focus', { value: () => {} });
  await userEvent.click(screen.getByRole('button', { name: 'Clear all' }));
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

it('adds a filter from the bar and lands focus on the new chip', async () => {
  const onAdd = vi.fn();
  render(<Adding onAdd={onAdd} />);
  // It sits after the chips and before clear-all, which is the order Tab walks.
  const bar = screen.getByRole('group', { name: 'Filters' });
  expect([...bar.querySelectorAll('[data-filter-id], [data-filter-add], [data-filter-clear]')]
    .map(el => (el.getAttribute('data-filter-id') ? 'chip' : el.hasAttribute('data-filter-add') ? 'add' : 'clear')))
    .toEqual(['chip', 'add', 'clear']);
  await userEvent.click(screen.getByRole('button', { name: 'Add' }));
  expect(screen.getByRole('group', { name: 'Month' })).toBeInTheDocument();
  expect(screen.getByRole('group', { name: 'Unit' })).toBeInTheDocument();
  await userEvent.click(screen.getByRole('menuitem', { name: 'April' }));
  expect(onAdd).toHaveBeenCalledWith('Month', 'April');
  expect(screen.getByRole('button', { name: 'Month: April' })).toHaveFocus();
  expect(screen.getByRole('button', { name: 'Remove Month filter' })).toBeInTheDocument();
});
it('closes the add menu on Escape without adding', async () => {
  const onAdd = vi.fn();
  render(<Adding onAdd={onAdd} />);
  const trigger = screen.getByRole('button', { name: 'Add' });
  await userEvent.click(trigger);
  expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await userEvent.keyboard('{Escape}');
  expect(trigger).toHaveAttribute('aria-expanded', 'false');
  expect(trigger).toHaveFocus();
  expect(onAdd).not.toHaveBeenCalled();
  // The panel stays in the tree and is shut by CSS, as every kit dropdown's is.
  expect(document.querySelector('[data-filter-add] .ui-dropdown.open')).toBeNull();
});
it('offers only the filters the bar is not holding, and drops the control at the last one', async () => {
  render(<Adding add={[catalogue[0]]} />);
  await userEvent.click(screen.getByRole('button', { name: 'Add' }));
  await userEvent.click(screen.getByRole('menuitem', { name: 'March' }));
  expect(screen.getByRole('button', { name: 'Month: March' })).toHaveFocus();
  expect(screen.queryByRole('button', { name: 'Add' })).toBeNull();
});
it.each([[9, false], [10, true]] as const)('puts a field over %i options: %s', async (count, field) => {
  const items = Array.from({ length: count - 1 }, (_, i) => ({ label: `Month ${i + 1}`, value: `m${i + 1}` }));
  render(<Adding add={[{ ...catalogue[0], items }, catalogue[1]]} />);
  await userEvent.click(screen.getByRole('button', { name: 'Add' }));
  const search = document.querySelector('[data-dd-search]');
  expect(Boolean(search)).toBe(field);
  if (search) expect(search).toHaveAttribute('aria-label', 'Search filters');
});
it.each(['busy', 'disabled'] as const)('stops the add control when %s', async flag => {
  const onAdd = vi.fn();
  render(<Adding onAdd={onAdd} {...{ [flag]: true }} />);
  const trigger = screen.getByRole('button', { name: 'Add' });
  expect(trigger).toBeDisabled();
  await userEvent.click(trigger);
  expect(trigger).toHaveAttribute('aria-expanded', 'false');
  expect(onAdd).not.toHaveBeenCalled();
});
it('draws no add control without a catalogue or without onAdd', () => {
  const props = callbacks();
  const { rerender } = render(<FilterBar filters={filters} {...props} />);
  expect(screen.queryByRole('button', { name: 'Add' })).toBeNull();
  rerender(<FilterBar filters={filters} add={catalogue} {...props} />);
  expect(screen.queryByRole('button', { name: 'Add' })).toBeNull();
});

// Emptying the chips does not empty the row while the add control is still drawn, so the
// focus belongs on it. Before this, clearing left `document.activeElement` on BODY in a
// browser — no ring on anything, and the next Tab starting over at the top of the page —
// because the bar's own fallback only looks OUTSIDE the bar. The pair for a row that draws
// no add control is above: the focus leaves the bar for the consumer's own action.
function Emptying({ start = filters, add = catalogue }: { start?: Filter[]; add?: AddFilter[] }) {
  const [items, setItems] = useState<Filter[]>(start);
  return <><FilterBar filters={items} add={add} onAdd={() => {}}
    onRemove={id => setItems(items.filter(f => f.id !== id))}
    onClear={() => setItems([])} onChange={() => {}} />
    <button type="button">Add filter</button></>;
}
it('lands the focus on the add control when clearing empties the chips', async () => {
  render(<Emptying />);
  await userEvent.click(screen.getByRole('button', { name: 'Clear all' }));
  expect(screen.queryByRole('button', { name: 'Clear all' })).not.toBeInTheDocument();
  const add = screen.getByRole('button', { name: 'Add' });
  expect(add).toHaveFocus();
  // The published answer a consumer reads names the control the bar chose, not the
  // page's own button past the row: one list, both faces.
  expect(nextFocusStop(document.querySelector('[data-filter-bar]'))).toBe(add);
});
it('lands the focus on the add control when the last chip is removed', async () => {
  render(<Emptying start={[filters[0]]} />);
  await userEvent.click(screen.getByRole('button', { name: `Remove ${filters[0].label} filter` }));
  expect(screen.queryByRole('button', { name: `Remove ${filters[0].label} filter` })).toBeNull();
  expect(screen.getByRole('button', { name: 'Add' })).toHaveFocus();
});

it('clears the width a searching menu held when it closes inside the row', async () => {
  // #467 in React: the search panel pins the width it opened at as an inline
  // min-width, and inline beats the rule that holds a shut panel to its trigger —
  // with the menu floor that residue is 320px of shut panel, measured 121.9px past
  // the row at 320. JSDOM lays nothing out, so the pin this clears is written here
  // the way a browser would write it; that it is written at all is the browser
  // gate's to measure.
  const months = Array.from({ length: 12 }, (_, i) => ({ label: `Month ${i + 1}`, value: `m${i + 1}` }));
  render(<Adding add={[{ id: 'Month', label: 'Month', items: months }]} />);
  await userEvent.click(screen.getByRole('button', { name: 'Add' }));
  const panel = document.querySelector<HTMLElement>('[data-filter-add] .ui-dropdown__panel')!;
  expect(panel.querySelector('[data-dd-search]')).not.toBeNull();
  panel.style.minWidth = '320px';
  await userEvent.keyboard('{Escape}');
  expect(panel.style.minWidth).toBe('');
});
