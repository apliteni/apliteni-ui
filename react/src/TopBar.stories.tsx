import { useEffect, useState, type ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { TopBar, ViewSwitch, VersionSwitcher, AccountMenu, type Version } from './TopBar';
import { ThemeToggle } from './ThemeToggle';

const VERSIONS: Version[] = [
  { value: 'phoenix.2026.002', label: 'phoenix.2026.002', meta: 'Product units, animated deck', badge: 'live' },
  { value: 'phoenix.2026.001', label: 'phoenix.2026.001', meta: 'Phoenix, 2026-05-17', badge: 'archive' },
];
const VIEWS = [{ id: 'deck', label: 'Deck' }, { id: 'text', label: 'Text' }];

const meta: Meta<typeof TopBar> = { title: 'React/TopBar', component: TopBar, parameters: { layout: 'fullscreen' } };
export default meta;

// ThemeToggle writes the theme onto the document, so the story puts back what it found.
function KeepTheme({ children }: { children: ReactNode }) {
  const [found] = useState(() => ['data-theme', 'data-theme-choice'].map(
    (name) => [name, document.documentElement.getAttribute(name)] as const));
  useEffect(() => () => {
    for (const [name, value] of found) {
      if (value === null) document.documentElement.removeAttribute(name);
      else document.documentElement.setAttribute(name, value);
    }
  }, [found]);
  return <>{children}</>;
}

function Bar({ view = 'deck', signedOut = false, open = false }: { view?: string; signedOut?: boolean; open?: boolean }) {
  const [version, setVersion] = useState(VERSIONS[0].value);
  const [current, setCurrent] = useState(view);
  return <KeepTheme><TopBar
    view={<ViewSwitch items={VIEWS} active={current} renderLink={(item, props) =>
      <a {...props} onClick={(e) => { e.preventDefault(); setCurrent(item.id); }} />} />}
    version={<VersionSwitcher versions={VERSIONS} value={version} onChange={setVersion} defaultOpen={open} />}
    theme={<ThemeToggle />}
    account={signedOut ? undefined : <AccountMenu name="Ada Lovelace" email="ada@apliteni.com" />} /></KeepTheme>;
}

export const Full: StoryObj = { render: () => <Bar /> };
export const SignedOut: StoryObj = { name: 'Signed out', render: () => <Bar view="text" signedOut /> };
export const VersionOpen: StoryObj = { name: 'Version menu open', render: () => <Bar open /> };
export const AccountOpen: StoryObj = {
  name: 'Account menu open',
  render: () => <KeepTheme><TopBar view={<ViewSwitch items={VIEWS} active="deck" />} theme={<ThemeToggle />}
    account={<AccountMenu name="Ada Lovelace" email="ada@apliteni.com" defaultOpen />} /></KeepTheme>,
};
