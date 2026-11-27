import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { composeStories } from '@storybook/react';
import { SplitLayout, type SplitLayoutProps } from './SplitLayout';
import * as stories from './SplitLayout.stories';

// Limits: JSDOM has no layout and does not apply media queries. The DOM half reads the
// order, the names, the zoom and the preview states, with ResizeObserver and the box sizes
// stubbed where a test needs them. The CSS half reads the rules as text. The panes, the
// scroll and the sticky rows are measured in a browser for the PR captures of #903.
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'SplitLayout.css'), 'utf8');
const layout = (props: Partial<SplitLayoutProps> = {}) => <SplitLayout
  primary={<><h1>Review the document</h1><p>Fields</p></>}
  preview={{ title: 'Document preview', children: <p>Sheet text</p> }}
  actions={<button type="button">Continue</button>}
  {...props} />;
const sheet = () => document.querySelector<HTMLElement>('.ui-split__sheet');
const readout = () => document.querySelector('output.ui-split__scale');

/** Give every element the box sizes a test names, and a ResizeObserver that answers once. */
const boxes = (sizes: Record<string, Partial<Record<'clientWidth' | 'clientHeight' | 'scrollWidth' | 'scrollHeight' | 'offsetWidth' | 'offsetHeight', number>>>) => {
  for (const key of ['clientWidth', 'clientHeight', 'scrollWidth', 'scrollHeight', 'offsetWidth', 'offsetHeight'] as const) {
    vi.spyOn(HTMLElement.prototype, key, 'get').mockImplementation(function (this: HTMLElement) {
      const hit = Object.entries(sizes).find(([selector]) => this.matches(selector));
      return hit?.[1][key] ?? 0;
    });
  }
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
};

it('reads in source order: the content, the preview named by its h2, then the actions', () => {
  render(layout());
  const root = document.querySelector('.ui-split')!;
  expect([...root.children].map(el => el.className)).toEqual([
    'ui-split__primary', 'ui-split__preview ui-document-ground', 'ui-split__actions',
  ]);
  expect(screen.getByRole('region', { name: 'Details' })).toHaveTextContent('Fields');
  // The page's one h1 is the caller's; the preview's title is an h2 that names its pane.
  expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  const preview = screen.getByRole('region', { name: 'Document preview' });
  expect(preview.tagName).toBe('SECTION');
  expect(within(preview).getByRole('heading', { level: 2 })).toHaveTextContent('Document preview');
  // The sheet is the kit's page, on the document ground, and no pane is a card.
  expect(sheet()).toHaveClass('ui-card__page');
  expect(root.querySelector('.ui-card')).toBeNull();
});

it('names the first pane with primaryLabel, and draws no action row without actions', () => {
  render(layout({ primaryLabel: 'Extracted fields', actions: undefined }));
  expect(screen.getByRole('region', { name: 'Extracted fields' })).toBeInTheDocument();
  expect(document.querySelector('.ui-split__actions')).toBeNull();
});

it('steps the zoom through 50, 100, 150 and 200, stops at each end, and returns to Fit', () => {
  render(layout());
  const out = screen.getByRole('button', { name: 'Zoom out' });
  const zoomIn = screen.getByRole('button', { name: 'Zoom in' });
  const fit = screen.getByRole('button', { name: 'Fit' });
  // Without a layout, Fit is the sheet's own size.
  expect(fit).toHaveAttribute('aria-pressed', 'true');
  expect(readout()).toHaveTextContent('100%');
  out.focus();
  fireEvent.click(out);
  expect(readout()).toHaveTextContent('50%');
  expect(sheet()!.style.zoom).toBe('0.5');
  expect(fit).toHaveAttribute('aria-pressed', 'false');
  expect(out).toBeDisabled();
  // A step that turns disabled under the press hands the focus to the other step.
  expect(document.activeElement).toBe(zoomIn);
  for (const step of ['100%', '150%', '200%']) {
    fireEvent.click(zoomIn);
    expect(readout()).toHaveTextContent(step);
  }
  expect(sheet()!.style.zoom).toBe('2');
  expect(zoomIn).toBeDisabled();
  expect(document.activeElement).toBe(out);
  fireEvent.click(fit);
  expect(readout()).toHaveTextContent('100%');
  expect(fit).toHaveAttribute('aria-pressed', 'true');
});

