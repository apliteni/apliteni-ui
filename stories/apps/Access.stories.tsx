// The access and agents showcase in React, under the vanilla page's title and id.
import type { Meta, StoryObj } from '@storybook/react';
import { useState, type ReactNode } from 'react';
import { ACCOUNT_NAV, codeTokens } from '@apliteni/apliteni-ui';
import { DemoShell, type DemoNavItem } from './_demo-shell';
import { Snippet } from '../../react/src/Snippet';
import { FilterBar } from '../../react/src/FilterBar';
import { SearchField } from '../../react/src/SearchField';
import { EmptyState } from '../../react/src/EmptyState';
import { BusyRegion, Denied as DeniedState, SkeletonTable } from '../../react/src/Loading';
import { Badge } from '../../react/src/primitives/Badge';
import { Button } from '../../react/src/primitives/Button';
import { Card } from '../../react/src/primitives/Card';
import { Icon } from '../../react/src/primitives/Icon';

const meta: Meta = { title: 'Showcases/Access & Agents', id: 'apps-access-agents', parameters: { layout: 'fullscreen' } };
export default meta;

// Overview is this demo's own screen, not the kit's default: a consuming /account
// page that took ACCOUNT_NAV whole would get a link to nothing.
const NAV: DemoNavItem[] = [{ id: 'overview', icon: 'chart', label: 'Overview' }, ...(ACCOUNT_NAV as DemoNavItem[])];
const Screen = ({ sub, children }: { sub: string; children: ReactNode }) =>
  <DemoShell layout="rail" nav={NAV} active="access" title="Access & agents" lede={sub}>{children}</DemoShell>;

const AGENTS = [
  ['Research bot', 'Read only', '2 hours ago', 'live'],
  ['Deck summariser', 'Read only', 'Yesterday', 'live'],
  ['Old integration', 'Read only', '3 weeks ago', 'dead'],
];
const LABEL = { live: 'Active', dead: 'Revoked' } as Record<string, string>;
// The state chip starts unset, so the table opens on every agent.
const STATE = { id: 'state', label: 'State', items: [{ label: 'Any state', value: '' }, { label: 'Active', value: 'Active' }, { label: 'Revoked', value: 'Revoked' }] };
const TokenTable = ({ rows }: { rows: string[][] }) => <table className="ui-table ui-table--hover">
  <thead><tr><th>Agent</th><th>Scope</th><th>Last used</th><th></th></tr></thead>
  <tbody>{rows.map(([name, scope, used, state]) => <tr key={name} className={state === 'dead' ? 'is-dead' : ''}>
    <td className="ui-table__title">{name}</td><td>{scope}</td><td>{used}</td>
    <td className="ui-table__act">{state === 'dead'
      ? <span style={{ color: 'var(--muted)', fontSize: 13 }}>Revoked</span>
      : <Button variant="danger" size="sm">Revoke access</Button>}</td>
  </tr>)}</tbody>
</table>;
// Every table has its filter bar directly above it, the loading one included, on a
// card because a field never stands on the page ground. why: guidelines/dense-tables.md
const Agents = ({ loading = false, children }: { loading?: boolean; children?: ReactNode }) => {
  const [query, setQuery] = useState('');
  const [state, setState] = useState('');
  const term = query.trim().toLowerCase();
  const rows = AGENTS.filter(([name, , , live]) => (!state || LABEL[live] === state) && name.toLowerCase().includes(term));
  const clear = () => { setQuery(''); setState(''); };
  return <>
    <Card><div className="ui-toolbar">
      <SearchField ariaLabel="Search agents" placeholder="Agent" value={query} onChange={(e) => setQuery(e.currentTarget.value)} />
      <FilterBar filters={[{ ...STATE, value: state }]} label="Agent filters"
        onChange={(_, value) => setState(value ?? '')} onRemove={() => setState('')} onClear={() => setState('')} />
    </div></Card>
    <Card title="Your agents">
      {loading ? <BusyRegion busy label="Loading your agents…" placeholder={<SkeletonTable rows={3} cols={4} />} />
        : rows.length ? <TokenTable rows={rows} />
        : <EmptyState title="No agents match" sub="" icon="" actions={<Button size="sm" onClick={clear}>Clear all</Button>} />}
      {children}
    </Card>
  </>;
};
const NewAgent = ({ busy = false }: { busy?: boolean }) => <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
  <input className="ui-input" type="text" placeholder="New agent name — e.g. Research bot" aria-label="New agent name" disabled={busy} />
  <Button variant="primary" icon="key" busy={busy}>Create token</Button>
