import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { pagerRange } from '@apliteni/apliteni-ui';
import { Pagination } from './Pagination';

it('says the range the kit says, for the same inputs', () => {
  render(<Pagination page={3} perPage={100} total={4812} onPageChange={() => {}} />);
  expect(screen.getByRole('navigation', { name: 'Pagination' })).toBeInTheDocument();
  expect(screen.getByText(pagerRange({ page: 3, perPage: 100, total: 4812 }))).toBeInTheDocument();
});

// ---- the three refusals, ported from pager() -----------------------------
// A component that quietly degrades is the failure this feature exists to fix:
// there is no last page to draw, so say so rather than draw a plausible one.

it('refuses an unknown tier rather than silently treating it as compact', () => {
  expect(() => render(
    // @ts-expect-error -- the point of the test is the value TypeScript forbids.
    <Pagination page={1} perPage={10} total={100} tier="fancy" onPageChange={() => {}} />,
  )).toThrow(/unknown tier "fancy"/);
});

it('refuses an unknown total without hasMore and rowsOnPage', () => {
  expect(() => render(
    <Pagination page={1} perPage={10} onPageChange={() => {}} />,
  )).toThrow(/needs hasMore and rowsOnPage/);
});

it('refuses the numbered tier when there is no total to draw a last page from', () => {
  expect(() => render(
    <Pagination page={1} perPage={10} hasMore rowsOnPage={10} tier="numbered" onPageChange={() => {}} />,
  )).toThrow(/numbered tier requires a total/);
});

// ---- compact: the range, and a way either side of it ---------------------

it('moves a page either way, by number', async () => {
  const onPageChange = vi.fn();
  render(<Pagination page={3} perPage={100} total={4812} onPageChange={onPageChange} />);
  await userEvent.click(screen.getByRole('button', { name: 'Go to next page' }));
  expect(onPageChange).toHaveBeenCalledWith(4);
  await userEvent.click(screen.getByRole('button', { name: 'Go to previous page' }));
  expect(onPageChange).toHaveBeenCalledWith(2);
});

