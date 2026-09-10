import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { DEFAULT_PAGE_SIZE } from '@apliteni/apliteni-ui';
import { DataTable, sortTableRows, type Column, type TableSort } from './DataTable';
import { ServerPaged } from './DataTable.stories';

type Row = { name: string; clicks: number };
const rows: Row[] = [
  { name: 'A', clicks: 10 }, { name: 'B', clicks: 30 }, { name: 'C', clicks: 20 },
];
const columns: Column<Row>[] = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'clicks', label: 'Clicks', num: true, sortable: true },
];

function Harness() {
  const [sel, setSel] = useState<Set<string>>(new Set());
  return (
    <DataTable columns={columns} rows={rows} pageSize={2}
      selected={sel}
      onToggle={(n) => setSel((s) => { const x = new Set(s); x.has(n) ? x.delete(n) : x.add(n); return x; })}
      onTogglePage={(ns) => setSel((s) => {
        const x = new Set(s);
        const all = ns.every((n) => x.has(n));
        ns.forEach((n) => (all ? x.delete(n) : x.add(n)));
        return x;
      })} />
  );
}

it('sorts by a column ascending on second click of default-desc', async () => {
  render(<Harness />);
  await userEvent.click(screen.getByText('Clicks'));           // default desc → B(30),C(20)
  const first = screen.getAllByRole('row')[1];
  expect(within(first).getByText('B')).toBeInTheDocument();
});

it('paginates (pageSize 2 of 3 rows → the first two)', () => {
  render(<Harness />);
  expect(screen.getByRole('navigation', { name: 'Pagination' })).toBeInTheDocument();
  expect(screen.getByText('1–2 of 3')).toBeInTheDocument();
  expect(screen.getAllByRole('row')).toHaveLength(3);   // header + 2
});

it('toggles a row selection', async () => {
  render(<Harness />);
  const boxes = screen.getAllByRole('checkbox');       // [selectAll, row0, row1]
  await userEvent.click(boxes[1]);
  expect(boxes[1]).toBeChecked();
});

it('toggles select-all for the visible page', async () => {
  render(<Harness />);
  const boxes = screen.getAllByRole('checkbox');       // [selectAll, row0, row1]
  await userEvent.click(boxes[0]);
  expect(boxes[1]).toBeChecked();
  expect(boxes[2]).toBeChecked();
  await userEvent.click(boxes[0]);
  expect(boxes[1]).not.toBeChecked();
  expect(boxes[2]).not.toBeChecked();
});


it('omits selection controls when the consumer has no selection action', () => {
  render(<DataTable columns={columns} rows={rows} selectable={false} />);
  expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  expect(screen.getAllByRole('columnheader')).toHaveLength(columns.length);
  expect(screen.getAllByRole('row')).toHaveLength(rows.length + 1);
});

it('keeps a sibling list in the controlled table order, including stable ties and external changes', async () => {
  const source = [...rows, { name: 'D', clicks: 20 }];
  function Controlled() {
    const [sort, setSort] = useState<TableSort<Row>>({ key: 'clicks', dir: -1 });
    return <>
      <DataTable columns={columns} rows={source} pageSize={source.length} selectable={false}
        sort={sort} onSortChange={setSort} />
      <ol aria-label="Cards">{sortTableRows(source, sort).map(row => <li key={row.name}>{row.name}</li>)}</ol>
      <button onClick={() => setSort({ key: undefined, dir: -1 })}>Original order</button>
    </>;
  }
  render(<Controlled />);
  const order = () => screen.getAllByRole('row').slice(1).map(row => within(row).getAllByRole('cell')[0].textContent);
  const cards = () => within(screen.getByRole('list', { name: 'Cards' })).getAllByRole('listitem').map(row => row.textContent);
  expect(order()).toEqual(['B', 'C', 'D', 'A']);
  expect(cards()).toEqual(order());
  screen.getByRole('button', { name: 'Clicks' }).focus();
  await userEvent.keyboard('{Enter}');
  expect(order()).toEqual(['A', 'C', 'D', 'B']);
  expect(cards()).toEqual(order());
  expect(screen.getByRole('columnheader', { name: 'Clicks' })).toHaveAttribute('aria-sort', 'ascending');
  await userEvent.click(screen.getByRole('button', { name: 'Original order' }));
  expect(order()).toEqual(['A', 'B', 'C', 'D']);
  expect(cards()).toEqual(order());
  expect(source.map(row => row.name)).toEqual(['A', 'B', 'C', 'D']);
});

