// The Preferences page (#845): how the product behaves for this reader. It opens from
// the account menu as one page inside the app shell, under the vanilla page's title and id.
import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { AccountPage, VIEWPORTS, fourWays } from './_account-pages';
import { useThemeChoice, type Theme } from '../../react/src/ThemeToggle';
import { Confirm } from '../../react/src/Confirm';
import { EmptyState } from '../../react/src/EmptyState';
import { Segmented } from '../../react/src/Segmented';
import { Button } from '../../react/src/primitives/Button';
import { Card } from '../../react/src/primitives/Card';

const meta: Meta = { title: 'Showcases/Preferences', id: 'apps-preferences', parameters: { layout: 'fullscreen', ...VIEWPORTS } };
export default meta;

// Each choice applies as it is made, so the page carries no Save.
const THEMES = [{ label: 'System', value: 'auto' }, { label: 'Light', value: 'light' }, { label: 'Dark', value: 'dark' }];
const ThemeChoice = () => {
  const { theme, set } = useThemeChoice();
  return <Card title="Theme">
    <Segmented label="Theme" options={THEMES} value={theme} onChange={(value) => set(value as Theme)} />
  </Card>;
};

const CONNECTIONS = [
  ['Research bot', 'Read only', '2026-09-02', 'Today'],
  ['Deck summariser', 'Read only', '2026-08-14', 'Yesterday'],
  ['Spreadsheet sync', 'Read and write', '2026-06-30', '3 weeks ago'],
];
// Revoking cannot be undone from here, so it asks first and names both actions.
const Connections = () => {
  const [rows, setRows] = useState(CONNECTIONS);
  const [asking, setAsking] = useState<string | null>(null);
  const revoke = () => { setRows(rows.filter(([app]) => app !== asking)); setAsking(null); };
  return <Card title="Connections">
    {rows.length ? <table className="ui-table ui-table--hover">
      <thead><tr><th>App</th><th>Access</th><th>Connected</th><th>Last used</th><th></th></tr></thead>
      <tbody>{rows.map(([app, access, connected, used]) => <tr key={app}>
        <td className="ui-table__title">{app}</td><td>{access}</td><td>{connected}</td><td>{used}</td>
        <td className="ui-table__act"><Button variant="danger" size="sm" aria-label={`Revoke ${app}`} onClick={() => setAsking(app)}>Revoke</Button></td>
      </tr>)}</tbody>
    </table> : <EmptyState title="No apps connected" sub="" icon="" />}
    <Confirm open={asking !== null} danger title={`Revoke ${asking ?? ''}?`} body="It loses access to your account at once."
      confirmLabel="Revoke access" cancelLabel="Keep access" onConfirm={revoke} onCancel={() => setAsking(null)} />
  </Card>;
};

const render = () => <AccountPage title="Preferences"><ThemeChoice /><Connections /></AccountPage>;

const ways = fourWays(render);
export const Default: StoryObj = ways.Default;
export const Light: StoryObj = ways.Light;
export const Phone: StoryObj = ways.Phone;
export const PhoneLight: StoryObj = ways.PhoneLight;
