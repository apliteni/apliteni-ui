import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
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
const at = (width: number) => vi.stubGlobal('matchMedia', (query: string) => ({
  matches: width <= Number(/max-width: (\d+)px/.exec(query)![1]), addEventListener() {}, removeEventListener() {} }));
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
  expect(css).toMatch(/\.ui-columns \{[^}]*grid-template-columns: min\(240px, 25%\) clamp\(min\(260px, 30%\), 26%, var\(--panel-sm\)\) minmax\(0, 1fr\);/);
  // Each column scrolls alone in the window under the band, and one line stands between two columns.
  expect(css).toMatch(/\.ui-columns \{[^}]*height: calc\(100dvh - var\(--ui-app-band, 0px\)\);/);
  expect(css).toMatch(/\.ui-columns__col \{[^}]*overflow-y: auto; \}/);
  expect(css).toMatch(/\.ui-columns__col \+ \.ui-columns__col \{ border-inline-start: 1px solid var\(--border\); \}/);
  // The header row has one height in each column.
  expect(css).toMatch(/\.ui-columns__head \{[^}]*min-height: calc\(var\(--space-12\) \+ var\(--space-2\)\);/);
});

it('shows two neighbour columns at 860px and one column at 560px, and only at those widths', () => {
  const queries = [...css.matchAll(/@media ([^{]+)\{/g)].map(m => m[1].trim());
  expect(queries).toEqual(['(max-width: 860px)', '(max-width: 560px)', '(max-width: 560px) and (pointer: coarse)']);
  const block = (q: string) => css.slice(css.indexOf(`@media ${q}`)).split(/\n}\n/)[0];
  const tablet = block('(max-width: 860px)');
  expect(tablet).toMatch(/grid-template-columns: minmax\(200px, 40%\) minmax\(0, 1fr\);/);
  expect(tablet).toMatch(/\.ui-columns:not\(\[data-depth='3'\]\) > \.ui-columns__col--3,\n  \.ui-columns\[data-depth='3'\] > \.ui-columns__col--1 \{ display: none; \}/);
  // The first column on show draws no line before it.
  expect(tablet).toMatch(/\.ui-columns\[data-depth='3'\] > \.ui-columns__col--2 \{ border-inline-start: 0; \}/);
  const phone = block('(max-width: 560px)');
  expect(phone).toMatch(/\.ui-columns > \.ui-columns__col \{ display: none;[^}]*border-inline-start: 0; \}/);
  for (const n of [1, 2, 3]) expect(phone).toContain(`.ui-columns[data-depth='${n}'] > .ui-columns__col--${n}`);
});

// Limits: JSDOM lays nothing out, so this reads the tap layer and the gap as declarations.
// stories/tap-zone.test.js measures the layer in a browser.
it('gives each row a 44px target on a touch phone', () => {
  const touch = css.slice(css.indexOf('@media (max-width: 560px) and (pointer: coarse)'));
  expect(touch).toMatch(/\.ui-columns__list > \.ui-nav__list \{ gap: var\(--tap-gap\); --tap-clear-y: var\(--tap-gap\); \}/);
  expect(touch).toMatch(/\.ui-columns__list \.ui-nav__item::after \{[^}]*height: min\(max\(100%, var\(--tap-min\)\), calc\(100% \+ var\(--tap-clear-y\)\)\);/);
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
  expect(names()[0]).toBe('Brief');
  const trigger = screen.getByRole('button', { name: 'Projects' });
  fireEvent.click(trigger);
  const menu = within(trigger.closest<HTMLElement>('.ui-dropdown')!).getByRole('menu');
  expect(menu).toHaveTextContent('6 files');
  fireEvent.click(within(menu).getByRole('menuitemradio', { name: 'Name' }));
  expect(names()).toEqual(['Brief', 'Budget', 'Notes', 'Plan', 'Report', 'Risks']);
  // The quick filter keeps the files edited in November, so Shared loses its October file.
  fireEvent.click(screen.getByRole('button', { name: 'Shared 3 files' }));
  fireEvent.click(screen.getByRole('button', { name: 'Shared' }));
  fireEvent.click(within(screen.getByRole('button', { name: 'Shared' }).closest<HTMLElement>('.ui-dropdown')!).getByRole('menuitemradio', { name: 'Edited in November' }));
  expect(names('Shared')).toEqual(['Contacts', 'Guide']);
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

it('pins the payee, puts the unit in the header, and a search with no rows offers to clear the filters', () => {
  render(<MonthClose />);
  expect(screen.getByRole('columnheader', { name: 'Payee' })).toHaveClass('ui-table__identity');
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
