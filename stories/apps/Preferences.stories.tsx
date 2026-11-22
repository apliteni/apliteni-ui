// The Preferences page (#845): how the product behaves for this reader. It opens from
// the account menu as one page inside the app shell, under the vanilla page's title and id.
import type { Meta, StoryObj } from '@storybook/react';
import { useEffect, useState } from 'react';
import { AccountPage, VIEWPORTS, fourWays } from './_account-pages';
import { Sheet } from '../_guideline';
import { Confirm } from '../../react/src/Confirm';
import { EmptyState } from '../../react/src/EmptyState';
import { ThemeChoice } from '../../react/src/ThemeChoice';
import { Toast, useToast } from '../../react/src/Toast';
import { Button } from '../../react/src/primitives/Button';
import { Card } from '../../react/src/primitives/Card';

const meta: Meta = { title: 'Showcases/Preferences', id: 'apps-preferences', parameters: { layout: 'fullscreen', ...VIEWPORTS } };
export default meta;

// The theme applies as it is chosen, so the page carries no Save.
const Theme = () => <Card title="Theme"><ThemeChoice /></Card>;

// A reader holds a few connections and compares none of them, so each is a setting row,
// not a table. The two dates are separate facts: a line breaks between them, never inside.
const CSS = `<style>
  .pf-facts { display: flex; flex-wrap: wrap; column-gap: var(--space-3); }
  .pf-facts > span { white-space: nowrap; }
</style>`;

type Connection = { name: string; access: string; connected: string; used: string };
const CONNECTIONS: Connection[] = [
  ['Research bot', 'Read only', '2 Sep 2026', 'Used today'],
  ['Deck summariser', 'Read only', '14 Aug 2026', 'Used yesterday'],
  ['Spreadsheet sync', 'Read and write', '30 Jun 2026', 'Used 3 weeks ago'],
  ['Calendar bridge with a very long name for a narrow screen', 'Read and write', '2 Nov 2026', 'Never used'],
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
  return <Card title="Connections">
    {rows.length
      ? rows.map((row) => <div key={row.name} className="ui-card__row">
        <div>
          <div className="lab">{row.name}</div>
          <div className="hint">{row.access}</div>
          <div className="hint pf-facts"><span>Connected {row.connected}</span><span>{row.used}</span></div>
        </div>
        <Button id={revokeId(row.name)} variant="danger" size="sm" aria-label={`Revoke ${row.name}`} onClick={() => setAsking(row.name)}>Revoke</Button>
      </div>)
      : <EmptyState title="No apps connected" sub="Apps that you allow to use your account show here." icon=""
        actions={<Button id={BROWSE}>Browse apps</Button>} />}
    <Confirm open={asking !== null} danger title={`Revoke ${asking ?? ''}?`} body="It loses access to your account at once."
      confirmLabel="Revoke access" cancelLabel="Keep access" onConfirm={revoke} onCancel={() => setAsking(null)} />
  </Card>;
};

const page = (start?: Connection[]) => () => <Toast><AccountPage title="Preferences"><Sheet css={CSS} /><Theme /><Connections start={start} /></AccountPage></Toast>;
const render = page();

const ways = fourWays(render);
export const Default: StoryObj = ways.Default;
export const Light: StoryObj = ways.Light;
export const Phone: StoryObj = ways.Phone;
export const PhoneLight: StoryObj = ways.PhoneLight;
// The card after the last connection is revoked.
export const NoConnections: StoryObj = { ...ways.Default, render: page([]) };
