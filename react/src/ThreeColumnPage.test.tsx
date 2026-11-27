import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ThreeColumnPage, type ThreeColumn } from './ThreeColumnPage';
import { Library } from './showcases/Library';
import { MonthClose, type MonthCloseStage } from './showcases/MonthClose';

// Limits: JSDOM has no layout and does not apply media queries. The DOM half reads the
// landmarks, the header row, the depth, the back link and the focus. matchMedia is stubbed to
// pick the width. The CSS half reads the column rules as text. stories/three-column.test.js
// measures them in a real browser.
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'ThreeColumnPage.css'), 'utf8');
const at = (width: number) => vi.stubGlobal('matchMedia', (query: string) => {
  const max = /max-width: (\d+)px/.exec(query);
  return { matches: max ? width <= Number(max[1]) : false, addEventListener() {}, removeEventListener() {} };
});
const cols = (third = true): [ThreeColumn, ThreeColumn, ThreeColumn?] => [
  { title: 'Folders', count: 5, countLabel: '5 folders', children: <button type="button">Shared</button> },
  { title: 'Shared', tools: <button type="button">Upload</button>, children: <button type="button">Contacts</button> },
  third ? { title: 'Contacts', children: <p>Facts</p> } : undefined,
];
const page = (props: Partial<Parameters<typeof ThreeColumnPage>[0]> = {}) => <ThreeColumnPage columns={cols()} {...props} />;
const root = () => document.querySelector<HTMLElement>('.ui-columns')!;

it('gives each column a region named by its h2, in the order of the chain, and no h1', () => {
  render(page());
  expect(screen.queryByRole('heading', { level: 1 })).toBeNull();
  expect(screen.getAllByRole('region').map(region => region.getAttribute('aria-labelledby') && document.getElementById(region.getAttribute('aria-labelledby')!)?.textContent))
    .toEqual(['Folders', 'Shared', 'Contacts']);
  // The header row: the title, then the count alone after it, then the tools.
  const head = document.querySelector('[data-column="1"] > .ui-columns__head')!;
  expect([...head.children].map(el => el.className)).toEqual(['ui-card__title', 'ui-columns__count', 'ui-sr']);
  expect(head.querySelector('.ui-columns__count')).toHaveAttribute('aria-hidden', 'true');
  expect(head).toHaveTextContent('5 folders');
  expect(document.querySelector('[data-column="2"] > .ui-columns__head > .ui-card__tools')).toHaveTextContent('Upload');
  // No count, no count element.
  expect(document.querySelector('[data-column="3"] .ui-columns__count')).toBeNull();
});

it('opens at depth 2, follows the depth it is given, and stops at 2 with no third column', () => {
  render(page());
  expect(root()).toHaveAttribute('data-depth', '2');
  cleanup();
  render(page({ depth: 3 }));
  expect(root()).toHaveAttribute('data-depth', '3');
  cleanup();
  // An empty parent: the children are the last column, and they take its space.
  render(page({ depth: 3, columns: cols(false) }));
  expect(root()).toHaveAttribute('data-depth', '2');
  expect(document.querySelectorAll('.ui-columns__col')).toHaveLength(2);
  expect(css).toMatch(/\.ui-columns__col--2:last-child \{ grid-column: 2 \/ -1; \}/);
});

it.each([
  [1280, 3, null], [820, 2, null], [820, 3, 'Folders'], [390, 1, null], [390, 2, 'Folders'], [390, 3, 'Shared'],
] as const)('at %ipx and depth %i, the back link names %s', (width, depth, label) => {
  at(width);
  render(page({ depth }));
  const link = screen.queryByRole('link', { name: /^Back to/ });
  if (label === null) return expect(link).toBeNull();
  expect(link).toHaveAccessibleName(`Back to ${label}`);
  expect(link).toHaveTextContent(label);
});

it('goes one step up the chain from the back link', () => {
  at(390);
  const onDepthChange = vi.fn();
  render(<ThreeColumnPage columns={cols()} defaultDepth={3} onDepthChange={onDepthChange} />);
  const link = screen.getByRole('link', { name: 'Back to Shared' });
  expect(link).toHaveAttribute('href', '#');
  expect(fireEvent.click(link)).toBe(false);
  expect(onDepthChange).toHaveBeenCalledWith(2);
  expect(root()).toHaveAttribute('data-depth', '2');
  expect(screen.getByRole('link', { name: 'Back to Folders' })).toBeInTheDocument();
  cleanup();
  // With an address for each depth, the link goes there, and the page follows its depth prop.
  render(page({ depth: 3, depthHref: depth => `#/depth-${depth}`, onDepthChange }));
  const real = screen.getByRole('link', { name: 'Back to Shared' });
  expect(real).toHaveAttribute('href', '#/depth-2');
  expect(fireEvent.click(real)).toBe(true);
  expect(root()).toHaveAttribute('data-depth', '3');
});

