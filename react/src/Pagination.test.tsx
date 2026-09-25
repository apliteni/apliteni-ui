// Class-name parity gate for <Pagination>.
// React components must match the vanilla class names.
//
// The vanilla pagination() is the source of truth. Every case below renders both
// and compares the nav's class list plus the
// shape read back off each DOM: the status sentence, every control's classes,
// target page, label and disabled state, the size options and the jump box. A
// React rule that disagrees with the factory fails here, and the fix is this
// component rather than the factory.
//
// What this does NOT compare: the `id` seeds. React's default comes from useId(),
// so two pagers on one page cannot collide the way a fixed 'pager' would; the id
// a caller GIVES is compared, below.
import { act, render, screen, cleanup } from '@testing-library/react';
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
      // The tag and the href are compared, not assumed: the factory renders an
      // <a> for an enabled control when it is given an `href`, and a shape that
      // read neither would call that markup identical to a strip of <button>s.
      tag: el.tagName,
      href: el.getAttribute('href'),
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
  // Check class parity separately so failures name the mismatch.
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
  // What a URL or an untyped JSON body hands a caller: the factory's int()
  // refuses each of these rather than reading it as 0, so this component has to.
  // Cast, because PaginationProps would reject them — a caller typed `any` would not.
  ['a page size of zero is no size at all', { page: 1, pageSize: 0, total: 4812 }],
  ['a negative page size is no size at all', { page: 1, pageSize: -25, total: 4812 }],
  ['an empty page size', { page: 1, pageSize: '' as unknown as number, total: 400 }],
  ['an empty total is a total nobody knows', { page: 2, pageSize: 10, total: '' as unknown as number, hasMore: true }],
  ['a blank page', { page: '  ' as unknown as number, pageSize: 10, total: 400 }],
  ['a page past what arithmetic can count', { page: Number.MAX_SAFE_INTEGER * 4, total: null, hasMore: true }],
  ['a size list no menu would offer', { page: 1, pageSize: 5, total: 10, pageSizes: Array.from({ length: 40 }, (_, i) => i + 1) }],
  ['a size list holding something that is not a number', { page: 1, pageSize: 25, total: 1000, pageSizes: [Symbol('x') as unknown as number, 25, 50] }],
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

it('renders a button where the factory would render a link — the one divergence', () => {
  // `PaginationProps` has no `href` and the factory has one, so this is the
  // single shape the two do not share. It is asserted rather than left out:
  // a parity gate silent about the one known divergence is a gate a reader
  // cannot tell from one that never looked.
  const opts: PaginationProps = { page: 4, pageSize: 10, total: 400 };
  parity('steps, middle page, as links', opts);   // no href: identical, tags included

  const linked = document.createElement('div');
  linked.innerHTML = pagination({ ...opts, href: (p: number) => `/rows?page=${p}` });
  const { container } = render(<Pagination {...opts} />);
  const controls = (root: Element) => shape(root).controls;
  const vanilla = controls(linked.firstElementChild!);
  const react = controls(container.querySelector('nav')!);

  expect(vanilla.map((c) => [c.tag, c.href])).toEqual([
    ['A', '/rows?page=1'], ['A', '/rows?page=3'], ['A', '/rows?page=5'], ['A', '/rows?page=40'],
  ]);
  expect(react.map((c) => [c.tag, c.href])).toEqual([
    ['BUTTON', null], ['BUTTON', null], ['BUTTON', null], ['BUTTON', null],
  ]);
  // And nothing else diverges: same classes, same targets, same labels, same
  // disabled states. React reports through onPageChange; that is the whole of it.
  const rest = (cs: ReturnType<typeof controls>) => cs.map(({ tag, href, ...c }) => c);
  expect(rest(react)).toEqual(rest(vanilla));
});

// ---- the jump box: what the reader typed, and what they did instead --------

it('commits nothing from an empty jump box and leaves the reader on their page', async () => {
  // userEvent.clear() fires no blur, so the empty box has to be left the way a
  // reader leaves it — by clicking something else. (A number input sanitises
  // anything unparseable to the empty string, so this is that case too.)
  const seen: number[] = [];
  render(<>
    <Pagination page={7} pageSize={10} total={400} variant="jump"
      onPageChange={(p) => seen.push(p)} />
    <button>Somewhere else</button>
  </>);
  const box = screen.getByLabelText('Page');
  await userEvent.clear(box);
  await userEvent.click(screen.getByRole('button', { name: 'Somewhere else' }));
  expect(seen).toEqual([]);
  expect(box).toHaveValue(7);
});

