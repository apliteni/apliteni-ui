// The Preferences page (#845): how the product behaves for this reader. It opens from
// the account menu as one page inside the app shell, under the vanilla page's title and id.
import type { Meta, StoryObj } from '@storybook/react';
import { useEffect, useState } from 'react';
import { AccountPage, VIEWPORTS, fourWays } from './_account-pages';
import { useThemeChoice, type Theme } from '../../react/src/ThemeToggle';
import { Confirm } from '../../react/src/Confirm';
import { DataTable, type Column } from '../../react/src/DataTable';
import { EmptyState } from '../../react/src/EmptyState';
import { Segmented } from '../../react/src/Segmented';
import { Toast, useToast } from '../../react/src/Toast';
import { Button } from '../../react/src/primitives/Button';
import { Card } from '../../react/src/primitives/Card';

const meta: Meta = { title: 'Showcases/Preferences', id: 'apps-preferences', parameters: { layout: 'fullscreen', ...VIEWPORTS } };
export default meta;

// Each choice applies as it is made, so the page carries no Save. The choice ends the
// row that names it, as the kit's settings rows place a control.
const THEMES = [{ label: 'System', value: 'auto' }, { label: 'Light', value: 'light' }, { label: 'Dark', value: 'dark' }];
const ThemeChoice = () => {
  const { theme, set } = useThemeChoice();
  return <Card title="Appearance">
    <div className="ui-card__row ui-card__row--tight-choice"><div className="lab">Theme</div>
      <Segmented label="Theme" options={THEMES} value={theme} onChange={(value) => set(value as Theme)} /></div>
  </Card>;
};

type Connection = { name: string; access: string; connected: string; used: string; act?: never };
const CONNECTIONS: Connection[] = [
  ['Research bot', 'Read only', '2026-09-02', 'Today'],
  ['Deck summariser', 'Read only', '2026-08-14', 'Yesterday'],
  ['Spreadsheet sync', 'Read and write', '2026-06-30', '3 weeks ago'],
].map(([name, access, connected, used]) => ({ name, access, connected, used }));
const revokeId = (app: string) => `revoke-${app.toLowerCase().replace(/\W+/g, '-')}`;
const BROWSE = 'connections-browse';

// Revoking cannot be undone from here, so it asks first and names both actions. After
// it, the keyboard lands on the next row's Revoke, and a toast says what changed.
const Connections = ({ start = CONNECTIONS }: { start?: Connection[] }) => {
  const [rows, setRows] = useState(start);
  const [asking, setAsking] = useState<string | null>(null);
  const [land, setLand] = useState<string | null>(null);
  const toast = useToast();
  const revoke = () => {
    const at = rows.findIndex((row) => row.name === asking);
    const left = rows.filter((row) => row.name !== asking);
    const next = left[at] ?? left[at - 1];
    setRows(left);
    setLand(next ? revokeId(next.name) : BROWSE);
    setAsking(null);
    toast({ tone: 'success', title: `${asking} revoked` });
  };
  // After the dialog hands focus back to a Revoke that is gone.
  useEffect(() => {
    if (!land) return;
    document.getElementById(land)?.focus();
    setLand(null);
  }, [land]);
  const columns: Column<Connection>[] = [
    { key: 'name', label: 'App', cell: 'title' },
    { key: 'access', label: 'Access' },
    { key: 'connected', label: 'Connected' },
    { key: 'used', label: 'Last used' },
    { key: 'act', label: <span className="ui-sr">Actions</span>, cell: 'act', render: (row) =>
      <Button id={revokeId(row.name)} variant="danger" size="sm" aria-label={`Revoke ${row.name}`} onClick={() => setAsking(row.name)}>Revoke</Button> },
  ];
  return <Card title="Connections">
    {/* A reader holds a few connections, so the table takes no bar. why: guidelines/dense-tables.md#give-a-long-table-its-filter-bar */}
    {rows.length
      ? <DataTable<Connection> selectable={false} pager={false} stickyHeader pinnedIdentity caption="Connections" scrollLabel="Connections" rows={rows} columns={columns} />
      : <EmptyState title="No apps connected" sub="Apps that you allow to use your account show here." icon=""
        actions={<Button id={BROWSE}>Browse apps</Button>} />}
    <Confirm open={asking !== null} danger title={`Revoke ${asking ?? ''}?`} body="It loses access to your account at once."
      confirmLabel="Revoke access" cancelLabel="Keep access" onConfirm={revoke} onCancel={() => setAsking(null)} />
  </Card>;
};

const page = (start?: Connection[]) => () => <Toast><AccountPage title="Preferences"><ThemeChoice /><Connections start={start} /></AccountPage></Toast>;
const render = page();

const ways = fourWays(render);
export const Default: StoryObj = ways.Default;
export const Light: StoryObj = ways.Light;
export const Phone: StoryObj = ways.Phone;
export const PhoneLight: StoryObj = ways.PhoneLight;
// The card after the last connection is revoked.
export const NoConnections: StoryObj = { ...ways.Default, render: page([]) };