// An uncontrolled page goes down the chain from a row, so a phone reader who goes back can
// open a row again.
it('goes one step down the chain from a row that calls open, with or without depth', () => {
  at(390);
  const onDepthChange = vi.fn();
  const rows = (): [ThreeColumn, ThreeColumn, ThreeColumn?] => [
    { title: 'Folders', children: open => <button type="button" onClick={open}>Shared</button> },
    { title: 'Shared', children: open => <button type="button" onClick={open}>Contacts</button> },
    { title: 'Contacts', children: open => <button type="button" onClick={open}>Stay</button> },
  ];
  render(<ThreeColumnPage columns={rows()} onDepthChange={onDepthChange} />);
  fireEvent.click(screen.getByRole('link', { name: 'Back to Folders' }));
  expect(root()).toHaveAttribute('data-depth', '1');
  fireEvent.click(screen.getByRole('button', { name: 'Shared' }));
  expect(root()).toHaveAttribute('data-depth', '2');
  fireEvent.click(screen.getByRole('button', { name: 'Contacts' }));
  expect(root()).toHaveAttribute('data-depth', '3');
  // The last column has no next column, so open keeps the depth.
  fireEvent.click(screen.getByRole('button', { name: 'Stay' }));
  expect(root()).toHaveAttribute('data-depth', '3');
  expect(onDepthChange.mock.calls.map(([to]) => to)).toEqual([1, 2, 3, 3]);
  cleanup();
  // A controlled page hears the step and keeps its depth prop.
  render(<ThreeColumnPage columns={rows()} depth={1} onDepthChange={onDepthChange} />);
  fireEvent.click(screen.getByRole('button', { name: 'Shared' }));
  expect(onDepthChange).toHaveBeenLastCalledWith(2);
  expect(root()).toHaveAttribute('data-depth', '1');
});

// Limits: JSDOM has no layout, so the page area is a stubbed ResizeObserver entry.
// stories/three-column.test.js measures the columns beside an open sidebar in a browser.
it('shows two columns in a page area of 860px or less, even in a wide window', () => {
  let report: ResizeObserverCallback = () => {};
  vi.stubGlobal('ResizeObserver', class { constructor(fn: ResizeObserverCallback) { report = fn; } observe() {} disconnect() {} });
  at(1280);
  render(page({ depth: 3 }));
  expect(screen.queryByRole('link', { name: /^Back to/ })).toBeNull();
  const area = (width: number) => act(() => report([{ contentRect: { width } } as ResizeObserverEntry], {} as ResizeObserver));
  area(860);
  expect(screen.getByRole('link', { name: 'Back to Folders' })).toBeInTheDocument();
  area(861);
  expect(screen.queryByRole('link', { name: /^Back to/ })).toBeNull();
  expect(root().parentElement).toHaveClass('ui-columns-area');
});

it('ends a long plain title in an ellipsis', () => {
  render(page());
  const words = document.querySelector('[data-column="1"] h2 > .ui-columns__words');
  expect(words).toHaveTextContent('Folders');
  expect(css).toMatch(/\.ui-columns__words \{[^}]*overflow: hidden; text-overflow: ellipsis; white-space: nowrap; \}/);
});

it('caps the title menu at its scroll height and draws a link row as a link', () => {
  render(page({ columns: [cols()[0], { ...cols()[1], menu: { scroll: 400, onSelect: vi.fn(),
    sections: [{ items: [{ label: 'Open folder', value: 'open', href: '#/folder' }] },
      { label: 'Sort by', items: [{ label: 'Name', value: 'name', selected: true }] }] } }, cols()[2]] }));
  fireEvent.click(within(document.querySelector<HTMLElement>('[data-column="2"] > .ui-columns__head')!).getByRole('button', { name: 'Shared' }));
  const menu = screen.getByRole('menu');
  expect(menu.closest<HTMLElement>('[style*="--ui-dropdown-cap"]')?.style.getPropertyValue('--ui-dropdown-cap')).toBe('400px');
  const link = within(menu).getByRole('menuitem', { name: 'Open folder' });
  expect(link.tagName).toBe('A');
  expect(link).toHaveAttribute('href', '#/folder');
});

// Limits: JSDOM does not follow a link's address, so this checks that the link keeps the
// parent's address through the click and the depth changes after it. stories/three-column.test.js
// reads the address that the browser lands on.
it('changes the depth only after the browser has followed the parent\'s address', async () => {
  at(390);
  const onDepthChange = vi.fn();
  const follow = (link: HTMLElement) => {
    let followed = '';
    link.addEventListener('click', () => { followed = link.getAttribute('href')!; });
    fireEvent.click(link);
    return followed;
  };
  render(<ThreeColumnPage columns={cols()} defaultDepth={3} depthHref={depth => `#/depth-${depth}`} onDepthChange={onDepthChange} />);
  expect(follow(screen.getByRole('link', { name: 'Back to Shared' }))).toBe('#/depth-2');
  expect(onDepthChange).not.toHaveBeenCalled();
  expect(root()).toHaveAttribute('data-depth', '3');
  await waitFor(() => expect(root()).toHaveAttribute('data-depth', '2'));
  expect(onDepthChange).toHaveBeenCalledWith(2);
  expect(screen.getByRole('link', { name: 'Back to Folders' })).toHaveAttribute('href', '#/depth-1');
  cleanup();
  // A click that opens a new tab keeps this page's depth.
  render(<ThreeColumnPage columns={cols()} defaultDepth={3} depthHref={depth => `#/depth-${depth}`} />);
  fireEvent.click(screen.getByRole('link', { name: 'Back to Shared' }), { ctrlKey: true });
  await new Promise(done => setTimeout(done));
  expect(root()).toHaveAttribute('data-depth', '3');
  cleanup();
  // The showcases keep the parent's address through the click.
  render(<Library folder="Shared" />);
  expect(follow(screen.getByRole('link', { name: 'Back to Shared' }))).toBe('#/library/Shared');
  await waitFor(() => expect(screen.getByRole('link', { name: 'Back to Folders' })).toBeInTheDocument());
  cleanup();
  render(<MonthClose depth={3} />);
  expect(follow(screen.getByRole('link', { name: 'Back to Month checks' }))).toBe('#/close/October');
  await waitFor(() => expect(root()).toHaveAttribute('data-depth', '2'));
});