it('lets the caller hold the zoom', () => {
  const onZoomChange = vi.fn();
  const { rerender } = render(layout({ zoom: 150, onZoomChange }));
  expect(readout()).toHaveTextContent('150%');
  fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
  expect(onZoomChange).toHaveBeenCalledWith(200);
  // The caller did not take the change, so the scale stays.
  expect(readout()).toHaveTextContent('150%');
  rerender(layout({ zoom: 'fit', onZoomChange }));
  expect(readout()).toHaveTextContent('100%');
});

it('fits the whole sheet in the stage: the smaller of the two ratios, never above 100%', () => {
  // The stage is 300 by 800 with a 24px inset, and the sheet 560 by 792.
  boxes({ '.ui-split__stage': { clientWidth: 348, clientHeight: 848 }, '.ui-split__sheet': { offsetWidth: 560, offsetHeight: 792 } });
  const real = window.getComputedStyle.bind(window);
  vi.spyOn(window, 'getComputedStyle').mockImplementation((el, pseudo) => el.matches('.ui-split__stage')
    ? { paddingLeft: '24px', paddingRight: '24px', paddingTop: '24px', paddingBottom: '24px' } as CSSStyleDeclaration
    : real(el, pseudo));
  render(layout());
  expect(readout()).toHaveTextContent('54%');
  // From Fit, Zoom out goes to the step below the scale on show, and Zoom in to the one above.
  fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
  expect(readout()).toHaveTextContent('100%');
  cleanup();
  boxes({ '.ui-split__stage': { clientWidth: 2048, clientHeight: 2048 }, '.ui-split__sheet': { offsetWidth: 560, offsetHeight: 792 } });
  render(layout());
  expect(readout()).toHaveTextContent('100%');
});

it('fits a sheet in a low stage with no floor, and keeps the scale when the stage has no room', () => {
  // A 320 by 200 window leaves the stage 32px of height for a 792px sheet: 4%, not a 10% floor.
  boxes({ '.ui-split__stage': { clientWidth: 320, clientHeight: 80 }, '.ui-split__sheet': { offsetWidth: 560, offsetHeight: 792 } });
  const real = window.getComputedStyle.bind(window);
  const inset = () => vi.spyOn(window, 'getComputedStyle').mockImplementation((el, pseudo) => el.matches('.ui-split__stage')
    ? { paddingLeft: '24px', paddingRight: '24px', paddingTop: '24px', paddingBottom: '24px' } as CSSStyleDeclaration
    : real(el, pseudo));
  inset();
  render(layout());
  expect(readout()).toHaveTextContent('4%');
  expect(Number(sheet()!.style.zoom) * 792).toBeLessThanOrEqual(32);
  cleanup();
  vi.restoreAllMocks();
  // The padding takes the whole stage, so there is no room to measure and Fit stays at 100%.
  boxes({ '.ui-split__stage': { clientWidth: 320, clientHeight: 48 }, '.ui-split__sheet': { offsetWidth: 560, offsetHeight: 792 } });
  inset();
  render(layout());
  expect(readout()).toHaveTextContent('100%');
});

it('keeps the height of the action row clear when the stacked scroll brings a control into view', () => {
  vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(function (this: HTMLElement) {
    return this.matches('.ui-split__actions') ? 72 : 0;
  });
  vi.stubGlobal('ResizeObserver', class { read: () => void; constructor(read: () => void) { this.read = read; } observe() { this.read(); } disconnect() {} });
  render(layout());
  expect(document.querySelector<HTMLElement>('.ui-split')!.style.getPropertyValue('--ui-split-foot')).toBe('72px');
  const stacked = css.slice(css.indexOf('@media (max-width: 860px)'), css.indexOf('@media (max-width: 560px)'));
  expect(stacked).toMatch(/\.ui-split \{[^}]*scroll-padding-bottom:\s*calc\(var\(--ui-split-foot, 0px\) \+ var\(--ring-gap-width\) \+ var\(--ring-width\)\)/);
});

it('marks Fit while it is on with the selected fill, ink and weight, also under the pointer', () => {
  const body = /\.ui-split__tools > \.ui-btn\[aria-pressed="true"\]:enabled,\s*\.ui-split__tools > \.ui-btn\[aria-pressed="true"\]:enabled:hover\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';
  expect(body).toMatch(/background:\s*var\(--surface-3\)/);
  expect(body).toMatch(/color:\s*var\(--strong\)/);
  expect(body).toMatch(/font-weight:\s*var\(--weight-semibold\)/);
});