it('returns to the first page when something other than a header changes the sort', async () => {
  const source: Row[] = [
    { name: 'A', clicks: 1 }, { name: 'B', clicks: 2 }, { name: 'C', clicks: 3 },
    { name: 'D', clicks: 4 }, { name: 'E', clicks: 5 }, { name: 'F', clicks: 6 },
  ];
  function Controlled() {
    const [sort, setSort] = useState<TableSort<Row>>({ key: 'name', dir: 1 });
    return <>
      {/* A FRESH OBJECT EVERY RENDER. The page must follow the sort's value, not its
          identity — an owner that builds this inline re-renders constantly. */}
      <DataTable columns={columns} rows={source} pageSize={2} selectable={false}
        sort={{ key: sort.key, dir: sort.dir }} onSortChange={setSort} />
      <button onClick={() => setSort((s) => ({ ...s }))}>Re-render</button>
      <button onClick={() => setSort({ key: 'clicks', dir: -1 })}>Newest first</button>
    </>;
  }
  render(<Controlled />);
  const order = () => screen.getAllByRole('row').slice(1).map(row => within(row).getAllByRole('cell')[0].textContent);

  await userEvent.click(screen.getByRole('button', { name: 'Next' }));
  expect(screen.getByText('3–4 of 6')).toBeInTheDocument();
  expect(order()).toEqual(['C', 'D']);

  await userEvent.click(screen.getByRole('button', { name: 'Re-render' }));
  expect(screen.getByText('3–4 of 6')).toBeInTheDocument();
  expect(order()).toEqual(['C', 'D']);

  await userEvent.click(screen.getByRole('button', { name: 'Newest first' }));
  expect(screen.getByText('1–2 of 6')).toBeInTheDocument();
  expect(order()).toEqual(['F', 'E']);
});

it('hands back a list of its own even when there is no sort key', () => {
  const source: Row[] = [...rows];
  const ordered = sortTableRows(source, { key: undefined, dir: -1 });
  expect(ordered).toEqual(source);
  expect(ordered).not.toBe(source);
  ordered.reverse();
  expect(source.map(row => row.name)).toEqual(['A', 'B', 'C']);
});

it('announces the sorted column whether or not its header offers a sort control', () => {
  const oneSortable: Column<Row>[] = [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'clicks', label: 'Clicks', num: true },
  ];
  const sorted = render(<DataTable columns={oneSortable} rows={rows} pageSize={3} selectable={false}
    sort={{ key: 'clicks', dir: -1 }} onSortChange={() => {}} />);
  const clicks = screen.getByRole('columnheader', { name: 'Clicks' });
  expect(clicks).toHaveAttribute('aria-sort', 'descending');
  // The announcement is the whole fix: the header stays non-interactive.
  expect(within(clicks).queryByRole('button')).toBeNull();
  expect(screen.getByRole('columnheader', { name: 'Name' })).toHaveAttribute('aria-sort', 'none');
  sorted.unmount();

  // A column that neither sorts nor is sorted by says nothing at all.
  render(<DataTable columns={oneSortable} rows={rows} pageSize={3} selectable={false} />);
  expect(screen.getByRole('columnheader', { name: 'Clicks' })).not.toHaveAttribute('aria-sort');
});

// ---- the page: controlled by its owner, or the table's own ------------------

it('renders the rows it is handed and never slices them when the page is controlled', async () => {
  // A server-paged surface: these three rows ARE page 2, and the range comes
  // from page/pageSize/total rather than from the rows in hand.
  const seen: number[] = [];
  render(<DataTable columns={columns} rows={rows} selectable={false}
    sort={{ key: undefined, dir: -1 }} onSortChange={() => {}}
    page={2} pageSize={2} total={10} onPageChange={(p) => seen.push(p)} />);
  const order = () => screen.getAllByRole('row').slice(1).map(row => within(row).getAllByRole('cell')[0].textContent);
  expect(order()).toEqual(['A', 'B', 'C']);
  expect(screen.getByText('3–4 of 10')).toBeInTheDocument();

  // The table asks; it does not turn the page itself.
  await userEvent.click(screen.getByRole('button', { name: 'Next' }));
  expect(seen).toEqual([3]);
  expect(order()).toEqual(['A', 'B', 'C']);
});

