// Class-name parity gate for <Pagination>.
// why: CONTRIBUTING.md#react-components-react
//
// The vanilla pagination() is the source of truth. Every case below renders both
// and compares the nav's class list — the rule CONTRIBUTING states — plus the
// shape read back off each DOM: the status sentence, every control's classes,
// target page, label and disabled state, the size options and the jump box. A
// React rule that disagrees with the factory fails here, and the fix is this
// component rather than the factory.
//
// What this does NOT compare: the `id` seeds. React's default comes from useId(),
// so two pagers on one page cannot collide the way a fixed 'pager' would; the id
// a caller GIVES is compared, below.
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach } from 'vitest';
import { button, pagination, PAGE_SIZES, DEFAULT_PAGE_SIZE } from '@apliteni/apliteni-ui';
import { Pagination, type PaginationProps } from './Pagination';
import { classesOf, classesOfEl } from './test/classlist';

afterEach(cleanup);

/** The vanilla factory's output as a DOM nav, or null where it renders nothing. */
function vanillaNav(opts: PaginationProps): Element | null {
  const host = document.createElement('div');
  host.innerHTML = pagination(opts as Record<string, unknown>);
  return host.firstElementChild;
}

const CONTROLS = '.ui-pager__step, .ui-pager__page, .ui-pager__gap';

/** What both implementations have to agree on, read off a rendered nav. */
function shape(nav: Element) {
  const jump = nav.querySelector('.ui-pager__jump-input') as HTMLInputElement | null;
  return {
    classes: classesOfEl(nav),
    label: nav.getAttribute('aria-label'),
    busy: nav.getAttribute('aria-busy'),
    status: nav.querySelector('.ui-pager__status')?.textContent,
    live: nav.querySelectorAll('[aria-live]').length,
    sizes: [...nav.querySelectorAll('option')].map((o) => [o.value, (o as HTMLOptionElement).selected]),
    sizeDisabled: (nav.querySelector('.ui-pager__size-select') as HTMLSelectElement | null)?.disabled ?? null,
    jump: jump && { value: jump.value, min: jump.min, max: jump.max, disabled: jump.disabled },
    jumpOf: nav.querySelector('.ui-pager__jump-of')?.textContent ?? null,
    controls: [...nav.querySelectorAll(CONTROLS)].map((el) => ({
      cls: classesOfEl(el).join(' '),
      page: el.getAttribute('data-page'),
      label: el.textContent,
      disabled: el.hasAttribute('disabled'),
      ariaDisabled: el.getAttribute('aria-disabled'),
      current: el.getAttribute('aria-current'),
      hidden: el.getAttribute('aria-hidden'),
    })),
  };
}

/** Render both and compare. Returns the React nav for a case that renders one. */
function parity(name: string, opts: PaginationProps): Element | null {
  const vanilla = vanillaNav(opts);
  const { container } = render(<Pagination {...opts} />);
  const react = container.querySelector('nav');
  if (vanilla === null) {
    expect(react, `${name}: the factory renders nothing, so the component must render null`).toBeNull();
    expect(container.innerHTML).toBe('');
    return null;
  }
  expect(react, `${name}: the factory rendered a nav and the component did not`).not.toBeNull();
  // The rule CONTRIBUTING states, asserted on its own so a failure says so first.
  expect(classesOfEl(react!), `${name}: nav class list`).toEqual(classesOf(pagination(opts as Record<string, unknown>)));
  expect(shape(react!), `${name}: rendered shape`).toEqual(shape(vanilla));
  return react;
}