it('renders with no ResizeObserver, and the window query names the columns on show', () => {
  vi.stubGlobal('ResizeObserver', undefined);
  at(820);
  render(page({ depth: 3 }));
  expect(screen.getByRole('link', { name: 'Back to Folders' })).toBeInTheDocument();
});

it('moves the focus to the open column\'s title when a move removes the focused row', () => {
  const { rerender } = render(page({ depth: 2 }));
  screen.getByRole('button', { name: 'Contacts' }).focus();
  // The page re-renders with the row gone, as a phone does when the reader goes back.
  rerender(<ThreeColumnPage depth={1} columns={[cols()[0], { title: 'Shared', children: null }, cols()[2]]} />);
  expect(screen.getByRole('heading', { name: 'Folders' })).toHaveFocus();
  // A move that keeps the focused row leaves the focus on it.
  screen.getByRole('button', { name: 'Shared' }).focus();
  rerender(page({ depth: 2 }));
  expect(screen.getByRole('button', { name: 'Shared' })).toHaveFocus();
  // Focus outside the page stays where it is.
  rerender(<><button type="button">Outside</button>{page({ depth: 3 })}</>);
  screen.getByRole('button', { name: 'Outside' }).focus();
  rerender(<><button type="button">Outside</button>{page({ depth: 1 })}</>);
  expect(screen.getByRole('button', { name: 'Outside' })).toHaveFocus();
});

it('makes the title a menu only when the column has menu rows', () => {
  const onSelect = vi.fn();
  render(page({ columns: [cols()[0], { ...cols()[1], menu: { header: <div className="ui-dropdown__head">3 files</div>, onSelect,
    sections: [{ items: [{ label: 'Export', value: 'export' }] },
      { label: 'Sort by', items: [{ label: 'Name', value: 'name', selected: false }, { label: 'Date', value: 'date', selected: true }] }] } }, cols()[2]] }));
  // Without menu rows the title is plain text.
  expect(within(document.querySelector<HTMLElement>('[data-column="1"] > .ui-columns__head')!).queryByRole('button')).toBeNull();
  // With them the h2 still names the column, and the trigger shows the title.
  expect(screen.getByRole('region', { name: 'Shared' })).toBeInTheDocument();
  const trigger = within(document.querySelector<HTMLElement>('[data-column="2"] > .ui-columns__head')!).getByRole('button', { name: 'Shared' });
  expect(trigger).toHaveClass('ui-dropdown__trigger', 'ui-columns__menu');
  expect(trigger).toHaveAttribute('aria-expanded', 'false');
  fireEvent.click(trigger);
  expect(trigger).toHaveAttribute('aria-expanded', 'true');
  const menu = screen.getByRole('menu');
  expect(menu).toHaveTextContent('3 files');
  // A row with `selected` is a single choice: the current one is checked and shows the kit's tick.
  expect(within(menu).getByRole('menuitem', { name: 'Export' })).not.toHaveAttribute('aria-checked');
  const date = within(menu).getByRole('menuitemradio', { name: 'Date' });
  expect(date).toHaveAttribute('aria-checked', 'true');
  expect(date).toHaveClass('ui-dropdown__item', 'is-selected');
  expect(date.querySelector('.ui-dropdown__tick svg')).not.toBeNull();
  expect(within(menu).getByRole('menuitemradio', { name: 'Name' })).toHaveAttribute('aria-checked', 'false');
  fireEvent.click(within(menu).getByRole('menuitemradio', { name: 'Name' }));
  expect(onSelect).toHaveBeenCalledWith('name', expect.objectContaining({ label: 'Name' }));
});

it('opens the title menu from the keyboard, walks it with the arrows and gives the focus back on Escape', () => {
  render(page({ columns: [cols()[0], { ...cols()[1], menu: { onSelect: vi.fn(),
    sections: [{ items: [{ label: 'Export', value: 'export' }] },
      { label: 'Sort by', items: [{ label: 'Name', value: 'name', selected: false }, { label: 'Date', value: 'date', selected: true }] }] } }, cols()[2]] }));
  const trigger = within(document.querySelector<HTMLElement>('[data-column="2"] > .ui-columns__head')!).getByRole('button', { name: 'Shared' });
  trigger.focus();
  fireEvent.keyDown(trigger, { key: 'ArrowDown' });
  expect(trigger).toHaveAttribute('aria-expanded', 'true');
  const rows = [...screen.getByRole('menu').querySelectorAll<HTMLElement>('[data-dd-item]')];
  expect(rows.map(row => row.getAttribute('role'))).toEqual(['menuitem', 'menuitemradio', 'menuitemradio']);
  expect(rows[0]).toHaveFocus();
  fireEvent.keyDown(rows[0], { key: 'ArrowDown' });
  expect(rows[1]).toHaveFocus();
  fireEvent.keyDown(rows[1], { key: 'Escape' });
  expect(trigger).toHaveAttribute('aria-expanded', 'false');
  expect(trigger).toHaveFocus();
});

