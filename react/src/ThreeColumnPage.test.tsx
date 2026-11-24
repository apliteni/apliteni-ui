import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ThreeColumnPage } from './ThreeColumnPage';
import { MonthClose, type MonthCloseStage } from './showcases/MonthClose';

// Limits: JSDOM has no layout and does not apply media queries. The DOM half reads the
// landmarks, the reading order and the view links. The CSS half reads the collapse rules
// as text. stories/three-column.test.js measures them in a real browser.
afterEach(cleanup);

const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'ThreeColumnPage.css'), 'utf8');
const page = (props: Partial<Parameters<typeof ThreeColumnPage>[0]> = {}) => <ThreeColumnPage title="Close October"
  nav={{ title: '2026', link: 'Months', children: <p>Month list</p> }}
  steps={{ title: 'Month checks', link: 'Checks', children: <p>Steps</p> }}
  work={{ title: 'Sources', link: 'Rows', children: <p>Rows</p> }} {...props} />;
const areas = () => [...document.querySelectorAll('section')];

it('gives the page one h1 and three named areas in reading order', () => {
  render(page());
  expect(screen.getAllByRole('heading', { level: 1 }).map(h => h.textContent)).toEqual(['Close October']);
  expect(areas().map(area => area.dataset.area)).toEqual(['nav', 'steps', 'work']);
  cleanup();
  // With AppShell's width="full", the band holds the h1 and the page draws none.
  render(page({ title: undefined }));
  expect(screen.queryByRole('heading', { level: 1 })).toBeNull();
  cleanup();
  render(page());
  expect(screen.getAllByRole('region').map(region => region.getAttribute('aria-labelledby') && document.getElementById(region.getAttribute('aria-labelledby')!)?.textContent))
    .toEqual(['2026', 'Month checks', 'Sources']);
});

it('opens on the steps, and a link opens its area and moves focus to its heading', () => {
  const onViewChange = vi.fn();
  render(page({ onViewChange }));
  const root = document.querySelector('.ui-columns')!;
  expect(root).toHaveAttribute('data-view', 'steps');
  const links = screen.getAllByRole('button');
  expect(screen.getByRole('group', { name: 'Page columns' })).toContainElement(links[0]);
  expect(links.map(link => link.textContent)).toEqual(['Months', 'Checks', 'Rows']);
  expect(links.map(link => link.getAttribute('aria-pressed'))).toEqual(['false', 'true', 'false']);
  fireEvent.click(links[2]);
  expect(root).toHaveAttribute('data-view', 'work');
  expect(onViewChange).toHaveBeenCalledWith('work');
  expect(screen.getByRole('heading', { name: 'Sources' })).toHaveFocus();
  // The link to the area already open still moves the reader to it.
  screen.getByRole('heading', { name: 'Close October' }).focus();
  fireEvent.click(links[2]);
  expect(screen.getByRole('heading', { name: 'Sources' })).toHaveFocus();
});

it('follows the view it is given', () => {
  const onViewChange = vi.fn();
  render(page({ view: 'nav', onViewChange }));
  fireEvent.click(screen.getByRole('button', { name: 'Checks' }));
  expect(onViewChange).toHaveBeenCalledWith('steps');
  expect(document.querySelector('.ui-columns')).toHaveAttribute('data-view', 'nav');
});

it('holds the widths: the flow half at most --panel-lg, the work half the rest', () => {
  expect(css).toMatch(/\.ui-columns \{[^}]*grid-template-columns: minmax\(0, min\(var\(--panel-lg\), 41%\)\) minmax\(0, 1fr\);/);
  // The list a third and the steps two thirds. The list never cuts a month's name, and the
  // steps go under it when both cannot fit. Measured at 984px and 200% text in the browser.
  expect(css).toMatch(/\.ui-columns__pair \{[^}]*display: flex;[^}]*flex-wrap: wrap;/);
  expect(css).toMatch(/\.ui-columns__pair > \.ui-columns__area--nav \{ flex: 1 1 0; min-width: max-content; \}/);
  expect(css).toMatch(/\.ui-columns__pair > \.ui-columns__area--steps \{ flex: 2 1 0; min-width: min\(100%, calc\(var\(--prose-display\) \+ 3 \* var\(--space-6\)\)\); \}/);
  // The two separators are the divider's line.
  expect(css.match(/border-inline-start: 1px solid var\(--border\)/g)).toHaveLength(2);
});

