// The access and agents showcase in React, under the vanilla page's title and id.
// Keys replace the old token vocabulary: the page mints one key per agent, shows it
// once, and revokes it to stop the agent. #850
import type { Meta, StoryObj } from '@storybook/react';
import { type ReactNode } from 'react';
import { ACCOUNT_NAV } from '@apliteni/apliteni-ui';
import { DemoShell, type DemoNavItem } from './_demo-shell';
import { Sheet } from '../_guideline';
import { Snippet } from '../../react/src/Snippet';
import { BusyRegion, Denied as DeniedState, SkeletonTable } from '../../react/src/Loading';
import { Badge } from '../../react/src/primitives/Badge';
import { Button } from '../../react/src/primitives/Button';
import { Card } from '../../react/src/primitives/Card';
import { Icon } from '../../react/src/primitives/Icon';
import { TextField, SelectField } from '../../react/src/Field';
import { Confirm } from '../../react/src/Confirm';

const meta: Meta = { title: 'Showcases/Access & Agents', id: 'apps-access-agents', parameters: { layout: 'fullscreen' } };
export default meta;

// The showcase's own glue and the paints the kit has no part for. A granted access
// check reads in success ink, the agent name keeps body ink with its underline only
// under the pointer, the row-end chevron is muted, and the revoke area stands apart
// behind a hairline. The check and chevron sit at 18px so their 2-unit stroke clears
// the 1.5px floor. #850
const CSS = `<style>
.acc-check { display: inline-flex; align-items: center; gap: var(--space-2); min-width: 0; color: var(--chip-success-ink); }
.acc-check svg, .acc-chevron svg { width: 18px; height: 18px; stroke-width: 2; }
.acc-link { color: inherit; }
.acc-link:hover { text-decoration: underline; }
.acc-name { display: flex; align-items: center; gap: var(--space-2); min-width: 0; }
.acc-agent { flex: 1; min-width: 0; }
.acc-chevron { display: inline-flex; flex: none; color: var(--muted); }
.acc-value { font-size: var(--text-sm); }
.acc-facts { display: flex; flex-wrap: wrap; column-gap: var(--space-4); }
.acc-revoke { border-top: 1px solid var(--border); }
.acc-narrow { max-width: 30rem; }
.acc-actions { display: flex; flex-wrap: wrap; gap: var(--space-2); margin-top: var(--space-2); }
</style>`;

// Overview is this demo's own screen, not the kit's default: a consuming /account
// page that took ACCOUNT_NAV whole would get a link to nothing.
const NAV: DemoNavItem[] = [{ id: 'overview', icon: 'chart', label: 'Overview' }, ...(ACCOUNT_NAV as DemoNavItem[])];
const LIST_TITLE = 'Access & agents';
const LIST_LEDE = 'Keys let an agent read this workspace. Revoke a key to stop it.';

const Screen = ({ title = LIST_TITLE, sub = LIST_LEDE, back, tools, children }: {
  title?: string; sub?: string; back?: { href: string; label: string }; tools?: ReactNode; children: ReactNode;
}) => <DemoShell layout="rail" nav={NAV} active="access" title={title} lede={sub} back={back} tools={tools}>
  <Sheet css={CSS} />{children}
</DemoShell>;

const AGENTS = [
  { name: 'Invoice reader', scope: 'Read invoices', last: 'Last use today', exp: 'Expires 30 Sep 2027', live: true },
  { name: 'Sales reporter', scope: 'Read orders', last: 'Last use yesterday', exp: 'Expires 12 Oct 2027', live: true },
  { name: 'Data loader', scope: 'Import products', last: 'Last use 3 weeks ago', exp: 'Expired 1 Jan 2027', live: false },
];

const AgentRow = ({ agent }: { agent: (typeof AGENTS)[number] }) => (
  <div className="ui-card__row">
    <div className="acc-agent">
      <div className="lab acc-name"><a className="acc-link" href="#agent">{agent.name}</a> <Badge variant={agent.live ? 'live' : 'archive'}>{agent.live ? 'Active' : 'Revoked'}</Badge></div>
      <div className="hint">{agent.scope}</div>
      <div className="hint acc-facts"><span>{agent.last}</span><span>{agent.exp}</span></div>
    </div>
    <span className="acc-chevron"><Icon name="chevronRight" /></span>
  </div>
);

const AgentList = () => (
  <Card title="Your agents">{AGENTS.map((agent) => <AgentRow key={agent.name} agent={agent} />)}</Card>
);

const CREATE_TOOL = <Button variant="primary" icon="key">Create key</Button>;