it('turns one page when a step is pressed with a jump half-typed', async () => {
  // Blur fires before the click that caused it. A reader who typed a page and
  // then reached for Next chose Next: two navigations here take them somewhere
  // neither control pointed at.
  const seen: number[] = [];
  function Harness() {
    const [page, setPage] = useState(7);
    return <Pagination page={page} pageSize={10} total={400} variant="jump"
      onPageChange={(p) => { seen.push(p); setPage(p); }} />;
  }
  render(<Harness />);
  const box = screen.getByLabelText('Page');
  await userEvent.clear(box);
  await userEvent.type(box, '12');
  await userEvent.click(screen.getByRole('button', { name: 'Next' }));
  expect(seen).toEqual([8]);
  expect(box).toHaveValue(8);
});

it('drops a half-typed page when the page changes underneath it', async () => {
  // A poll, a filter, another pager on the same query: the page can move while
  // the box holds a draft, and a box still showing 12 under a pager on page 9
  // is a lie the reader is about to commit.
  const seen: number[] = [];
  const pager = (page: number) => <Pagination page={page} pageSize={10} total={400}
    variant="jump" onPageChange={(p) => seen.push(p)} />;
  const { rerender } = render(pager(7));
  const box = screen.getByLabelText('Page');
  await userEvent.clear(box);
  await userEvent.type(box, '12');
  expect(box).toHaveValue(12);

  rerender(pager(9));
  expect(box).toHaveValue(9);
  await userEvent.tab();          // the dropped draft commits nothing on the way out
  expect(seen).toEqual([]);
});

// ---- what the published types have to say for themselves -------------------

it('declares the page-size scale outright, naming no module a consumer cannot resolve', async () => {
  // react/src/index.ts used to re-export PAGE_SIZES straight from
  // '@apliteni/apliteni-ui', and the declaration emit copies a re-export
  // through: the shipped index.d.ts then pointed at a package whose "." export
  // carries no `types` condition, so a consumer got TS7016 with
  // skipLibCheck off and `any` with it on. react/src/apliteni-ui.d.ts, which
  // makes it work in here, is not published (`files` excludes react/src).
  //
  // What this does NOT reach: it reads the isolated declaration emit for
  // index.ts, not the bundle tsup writes to react/dist/index.d.ts — CI builds
  // that after this suite runs. It fails on the source shape that produced the
  // broken artifact.
  const ts = (await import('typescript')).default;
  const { readFileSync } = await import('node:fs');
  const path = (await import('node:path')).default;
  // From this file's own path, not from cwd: `vitest run` and `vitest --root
  // react` start in different directories and only one of them is the workspace.
  const entry = path.join(path.dirname(expect.getState().testPath!), 'index.ts');
  const source = readFileSync(entry, 'utf8');
  expect(source).toContain('PAGE_SIZES');   // the subject is in the file this read

  // fileName carries the .ts extension the source has: told it is already a
  // declaration, the emitter refuses the job.
  const emitted = ts.transpileDeclaration(source, { fileName: 'index.ts' }).outputText;
  expect(emitted).not.toContain('@apliteni/apliteni-ui');
  expect(emitted).toMatch(/declare const PAGE_SIZES: readonly number\[\]/);
  expect(emitted).toMatch(/declare const DEFAULT_PAGE_SIZE: number/);
});

// ---- focus at an end: disabled-not-removed, and the recovery it needs --------
//
// A control at an end is disabled rather than removed (see the file header of
// src/components/pagination.js), and a browser blurs a control the moment it
// becomes disabled: a reader who pressed Next into the last page is left on
// <body>, and their next Tab starts from the top of the document. jsdom does NOT
// blur on disable — the dead control keeps focus — so where the browser case
// matters the tests below blur by hand, exactly as the browser would, and every
// assertion is on `document.activeElement` either way.