it('holds the widths: column 1 240px, column 2 26% from 260px to --panel-sm, column 3 the rest', () => {
  // A page that resizes gives the first two widths in px.
  expect(css).toMatch(/\.ui-columns \{[^}]*grid-template-columns: var\(--ui-columns-1, 240px\) var\(--ui-columns-2, clamp\(260px, 26%, var\(--panel-sm\)\)\) minmax\(0, 1fr\);/);
  // Each column scrolls alone in the window under the band, and one line stands between two columns.
  expect(css).toMatch(/\.ui-columns \{[^}]*height: calc\(100dvh - var\(--ui-app-band, 0px\)\);/);
  // The content scrolls in a box below the header row, so the box's focus band shows its four sides.
  expect(css).toMatch(/\.ui-columns__scroll \{[^}]*overflow-y: auto; \}/);
  expect(css).toMatch(/\.ui-columns__scroll:focus-visible \{ outline: var\(--ring-scroll\); outline-offset: var\(--ring-scroll-offset\); \}/);
  expect(css).not.toMatch(/position: sticky/);
  render(page());
  for (const n of [1, 2, 3]) expect(document.querySelector(`[data-column="${n}"] > .ui-columns__head + .ui-columns__scroll`)).not.toBeNull();
  expect(css).toMatch(/\.ui-columns__col \+ \.ui-columns__col \{ border-inline-start: 1px solid var\(--border\); \}/);
  // The header row has one height in each column.
  expect(css).toMatch(/\.ui-columns__head \{[^}]*min-height: calc\(var\(--space-12\) \+ var\(--space-2\)\);/);
});

