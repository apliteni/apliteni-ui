import { render, screen } from '@testing-library/react';
import { Skeleton, SkeletonTable, BusyRegion, Denied } from './Loading';
import { Button } from './primitives/Button';

it('the busy region is the same polite live region the vanilla kit ships', () => {
  const { container } = render(<BusyRegion busy label="Loading payouts…">rows</BusyRegion>);
  const region = container.querySelector('.ui-busy')!;
  expect(region).toHaveAttribute('role', 'status');
  expect(region).toHaveAttribute('aria-live', 'polite');
  expect(region).toHaveAttribute('aria-busy', 'true');
  expect(region.querySelector('.ui-sr')).toHaveTextContent('Loading payouts…');
});

// The whole mechanism. React announces by keeping the region mounted and
// changing the text inside it — a region that unmounts and remounts with the
// loaded view announces nothing, which is the silent bug #128 was filed for.
it('the region element survives the busy → ready transition', () => {
  const { container, rerender } = render(
    <BusyRegion busy label="Loading payouts…" message="3 payouts"><p>rows</p></BusyRegion>,
  );
  const before = container.querySelector('.ui-busy');
  expect(container.querySelector('.ui-skel')).toBeInTheDocument();

  rerender(<BusyRegion busy={false} label="Loading payouts…" message="3 payouts"><p>rows</p></BusyRegion>);

  expect(container.querySelector('.ui-busy')).toBe(before);
  expect(before).toHaveAttribute('aria-busy', 'false');
  expect(before!.querySelector('.ui-sr')).toHaveTextContent('3 payouts');
  expect(container.querySelector('.ui-skel')).toBeNull();
  expect(screen.getByText('rows')).toBeInTheDocument();
});

it('skeletons are hidden from assistive tech and render the shape asked for', () => {
  const { container } = render(<><Skeleton lines={4} /><SkeletonTable rows={2} cols={3} /></>);
  container.querySelectorAll('.ui-skel').forEach((el) => {
    expect(el).toHaveAttribute('aria-hidden', 'true');
  });
  expect(container.querySelectorAll('.ui-skel:not(.ui-skel--table) .ui-skel__bar')).toHaveLength(4);
  expect(container.querySelectorAll('.ui-skel--table .ui-skel__bar')).toHaveLength(9);
});

it('explicit widths reach the bar', () => {
  const { container } = render(<Skeleton lines={['100%', '62%']} />);
  const bars = container.querySelectorAll<HTMLElement>('.ui-skel__bar');
  expect(bars[0].style.width).toBe('100%');
  expect(bars[1].style.width).toBe('62%');
});

// Denied is how a fetch resolved, not an event of its own. Two live regions
// racing over one outcome is how a screen says things twice.
it('Denied carries no live region, and names the scope verbatim', () => {
  const { container } = render(<Denied title="Nope" sub="Ask an owner." need="reports.read" />);
  expect(container.querySelector('[aria-live]')).toBeNull();
  expect(container.querySelector('[role="status"]')).toBeNull();
  expect(container.querySelector('[role="alert"]')).toBeNull();
  expect(screen.getByText('reports.read').tagName).toBe('CODE');
});

// busy ⇒ disabled, the same ruling button() makes in components/index.js. The
// two implementations of this button must not disagree about it.
it('Button busy sets aria-busy, disables, and draws the kit bars', () => {
  render(<Button variant="primary" busy>Saving…</Button>);
  const btn = screen.getByRole('button', { name: 'Saving…' });
  expect(btn).toHaveAttribute('aria-busy', 'true');
  expect(btn).toBeDisabled();
  expect(btn.querySelector('.ui-btn__bars')).toBeInTheDocument();
});

it('Button without busy is untouched — no stray attributes, no bars', () => {
  render(<Button variant="primary">Save</Button>);
  const btn = screen.getByRole('button', { name: 'Save' });
  expect(btn).not.toHaveAttribute('aria-busy');
  expect(btn).not.toHaveAttribute('aria-disabled');
  expect(btn).toBeEnabled();
  expect(btn.querySelector('.ui-btn__bars')).toBeNull();
});
