import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { AuthShell } from './AuthShell';

it('keeps the brand and the auth task inside one centered kit card', () => {
  const { container } = render(<AuthShell brand={<a href="/">Example</a>}><h1>Sign in</h1></AuthShell>);
  const shell = container.querySelector('.ui-auth')!;
  const card = shell.querySelector('.ui-auth__card')!;
  expect(card.querySelector('.ui-auth__brand a')).toHaveAttribute('href', '/');
  expect(card).toContainElement(screen.getByRole('heading', { name: 'Sign in' }));
  expect(shell.querySelector('.ui-glow')).toBeNull();
});

it('splits the brand and the task with a tagline under the brand', () => {
  const { container } = render(<AuthShell split tagline="Access the design system with your work account."
    brand={<a href="/">Example</a>}><h1>Sign in</h1></AuthShell>);
  const shell = container.querySelector('.ui-auth--split')!;
  const pane = shell.querySelector('.ui-auth__brand-pane')!;
  expect(pane.querySelector('.ui-auth__brand a')).toHaveAttribute('href', '/');
  expect(pane.querySelector('.ui-auth__tagline')).toHaveTextContent('Access the design system with your work account.');
  expect(shell.querySelector('.ui-auth__pane')).toContainElement(screen.getByRole('heading', { name: 'Sign in' }));
  expect(shell.querySelector('.ui-auth__card')).toBeNull();
});