const CASES: [string, PaginationProps][] = [
  ['steps, middle page', { page: 4, pageSize: 10, total: 400 }],
  ['steps, first page', { page: 1, pageSize: 10, total: 400 }],
  ['steps, last page', { page: 40, pageSize: 10, total: 400 }],
  ['numbered, middle page', { page: 5, pageSize: 10, total: 400, variant: 'numbered' }],
  ['numbered, first page', { page: 1, pageSize: 10, total: 400, variant: 'numbered' }],
  ['numbered, last page', { page: 40, pageSize: 10, total: 400, variant: 'numbered' }],
  ['numbered, a gap at each end', { page: 50, pageSize: 10, total: 1000, variant: 'numbered' }],
  ['numbered, one page hidden is drawn', { page: 1, pageSize: 10, total: 50, variant: 'numbered' }],
  ['jump, middle page', { page: 5, pageSize: 10, total: 400, variant: 'jump' }],
  ['jump, first page', { page: 1, pageSize: 10, total: 400, variant: 'jump' }],
  ['jump, last page', { page: 40, pageSize: 10, total: 400, variant: 'jump' }],
  ['unknown total, steps', { page: 3, total: null, hasMore: true }],
  ['unknown total, numbered', { page: 3, total: null, hasMore: true, variant: 'numbered' }],
  ['unknown total, jump', { page: 3, total: null, hasMore: true, variant: 'jump' }],
  ['unknown total, nothing after this page', { page: 7, total: null, hasMore: false }],
  ['unknown total, first page', { page: 1, total: null, hasMore: true }],
  ['loading', { page: 4, pageSize: 10, total: 400, variant: 'jump', pageSizes: PAGE_SIZES, loading: true }],
  ['loading, numbered', { page: 4, pageSize: 10, total: 400, variant: 'numbered', loading: true }],
  ['one page with sizes on offer', { page: 1, pageSize: 100, total: 12, pageSizes: PAGE_SIZES }],
  ['one page and nothing to choose', { page: 1, pageSize: 100, total: 12 }],
  ['one page, an empty list of sizes', { page: 1, pageSize: 100, total: 12, pageSizes: [] }],
  ['one page, numbered', { page: 1, pageSize: 100, total: 12, variant: 'numbered' }],
  ['an empty result', { page: 1, pageSize: 10, total: 0, pageSizes: PAGE_SIZES }],
  ['a single row', { page: 3, pageSize: 1, total: 3 }],
  ['a page past the end', { page: 999, pageSize: 100, total: 4812 }],
  ['a page below one', { page: 0, pageSize: 100, total: 4812 }],
  ['the size in use is missing from the list', { page: 1, pageSize: 75, total: 4812, pageSizes: PAGE_SIZES }],
  ['sizes and the whole strip', { page: 2, pageSize: 25, total: 4812, pageSizes: PAGE_SIZES, variant: 'jump' }],
  ['the defaults', {}],
  ['the default page size', { page: 1, total: DEFAULT_PAGE_SIZE * 3 }],
  ['a label of its own', { page: 2, pageSize: 10, total: 400, label: 'Payout pages' }],
];

for (const [name, opts] of CASES) {
  it(`matches the vanilla pager: ${name}`, () => {
    parity(name, opts);
  });
}

it('carries exactly the classes button({ ghost, sm }) emits on every control', () => {
  // The kit has one ghost/sm button and this component may not become a second
  // one. Read off button(), so a change there fails here.
  const ghostSm = classesOf(button({ variant: 'ghost', size: 'sm' })).join(' ');
  expect(ghostSm).toBe('ui-btn ui-btn--ghost ui-btn--sm');
  const { container } = render(
    <Pagination page={4} pageSize={10} total={400} variant="numbered" />);
  const sorted = (cls: string) => cls.split(' ').sort().join(' ');
  const allowed = [
    `${ghostSm} ui-pager__step`,
    `${ghostSm} ui-pager__page`,
    `${ghostSm} ui-pager__page is-current`,
  ].map(sorted);
  const classes = [...container.querySelectorAll('button')].map((el) => classesOfEl(el).join(' '));
  expect(classes.length).toBeGreaterThanOrEqual(5);
  for (const cls of classes) expect(allowed).toContain(cls);
});

