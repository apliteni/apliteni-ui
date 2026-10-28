// <AccountWindow>: what the window owns once a product gives it the reader and the
// sections. jsdom applies no media query, so both navs and both closes are in the DOM
// here; which one a reader sees is AccountWindow.css's, measured in a browser.
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, vi } from 'vitest';
import { AccountWindow, type AccountSection } from './AccountWindow';

afterEach(cleanup);

const reader = { name: 'Dana Example', email: 'dana@example.com' };
const sections: AccountSection[] = [
  { id: 'profile', label: 'Profile', icon: 'user', content: <input aria-label="Full name" /> },
  { id: 'security', label: 'Security', icon: 'lock', content: <p>Password</p> },
];
const dialog = () => screen.getByRole('dialog', { name: 'Account' });
const navs = () => within(dialog()).getAllByRole('navigation', { name: 'Account' });

it('shows the reader, the sections in both navs and the first section', () => {
  render(<AccountWindow open onClose={() => {}} reader={reader} sections={sections} />);
  expect(within(dialog()).getByText('Dana Example')).toBeTruthy();
  expect(within(dialog()).getByText('dana@example.com')).toBeTruthy();
  expect(within(dialog()).getByRole('heading', { level: 2 }).textContent).toBe('Profile');
  for (const nav of navs()) {
    const rows = within(nav).getAllByRole('button');
    expect(rows.map(r => r.textContent)).toEqual(['Profile', 'Security']);
    expect(rows.map(r => r.getAttribute('aria-current'))).toEqual(['true', null]);
    expect(rows.every(r => !r.hasAttribute('href'))).toBe(true);
  }
});

it('a row opens its section and remounts the pane', async () => {
  const onSectionChange = vi.fn();
  render(<AccountWindow open onClose={() => {}} reader={reader} sections={sections} onSectionChange={onSectionChange} />);
  await userEvent.type(screen.getByLabelText('Full name'), 'Dana');
  await userEvent.click(within(navs()[0]).getByRole('button', { name: 'Security' }));
  expect(onSectionChange).toHaveBeenCalledWith('security');
  expect(within(dialog()).getByRole('heading', { level: 2 }).textContent).toBe('Security');
  for (const nav of navs()) {
    expect(within(nav).getByRole('button', { name: 'Security' }).getAttribute('aria-current')).toBe('true');
  }
  await userEvent.click(within(navs()[1]).getByRole('button', { name: 'Profile' }));
  expect((screen.getByLabelText('Full name') as HTMLInputElement).value).toBe('');
});

it('a controlled section follows the product', async () => {
  function Host() {
    const [section, setSection] = useState('security');
    return <AccountWindow open onClose={() => {}} reader={reader} sections={sections}
      section={section} onSectionChange={id => setSection(id === 'profile' ? 'security' : id)} />;
  }
  render(<Host />);
  expect(within(dialog()).getByRole('heading', { level: 2 }).textContent).toBe('Security');
  await userEvent.click(within(navs()[0]).getByRole('button', { name: 'Profile' }));
  expect(within(dialog()).getByRole('heading', { level: 2 }).textContent).toBe('Security');
});

it('each close and Escape call onClose', async () => {
  const onClose = vi.fn();
  render(<AccountWindow open onClose={onClose} reader={reader} sections={sections} />);
  const closes = within(dialog()).getAllByRole('button', { name: 'Close' });
  expect(closes).toHaveLength(2);
  for (const close of closes) await userEvent.click(close);
  await userEvent.keyboard('{Escape}');
  expect(onClose).toHaveBeenCalledTimes(3);
});

it('renders nothing while closed', () => {
  render(<AccountWindow open={false} onClose={() => {}} reader={reader} sections={sections} />);
  expect(screen.queryByRole('dialog')).toBeNull();
});
