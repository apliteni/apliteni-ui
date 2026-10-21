// DOM semantics, state and Escape; browser captures cover appearance.
import { useState } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TopBar, ViewSwitch, VersionSwitcher, AccountMenu, type Version } from './TopBar';

const VERSIONS: Version[] = [
  { value: 'a2', label: 'phoenix.2026.002', meta: 'Product units', badge: 'live' },
  { value: 'a1', label: 'phoenix.2026.001', meta: 'Phoenix, 2026-05-17', badge: 'archive' },
];
const VIEWS = [{ id: 'deck', label: 'Deck' }, { id: 'text', label: 'Text' }];

it('places brand first, then the slots after the spacer, as the vanilla band does', () => {
  const { container } = render(<TopBar word="Strategy" view={<ViewSwitch items={VIEWS} active="deck" />}
    version={<span data-slot="version" />} theme={<span data-slot="theme" />} account={<span data-slot="account" />} />);
  const inner = container.querySelector('.topbar > .topbar__in')!;
  const kids = [...inner.children].map((el) => el.getAttribute('data-slot') || el.className.split(' ')[0]);
  expect(kids).toEqual(['brand', 'dtsw', 'spacer', 'version', 'theme', 'account']);
  expect(screen.getByRole('link', { name: 'Apliteni Strategy' })).toHaveAttribute('href', '/');
});
it('draws the signed-out bar when no account is given', () => {
  const { container } = render(<TopBar />);
  expect(container.querySelector('.acct')).toBeNull();
});
it('takes a brand of the caller and forwards native attributes', () => {
  render(<TopBar id="bar" className="mine" brand={<b>Mine</b>} />);
  expect(document.getElementById('bar')).toHaveClass('topbar', 'mine');
  expect(screen.queryByRole('link', { name: /Apliteni/ })).toBeNull();
});

it('marks only the current view and names the group', () => {
  render(<ViewSwitch items={VIEWS} active="text" />);
  const group = screen.getByRole('group', { name: 'View' });
  expect(group).toHaveClass('dtsw', 'on');
  expect(within(group).getByRole('link', { name: 'Text' })).toHaveAttribute('aria-current', 'page');
  expect(within(group).getByRole('link', { name: 'Text' })).toHaveClass('cur');
  expect(within(group).getByRole('link', { name: 'Deck' })).not.toHaveAttribute('aria-current');
  expect(within(group).getByRole('link', { name: 'Deck' })).toHaveAttribute('href', '#deck');
});
it('hands the link props to a router link', async () => {
  const user = userEvent.setup();
  const seen: string[] = [];
  render(<ViewSwitch items={VIEWS} active="deck" renderLink={(item, props) =>
    <a {...props} onClick={(e) => { e.preventDefault(); seen.push(item.id); }} />} />);
  await user.click(screen.getByRole('link', { name: 'Text' }));
  expect(seen).toEqual(['text']);
});

function Version2() {
  const [v, setV] = useState('a2');
  return <VersionSwitcher versions={VERSIONS} value={v} onChange={setV} />;
}
it('shows only the value on the button, with no "version:" prefix', () => {
  render(<Version2 />);
  const button = screen.getByRole('button', { name: 'Version — phoenix.2026.002' });
  expect(button).toHaveTextContent(/^phoenix\.2026\.002$/);
  expect(button).toHaveClass('vsw__btn');
});
it('ticks the selected version in the open menu and moves the tick on a pick', async () => {
  const user = userEvent.setup();
  render(<Version2 />);
  await user.click(screen.getByRole('button', { name: /Version/ }));
  const list = screen.getByRole('listbox');
  const rows = within(list).getAllByRole('option');
  expect(rows[0]).toHaveAttribute('aria-selected', 'true');
  expect(rows[0].querySelector('.vtick')).not.toBeNull();
  expect(rows[0]).toHaveClass('is-selected');
  expect(rows[1]).not.toHaveClass('is-selected');
  expect(rows[0]).toHaveTextContent('Live');
  expect(rows[1]).toHaveTextContent('Archive');
  await user.click(rows[1]);
  expect(screen.getByRole('button', { name: 'Version — phoenix.2026.001' })).toBeInTheDocument();
});

