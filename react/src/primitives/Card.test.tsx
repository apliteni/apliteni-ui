import { render } from '@testing-library/react';
import { Card } from './Card';

it('renders title, sub and body', () => {
  const { getByText, container } = render(<Card title="Top" sub="last 7d"><p>body</p></Card>);
  expect(container.querySelector('.ui-card')).not.toBeNull();
  expect(getByText('Top')).toHaveClass('ui-card__title');
  expect(getByText('last 7d')).toHaveClass('ui-card__sub');
  expect(getByText('body')).not.toBeNull();
});

// why: docs/foundations.md#labels-and-titles
it('titles a card with a heading one level under the page title', () => {
  const { getByRole, rerender } = render(<Card title="Payouts" />);
  expect(getByRole('heading', { level: 2, name: 'Payouts' })).toHaveClass('ui-card__title');
  rerender(<Card title="Payouts" level={3} />);
  expect(getByRole('heading', { level: 3, name: 'Payouts' })).toHaveClass('ui-card__title');
});

it('renders no heading for a card without a title', () => {
  const { queryByRole, rerender } = render(<Card><p>body</p></Card>);
  expect(queryByRole('heading')).toBeNull();
  rerender(<Card title=""><p>body</p></Card>);
  expect(queryByRole('heading')).toBeNull();
  rerender(<Card title={false}><p>body</p></Card>);
  expect(queryByRole('heading')).toBeNull();
});

it('falls back to h2 for a level that is not 2 to 6', () => {
  const { getByRole } = render(<Card title="Payouts" level={7 as 2} />);
  expect(getByRole('heading', { level: 2, name: 'Payouts' })).toBeTruthy();
});

// Main gave Button a merged className in 0.64.0; the card takes one the same way, so a
// page can mark a card without hand-writing `.ui-card` beside its own class.
it('merges a caller className with the kit class instead of replacing it', () => {
  const { container, rerender } = render(<Card title="Plan" />);
  expect(container.querySelector('div')?.className).toBe('ui-card');
  rerender(<Card title="Plan" className="doc-flow__saved-pane" />);
  const card = container.querySelector('div')!;
  expect(card).toHaveClass('ui-card');
  expect(card).toHaveClass('doc-flow__saved-pane');
});

it('adds the variant and padding classes and leaves a plain card with only ui-card', () => {
  const { container, rerender } = render(<Card variant="accent" pad="lg" />);
  expect(container.firstElementChild?.className).toBe('ui-card ui-card--accent ui-card--pad-lg');
  rerender(<Card variant="live" pad="sm" />);
  expect(container.firstElementChild?.className).toBe('ui-card ui-card--live ui-card--pad-sm');
});

it('leads the title with a hidden icon chip', () => {
  const { getByRole } = render(<Card title="Shield" icon="shield" />);
  const chip = getByRole('heading', { name: 'Shield' }).querySelector('.ui-card__icon');
  expect(chip?.getAttribute('aria-hidden')).toBe('true');
  expect(chip?.querySelector('svg')).not.toBeNull();
});

it('renders a link card with a block title instead of a heading', () => {
  const { container, queryByRole, getByText } = render(<Card href="/deck" title="Deck" sub="The deck." icon="layers" />);
  const link = container.querySelector('a');
  expect(link).toHaveClass('ui-card', 'ui-card--interactive');
  expect(link).toHaveAttribute('href', '/deck');
  expect(queryByRole('heading')).toBeNull();
  expect(getByText('Deck').tagName).toBe('DIV');
  expect(getByText('Deck')).toHaveClass('ui-card__title');
});

it.each(['javascript:alert(1)', 'data:text/plain,example', 'vbscript:example'])(
  'replaces a rejected card destination with # (%s)', href => {
    const { getByRole } = render(<Card href={href} title="Deck" />);
    expect(getByRole('link', { name: 'Deck' })).toHaveAttribute('href', '#');
  },
);

it.each(['/deck', 'https://example.com/deck'])(
  'preserves an ordinary card destination (%s)', href => {
    const { getByRole } = render(<Card href={href} title="Deck" />);
    expect(getByRole('link', { name: 'Deck' })).toHaveAttribute('href', href);
  },
);
