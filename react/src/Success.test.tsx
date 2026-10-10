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

it('keeps its decoration hidden and carries no backdrop layer', () => {
  const { container, queryByRole } = render(<Success confetti />);
  expect(queryByRole('img')).toBeNull();
  expect(container.querySelector('.ui-sx__confetti')).toHaveAttribute('aria-hidden', 'true');
  expect(container.querySelectorAll('.ui-sx__piece')).toHaveLength(14);
  // The blurred aurora blobs and the ambient glow are gone; the card is the surface.
  expect(container.querySelector('.ui-sx__aurora')).toBeNull();
  expect(container.querySelector('.ui-sx__glow')).toBeNull();
  expect(container.querySelector('.ui-sx__bg-glow')).toBeNull();
  expect(container.querySelector('.ui-glow')).toBeNull();
});

/* The text budget: one title and at most one short line.
 *
 * The same shape vanilla holds in src/components/success.test.js, held
 * separately here because the two render independently. It counts the text
 * tiers the content column emits rather than the one removed `eyebrow` name, so
 * a second label under a new class fails too.
 *
 * Limits: it counts tiers, not words. `body` is one element whatever length of
 * line is put in it.
 *
 * why: docs/components.md#success-confirmations
 */
const tiers = (container: HTMLElement) =>
  [...container.querySelector('.ui-sx__content')!.children]
    // Actions and the countdown are controls and a timer, not tiers of prose.
    .filter(el => !el.classList.contains('ui-sx__actions') && !el.classList.contains('ui-sx__count'))
    .map(el => el.className);

it.each(['hero', 'split', 'compact'] as const)('emits one title and at most one line in the %s layout', layout => {
  const withLine = render(<Success layout={layout} title="Feedback sent" body="It goes to the owner." />);
  expect(tiers(withLine.container)).toEqual(['ui-sx__title', 'ui-sx__body']);
  cleanup();
  expect(tiers(render(<Success layout={layout} title="Feedback sent" />).container)).toEqual(['ui-sx__title']);
});

// `eyebrow` is not in SuccessProps, so this is the untyped caller — a plain JS
// consumer, or a spread whose type was widened. It must draw nothing rather than
// land in {...rest} as an attribute on the root.
it('ignores an `eyebrow` an untyped caller still passes', () => {
  const stray = { eyebrow: 'Feedback sent' } as unknown as SuccessProps;
  const { container, queryByText } = render(<Success {...stray} title="Your plan is active" />);
  expect(container.querySelector('.ui-sx__eyebrow')).toBeNull();
  expect(queryByText('Feedback sent')).toBeNull();
  expect(tiers(container)).toEqual(['ui-sx__title']);
  expect(container.querySelector('.ui-sx')).not.toHaveAttribute('eyebrow');
});

// The two marks. `line` is the default and draws itself on; `circled` adds the
// ring path and is the mark Guidelines / Iconography asks a reported state to use.
it('draws the line mark by default and the circled mark on request', () => {
  const line = render(<Success title="Saved" />).container;
  expect(line.querySelector('.ui-sx')).toHaveClass('ui-sx--check-line');
  const lineSvg = line.querySelector('svg.ui-sx__check')!;
  expect(lineSvg).toHaveClass('ui-sx__check--line');
  expect(lineSvg).toHaveAttribute('viewBox', '0 0 24 24');
  expect(lineSvg.querySelector('.ui-sx__circle')).toBeNull();
  // Unmodified Lucide `check`.
  expect(lineSvg.querySelector('.ui-sx__tick')).toHaveAttribute('d', 'M20 6L9 17l-5-5');
  // No filled disc and no burst ring behind it.
  expect(lineSvg.querySelector('circle')).toBeNull();
  cleanup();

  const circled = render(<Success check="circled" title="Saved" />).container;
  expect(circled.querySelector('.ui-sx')).toHaveClass('ui-sx--check-circled');
  const circledSvg = circled.querySelector('svg.ui-sx__check')!;
  expect(circledSvg).toHaveClass('ui-sx__check--circled');
  // Unmodified Lucide `circle-check-big`, the kit's circleCheck.
  expect(circledSvg.querySelector('.ui-sx__circle')).toHaveAttribute('d', 'M22 11.08V12a10 10 0 1 1-5.93-9.14');
  expect(circledSvg.querySelector('.ui-sx__tick')).toHaveAttribute('d', 'M22 4L12 14.01l-3-3');
});

// TypeScript constrains typed callers; a published package also has plain-JS ones,
// and an unknown value must land on the default rather than on a class nobody styles.
it('falls back to the line mark for a value outside the two', () => {
  const { container } = render(<Success check={'nonsense' as never} title="Saved" />);
  expect(container.querySelector('.ui-sx')).toHaveClass('ui-sx--check-line');
  expect(container.querySelector('.ui-sx')).not.toHaveClass('ui-sx--check-nonsense');
  expect(container.querySelector('svg.ui-sx__check')).toHaveClass('ui-sx__check--line');
});

it('lets the inline panel pick its mark too', () => {
  const { container, rerender } = render(<SuccessPanel />);
  expect(container.querySelector('svg.ui-sx__check')).toHaveClass('ui-sx__check--line');
  rerender(<SuccessPanel check="circled" />);
  expect(container.querySelector('svg.ui-sx__check')).toHaveClass('ui-sx__check--circled');
  rerender(<SuccessPanel check={'nonsense' as never} />);
  expect(container.querySelector('svg.ui-sx__check')).toHaveClass('ui-sx__check--line');
});

// The circled mark is one status size everywhere, and the panel's box is what sets
// it. Vanilla writes the same modifier; src/components/success.test.js holds the two
// stylesheets to the same number, and this holds React to the same markup.
// why: docs/components.md#success-confirmations
it('narrows the panel box for the circled mark, as vanilla does', () => {
  const { container, rerender } = render(<SuccessPanel check="circled" />);
  expect(container.querySelector('.ui-success__check')).toHaveClass('ui-success__check--circled');
  for (const check of [undefined, 'line', 'nonsense'] as const) {
    rerender(<SuccessPanel check={check as never} />);
    expect(container.querySelector('.ui-success__check')).not.toHaveClass('ui-success__check--circled');
  }
});

it('lets SuccessCheck pick its own mark, defaulting to the line', () => {
  const { container, rerender } = render(<SuccessCheck />);
  expect(container.querySelector('svg')).toHaveClass('ui-sx__check--line');
  rerender(<SuccessCheck variant="circled" />);
  expect(container.querySelector('svg')).toHaveClass('ui-sx__check--circled');
  expect(container.querySelectorAll('path')).toHaveLength(2);
});

// A bare <a> takes the browser's own outline, which #457 rejected. The kit's answer is
// src/styles/base.css:144 `.ui-focusable:focus-visible,`, so the composition asserted
// here is the one the README tells a caller to write. jsdom paints nothing: the ring
// itself is measured in the browser, in this PR's evidence.
it('keeps action events, keyboard focus and caller routing', async () => {
  const user = userEvent.setup();
  const click = vi.fn();
  const { getByRole } = render(<Success actions={<><Button onClick={click}>Continue</Button><a className="ui-focusable" href="#receipt">Receipt</a></>} />);
  await user.tab();
  expect(getByRole('button')).toHaveFocus();
  await user.keyboard('{Enter}');
  expect(click).toHaveBeenCalledOnce();
  await user.tab();
  expect(getByRole('link')).toHaveFocus();
  expect(getByRole('link')).toHaveAttribute('href', '#receipt');
  expect(getByRole('link')).toHaveClass('ui-focusable');
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