it('keeps the version tick on the controlled value when the parent rejects a pick', async () => {
  const user = userEvent.setup();
  const picks: string[] = [];
  render(<VersionSwitcher versions={VERSIONS} value="a2" onChange={(value) => picks.push(value)} />);
  await user.click(screen.getByRole('button', { name: 'Version — phoenix.2026.002' }));
  await user.click(within(screen.getByRole('listbox')).getByRole('option', { name: /phoenix.2026.001/ }));
  expect(picks).toEqual(['a1']);
  expect(screen.getByRole('button', { name: 'Version — phoenix.2026.002' })).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Version — phoenix.2026.002' }));
  const rows = within(screen.getByRole('listbox')).getAllByRole('option');
  expect(rows[0]).toHaveAttribute('aria-selected', 'true');
  expect(rows[1]).toHaveAttribute('aria-selected', 'false');
});

it('keeps the vanilla version panel and row structure', () => {
  const { container } = render(<VersionSwitcher versions={VERSIONS} value="a2" defaultOpen />);
  expect(container.querySelector('.vsw__menu')).toBeInTheDocument();
  expect(container.querySelector('.vsw__menu .vopt .vname')).toHaveTextContent('phoenix.2026.002');
  expect(container.querySelector('.vsw__menu .vopt .vmeta')).toHaveTextContent('Product units');
  expect(container.querySelector('.vsw__menu .vopt .vtick')).toBeInTheDocument();
});

it('opens the account menu from the avatar, with the reader, the pages and Sign out', async () => {
  const user = userEvent.setup();
  const out = vi.fn();
  render(<AccountMenu name="Ada Lovelace" email="ada@apliteni.com" onSignOut={out} />);
  const avatar = screen.getByRole('button', { name: 'Account' });
  expect(avatar).toHaveTextContent('AL');
  await user.click(avatar);
  const menu = screen.getByRole('menu');
  expect(within(menu).getByText('Ada Lovelace')).toBeInTheDocument();
  expect(within(menu).getByText('ada@apliteni.com')).toBeInTheDocument();
  expect(within(menu).getByRole('menuitem', { name: 'Preferences' })).toHaveAttribute('href', '#prefs');
  await user.click(within(menu).getByRole('menuitem', { name: 'Sign out' }));
  expect(out).toHaveBeenCalledTimes(1);
});

it('keeps the vanilla account head and one current-page mark', () => {
  const { container } = render(<AccountMenu name="Ada Lovelace" email="ada@apliteni.com" current="access" defaultOpen />);
  const panel = container.querySelector('.amenu')!;
  expect(panel.querySelector('.ahead .avatar')).toHaveTextContent('AL');
  expect(panel.querySelector('.ahead .anm')).toHaveTextContent('Ada Lovelace');
  expect(panel.querySelector('.ahead .aem')).toHaveTextContent('ada@apliteni.com');
  expect(panel.querySelectorAll('a.cur')).toHaveLength(1);
  expect(within(panel as HTMLElement).getByRole('menuitem', { name: 'Access & agents' })).toHaveClass('cur');
});
it('falls back to the address for the avatar mark and closes on Escape', async () => {
  const user = userEvent.setup();
  render(<AccountMenu name=" " email="grace.hopper@apliteni.com" />);
  const avatar = screen.getByRole('button', { name: 'Account' });
  expect(avatar).toHaveTextContent('GH');
  await user.click(avatar);
  expect(avatar).toHaveAttribute('aria-expanded', 'true');
  await fireEvent.keyDown(avatar, { key: 'Escape' });
  expect(avatar).toHaveAttribute('aria-expanded', 'false');
});