const SCOPES = ['Read invoices', 'Send invoices'];
const FACTS: [string, string][] = [
  ['Created', '12 Sep 2026'],
  ['Last use', 'Today'],
  ['Expires', '30 Sep 2027'],
];

export const Default: StoryObj = {
  render: () => <Screen tools={CREATE_TOOL}><AgentList /></Screen>,
};

export const AgentPage: StoryObj = {
  name: 'Agent page',
  render: () => <Screen title="Invoice reader" sub="A key that reads invoices over MCP." back={{ href: '#agents', label: 'Access & agents' }}>
    <Card title="Access">
      {SCOPES.map((scope) => (
        <div className="ui-card__row" key={scope}>
          <span className="acc-check"><Icon name="circleCheck" /><span className="lab">{scope}</span></span>
        </div>
      ))}
    </Card>
    <Card title="Details">
      {FACTS.map(([label, value]) => (
        <div className="ui-card__row" key={label}><span className="lab">{label}</span><span className="acc-value">{value}</span></div>
      ))}
    </Card>
    <Card className="acc-revoke" title="Revoke access" sub="The key stops at once. The agent loses its access.">
      <Button variant="danger">Revoke access</Button>
    </Card>
  </Screen>,
};

export const Create: StoryObj = {
  name: 'Create key',
  render: () => <Screen title="Create key" sub="Name the agent, pick a preset, then set an expiry.">
    <Card className="acc-narrow" title="Create key">
      <TextField label="Agent name" defaultValue="Invoice reader" />
      <SelectField label="Preset" defaultValue="Read invoices">
        <option>Read invoices</option><option>Read orders</option><option>Full access</option>
      </SelectField>
      <SelectField label="Expiry" defaultValue="90 days">
        <option>30 days</option><option>90 days</option><option>1 year</option><option>Never</option>
      </SelectField>
      <div className="acc-actions">
        <Button variant="primary" icon="key">Create key</Button>
        <Button variant="secondary">Cancel</Button>
      </div>
    </Card>
  </Screen>,
};

export const NewToken: StoryObj = {
  name: 'Key created',
  render: () => <Screen title="Key created" sub="Copy it once, then store it in the agent.">
    <Card className="acc-narrow" variant="live" title={<>Key created <Badge variant="warn">Copy now</Badge></>}
      sub="This is the only time you will see it. Paste it into your agent.">
      <Snippet label="Invoice reader" reveal code="apli_sk_live_9f2c4b7e1a06d8f3c5b2e9a1d4f70c83" copyLabel="Copy key" />
      <div className="acc-actions">
        <Button variant="primary" icon="copy">Copy key</Button>
        <Button variant="secondary">Done</Button>
      </div>
    </Card>
  </Screen>,
};

export const Revoke: StoryObj = {
  name: 'Revoke access',
  render: () => <Screen tools={CREATE_TOOL}>
    <AgentList />
    <Confirm open title="Revoke Invoice reader?" body="The key stops at once, and the agent loses its access."
      confirmLabel="Revoke access" cancelLabel="Cancel" danger onConfirm={() => {}} onCancel={() => {}} />
  </Screen>,
};

export const Empty: StoryObj = {
  render: () => <Screen>
    <Card><div className="ui-empty">
      <div className="ui-empty__icon"><Icon name="key" /></div>
      <div className="ui-empty__title">No agents connected yet</div>
      <div className="ui-empty__sub">Create a key, then paste it into your agent.</div>
      <div className="ui-empty__actions"><Button variant="primary" icon="key">Create key</Button></div>
    </div></Card>
  </Screen>,
};

// The state this screen is in for as long as the key list is in flight (#128).
// The skeleton takes the shape of the list that is coming, and the Create-key
// button is busy in the same breath: one flag, two scales.
export const Loading: StoryObj = {
  render: () => <Screen tools={CREATE_TOOL}>
    <Card title="Your agents">
      <BusyRegion busy label="Loading your agents…" placeholder={<SkeletonTable rows={3} cols={4} />} />
    </Card>
  </Screen>,
};

// 403. `need` names the scope verbatim, because a reader who can name what they
// lack can ask for it. Denial is how the fetch resolved, so the region that said
// "Loading…" announces it.
export const Denied: StoryObj = {
  name: 'Permission denied',
  render: () => <Screen>
    <Card><BusyRegion busy={false} message="You don’t have access to agent keys.">
      <DeniedState title="You don’t have access to agent keys" need="keys.read"
        sub="Keys are managed by account owners and admins. Your role can read the account, but not the credentials that reach it.">
        <Button variant="primary" icon="mail">Request access</Button>
        <Button variant="secondary" href="#overview">Back to overview</Button>
      </DeniedState>
    </BusyRegion></Card>
  </Screen>,
};
