import { StrictMode, createRef } from 'react';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { afterEach, expect, it, vi } from 'vitest';
import { Success, SuccessCheck, SuccessPanel, type SuccessProps } from './Success';
import { Button } from './primitives/Button';

// DOM checks cover semantics and timer ownership; browser evidence covers paint and motion.
afterEach(() => { cleanup(); vi.useRealTimers(); });

it.each(['hero', 'split', 'compact'] as const)('provides the %s heading and polite status', layout => {
  const { getByRole } = render(<Success layout={layout} title="Saved" />);
  expect(getByRole('heading', { level: layout === 'compact' ? 2 : 1 })).toHaveTextContent('Saved');
  expect(getByRole('status')).toHaveAttribute('aria-live', 'polite');
});

it('accepts a heading rank, root props and a forwarded ref', () => {
  const ref = createRef<HTMLDivElement>();
  const { getByRole } = render(<Success ref={ref} level={3} id="result" className="custom" aria-label="Result" />);
  expect(getByRole('heading', { level: 3 })).toBeVisible();
  expect(ref.current).toBe(getByRole('status'));
  expect(ref.current).toHaveClass('ui-sx', 'custom');
  expect(ref.current).toHaveAttribute('id', 'result');
});

it.each(['aurora', 'glow', 'flat'] as const)('keeps %s decoration hidden', backdrop => {
  const { container, queryByRole } = render(<Success backdrop={backdrop} confetti />);
  expect(queryByRole('img')).toBeNull();
  expect(container.querySelector('.ui-sx__confetti')).toHaveAttribute('aria-hidden', 'true');
  expect(container.querySelectorAll('.ui-sx__piece')).toHaveLength(14);
  expect(container.querySelector('.ui-sx__aurora') !== null).toBe(backdrop === 'aurora');
  expect(container.querySelector('.ui-sx__bg-glow') !== null).toBe(backdrop === 'glow');
});

it('keeps action events, keyboard focus and caller routing', async () => {
  const user = userEvent.setup();
  const click = vi.fn();
  const { getByRole } = render(<Success actions={<><Button onClick={click}>Continue</Button><a href="#receipt">Receipt</a></>} />);
  await user.tab();
  expect(getByRole('button')).toHaveFocus();
  await user.keyboard('{Enter}');
  expect(click).toHaveBeenCalledOnce();
  await user.tab();
  expect(getByRole('link')).toHaveFocus();
  expect(getByRole('link')).toHaveAttribute('href', '#receipt');
});

it('renders panel text safely and shares the decorative check', () => {
  const ref = createRef<HTMLDivElement>();
  const { container, getByText, rerender } = render(<SuccessPanel ref={ref} title="<img src=x>" sub="Changes saved." className="custom" />);
  expect(getByText('<img src=x>')).toBeVisible();
  expect(container.querySelector('img')).toBeNull();
  expect(ref.current).toHaveClass('ui-success', 'custom');
  expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  rerender(<SuccessPanel />);
  expect(getByText('Done')).toBeVisible();
  expect(container.querySelector('.ui-success__sub')).toBeNull();
});

it('is the bare mark, wrapped by whoever places it', () => {
  const ref = createRef<SVGSVGElement>();
  const { container } = render(<SuccessCheck ref={ref} className="custom" />);
  expect(ref.current).toBe(container.querySelector('svg'));
  expect(ref.current).toHaveClass('ui-sx__check', 'custom');
  expect(container.firstElementChild!.tagName).toBe('svg');
  expect(container.querySelector('.ui-success__check')).toBeNull();
  expect(container.querySelector('svg')).toHaveAttribute('focusable', 'false');
});

it('lets the panel and the page confirmation own the mark box', () => {
  const panel = render(<SuccessPanel />).container.querySelector('.ui-success__check');
  expect(panel!.firstElementChild).toBe(panel!.querySelector('svg.ui-sx__check'));
  cleanup();
  const visual = render(<Success />).container.querySelector('.ui-sx__visual');
  expect(visual!.firstElementChild).toBe(visual!.querySelector('svg.ui-sx__check'));
});

// Fix 1: an empty row would still add its 20px margin (src/styles/success.css).
const EMPTY: [string, SuccessProps['actions']][] = [
  ['omitted', undefined], ['null', null], ['false', false], ['an empty array', []], ['empty text', ''],
];
it.each(EMPTY)('omits the actions row when actions is %s', (_case, actions) => {
  const { container } = render(<Success actions={actions} />);
  expect(container.querySelector('.ui-sx__actions')).toBeNull();
});