it('gives the saved values the weight over their labels, and the pane name the accent', () => {
  expect(css).toMatch(/\.ui-split__content \.ui-kv dd,\s*\.ui-split__content \.ui-table td:not\(\.ui-table__num--strong\) \{ font-weight: var\(--weight-medium\); \}/);
  expect(css).toMatch(/\.ui-split__content \.ui-table tbody th:not\(\.ui-table__num--strong\) \{ font-weight: var\(--weight-normal\); \}/);
  expect(css).toMatch(/\.ui-split__name \{ color: var\(--accent\); \}/);
});

it('takes new story controls after it mounts', () => {
  const { Default } = composeStories(stories);
  const { rerender } = render(<Default />);
  expect(readout()).toHaveTextContent('100%');
  rerender(<Default state="unavailable" zoom={200} />);
  expect(screen.getByText('Preview unavailable')).toBeInTheDocument();
  rerender(<Default state="ready" zoom={200} />);
  expect(readout()).toHaveTextContent('200%');
  expect(sheet()!.style.zoom).toBe('2');
});

it('makes a pane a Tab stop only while it has something to scroll', () => {
  boxes({ '.ui-split__stage': { clientHeight: 400, scrollHeight: 900 }, '.ui-split__primary': { clientHeight: 400, scrollHeight: 400 } });
  render(layout());
  const stage = screen.getByRole('region', { name: 'Document preview, page' });
  expect(stage).toHaveAttribute('tabindex', '0');
  expect(screen.getByRole('region', { name: 'Details' })).not.toHaveAttribute('tabindex');
});

it('shows a loading sheet with no zoom, and announces it', () => {
  render(layout({ preview: { title: 'Document preview', children: <p>Sheet text</p>, state: 'loading' } }));
  expect(screen.queryByText('Sheet text')).toBeNull();
  expect(screen.getByText('Loading the preview')).toHaveAttribute('role', 'status');
  expect(document.querySelector('.ui-split__stage')).toHaveAttribute('aria-busy', 'true');
  for (const name of ['Zoom out', 'Zoom in', 'Fit']) expect(screen.getByRole('button', { name })).toBeDisabled();
  expect(readout()).toHaveTextContent('');
});

it('offers Try again on an unavailable preview, and only when there is a way to retry', () => {
  const onRetry = vi.fn();
  const { rerender } = render(layout({ preview: { title: 'Document preview', children: <p>Sheet text</p>, state: 'unavailable', onRetry } }));
  expect(screen.getByText('Preview unavailable')).toBeInTheDocument();
  expect(sheet()).toBeNull();
  expect(screen.getByRole('button', { name: 'Fit' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  expect(onRetry).toHaveBeenCalledOnce();
  // The button leaves with the state, so the focus goes to the preview's title.
  rerender(layout({ preview: { title: 'Document preview', children: <p>Sheet text</p>, state: 'loading', onRetry } }));
  expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'Document preview' }));
  rerender(layout({ preview: { title: 'Document preview', children: <p>Sheet text</p>, state: 'unavailable', onRetry } }));
  rerender(layout({ preview: { title: 'Document preview', children: <p>Sheet text</p>, state: 'unavailable' } }));
  expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull();
});

it('splits 60 and 40 under the band, and stacks at 860px with sticky tools and actions', () => {
  const rule = (selector: string, body = css) => new RegExp(`(?:^|\\n)\\s*${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{([^}]*)\\}`).exec(body)?.[1] ?? '';
  expect(rule('.ui-split')).toMatch(/grid-template-columns:\s*minmax\(0, 3fr\) minmax\(0, 2fr\)/);
  expect(rule('.ui-split')).toMatch(/height:\s*calc\(100dvh - var\(--ui-app-band, 0px\)\)/);
  expect(rule('.ui-split__primary')).toMatch(/overflow-y:\s*auto/);
  expect(rule('.ui-split__stage')).toMatch(/overflow:\s*auto/);
  // Only the kit's breakpoints.
  expect([...css.matchAll(/@media \(max-width: (\d+)px\)/g)].map(m => m[1])).toEqual(['860', '560']);
  const stacked = css.slice(css.indexOf('@media (max-width: 860px)'), css.indexOf('@media (max-width: 560px)'));
  expect(rule('.ui-split', stacked)).toMatch(/display:\s*block;\s*overflow-y:\s*auto/);
  expect(rule('.ui-split__controls', stacked)).toMatch(/position:\s*sticky;\s*top:\s*0/);
  expect(rule('.ui-split__actions', stacked)).toMatch(/position:\s*sticky;\s*bottom:\s*0/);
});