it('seeds both label/control pairs from the id it is given, as the factory does', () => {
  const opts = {
    page: 2, pageSize: 10, total: 400, variant: 'jump' as const, pageSizes: PAGE_SIZES, id: 'payouts',
  };
  const html = pagination(opts);
  const { container } = render(<Pagination {...opts} />);
  for (const sel of ['.ui-pager__size-label', '.ui-pager__size-select', '.ui-pager__jump-input']) {
    const attr = sel.endsWith('label') ? 'for' : 'id';
    expect(container.querySelector(sel)!.getAttribute(attr)).toBe(
      vanillaNav(opts)!.querySelector(sel)!.getAttribute(attr));
  }
  expect(html).toContain('payouts-size');
  // The pairs work, which is what the ids are for.
  expect(screen.getByLabelText('Rows')).toBe(container.querySelector('.ui-pager__size-select'));
  expect(screen.getByLabelText('Page')).toBe(container.querySelector('.ui-pager__jump-input'));
});

it('gives two pagers on one page ids that do not collide', () => {
  const { container } = render(<>
    <Pagination page={1} pageSize={10} total={400} pageSizes={PAGE_SIZES} />
    <Pagination page={1} pageSize={10} total={400} pageSizes={PAGE_SIZES} />
  </>);
  const ids = [...container.querySelectorAll('.ui-pager__size-select')].map((el) => el.id);
  expect(ids).toHaveLength(2);
  expect(new Set(ids).size).toBe(2);
});

// ---- what the React component adds: the callbacks --------------------------

it('reports the page each step aims at', async () => {
  const seen: number[] = [];
  render(<Pagination page={4} pageSize={10} total={400} onPageChange={(p) => seen.push(p)} />);
  for (const name of ['First', 'Prev', 'Next', 'Last']) {
    await userEvent.click(screen.getByRole('button', { name }));
  }
  expect(seen).toEqual([1, 3, 5, 40]);
});

it('reports the page a number was clicked for, and never one a disabled control points at', async () => {
  const seen: number[] = [];
  render(<Pagination page={1} pageSize={10} total={400} variant="numbered"
    onPageChange={(p) => seen.push(p)} />);
  await userEvent.click(screen.getByRole('button', { name: '2' }));
  await userEvent.click(screen.getByRole('button', { name: 'Prev' }));   // disabled at page 1
  expect(seen).toEqual([2]);
});

it('reports nothing while it loads, however hard the reader presses', async () => {
  const seen: number[] = [];
  render(<Pagination page={4} pageSize={10} total={400} loading
    onPageChange={(p) => seen.push(p)} />);
  await userEvent.click(screen.getByRole('button', { name: 'Next' }));
  expect(seen).toEqual([]);
});

it('turns the page from the jump box on Enter, clamped to a page that exists', async () => {
  const seen: number[] = [];
  function Harness() {
    const [page, setPage] = useState(5);
    return <Pagination page={page} pageSize={10} total={400} variant="jump"
      onPageChange={(p) => { seen.push(p); setPage(p); }} />;
  }
  render(<Harness />);
  const box = screen.getByLabelText('Page');
  await userEvent.clear(box);
  await userEvent.type(box, '12{Enter}');
  expect(seen).toEqual([12]);
  // A half-typed number does not turn the page under the reader.
  expect(box).toHaveValue(12);

  await userEvent.clear(box);
  await userEvent.type(box, '9999{Enter}');
  expect(seen).toEqual([12, 40]);
});

it('reports a size the reader picked', async () => {
  const seen: number[] = [];
  render(<Pagination page={1} pageSize={100} total={4812} pageSizes={PAGE_SIZES}
    onPageSizeChange={(s) => seen.push(s)} />);
  await userEvent.selectOptions(screen.getByLabelText('Rows'), '25');
  expect(seen).toEqual([25]);
});

it("takes the kit's page sizes rather than numbers of its own", () => {
  render(<Pagination page={1} pageSize={DEFAULT_PAGE_SIZE} total={4812} pageSizes={PAGE_SIZES} />);
  expect([...screen.getByLabelText('Rows').querySelectorAll('option')].map((o) => Number(o.value)))
    .toEqual(PAGE_SIZES);
  expect(PAGE_SIZES).toContain(DEFAULT_PAGE_SIZE);
});
