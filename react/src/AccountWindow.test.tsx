// <AccountWindow>: what the window owns once a product gives it the reader and the
// sections. jsdom applies no media query, so both screens, the back button and both closes
// are in the DOM here; which of them a reader sees is AccountWindow.css's, measured in a
// browser. jsdom has no checkVisibility, so a hidden back button takes focus here.
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
const rail = () => within(dialog()).getByRole('navigation', { name: 'Account' });
const view = () => dialog().getAttribute('data-view');

it('shows the reader, the sections in the rail, and the first section', () => {
  render(<AccountWindow open onClose={() => {}} reader={reader} sections={sections} />);
  expect(within(dialog()).getByText('Dana Example')).toBeTruthy();
  expect(within(dialog()).getByText('dana@example.com')).toBeTruthy();
  expect(within(dialog()).getByRole('heading', { level: 2 }).textContent).toBe('Profile');
  expect(within(dialog()).getByRole('region', { name: 'Profile' })).toBeTruthy();
  const rows = within(rail()).getAllByRole('button');
  expect(rows.map(r => r.textContent)).toEqual(['Profile', 'Security']);
  expect(rows.map(r => r.getAttribute('aria-current'))).toEqual(['true', null]);
  expect(rows.every(r => !r.hasAttribute('href') && r.tagName === 'BUTTON')).toBe(true);
  expect(within(dialog()).queryByRole('tablist')).toBeNull();
});

// On a phone the window shows one screen at a time. It opens on the section, the back
// button opens the screen of sections, and a press there opens that section. Each
// change moves focus to the new screen.
it('the back button opens the sections, a section press opens it, and each screen takes focus', async () => {
  const onSectionChange = vi.fn();
  const onClose = vi.fn();
  const { rerender } = render(<AccountWindow open onClose={onClose} reader={reader} sections={sections}
    onSectionChange={onSectionChange} />);
  const back = within(dialog()).getByRole('button', { name: 'Sections' });
  expect(back.title).toBe('Sections');
  expect(view()).toBe('section');
  await userEvent.click(back);
  expect(view()).toBe('sections');
  expect(document.activeElement).toBe(within(rail()).getByRole('button', { name: 'Profile' }));
  within(rail()).getByRole('button', { name: 'Security' }).focus();
  await userEvent.keyboard('{Enter}');
  expect(view()).toBe('section');
  expect(onSectionChange).toHaveBeenCalledWith('security');
  expect(within(dialog()).getByRole('heading', { level: 2 }).textContent).toBe('Security');
  expect(document.activeElement).toBe(within(dialog()).getByRole('button', { name: 'Sections' }));
  await userEvent.click(within(dialog()).getByRole('button', { name: 'Sections' }));
  expect(document.activeElement).toBe(within(rail()).getByRole('button', { name: 'Security' }));
  await userEvent.keyboard('{Escape}');
  expect(onClose).toHaveBeenCalledTimes(1);
  // A closed window opens again on the section.
  rerender(<AccountWindow open={false} onClose={() => {}} reader={reader} sections={sections} />);
  rerender(<AccountWindow open onClose={() => {}} reader={reader} sections={sections} />);
  expect(view()).toBe('section');
});

it('a row opens its section and remounts the pane', async () => {
  const onSectionChange = vi.fn();
  render(<AccountWindow open onClose={() => {}} reader={reader} sections={sections} onSectionChange={onSectionChange} />);
  await userEvent.type(screen.getByLabelText('Full name'), 'Dana');
  await userEvent.click(within(rail()).getByRole('button', { name: 'Security' }));
  expect(onSectionChange).toHaveBeenCalledWith('security');
  expect(within(dialog()).getByRole('heading', { level: 2 }).textContent).toBe('Security');
  expect(within(rail()).getByRole('button', { name: 'Security' }).getAttribute('aria-current')).toBe('true');
  await userEvent.click(within(rail()).getByRole('button', { name: 'Profile' }));
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
  await userEvent.click(within(rail()).getByRole('button', { name: 'Profile' }));
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