function EndHarness({ start, loadingFor = 0 }: { start: number; loadingFor?: number }) {
  const [page, setPage] = useState(start);
  const [loading, setLoading] = useState(false);
  return <>
    <Pagination page={page} pageSize={10} total={490} loading={loading}
      onPageChange={(p) => {
        setPage(p);
        if (loadingFor) setLoading(true);
      }} />
    <button onClick={() => setLoading(false)}>Arrived</button>
    <button onClick={() => setPage(49)}>Parent jumps to the end</button>
  </>;
}
const named = (name: string) => screen.getByRole('button', { name });
// jsdom's blur() returns early on a disabled element — it is not a focusable
// area — so the browser's drop to <body> is reproduced through a focusable
// stand-in that takes focus and gives it straight up.
function dropFocusToBody() {
  const sink = document.createElement('input');
  document.body.appendChild(sink);
  sink.focus();
  sink.blur();
  sink.remove();
}

it('moves focus to the step that still has somewhere to go when Next runs into the end', async () => {
  render(<EndHarness start={48} />);
  named('Next').focus();
  await userEvent.keyboard('{Enter}');
  expect(named('Next')).toBeDisabled();
  expect(document.activeElement).toBe(named('Prev'));
});

it('does the same at the other end, for First and for Prev', async () => {
  const first = render(<EndHarness start={3} />);
  named('First').focus();
  await userEvent.keyboard('{Enter}');
  expect(named('First')).toBeDisabled();
  expect(document.activeElement).toBe(named('Next'));
  first.unmount();

  render(<EndHarness start={2} />);
  named('Prev').focus();
  await userEvent.keyboard('{Enter}');
  expect(named('Prev')).toBeDisabled();
  expect(document.activeElement).toBe(named('Next'));
});

it('recovers from Last as well, onto the nearest step that is still live', async () => {
  // Next is dead at the last page too, so the nearest live step from Last is Prev.
  // The body case — what a browser leaves focus on — is driven by hand in the
  // loading test below; here jsdom keeps focus on the dead control.
  render(<EndHarness start={20} />);
  const last = named('Last');
  last.focus();
  await userEvent.keyboard('{Enter}');
  expect(document.activeElement).toBe(named('Prev'));
});

it('takes focus nowhere when the pager did not cause the loss', async () => {
  // A parent moving the page is not a press. Focus that sat on Next without
  // pressing it stays there — even though Next has just gone dead — because
  // nothing the reader did in the strip asked for a move.
  render(<EndHarness start={40} />);
  named('Next').focus();
  // Moved by something else on the page, without focus leaving Next: the
  // outside button's handler is invoked directly rather than clicked.
  await act(async () => { named('Parent jumps to the end').click(); });
  expect(named('Next')).toBeDisabled();
  expect(document.activeElement).toBe(named('Next'));

  // And focus somewhere else entirely is never pulled into the strip.
  named('Arrived').focus();
  await act(async () => { named('Parent jumps to the end').click(); });
  expect(document.activeElement).toBe(named('Arrived'));
});

it('waits out a load, then puts focus back where the reader pressed', async () => {
  // A server-paged strip disables every control while it loads, so every press
  // loses focus, not only a press into an end. Nothing moves while it is busy;
  // once the page has arrived the reader is put back on the control they
  // pressed, or on the nearest live one if that has run out of pages.
  render(<EndHarness start={10} loadingFor={1} />);
  const next = named('Next');
  next.focus();
  await userEvent.keyboard('{Enter}');
  expect(next).toBeDisabled();                // busy
  dropFocusToBody();                          // what the browser does to a disabled control
  expect(document.activeElement).toBe(document.body);
  await act(async () => { named('Arrived').click(); });   // .click() moves no focus
  expect(next).toBeEnabled();
  expect(document.activeElement).toBe(next);
});

it('leaves focus where the reader took it while the page was loading', async () => {
  // The press is only a licence to recover focus the press lost. A reader who
  // moved on while the page loaded has put focus somewhere on purpose.
  render(<EndHarness start={10} loadingFor={1} />);
  named('Next').focus();
  await userEvent.keyboard('{Enter}');
  named('Parent jumps to the end').focus();    // the reader moved on
  await act(async () => { named('Arrived').click(); });
  expect(document.activeElement).toBe(named('Parent jumps to the end'));
});