it('collapses at 860px and 560px only, in the documented order', () => {
  const queries = [...css.matchAll(/@media ([^{]+)\{/g)].map(m => m[1].trim());
  expect(queries).toEqual(['(max-width: 860px)', '(max-width: 720px)', '(max-width: 560px)', '(max-width: 560px) and (pointer: coarse)']);
  const block = (q: string) => css.slice(css.indexOf(`@media ${q}`)).split(/\n}\n/)[0];
  const tablet = block('(max-width: 860px)');
  // The months become their own view, and the steps stand above the work.
  expect(tablet).toMatch(/\.ui-columns \{[^}]*grid-template-columns: minmax\(0, 1fr\);/);
  expect(tablet).toMatch(/\.ui-columns__area--nav \{ display: none; \}/);
  expect(tablet).toMatch(/\[data-view='nav'\] \.ui-columns__area--nav \{ display: flex; \}/);
  expect(tablet).toMatch(/\[data-view='nav'\] \.ui-columns__area--steps,\n  \.ui-columns\[data-view='nav'\] \.ui-columns__area--work \{ display: none; \}/);
  expect(tablet).toMatch(/\.ui-columns__views \{ display: flex; \}/);
  const phone = block('(max-width: 560px)');
  // Each area is its own view.
  expect(phone).toMatch(/\.ui-columns \.ui-columns__area \{ display: none; \}/);
  for (const key of ['nav', 'steps', 'work']) expect(phone).toContain(`[data-view='${key}'] .ui-columns__area--${key}`);
});

// Limits: JSDOM lays nothing out, so these read the tap layer and the gap as declarations.
// stories/three-column.test.js measures the edge, the layer and the gap in a browser.
it('puts the first link on the band title\'s edge and gives a touch phone its target and gap', () => {
  expect(css).toMatch(/margin-inline-start: calc\(var\(--ui-app-title-inset, var\(--ui-columns-edge\)\) - var\(--ui-columns-edge\) - var\(--space-3\)\);/);
  const touch = css.slice(css.indexOf('@media (max-width: 560px) and (pointer: coarse)'));
  expect(touch).toMatch(/\.ui-columns__views \{ gap: var\(--tap-gap\); --tap-clear-x: var\(--tap-gap\); --tap-clear-y: var\(--tap-gap\); \}/);
  expect(touch).toMatch(/\.ui-columns__views > \.ui-nav__item::after \{[^}]*height: min\(max\(100%, var\(--tap-min\)\), calc\(100% \+ var\(--tap-clear-y\)\)\);/);
  expect(touch).toMatch(/\.ui-columns__area > \.ui-toolbar:not\(:last-child\) \{ margin-bottom: calc\(var\(--tap-gap\) - var\(--space-2\)\); \}/);
});

// The showcase: the work area follows the open step, and an action that takes away the
// focused button leaves the focus on the step that is now open.
const workHeading = () => document.querySelector('[data-area="work"] > h2')!.textContent;
const step = (n: number) => screen.getByRole('button', { name: new RegExp(`^${n}\\. `) });

it('shows the work of the step the reader opens, without a completed check', () => {
  render(<MonthClose stage="blocked" />);
  expect(workHeading()).toBe('Documents');
  fireEvent.click(step(1));
  expect(step(1)).toHaveAttribute('aria-expanded', 'true');
  expect(workHeading()).toBe('Sources');
});

it.each([
  ['sources', 'Check', 2, 'Unclassified rows'], ['rows', 'Classify', 3, 'Documents'], ['blocked', 'Add', 4, 'Exchange rates'],
  ['rates', 'Verify', 5, 'Reviewed rows'], ['ready', 'Close month', 5, 'Reviewed rows'],
] as [MonthCloseStage, string, number, string][])('at %s, %s moves the focus to step %i and its work', (stage, action, next, work) => {
  render(<MonthClose stage={stage} />);
  const button = screen.getByRole('button', { name: action, exact: true } as never);
  button.focus();
  fireEvent.click(button);
  expect(screen.queryByRole('button', { name: action, exact: true } as never)).toBeNull();
  expect(step(next)).toHaveFocus();
  expect(workHeading()).toBe(work);
});

it('pins the payee, puts the unit in the header, and a search with no rows offers to clear the filters', () => {
  render(<MonthClose />);
  expect(screen.getByRole('columnheader', { name: 'Payee' })).toHaveClass('ui-table__identity');
  // The unit stands once, small, in the header, so each amount is a plain number.
  expect(screen.getByRole('columnheader', { name: 'Amount EUR' }).querySelector('.ui-value__unit')).toHaveTextContent('EUR');
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
