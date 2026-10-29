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
const rail = () => within(dialog()).getByRole('navigation', { name: 'Account' });
const tablist = () => within(dialog()).getByRole('tablist', { name: 'Account' });

it('shows the reader, the sections in the rail and the tabs, and the first section', () => {
  render(<AccountWindow open onClose={() => {}} reader={reader} sections={sections} />);
  expect(within(dialog()).getByText('Dana Example')).toBeTruthy();
  expect(within(dialog()).getByText('dana@example.com')).toBeTruthy();
  expect(within(dialog()).getByRole('heading', { level: 2 }).textContent).toBe('Profile');
  const rows = within(rail()).getAllByRole('button');
  expect(rows.map(r => r.textContent)).toEqual(['Profile', 'Security']);
  expect(rows.map(r => r.getAttribute('aria-current'))).toEqual(['true', null]);
  const tabs = within(tablist()).getAllByRole('tab');
  expect(tabs.map(t => t.textContent)).toEqual(['Profile', 'Security']);
  expect(tabs.map(t => t.getAttribute('aria-selected'))).toEqual(['true', 'false']);
  expect([...rows, ...tabs].every(r => !r.hasAttribute('href') && r.tagName === 'BUTTON')).toBe(true);
});

it('the phone tabs are one Tab stop, move with the arrows, Home and End, and label the pane', async () => {
  const onSectionChange = vi.fn();
  render(<AccountWindow open onClose={() => {}} reader={reader} sections={[...sections,
    { id: 'billing', label: 'Billing', content: <p>Plan</p> }]} onSectionChange={onSectionChange} />);
  const tab = (name: string) => within(tablist()).getByRole('tab', { name });
  const selected = () => within(tablist()).getByRole('tab', { selected: true });
  expect(within(tablist()).getAllByRole('tab').map(t => t.tabIndex)).toEqual([0, -1, -1]);
  tab('Profile').focus();
  for (const [key, name] of [['{ArrowRight}', 'Security'], ['{End}', 'Billing'], ['{ArrowRight}', 'Profile'],
    ['{ArrowLeft}', 'Billing'], ['{Home}', 'Profile']]) {
    await userEvent.keyboard(key);
    expect(selected().textContent).toBe(name);
    expect(document.activeElement).toBe(selected());
    expect(within(tablist()).getAllByRole('tab').filter(t => t.tabIndex === 0)).toEqual([selected()]);
    const pane = within(dialog()).getByRole('tabpanel', { name });
    expect(selected().getAttribute('aria-controls')).toBe(pane.id);
  }
  expect(onSectionChange.mock.calls.map(([id]) => id)).toEqual(['security', 'billing', 'profile', 'billing', 'profile']);
});

// jsdom lays nothing out, so the row and the selected tab are given the 390px phone's
// boxes: a 310px row and a tab that ends 100px past its right edge. The browser's own
// reveal is NavTabs', measured there.
it('the phone row reveals the default section and a controlled change', () => {
  const tabsOf = (el: Element) => el.closest('.rx-account__tabs') === el;
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(function (this: HTMLElement) { return tabsOf(this) ? 310 : 0; });
  vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockImplementation(function (this: HTMLElement) { return tabsOf(this) ? 600 : 0; });
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
    if (tabsOf(this)) return { left: 40, right: 350 } as DOMRect;
    return (this.getAttribute('aria-selected') === 'true' ? { left: 360, right: 450 } : { left: 0, right: 0 }) as DOMRect;
  });
  try {
    const props = { open: true, onClose: () => {}, reader, sections };
    render(<AccountWindow {...props} defaultSection="security" />);
    expect(tablist().scrollLeft).toBe(100);
    cleanup();
    const { rerender } = render(<AccountWindow {...props} section="profile" />);
    tablist().scrollLeft = 0;
    rerender(<AccountWindow {...props} section="security" />);
    expect(tablist().scrollLeft).toBe(100);
  } finally {
    vi.restoreAllMocks();
  }
});

it('a row opens its section and remounts the pane', async () => {
  const onSectionChange = vi.fn();
  render(<AccountWindow open onClose={() => {}} reader={reader} sections={sections} onSectionChange={onSectionChange} />);
  await userEvent.type(screen.getByLabelText('Full name'), 'Dana');
  await userEvent.click(within(rail()).getByRole('button', { name: 'Security' }));
  expect(onSectionChange).toHaveBeenCalledWith('security');
  expect(within(dialog()).getByRole('heading', { level: 2 }).textContent).toBe('Security');
  expect(within(rail()).getByRole('button', { name: 'Security' }).getAttribute('aria-current')).toBe('true');
  expect(within(tablist()).getByRole('tab', { name: 'Security' }).getAttribute('aria-selected')).toBe('true');
  await userEvent.click(within(tablist()).getByRole('tab', { name: 'Profile' }));
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