it('disables the control at each end rather than letting it fire', () => {
  const first = render(<Pagination page={1} perPage={100} total={4812} onPageChange={() => {}} />);
  expect(screen.getByRole('button', { name: 'Go to previous page' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Go to next page' })).toBeEnabled();
  first.unmount();

  render(<Pagination page={49} perPage={100} total={4812} onPageChange={() => {}} />);
  expect(screen.getByRole('button', { name: 'Go to next page' })).toBeDisabled();
});

it('has no last page to offer when the total is unknown', () => {
  render(<Pagination page={2} perPage={100} hasMore rowsOnPage={100} tier="advanced"
    onPageChange={() => {}} onPerPageChange={() => {}} />);
  expect(screen.getByRole('button', { name: 'Go to first page' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Go to last page' })).toBeNull();
  // hasMore is the only thing the query paid for, and it says there is a next.
  expect(screen.getByRole('button', { name: 'Go to next page' })).toBeEnabled();
});

// ---- when a pager is the wrong thing to draw -----------------------------
// The empty state belongs to the table, and one page needs no way off it —
// except in `advanced`, where the rows-per-page control is the reason to stay.

it('draws nothing for an empty set', () => {
  const { container } = render(<Pagination page={1} perPage={25} total={0} onPageChange={() => {}} />);
  expect(container).toBeEmptyDOMElement();
});

it('draws nothing when there is only one page', () => {
  const known = render(<Pagination page={1} perPage={25} total={12} onPageChange={() => {}} />);
  expect(known.container).toBeEmptyDOMElement();
  known.unmount();

  // Unknown total: page one with nothing behind it is the same one page.
  const { container } = render(<Pagination page={1} perPage={25} hasMore={false} rowsOnPage={12}
    onPageChange={() => {}} />);
  expect(container).toBeEmptyDOMElement();
});

it('keeps the advanced tier on a single page, because the page size is still worth changing', () => {
  render(<Pagination page={1} perPage={25} total={12} tier="advanced"
    onPageChange={() => {}} onPerPageChange={() => {}} />);
  expect(screen.getByRole('combobox', { name: 'Rows per page' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Go to next page' })).toBeDisabled();
});

// ---- numbered: first and last always reachable, ±2 either side -----------

it('draws the truncated window, with the ellipsis hidden from the reader', () => {
  const { container } = render(<Pagination page={10} perPage={25} total={500} tier="numbered"
    onPageChange={() => {}} />);
  const strip = [...container.querySelectorAll('.ui-pager__page, .ui-pager__gap')]
    .map((el) => el.textContent);
  expect(strip).toEqual(['1', '…', '8', '9', '10', '11', '12', '…', '20']);
  container.querySelectorAll('.ui-pager__gap').forEach((gap) => {
    expect(gap).toHaveAttribute('aria-hidden', 'true');
  });
});

it('draws a gap of one page as the page, because the number hides nothing', () => {
  const { container } = render(<Pagination page={4} perPage={10} total={70} tier="numbered"
    onPageChange={() => {}} />);
  const strip = [...container.querySelectorAll('.ui-pager__page, .ui-pager__gap')]
    .map((el) => el.textContent);
  expect(strip).toEqual(['1', '2', '3', '4', '5', '6', '7']);
});

it('marks the page you are on and jumps to one you are not', async () => {
  const onPageChange = vi.fn();
  render(<Pagination page={10} perPage={25} total={500} tier="numbered" onPageChange={onPageChange} />);
  expect(screen.getByRole('button', { name: 'Page 10' })).toHaveAttribute('aria-current', 'page');
  await userEvent.click(screen.getByRole('button', { name: 'Go to page 12' }));
  expect(onPageChange).toHaveBeenCalledWith(12);
});

// ---- advanced: the two controls a table someone works in needs -----------

it('offers a page size, with the current one selected, and reports a change as a number', async () => {
  const onPerPageChange = vi.fn();
  render(<Pagination page={3} perPage={50} total={4812} tier="advanced"
    onPageChange={() => {}} onPerPageChange={onPerPageChange} />);
  const size = screen.getByRole('combobox', { name: 'Rows per page' });
  expect(size).toHaveValue('50');
  await userEvent.selectOptions(size, '100');
  expect(onPerPageChange).toHaveBeenCalledWith(100);
  expect(onPerPageChange.mock.calls[0][0]).toBeTypeOf('number');
});

it('keeps a page size nobody offered, because it is still the truth about the table', () => {
  render(<Pagination page={1} perPage={7} total={4812} tier="advanced"
    onPageChange={() => {}} onPerPageChange={() => {}} />);
  const options = [...screen.getByRole('combobox', { name: 'Rows per page' })
    .querySelectorAll('option')].map((o) => o.value);
  expect(options).toEqual(['7', '10', '25', '50', '100']);
  expect(screen.getByRole('combobox', { name: 'Rows per page' })).toHaveValue('7');
});

it('jumps by number, bounded by the pages that exist', () => {
  render(<Pagination page={3} perPage={100} total={4812} tier="advanced"
    onPageChange={() => {}} onPerPageChange={() => {}} />);
  const jump = screen.getByRole('spinbutton', { name: 'Go to page' });
  expect(jump).toHaveAttribute('min', '1');
  expect(jump).toHaveAttribute('max', '49');
  expect(jump).toHaveValue(3);
});

it('has no upper bound to offer when there is no last page', () => {
  render(<Pagination page={2} perPage={100} hasMore rowsOnPage={100} tier="advanced"
    onPageChange={() => {}} onPerPageChange={() => {}} />);
  expect(screen.getByRole('spinbutton', { name: 'Go to page' })).not.toHaveAttribute('max');
});

it('refuses the advanced tier without a way to report the page size', () => {
  expect(() => render(
    <Pagination page={1} perPage={25} total={4812} tier="advanced" onPageChange={() => {}} />,
  )).toThrow(/advanced tier needs onPerPageChange/);
});
