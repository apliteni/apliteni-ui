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