it('keeps the actions row for a supplied action', () => {
  const { container } = render(<Success actions={[<Button key="go">Continue</Button>]} />);
  expect(container.querySelector('.ui-sx__actions')!.textContent).toBe('Continue');
});

// Fix 2: an unclamped rank renders <h9>, which is not a heading at all.
it.each([0, 7, 9, 2.5, NaN])('clamps the out-of-range level %s to the layout default', level => {
  const hero = render(<Success {...({ level } as SuccessProps)} title="Saved" />);
  expect(hero.getByRole('heading', { level: 1 })).toHaveTextContent('Saved');
  expect(hero.container.querySelector('.ui-sx__title')!.tagName).toBe('H1');
  cleanup();
  const compact = render(<Success layout="compact" {...({ level } as SuccessProps)} title="Saved" />);
  expect(compact.getByRole('heading', { level: 2 })).toHaveTextContent('Saved');
});

it('finishes once, uses the latest callback and survives StrictMode', () => {
  vi.useFakeTimers();
  const old = vi.fn();
  const done = vi.fn();
  const { getByText, rerender } = render(<StrictMode><Success countdown={{ seconds: 2 }} onCountdownEnd={old} /></StrictMode>);
  act(() => vi.advanceTimersByTime(1000));
  expect(getByText('1', { selector: 'b' })).toBeVisible();
  rerender(<StrictMode><Success countdown={{ seconds: 2 }} onCountdownEnd={done} /></StrictMode>);
  act(() => vi.advanceTimersByTime(5000));
  expect(getByText('0', { selector: 'b' })).toBeVisible();
  expect(old).not.toHaveBeenCalled();
  expect(done).toHaveBeenCalledOnce();
});

it('cancels on removal and unmount, and restarts when duration changes', () => {
  vi.useFakeTimers();
  const done = vi.fn();
  const { rerender, unmount, getByText } = render(<Success countdown={{ seconds: 2 }} onCountdownEnd={done} />);
  act(() => vi.advanceTimersByTime(1000));
  rerender(<Success countdown={null} onCountdownEnd={done} />);
  act(() => vi.advanceTimersByTime(5000));
  expect(done).not.toHaveBeenCalled();
  rerender(<Success countdown={{ seconds: 2 }} onCountdownEnd={done} />);
  act(() => vi.advanceTimersByTime(1000));
  rerender(<Success countdown={{ seconds: 3 }} onCountdownEnd={done} />);
  expect(getByText('3', { selector: 'b' })).toBeVisible();
  act(() => vi.advanceTimersByTime(2000));
  expect(done).not.toHaveBeenCalled();
  unmount();
  act(() => vi.advanceTimersByTime(5000));
  expect(done).not.toHaveBeenCalled();
  expect(vi.getTimerCount()).toBe(0);
});

it.each([undefined, 0, -1, NaN, Infinity, 2.9])('normalizes duration %s', seconds => {
  vi.useFakeTimers();
  const done = vi.fn();
  const duration = seconds === 2.9 ? 2 : 5;
  render(<Success countdown={{ seconds }} onCountdownEnd={done} />);
  act(() => vi.advanceTimersByTime(duration * 1000));
  expect(done).toHaveBeenCalledOnce();
});

it('allows an action to cancel a countdown in the caller', () => {
  vi.useFakeTimers();
  const done = vi.fn();
  const { rerender, getByRole } = render(<Success countdown={{ seconds: 1 }} onCountdownEnd={done}
    actions={<Button onClick={() => rerender(<Success countdown={null} />)}>Stay here</Button>} />);
  fireEvent.click(getByRole('button'));
  act(() => vi.advanceTimersByTime(1000));
  expect(done).not.toHaveBeenCalled();
});

it('has no automated accessibility violations in page and inline compositions', async () => {
  const { container } = render(<main><Success title="Saved" actions={<Button>Continue</Button>} /><SuccessPanel title="Copied" /><SuccessCheck /></main>);
  // jsdom cannot measure colour contrast or actual screen-reader announcements.
  const result = await axe.run(container, { rules: { 'color-contrast': { enabled: false } } });
  expect(result.violations).toEqual([]);
});