</div>;

const CONNECT = 'claude mcp add apliteni \\\n  --url "https://ui.apli.tech/mcp" \\\n  --header "Authorization: Bearer $TOKEN"';
const highlighted = (code: string) => codeTokens(code, 'shell').map(({ cls, text }: { cls?: string; text: string }, at: number) =>
  (cls ? <span key={at} className={cls}>{text}</span> : text));

export const Default: StoryObj = {
  render: () => <Screen sub="Connect agents to read over MCP. Each gets a scoped, revocable token.">
    <Card title={<>Connect over MCP <Badge variant="live">Live</Badge></>} icon="plug" sub="Paste this into your agent. It reads as you — read-only.">
      <Snippet label="Terminal" code={CONNECT}>{highlighted(CONNECT)}</Snippet>
    </Card>
    <Agents><NewAgent /></Agents>
  </Screen>,
};

export const NewToken: StoryObj = {
  name: 'New token revealed',
  render: () => <Screen sub="Connect agents to read over MCP.">
    <Card variant="live" title={<>Token created <Badge variant="warn">Copy now</Badge></>} icon="key"
      sub="This is the only time you'll see it. Paste it into your agent's config.">
      <Snippet label="Research bot — shown once" reveal code="apli_sk_live_9f2c4b7e1a06d8f3c5b2e9a1d4f70c83" />
      <div style={{ marginTop: 14, display: 'flex', gap: 10 }}><Button variant="primary" icon="copy">Copy token</Button><Button variant="secondary">Done</Button></div>
    </Card>
    <Agents />
  </Screen>,
};

export const Empty: StoryObj = {
  render: () => <Screen sub="Connect agents to read over MCP.">
    <Card><div className="ui-empty">
      <div className="ui-empty__icon"><Icon name="plug" /></div>
      <div className="ui-empty__title">No agents connected yet</div>
      <div className="ui-empty__sub">Create a token, then paste the MCP connect command into your agent.</div>
      <div style={{ marginTop: 18 }}><Button variant="primary" icon="key">Create token</Button></div>
    </div></Card>
  </Screen>,
};

// The state this screen is in for as long as the token list is in flight (#128).
// The skeleton takes the shape of the table that is coming, and the Create-token
// button is busy in the same breath: one flag, two scales.
export const Loading: StoryObj = {
  render: () => <Screen sub="Connect agents to read over MCP.">
    <Agents loading><NewAgent busy /></Agents>
  </Screen>,
};

// 403. `need` names the scope verbatim, because a reader who can name what they
// lack can ask for it. Denial is how the fetch resolved, so the region that said
// "Loading…" announces it.
export const Denied: StoryObj = {
  name: 'Permission denied',
  render: () => <Screen sub="Connect agents to read over MCP.">
    <Card><BusyRegion busy={false} message="You don’t have access to agent tokens.">
      <DeniedState title="You don’t have access to agent tokens" need="tokens.read"
        sub="Tokens are managed by account owners and admins. Your role can read the account, but not the credentials that reach it.">
        <Button variant="primary" icon="mail">Request access</Button>
        <Button variant="secondary" href="#overview">Back to overview</Button>
      </DeniedState>
    </BusyRegion></Card>
  </Screen>,
};
