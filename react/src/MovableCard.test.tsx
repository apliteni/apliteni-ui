import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import axe from 'axe-core';
import { CardSlot, MovableCard } from './MovableCard';

afterEach(cleanup);

it('is one named Tab stop that the browser can drag, with its heading, body and action', () => {
  render(<MovableCard title={<a href="#t1">Send the report</a>} label="Send the report" action={<button type="button">Actions</button>}>
    <p>Ada Lovelace</p>
  </MovableCard>);
  const card = screen.getByRole('group', { name: 'Send the report' });
  expect(card).toHaveAttribute('draggable', 'true');
  expect(card).toHaveAttribute('tabindex', '0');
  expect(card.className).toBe('ui-card ui-card--movable');
  expect(screen.getByRole('heading', { level: 3, name: 'Send the report' })).toHaveClass('ui-card__title');
  expect(card.querySelector('.ui-card__action > button')).not.toBeNull();
});

it('marks a held card and takes a heading level under its column', () => {
  render(<MovableCard title="Send the report" label="Send the report" level={4} held />);
  expect(screen.getByRole('group')).toHaveClass('is-held');
  expect(screen.getByRole('heading', { level: 4 })).toBeInTheDocument();
});

it('draws a target slot that a screen reader skips, as tall as the card', () => {
  const { container } = render(<CardSlot height={96} />);
  const slot = container.firstElementChild as HTMLElement;
  expect(slot.className).toBe('ui-card-slot');
  expect(slot).toHaveAttribute('aria-hidden', 'true');
  expect(slot.style.blockSize).toBe('96px');
});

it('has no axe violation', async () => {
  const { container } = render(<MovableCard title="Send the report" label="Send the report" action={<button type="button">Actions</button>} />);
  expect((await axe.run(container)).violations).toEqual([]);
});
