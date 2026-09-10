import { useRef, useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { pager, pagerRange } from '@apliteni/apliteni-ui';
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

// The jump is the one control a router cannot own: there is no anchor for a page
// the reader has not typed yet, so link mode still needs a callback to commit it.
it('refuses the advanced tier in link mode with no way to commit a typed page', () => {
  expect(() => render(
    <Pagination page={1} perPage={25} total={4812} tier="advanced" onPerPageChange={() => {}}
      renderLink={(p, children) => <a href={`?page=${p}`}>{children}</a>} />,
  )).toThrow(/jump needs onPageChange/);
});

it('commits a typed page on Enter, and clamps it to the pages that exist', async () => {
  const onPageChange = vi.fn();
  render(<Pagination page={3} perPage={100} total={4812} tier="advanced"
    onPageChange={onPageChange} onPerPageChange={() => {}} />);
  const jump = screen.getByRole('spinbutton', { name: 'Go to page' });
  await userEvent.clear(jump);
  await userEvent.type(jump, '900{Enter}');
  expect(onPageChange).toHaveBeenCalledWith(49);
});

it('refuses the advanced tier without a way to report the page size', () => {
  expect(() => render(
    <Pagination page={1} perPage={25} total={4812} tier="advanced" onPageChange={() => {}} />,
  )).toThrow(/advanced tier needs onPerPageChange/);
});

// ---- the announcement, and who owes it -----------------------------------
// In button mode the document never reloads, so nothing tells a screen reader
// the table changed under it. In link mode the browser reads the new document
// and a live region on top of that reads the position twice.
// why: stories/guidelines/_tables-at-scale.js `announce`

it('announces the new range in button mode, where nothing else will', () => {
  const { container } = render(<Pagination page={2} perPage={25} total={500} onPageChange={() => {}} />);
  const range = container.querySelector('.ui-pager__range');
  expect(range).toHaveAttribute('aria-live', 'polite');
  expect(range).toHaveAttribute('aria-atomic', 'true');
});

it('stays quiet in link mode, because the document reloads and reads itself', () => {
  const { container } = render(<Pagination page={2} perPage={25} total={500}
    renderLink={(p, children) => <a href={`?page=${p}`}>{children}</a>} />);
  const range = container.querySelector('.ui-pager__range');
  expect(range).not.toHaveAttribute('aria-live');
  expect(range).not.toHaveAttribute('aria-atomic');
});

// ---- focus, the half the factory cannot do ------------------------------
// After a page turns the reader is still on the Next button below a table they
// have not seen, and Tab from there walks out of the page rather than into it.
// Primer: focus must be programmatically moved to the updated content so screen
// reader users are made aware of the change.
// why: stories/guidelines/_tables-at-scale.js `announce`

function Paged({ link = false, missing = false }: { link?: boolean; missing?: boolean }) {
  const [page, setPage] = useState(1);
  const rows = useRef<HTMLTableElement>(null);
  const nowhere = useRef<HTMLElement>(null);
  return (
    <>
      <table ref={rows}><tbody><tr><td>page {page}</td></tr></tbody></table>
      <Pagination page={page} perPage={25} total={500} focusRef={missing ? nowhere : rows}
        onPageChange={setPage}
        renderLink={link ? ((p, children) => <a href={`?page=${p}`}>{children}</a>) : undefined} />
    </>
  );
}

it('moves focus to the rows the new range describes', async () => {
  render(<Paged />);
  await userEvent.click(screen.getByRole('button', { name: 'Go to next page' }));
  expect(screen.getByText('page 2')).toBeInTheDocument();
  expect(screen.getByRole('table')).toHaveFocus();
});

// -1 makes the rows a target for focus() without putting them in the tab order,
// so Tab from there still walks into the page rather than out of it.
it('makes the rows focusable without putting them in the tab order', async () => {
  render(<Paged />);
  await userEvent.click(screen.getByRole('button', { name: 'Go to next page' }));
  expect(screen.getByRole('table')).toHaveAttribute('tabindex', '-1');
});

it('does not steal focus on the first render', () => {
  render(<Paged />);
  expect(screen.getByRole('table')).not.toHaveFocus();
});

it('leaves focus alone in link mode, where the browser already moved it', async () => {
  render(<Paged link />);
  await userEvent.click(screen.getByRole('link', { name: 'Go to next page' }));
  expect(screen.getByRole('table')).not.toHaveFocus();
});

it('is a no-op rather than a crash when the ref points at nothing', async () => {
  render(<Paged missing />);
  await userEvent.click(screen.getByRole('button', { name: 'Go to next page' }));
  expect(screen.getByText('page 2')).toBeInTheDocument();
});

// ---- one skin, two renderers --------------------------------------------
// The React component and the vanilla factory draw against the SAME stylesheet
// and nothing else holds them to it. These are what notices when one of them
// grows a class the other does not have. why: react/kit-alias.ts

const classNames = (root: ParentNode) => [...new Set(
  [...root.querySelectorAll('[class]')].flatMap((el) => [...el.classList]),
)].sort();

const vanillaBody = (html: string) => {
  const doc = document.implementation.createHTMLDocument('');
  doc.body.innerHTML = html;
  return doc.body;
};

it.each(['compact', 'advanced', 'numbered'] as const)(
  'carries the same class names the vanilla factory emits for the %s tier',
  (tier) => {
    const args = { page: 3, perPage: 25, total: 500 };
    const { container } = render(<Pagination {...args} tier={tier}
      onPageChange={() => {}} onPerPageChange={() => {}} />);
    expect(classNames(container)).toEqual(classNames(vanillaBody(pager({ ...args, tier }))));
  });

it('carries the same class names for an unknown total, where the last page is absent', () => {
  const args = { page: 2, perPage: 25, hasMore: true, rowsOnPage: 25 };
  const { container } = render(<Pagination {...args} tier="advanced"
    onPageChange={() => {}} onPerPageChange={() => {}} />);
  expect(classNames(container)).toEqual(classNames(vanillaBody(pager({ ...args, tier: 'advanced' }))));
});

// ---- link mode, and the fetch in flight ----------------------------------

it('hands the router a real anchor rather than a button pretending to be one', () => {
  render(<Pagination page={3} perPage={100} total={4812}
    renderLink={(p, children) => <a href={`?page=${p}`}>{children}</a>} />);
  expect(screen.getByRole('link', { name: 'Go to next page' })).toHaveAttribute('href', '?page=4');
  expect(screen.queryByRole('button', { name: 'Go to next page' })).toBeNull();
});

it('keeps a className of the router\'s own instead of replacing it', () => {
  render(<Pagination page={3} perPage={100} total={4812}
    renderLink={(p, children) => <a href={`?page=${p}`} className="router-link">{children}</a>} />);
  expect(screen.getByRole('link', { name: 'Go to next page' })).toHaveClass('ui-pager__btn', 'router-link');
});

// A control with nowhere to go is a disabled <button> in BOTH modes: there is no
// URL for a page that does not exist, and aria-disabled on an anchor is a promise
// the browser does not keep.
it('makes a dead control a disabled button even in link mode', () => {
  render(<Pagination page={1} perPage={100} total={4812}
    renderLink={(p, children) => <a href={`?page=${p}`}>{children}</a>} />);
  expect(screen.getByRole('button', { name: 'Go to previous page' })).toBeDisabled();
});

// The rows are what is loading. The position is not, and it was true a moment ago.
// why: stories/guidelines/_tables-at-scale.js `loading`
it('disables every control while a fetch is in flight, without clearing the range', () => {
  render(<Pagination page={4} perPage={100} total={4812} tier="advanced" busy
    onPageChange={() => {}} onPerPageChange={() => {}} />);
  expect(screen.getByText(pagerRange({ page: 4, perPage: 100, total: 4812 }))).toBeInTheDocument();
  expect(screen.getByRole('navigation', { name: 'Pagination' })).toHaveAttribute('aria-busy', 'true');
  for (const name of ['Go to first page', 'Go to previous page', 'Go to next page', 'Go to last page']) {
    expect(screen.getByRole('button', { name })).toBeDisabled();
  }
  expect(screen.getByRole('combobox', { name: 'Rows per page' })).toBeDisabled();
  expect(screen.getByRole('spinbutton', { name: 'Go to page' })).toBeDisabled();
});