it('takes the range from the caller when the page is controlled, whatever the row count', () => {
  render(<DataTable columns={columns} rows={rows} selectable={false}
    page={4} pageSize={25} total={4812} onPageChange={() => {}} />);
  expect(screen.getByText('76–100 of 4,812')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Last' })).toHaveAttribute('data-page', '193');
});

it('draws Prev and Next alone when the caller cannot count the result', () => {
  render(<DataTable columns={columns} rows={rows} selectable={false}
    page={2} pageSize={2} total={null} hasMore onPageChange={() => {}} />);
  expect(screen.getByRole('navigation')).toHaveClass('ui-pager--open');
  expect(screen.queryAllByRole('button', { name: /First|Last/ })).toHaveLength(0);
  expect(screen.getByText('Page 2')).toBeInTheDocument();
});

it('asks its owner for the first page when a header changes the sort', async () => {
  const seen: number[] = [];
  render(<DataTable columns={columns} rows={rows} selectable={false}
    page={3} pageSize={2} total={10} onPageChange={(p) => seen.push(p)} />);
  await userEvent.click(screen.getByRole('button', { name: /Clicks/ }));
  expect(seen).toEqual([1]);
});

it('renders no pager at all when the consumer supplies its own', () => {
  render(<DataTable columns={columns} rows={rows} pageSize={2} selectable={false} pager={false} />);
  expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  expect(screen.getAllByRole('row')).toHaveLength(3);   // still paginated: header + 2
});

it('draws no pager for one page of content, and keeps one that still offers a size', () => {
  // GOV.UK: "Do not show pagination if there's only one page of content."
  const one = render(<DataTable columns={columns} rows={rows} pageSize={100} selectable={false} />);
  expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  one.unmount();

  render(<DataTable columns={columns} rows={rows} pageSize={100} selectable={false}
    pageSizes={[25, 100]} />);
  expect(screen.getByRole('navigation')).toHaveClass('ui-pager--single');
  expect(screen.getByLabelText('Rows')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Next' })).not.toBeInTheDocument();
});

it('starts on the page size the kit ships rather than a number of its own', () => {
  const many: Row[] = Array.from({ length: 8 }, (_, i) => ({ name: `R${i}`, clicks: i }));
  render(<DataTable columns={columns} rows={many} selectable={false} />);
  expect(DEFAULT_PAGE_SIZE).toBeGreaterThan(8);
  expect(screen.getAllByRole('row')).toHaveLength(many.length + 1);
});

it('repages on a size the reader picks, and returns them to the first page', async () => {
  const source: Row[] = Array.from({ length: 6 }, (_, i) => ({ name: `R${i}`, clicks: i }));
  const seen: number[] = [];
  render(<DataTable columns={columns} rows={source} selectable={false} pageSizes={[2, 4]}
    onPageSizeChange={(s) => seen.push(s)} sort={{ key: undefined, dir: -1 }} onSortChange={() => {}} />);
  expect(screen.getAllByRole('row')).toHaveLength(source.length + 1);   // one page at the default

  await userEvent.selectOptions(screen.getByLabelText('Rows'), '2');
  expect(seen).toEqual([2]);
  expect(screen.getByText('1–2 of 6')).toBeInTheDocument();
  expect(screen.getAllByRole('row')).toHaveLength(3);

  await userEvent.click(screen.getByRole('button', { name: 'Next' }));
  expect(screen.getByText('3–4 of 6')).toBeInTheDocument();
  await userEvent.selectOptions(screen.getByLabelText('Rows'), '4');
  expect(screen.getByText('1–4 of 6')).toBeInTheDocument();
});

it('stops taking input while a page loads, and keeps the numbers legible', () => {
  render(<DataTable columns={columns} rows={rows} selectable={false} loading
    page={2} pageSize={2} total={10} onPageChange={() => {}} />);
  expect(screen.getByRole('navigation')).toHaveAttribute('aria-busy', 'true');
  expect(screen.getByText('3–4 of 10')).toBeInTheDocument();
  for (const name of ['First', 'Prev', 'Next', 'Last']) {
    expect(screen.getByRole('button', { name })).toBeDisabled();
  }
});

it('shows the size it is given and reports the one the reader picked', async () => {
  // A `pageSize` prop is the caller's statement of the size in use, exactly as
  // `sort` is: the table reports the choice and waits to be told.
  const source: Row[] = Array.from({ length: 6 }, (_, i) => ({ name: `R${i}`, clicks: i }));
  const seen: number[] = [];
  render(<DataTable columns={columns} rows={source} selectable={false} pageSize={2}
    pageSizes={[2, 4]} onPageSizeChange={(s) => seen.push(s)}
    sort={{ key: undefined, dir: -1 }} onSortChange={() => {}} />);
  await userEvent.selectOptions(screen.getByLabelText('Rows'), '4');
  expect(seen).toEqual([4]);
  expect(screen.getByText('1–2 of 6')).toBeInTheDocument();
  expect(screen.getAllByRole('row')).toHaveLength(3);
});

it('names its pager, so two tables on one page publish two distinguishable landmarks', () => {
  // Axe will never report this: `landmark-unique` is a best-practice rule and
  // stories/a11y.test.js runs only the WCAG A/AA tags. So it is asserted here.
  render(<>
    <DataTable columns={columns} rows={rows} pageSize={2} selectable={false}
      pagerLabel="Invoice pages" />
    <DataTable columns={columns} rows={rows} pageSize={2} selectable={false}
      pagerLabel="Transaction pages" />
  </>);
  const names = screen.getAllByRole('navigation').map((nav) => nav.getAttribute('aria-label'));
  expect(names).toEqual(['Invoice pages', 'Transaction pages']);
  expect(new Set(names).size).toBe(names.length);
});

it('falls back to one plain name when a caller does not supply one', () => {
  render(<DataTable columns={columns} rows={rows} pageSize={2} selectable={false} />);
  expect(screen.getByRole('navigation')).toHaveAttribute('aria-label', 'Pagination');
});

// ---- what a controlled table may not do to the page it was handed ----------

// Page 2 as a server ordered and cut it: not sorted by any column this table
// could name, which is the point — the order is somebody else's.
const served: Row[] = [
  { name: 'zeta', clicks: 3 }, { name: 'alpha', clicks: 1 }, { name: 'mike', clicks: 2 },
];
const rowNames = () => screen.getAllByRole('row').slice(1)
  .map((row) => within(row).getAllByRole('cell')[0].textContent);

it('leaves a controlled page in the order it arrived, and claims no sort it is not applying', () => {
  render(<DataTable columns={columns} rows={served} selectable={false}
    page={2} pageSize={3} total={300} onPageChange={() => {}} />);
  expect(rowNames()).toEqual(['zeta', 'alpha', 'mike']);
  // Nothing here knows what the server ordered by, so no header may say. A
  // direction caret is the loudest version of the claim; aria-sort is the one a
  // screen reader hears.
  for (const name of ['Name', 'Clicks']) {
    const th = screen.getByRole('columnheader', { name });
    expect(th).not.toHaveAttribute('aria-sort');
    expect(th.textContent).not.toMatch(/[▲▼]/);
  }
});

it('does not reorder a controlled page even when the sort it is told about names a column', () => {
  render(<DataTable columns={columns} rows={served} selectable={false}
    sort={{ key: 'clicks', dir: 1 }} onSortChange={() => {}}
    page={2} pageSize={3} total={300} onPageChange={() => {}} />);
  expect(rowNames()).toEqual(['zeta', 'alpha', 'mike']);
  // A controlled sort is still announced: the owner stated it, so the table can.
  expect(screen.getByRole('columnheader', { name: 'Clicks' })).toHaveAttribute('aria-sort', 'ascending');
});

it('takes the size of a controlled page from the page itself when no size is named', () => {
  const page1: Row[] = Array.from({ length: 20 }, (_, i) => ({ name: `R${i}`, clicks: i }));
  render(<DataTable columns={columns} rows={page1} selectable={false}
    page={1} total={5000} onPageChange={() => {}} />);
  expect(screen.getAllByRole('row')).toHaveLength(page1.length + 1);
  expect(screen.getByText('1–20 of 5,000')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Last' })).toHaveAttribute('data-page', '250');
});

it('reports one size change and asks for no page when the page is controlled', async () => {
  // A size and a page turn in the same breath: the second call carries the old
  // size, and an owner that refetches on either lands back where it started.
  const calls: string[] = [];
  render(<DataTable columns={columns} rows={served} selectable={false}
    page={2} pageSize={3} total={300} pageSizes={[3, 5]}
    onPageChange={(p) => calls.push(`page ${p}`)}
    onPageSizeChange={(s) => calls.push(`size ${s}`)} />);
  await userEvent.selectOptions(screen.getByLabelText('Rows'), '5');
  expect(calls).toEqual(['size 5']);
});

it('coerces a page size exactly as the pager does, so the two can never disagree', async () => {
  const source: Row[] = Array.from({ length: 6 }, (_, i) => ({ name: `R${i}`, clicks: i }));
  // A fraction: the pager truncates it, so the slice has to truncate it too.
  // Page 1 agrees by accident — `slice(0, 2.5)` is two rows — so the case is
  // page 2, where `slice(2.5, 5)` hands over three under a range promising two.
  const fraction = render(<DataTable columns={columns} rows={source} selectable={false}
    pageSize={2.5} />);
  await userEvent.click(screen.getByRole('button', { name: 'Next' }));
  expect(screen.getByText('3–4 of 6')).toBeInTheDocument();
  // Two rows, because the range says two. (R3 before R2: this table sorts
  // itself, and its default is the first sortable column descending.)
  expect(rowNames()).toEqual(['R3', 'R2']);
  fraction.unmount();

  // `Number(searchParams.get('size'))` on a URL that carries no size. The pager
  // already falls back to the kit's default; a table that does not renders an
  // empty page under a pager announcing a full one.
  const nan = render(<DataTable columns={columns} rows={source} selectable={false}
    pageSize={Number.NaN} pageSizes={[2, 4]} />);
  expect(screen.getAllByRole('row')).toHaveLength(source.length + 1);
  expect(screen.getByText('1–6 of 6')).toBeInTheDocument();
  nan.unmount();

  // Zero is no size rather than a size of one, as the factory reads it: clamping
  // it to 1 turns `?size=0` into six pages of one row.
  render(<DataTable columns={columns} rows={source} selectable={false}
    pageSize={0} pageSizes={[2, 4]} />);
  expect(screen.getAllByRole('row')).toHaveLength(source.length + 1);
  expect(screen.getByText('1–6 of 6')).toBeInTheDocument();
});

// ---- the type a controlled table has to satisfy ----------------------------
//
// The pager arms are a discriminated union, so what a controlled table must
// state is a compile-time rule with nothing to assert at runtime: a call that
// says `page` and nothing about the size of the result renders a strip whose
// every control is dead, and no test that renders it can say why. So this one
// asks the compiler. It types the cases below against the real DataTable.tsx
// through a virtual file, and checks the errors land on the cases that earn
// them — the clean pair is what keeps the erroring pair from being a probe that
// rejects everything.
//
// What it does NOT reach: only the pager arms are typed here, and only through
// this file's own diagnostics. The declarations tsup emits are a separate
// question, asked in Pagination.test.tsx.
it('accepts a controlled table that says what its pager can say, and rejects one that does not', async () => {
  const ts = (await import('typescript')).default;
  const path = (await import('node:path')).default;
  const { existsSync } = await import('node:fs');
  // From this file's own path. Not import.meta.url — under the jsdom environment
  // that is an http:// URL — and not cwd, which is the directory vitest was
  // started in rather than the one the sources are in.
  const src = path.dirname(expect.getState().testPath!);
  const probe = path.join(src, 'page-arms.probe.tsx');   // virtual, never written
  const ambient = path.join(src, 'apliteni-ui.d.ts');
  const config = path.join(src, '..', 'tsconfig.json');
  // A path that has moved would type an empty program and report no errors at
  // all, which is the answer two of the four cases are watching for.
  for (const real of [path.join(src, 'DataTable.tsx'), ambient, config]) {
    expect(existsSync(real), `${real} is not on disk`).toBe(true);
  }

  const cases: [string, boolean, string][] = [
    ['a page and a row count', false,
      '<DataTable columns={columns} rows={rows} selectable={false} page={2} total={300} onPageChange={f} />'],
    ['a page, no count, and whether more follows', false,
      '<DataTable columns={columns} rows={rows} selectable={false} page={2} total={null} hasMore onPageChange={f} />'],
    ['a page and nothing about the result', true,
      '<DataTable columns={columns} rows={rows} selectable={false} page={2} onPageChange={f} />'],
    ['a page, no count, and no word on whether more follows', true,
      '<DataTable columns={columns} rows={rows} selectable={false} page={2} total={null} onPageChange={f} />'],
    // The published scale is readonly, and the README passes it straight in.
    ['the published page sizes, handed to the table', false,
      '<DataTable columns={columns} rows={rows} selectable={false} pageSizes={PAGE_SIZES} />'],
    ['the published page sizes, handed to the pager', false,
      '<Pagination total={400} pageSizes={PAGE_SIZES} />'],
  ];
  const preamble = [
    "import { DataTable, Pagination, PAGE_SIZES, type Column } from './index';",
    "type Row = { name: string };",
    "const columns: Column<Row>[] = [{ key: 'name', label: 'Name' }];",
    "const rows: Row[] = [{ name: 'A' }];",
    "const f = (_page: number) => {};",
  ];
  const source = [...preamble, ...cases.map(([, , jsx], i) => `export const case${i} = ${jsx};`)].join('\n');

  const read = ts.readConfigFile(config, ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(read.config, ts.sys, path.join(src, '..'));
  // `types` names vitest's globals, which this virtual file does not use and
  // whose absence would be an error of its own.
  const options = { ...parsed.options, noEmit: true, types: [] };
  const host = ts.createCompilerHost(options, true);
  const inherited = host.getSourceFile.bind(host);
  host.getSourceFile = (name, ...rest) => (name === probe
    ? ts.createSourceFile(name, source, ts.ScriptTarget.ES2020, true, ts.ScriptKind.TSX)
    : inherited(name, ...rest));
  host.fileExists = (name) => name === probe || ts.sys.fileExists(name);
  host.readFile = (name) => (name === probe ? source : ts.sys.readFile(name));

  const program = ts.createProgram([probe, ambient], options, host);
  const lines = ts.getPreEmitDiagnostics(program)
    .filter((d) => d.file?.fileName === probe && d.start !== undefined)
    .map((d) => ({
      line: d.file!.getLineAndCharacterOfPosition(d.start!).line,
      text: ts.flattenDiagnosticMessageText(d.messageText, ' '),
    }));

  const verdict = cases.map(([name], i) => {
    const here = lines.filter((d) => d.line === preamble.length + i);
    return `${name}: ${here.length ? here[0].text.slice(0, 90) : 'compiles'}`;
  });
  // The verdicts ride along as the message, so a failure names the case and the
  // compiler's own words rather than a row of booleans.
  expect(verdict.map((v, i) => v.startsWith(`${cases[i][0]}: compiles`)), verdict.join('\n'))
    .toEqual(cases.map(([, bad]) => !bad));
  // Nothing may go wrong in the preamble: an error there would fail every case
  // for a reason that has nothing to do with the pager.
  expect(lines.filter((d) => d.line < preamble.length)).toEqual([]);
}, 30_000);

it('turns the shipped ServerPaged story to the size the reader picked, and leaves it there', async () => {
  // The story, not a copy of it: this is the surface the kit publishes as the
  // way to page on a server, and one pick used to fire two callbacks — the
  // second carrying the size the first had just replaced, off a closure a
  // second late. The reader picked 5 and stayed on 2.
  const Story = ServerPaged.render as unknown as () => React.ReactElement;
  render(<Story />);
  const idle = () => waitFor(() =>
    expect(screen.getByRole('navigation')).not.toHaveAttribute('aria-busy'));

  expect(screen.getByText('1–2 of 5')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Next' }));
  await idle();
  expect(screen.getByText('3–4 of 5')).toBeInTheDocument();

  await userEvent.selectOptions(screen.getByLabelText('Rows'), '5');
  await idle();
  expect(screen.getByLabelText('Rows')).toHaveValue('5');
  expect(screen.getByText('1–5 of 5')).toBeInTheDocument();
  expect(screen.getAllByRole('row')).toHaveLength(6);
});