it('shows two neighbour columns in a page area of 860px and one column at 560px, and only at those widths', () => {
  const queries = [...css.matchAll(/@(media|container) ([^{]+)\{/g)].map(m => `${m[1]} ${m[2].trim()}`);
  expect(queries).toEqual(['container ui-columns (max-width: 860px)', 'media (max-width: 560px)', 'media (max-width: 560px) and (pointer: coarse)']);
  // The page area, not the window, is the container, so an open sidebar counts.
  expect(css).toMatch(/\.ui-columns-area \{ container: ui-columns \/ inline-size;/);
  const block = (q: string) => css.slice(css.indexOf(q)).split(/\n}\n/)[0];
  const tablet = block('@container ui-columns (max-width: 860px)');
  expect(tablet).toMatch(/grid-template-columns: minmax\(200px, 40%\) minmax\(0, 1fr\);/);
  expect(tablet).toMatch(/\.ui-columns:not\(\[data-depth='3'\]\) > \.ui-columns__col--3,\n  \.ui-columns\[data-depth='3'\] > \.ui-columns__col--1 \{ display: none; \}/);
  // The first column on show draws no line before it.
  expect(tablet).toMatch(/\.ui-columns\[data-depth='3'\] > \.ui-columns__col--2 \{ border-inline-start: 0; \}/);
  const phone = block('@media (max-width: 560px) {');
  expect(phone).toMatch(/\.ui-columns > \.ui-columns__col \{ display: none;[^}]*border-inline-start: 0; \}/);
  for (const n of [1, 2, 3]) expect(phone).toContain(`.ui-columns[data-depth='${n}'] > .ui-columns__col--${n}`);
});

// Limits: JSDOM lays nothing out, so this reads the tap layer and the gap as declarations.
// stories/tap-zone.test.js measures the layer in a browser.
it('gives each row a 44px target on a touch phone', () => {
  const touch = css.slice(css.indexOf('@media (max-width: 560px) and (pointer: coarse)'));
  expect(touch).toMatch(/\.ui-columns__list > \.ui-nav__list \{ gap: var\(--tap-gap\); --tap-clear-y: var\(--tap-gap\); \}/);
  expect(touch).toMatch(/\.ui-columns__list \.ui-nav__item::after,\n  \.ui-columns__head \.ui-columns__menu::after \{[^}]*height: min\(max\(100%, var\(--tap-min\)\), calc\(100% \+ var\(--tap-clear-y\)\)\);/);
  // The title menu: its layer stands on the button, in the 56px header row's clear space.
  expect(touch).toMatch(/\.ui-columns__head \{ --tap-clear-y: var\(--space-3\); \}/);
  expect(touch).toMatch(/\.ui-columns__head \.ui-columns__menu \{ position: relative; \}/);
});

// The folders showcase: a parent row ends with a chevron, and an empty folder gives its space
// to the files column, which says what is missing and offers an action.
it('replaces the files for a new folder, and an empty folder takes the open file\'s space', () => {
  render(<Library />);
  const folders = screen.getByRole('navigation', { name: 'Folders' });
  expect(within(folders).getByRole('button', { name: 'Shared 3 files' })).toHaveAttribute('aria-pressed', 'true');
  expect(folders.querySelectorAll('.ui-columns__into')).toHaveLength(5);
  expect(screen.getByRole('button', { name: 'Contacts 24 Nov' })).toHaveAttribute('aria-pressed', 'true');
  fireEvent.click(within(folders).getByRole('button', { name: 'Archive 2 files' }));
  expect(screen.getByRole('navigation', { name: 'Files in Archive' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /^Contacts/ })).toBeNull();
  expect(screen.getByRole('region', { name: 'Old plan' })).toBeInTheDocument();
  fireEvent.click(within(folders).getByRole('button', { name: 'Templates 0 files' }));
  expect(document.querySelectorAll('.ui-columns__col')).toHaveLength(2);
  expect(screen.getByRole('heading', { name: 'No files in Templates' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Upload file' })).toBeInTheDocument();
});

it('announces the wait while the files and the open file load', () => {
  render(<Library loading />);
  expect(screen.getAllByRole('status').map(s => s.textContent)).toEqual(expect.arrayContaining([expect.stringContaining('Loading the files')]));
  expect(document.querySelectorAll('.ui-skeleton, [class*="skeleton"]').length).toBeGreaterThan(0);
});

it('sorts the files from the title menu', () => {
  render(<Library menu folder="Projects" depth={2} />);
  const names = (folder = 'Projects') => [...screen.getByRole('navigation', { name: `Files in ${folder}` }).querySelectorAll('.ui-nav__label')].map(el => el.textContent);
  // Date is the first choice: the newest file first.
  expect(names()).toEqual(['Plan', 'Notes', 'Brief', 'Report', 'Budget', 'Risks']);
  const trigger = screen.getByRole('button', { name: 'Projects' });
  fireEvent.click(trigger);
  const menu = within(trigger.closest<HTMLElement>('.ui-dropdown')!).getByRole('menu');
  // The count stands beside the title only, not in the menu.
  expect(menu.querySelector('.ui-dropdown__head')).toBeNull();
  expect(within(menu).getByRole('menuitemradio', { name: 'Date' })).toHaveAttribute('aria-checked', 'true');
  fireEvent.click(within(menu).getByRole('menuitemradio', { name: 'Name' }));
  expect(names()).toEqual(['Brief', 'Budget', 'Notes', 'Plan', 'Report', 'Risks']);
  fireEvent.click(trigger);
  fireEvent.click(within(trigger.closest<HTMLElement>('.ui-dropdown')!).getByRole('menuitemradio', { name: 'Date' }));
  expect(names()).toEqual(['Plan', 'Notes', 'Brief', 'Report', 'Budget', 'Risks']);
  // The quick filter keeps the files edited in November, so Shared loses its October file.
  fireEvent.click(screen.getByRole('button', { name: 'Shared 3 files' }));
  fireEvent.click(screen.getByRole('button', { name: 'Shared' }));
  fireEvent.click(within(screen.getByRole('button', { name: 'Shared' }).closest<HTMLElement>('.ui-dropdown')!).getByRole('menuitemradio', { name: 'Edited in November' }));
  expect(names('Shared')).toEqual(['Contacts', 'Guide']);
});

// With a filter on, the count, the selected row and the open file follow the rows on show.
it('counts the rows on show, and opens a row on show when the filter hides the open file', () => {
  render(<Library menu folder="Shared" />);
  const head = () => document.querySelector('[data-column="2"] > .ui-columns__head')!;
  expect(head()).toHaveTextContent('3 files');
  fireEvent.click(screen.getByRole('button', { name: 'Glossary 26 Oct' }));
  expect(screen.getByRole('region', { name: 'Glossary' })).toBeInTheDocument();
  const filter = (label: string) => {
    const trigger = screen.getByRole('button', { name: 'Shared' });
    fireEvent.click(trigger);
    fireEvent.click(within(trigger.closest<HTMLElement>('.ui-dropdown')!).getByRole('menuitemradio', { name: label }));
  };
  filter('Edited in November');
  expect(head().querySelector('.ui-columns__count')).toHaveTextContent('2 of 3');
  expect(head()).toHaveTextContent('2 of 3 files');
  expect(screen.getByRole('button', { name: 'Contacts 24 Nov' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.queryByRole('region', { name: 'Glossary' })).toBeNull();
  expect(screen.getByRole('region', { name: 'Contacts' })).toBeInTheDocument();
  filter('All files');
  expect(head().querySelector('.ui-columns__count')).toHaveTextContent(/^3$/);
  cleanup();
  // One file is "1 file".
  render(<Library menu folder="Drafts" />);
  expect(head()).toHaveTextContent('1 file');
  expect(head()).not.toHaveTextContent('1 files');
  expect(screen.getByRole('button', { name: 'Drafts 1 file' })).toBeInTheDocument();
  cleanup();
  // A filter that hides every row says so and offers to show them all.
  render(<Library menu folder="Archive" />);
  const trigger = screen.getByRole('button', { name: 'Archive' });
  fireEvent.click(trigger);
  fireEvent.click(within(trigger.closest<HTMLElement>('.ui-dropdown')!).getByRole('menuitemradio', { name: 'Edited in November' }));
  expect(head().querySelector('.ui-columns__count')).toHaveTextContent('0 of 2');
  expect(screen.getByRole('heading', { name: 'No files edited in November' })).toBeInTheDocument();
  expect(document.querySelectorAll('.ui-columns__col')).toHaveLength(2);
  fireEvent.click(screen.getByRole('button', { name: 'Show all files' }));
  expect(screen.getByRole('button', { name: 'Minutes 28 Oct' })).toHaveAttribute('aria-pressed', 'true');
});

it('gives the back link the address of the depth above in the showcases', () => {
  at(390);
  render(<Library folder="Shared" />);
  expect(screen.getByRole('link', { name: 'Back to Shared' })).toHaveAttribute('href', '#/library/Shared');
  cleanup();
  render(<Library folder="Shared" depth={2} />);
  expect(screen.getByRole('link', { name: 'Back to Folders' })).toHaveAttribute('href', '#/library');
});

// The month close showcase: the rows follow the open check, and an action that takes away the
// focused button leaves the focus on the check that is now open.
const workHeading = () => document.querySelector('[data-column="3"] h2')!.textContent;
const step = (n: number) => screen.getByRole('button', { name: new RegExp(`^${n}\\. `) });

it('shows the rows of the check the reader opens, and goes one step down the chain', () => {
  render(<MonthClose stage="blocked" />);
  expect(root()).toHaveAttribute('data-depth', '2');
  expect(workHeading()).toBe('Documents');
  fireEvent.click(step(1));
  expect(step(1)).toHaveAttribute('aria-expanded', 'true');
  expect(workHeading()).toBe('Sources');
  expect(root()).toHaveAttribute('data-depth', '3');
  fireEvent.click(screen.getByRole('button', { name: 'September' }));
  expect(root()).toHaveAttribute('data-depth', '2');
});

it.each([
  ['sources', 'Check', 2, 'Unclassified rows'], ['rows', 'Classify', 3, 'Documents'], ['blocked', 'Add', 4, 'Exchange rates'],
  ['rates', 'Verify', 5, 'Reviewed rows'], ['ready', 'Close month', 5, 'Reviewed rows'],
] as [MonthCloseStage, string, number, string][])('at %s, %s moves the focus to step %i and its rows', (stage, action, next, work) => {
  render(<MonthClose stage={stage} />);
  const button = screen.getByRole('button', { name: action, exact: true } as never);
  button.focus();
  fireEvent.click(button);
  expect(screen.queryByRole('button', { name: action, exact: true } as never)).toBeNull();
  expect(step(next)).toHaveFocus();
  expect(workHeading()).toBe(work);
  // An action is not a move down the chain: the checks stay on show.
  expect(root()).toHaveAttribute('data-depth', '2');
});

it('replaces the checks and the rows when the reader selects another month', () => {
  render(<MonthClose stage="rows" />);
  const month = (name: string) => screen.getByRole('button', { name, exact: true } as never);
  fireEvent.change(screen.getByRole('searchbox', { name: 'Search rows' }), { target: { value: 'Aster' } });
  fireEvent.click(month('September'));
  expect(month('September')).toHaveAttribute('aria-pressed', 'true');
  // September's own checks: the first is open and current, and the rows are its rows.
  expect(step(1)).toHaveAttribute('aria-expanded', 'true');
  expect(step(1)).toHaveAccessibleName(/Current/);
  expect(step(2)).toHaveAccessibleName(/To do/);
  expect(workHeading()).toBe('Sources');
  expect(screen.getByRole('table', { name: 'Rows for September' })).toBeInTheDocument();
  expect(screen.getByRole('searchbox', { name: 'Search rows' })).toHaveValue('');
  // A new check replaces only the rows.
  fireEvent.click(step(2));
  expect(workHeading()).toBe('Unclassified rows');
  expect(month('September')).toHaveAttribute('aria-pressed', 'true');
  // October keeps its own checks, and opens on the first.
  fireEvent.click(month('October'));
  expect(step(1)).toHaveAttribute('aria-expanded', 'true');
  expect(step(1)).toHaveAccessibleName(/Done/);
  expect(step(2)).toHaveAccessibleName(/Current/);
  expect(workHeading()).toBe('Sources');
});

// Limits: JSDOM lays nothing out, so this reads the cells. stories/three-column.test.js
// checks in a browser that the table fits column 3.
it('lets the payee wrap, puts the unit in the header, and a search with no rows offers to clear the filters', () => {
  render(<MonthClose />);
  // The document stands under the payee, so the table needs one column less.
  const payee = screen.getByRole('cell', { name: 'Aster Paper INV-104' });
  expect(payee.firstElementChild).toHaveClass('ui-identity__name');
  expect(payee.querySelector('.ui-table__sub')).toHaveTextContent('INV-104');
  expect(screen.getByRole('cell', { name: 'Cedar Tools Missing document' })).toBeInTheDocument();
  expect(screen.getAllByRole('columnheader').map(th => th.textContent)).toEqual(['Payee', 'Date', 'Amount€']);
  // The unit stands once, small, in the header, so each amount is a plain number.
  expect(screen.getByRole('columnheader', { name: 'Amount€' }).querySelector('.ui-value__unit')).toHaveTextContent('€');
  expect(screen.getByRole('cell', { name: '184.20' })).toBeInTheDocument();
  const search = screen.getByRole('searchbox', { name: 'Search rows' });
  fireEvent.change(search, { target: { value: 'zzzznomatch' } });
  expect(screen.queryByRole('table')).toBeNull();
  expect(screen.getByText('No rows match the search.')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
  expect(search).toHaveValue('');
  expect(search).toHaveFocus();
  expect(screen.getAllByRole('row').length).toBeGreaterThan(1);
});

// Limits: JSDOM lays nothing out, so the page area is a stubbed ResizeObserver entry and a drag
// is a pointer event's clientX. stories/three-column.test.js drags the lines in a browser.
const sized = (width: number) => {
  let report: ResizeObserverCallback = () => {};
  vi.stubGlobal('ResizeObserver', class { constructor(fn: ResizeObserverCallback) { report = fn; } observe() {} disconnect() {} });
  return () => act(() => report([{ contentRect: { width } } as ResizeObserverEntry], {} as ResizeObserver));
};
const lines = () => screen.queryAllByRole('separator');
const values = (line: HTMLElement) => ['aria-valuemin', 'aria-valuenow', 'aria-valuemax'].map(a => Number(line.getAttribute(a)));
const resizable = (width: number, props: Partial<Parameters<typeof ThreeColumnPage>[0]> = {}, room = width) => {
  at(width);
  const area = sized(room);
  render(page({ resizable: true, ...props }));
  area();
  return lines() as HTMLElement[];
};

it('resizes only when resizable is set, and names each line by the column it sizes', () => {
  at(1280);
  const area = sized(1280);
  render(page());
  area();
  expect(lines()).toHaveLength(0);
  expect(root().getAttribute('style')).toBeNull();
  cleanup();
  const [first, second] = resizable(1280);
  expect(lines()).toHaveLength(2);
  expect(first).toHaveAccessibleName('Folders');
  expect(second).toHaveAccessibleName('Shared');
  expect(first).toHaveAttribute('aria-orientation', 'vertical');
  expect(first).toHaveAttribute('tabindex', '0');
  expect(document.getElementById(first!.getAttribute('aria-controls')!)).toHaveAttribute('data-column', '1');
  expect(document.getElementById(second!.getAttribute('aria-controls')!)).toHaveAttribute('data-column', '2');
  // Column 1 is 240px and column 2 is 26% of 1280px, at most --panel-sm: the stylesheet's widths.
  expect(values(first!)).toEqual([200, 240, 320]);
  expect(values(second!)).toEqual([240, 320, 420]);
  expect(first).toHaveAttribute('aria-valuetext', '240 pixels');
  expect(root().style.getPropertyValue('--ui-columns-1')).toBe('240px');
  expect(root().style.getPropertyValue('--ui-columns-2')).toBe('320px');
  // Each line stands at the start of the column after the one it sizes.
  expect(first!.parentElement).toHaveAttribute('data-column', '2');
  expect(second!.parentElement).toHaveAttribute('data-column', '3');
  expect(css).toMatch(/\.ui-columns__col \{ position: relative;/);
  // The line: a 12px target with the resize cursor, 4px of neutral ink in each active state,
  // the kit's ring on the keyboard focus, no accent and no transition.
  const line = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'ColumnResizer.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  expect(line).toMatch(/\.ui-resizer \{[^}]*width: var\(--space-3\);[^}]*cursor: col-resize;/);
  expect(line).toMatch(/\.ui-resizer::before \{[^}]*width: var\(--space-1\);/);
  expect(line).toMatch(/\.ui-resizer:hover::before,\n\.ui-resizer\[data-dragging\]::before,\n\.ui-resizer:focus-visible::before \{ background: var\(--muted\); \}/);
  expect(line).toMatch(/\.ui-resizer:focus-visible \{[^}]*outline: var\(--ring\); outline-offset: var\(--ring-offset\); \}/);
  expect(line).toMatch(/@media \(pointer: coarse\) \{\n  \.ui-resizer \{ width: var\(--tap-min\); \}/);
  expect(line).not.toMatch(/accent|transition|animation/);
});

it('moves a line 16px with an arrow, 48px with Shift, and to its limits with Home and End', () => {
  const onResize = vi.fn();
  const [first, second] = resizable(1280, { onResize });
  fireEvent.keyDown(second!, { key: 'ArrowRight' });
  expect(onResize).toHaveBeenLastCalledWith([240, 336]);
  fireEvent.keyDown(second!, { key: 'ArrowRight', shiftKey: true });
  expect(onResize).toHaveBeenLastCalledWith([240, 384]);
  fireEvent.keyDown(second!, { key: 'ArrowLeft' });
  expect(onResize).toHaveBeenLastCalledWith([240, 368]);
  fireEvent.keyDown(second!, { key: 'ArrowLeft', shiftKey: true });
  expect(onResize).toHaveBeenLastCalledWith([240, 320]);
  fireEvent.keyDown(second!, { key: 'End' });
  expect(onResize).toHaveBeenLastCalledWith([240, 420]);
  expect(second).toHaveAttribute('aria-valuenow', '420');
  expect(root().style.getPropertyValue('--ui-columns-2')).toBe('420px');
  // At a limit, a key past it changes nothing, and other keys stay with the page.
  onResize.mockClear();
  fireEvent.keyDown(second!, { key: 'ArrowRight' });
  fireEvent.keyDown(second!, { key: 'Enter' });
  expect(onResize).not.toHaveBeenCalled();
  // With three columns, the first line trades width with column 2, so the open child stays.
  fireEvent.keyDown(first!, { key: 'ArrowRight' });
  expect(onResize).toHaveBeenLastCalledWith([256, 404]);
  fireEvent.keyDown(first!, { key: 'End' });
  expect(onResize).toHaveBeenLastCalledWith([320, 340]);
  fireEvent.keyDown(first!, { key: 'Home' });
  // Column 2 keeps its 420px maximum, so column 1 stops at 240px.
  expect(onResize).toHaveBeenLastCalledWith([240, 420]);
  expect(values(first!)).toEqual([240, 240, 320]);
});

it('keeps each column in its limits and the open child at 320px in the space of the page area', () => {
  // 900px: column 2 has 900 - 240 - 320 = 340px at most.
  let [first, second] = resizable(900);
  expect(values(first!)).toEqual([200, 240, 260]);
  expect(values(second!)).toEqual([240, 260, 340]);
  cleanup();
  // Widths from the app that the space cannot hold are fitted to it.
  [first, second] = resizable(1000, { widths: [400, 500] });
  expect(values(first!)[1]).toBe(320);
  expect(values(second!)).toEqual([240, 360, 360]);
  expect(root().style.getPropertyValue('--ui-columns-1')).toBe('320px');
  cleanup();
  // With no third column, column 2 takes the rest, at least 240px, and only column 1 resizes.
  at(1280);
  const area = sized(1280);
  render(page({ resizable: true, columns: cols(false), widths: [300, 300] }));
  area();
  expect(lines()).toHaveLength(1);
  expect(values(lines()[0]!)).toEqual([200, 300, 320]);
});

it('follows a drag, and Escape puts the widths back to where the drag started', () => {
  const onResize = vi.fn();
  const [, second] = resizable(1280, { onResize });
  fireEvent.pointerDown(second!, { button: 0, pointerId: 1, clientX: 560 });
  expect(second).toHaveFocus();
  expect(second).toHaveAttribute('data-dragging');
  fireEvent.pointerMove(second!, { pointerId: 1, clientX: 600 });
  expect(onResize).toHaveBeenLastCalledWith([240, 360]);
  // A drag past the limit stops at it.
  fireEvent.pointerMove(second!, { pointerId: 1, clientX: 900 });
  expect(onResize).toHaveBeenLastCalledWith([240, 420]);
  fireEvent.keyDown(second!, { key: 'Escape' });
  expect(onResize).toHaveBeenLastCalledWith([240, 320]);
  expect(second).not.toHaveAttribute('data-dragging');
  // After the drag, a move does nothing, and Escape is the page's again.
  onResize.mockClear();
  fireEvent.pointerMove(second!, { pointerId: 1, clientX: 700 });
  fireEvent.keyDown(second!, { key: 'Escape' });
  expect(onResize).not.toHaveBeenCalled();
  // A drag that ends keeps its width, and a drag that the browser cancels goes back.
  fireEvent.pointerDown(second!, { button: 0, pointerId: 2, clientX: 560 });
  fireEvent.pointerMove(second!, { pointerId: 2, clientX: 592 });
  fireEvent.pointerUp(second!, { pointerId: 2, clientX: 592 });
  expect(onResize).toHaveBeenLastCalledWith([240, 352]);
  fireEvent.pointerDown(second!, { button: 0, pointerId: 3, clientX: 560 });
  fireEvent.pointerMove(second!, { pointerId: 3, clientX: 520 });
  fireEvent.pointerCancel(second!, { pointerId: 3 });
  expect(onResize).toHaveBeenLastCalledWith([240, 352]);
  // A right button starts no drag.
  onResize.mockClear();
  fireEvent.pointerDown(second!, { button: 2, pointerId: 4, clientX: 560 });
  fireEvent.pointerMove(second!, { pointerId: 4, clientX: 600 });
  expect(onResize).not.toHaveBeenCalled();
});

it('puts one line back to its first width on a double click', () => {
  const onResize = vi.fn();
  const [first, second] = resizable(1280, { onResize });
  fireEvent.keyDown(first!, { key: 'Home' });
  expect(onResize).toHaveBeenLastCalledWith([200, 360]);
  fireEvent.keyDown(second!, { key: 'End' });
  expect(onResize).toHaveBeenLastCalledWith([200, 420]);
  fireEvent.doubleClick(second!);
  // Column 2 goes back to 320px. Column 1 keeps its width.
  expect(onResize).toHaveBeenLastCalledWith([200, 320]);
  fireEvent.doubleClick(first!);
  expect(onResize).toHaveBeenLastCalledWith([240, 280]);
});

it('draws no line in a page area of 860px or less, or on a phone, and the widths stay the stylesheet\'s', () => {
  // One pixel more of page area has the lines, so the 860px step is the one that removes them.
  expect(resizable(1280, { depth: 3 }, 861)).toHaveLength(2);
  cleanup();
  // A wide window with an 860px page area, as beside an open sidebar, a tablet, and a phone.
  for (const [win, room] of [[1280, 860], [820, 820], [390, 390]] as const) {
    resizable(win, { depth: 3 }, room);
    expect(lines()).toHaveLength(0);
    expect(root().style.getPropertyValue('--ui-columns-1')).toBe('');
    cleanup();
  }
  // The stylesheet: the two narrower layouts set their own columns, so a width never reaches them.
  const tablet = css.slice(css.indexOf('@container ui-columns (max-width: 860px)'));
  expect(tablet).toMatch(/grid-template-columns: minmax\(200px, 40%\) minmax\(0, 1fr\);/);
  // Markup from a wider render, as on a server, keeps its lines, so the stylesheet hides them.
  expect(tablet.slice(0, tablet.indexOf('\n}'))).toMatch(/\.ui-columns__col > \.ui-resizer \{ display: none; \}/);
});
