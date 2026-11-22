// The access and agents showcase in React: the phone-first flow of creating, listing,
// opening and revoking agent keys, under the vanilla page's title and id. A list of
// agent rows, not a table, so "Revoke access" never sits in a cut-off column. #850
import type { Meta, StoryObj } from '@storybook/react';
import { useEffect, useState } from 'react';
import { ACCOUNT_NAV, codeTokens } from '@apliteni/apliteni-ui';
import { DemoShell, type DemoNavItem } from './_demo-shell';
import { Modal } from '../../react/src/Modal';
import { Snippet } from '../../react/src/Snippet';
import { EmptyState } from '../../react/src/EmptyState';
import { TextField, SelectField } from '../../react/src/Field';
import { KeyValueList } from '../../react/src/KeyValueList';
import { Badge } from '../../react/src/primitives/Badge';
import { Button } from '../../react/src/primitives/Button';
import { Callout } from '../../react/src/primitives/Callout';
import { Card } from '../../react/src/primitives/Card';
import { Icon } from '../../react/src/primitives/Icon';

const meta: Meta = { title: 'Showcases/Access & Agents', id: 'apps-access-agents', excludeStories: ['AccessFlow'], parameters: { layout: 'fullscreen' } };
export default meta;

// Overview is this demo's own screen, not the kit's default: a consuming /account
// page that took ACCOUNT_NAV whole would get a link to nothing.
const NAV: DemoNavItem[] = [{ id: 'overview', icon: 'chart', label: 'Overview' }, ...(ACCOUNT_NAV as DemoNavItem[])];

const PRESETS = ['Read invoices and suppliers', 'Read reports', 'Read and write invoices'];
const EXPIRY = ['7 days', '30 days', '90 days', 'Custom date', 'No expiry'];

type Agent = { name: string; access: string; created: string; last: string; expires: string; state: 'agent' | 'never-used' | 'expired' };
const SAMPLE_AGENTS: Agent[] = [
  { name: 'Invoice reader', access: PRESETS[0], created: '1 Nov 2026', last: '22 Nov 2026, 10:42', expires: '1 Dec 2026', state: 'agent' },
  { name: 'Bookkeeping agent', access: PRESETS[2], created: '20 Nov 2026', last: 'Never used', expires: '20 Dec 2026', state: 'never-used' },
  { name: 'Monthly report', access: PRESETS[1], created: '1 Sep 2026', last: '15 Sep 2026', expires: '1 Oct 2026', state: 'expired' },
];
const DEMO_KEY = 'demo_key_not_valid_1042';
const DEMO_COMMAND = `claude mcp add --transport http finance https://api.example.com/mcp --header "Authorization: Bearer ${DEMO_KEY}"`;
const highlighted = (code: string) => codeTokens(code, 'shell').map(({ cls, text }: { cls?: string; text: string }, at: number) =>
  (cls ? <span key={at} className={cls}>{text}</span> : text));

/* A chosen expiry becomes a date the way the prototype writes it: today plus the days,
   or the reader's custom date, or no expiry at all. */
const expiryOf = (expiry: string, date: string) => {
  if (expiry === 'Custom date') return date;
  if (expiry === 'No expiry') return 'No expiry';
  return new Date(Date.UTC(2026, 10, 22) + Number.parseInt(expiry) * 86400000)
    .toLocaleDateString('en-GB', { timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric' });
};

export type AccessState = 'empty' | 'create' | 'create-error' | 'expiry-custom' | 'expiry-none'
  | 'key' | 'key-copied' | 'command-copied' | 'list' | 'agent' | 'never-used' | 'expired'
  | 'revoke' | 'revoke-cancelled' | 'revoked';
const ALL_STATES: readonly string[] = ['empty', 'create', 'create-error', 'expiry-custom', 'expiry-none',
  'key', 'key-copied', 'command-copied', 'list', 'agent', 'never-used', 'expired',
  'revoke', 'revoke-cancelled', 'revoked'];

const agentOf = (screen: AccessState): Agent =>
  screen === 'never-used' ? SAMPLE_AGENTS[1] : screen === 'expired' ? SAMPLE_AGENTS[2] : SAMPLE_AGENTS[0];

export function AccessFlow({ initialState = 'list' }: { initialState?: AccessState }) {
  const [screen, setScreen] = useState<AccessState>(() => {
    const hash = typeof window !== 'undefined' ? window.location.hash.slice(1) : '';
    return (ALL_STATES.includes(hash) ? hash : initialState) as AccessState;
  });
  const [draft, setDraft] = useState(() => ({
    name: '',
    access: PRESETS[0],
    expiry: initialState === 'expiry-custom' ? 'Custom date' : initialState === 'expiry-none' ? 'No expiry' : '30 days',
    date: '2027-01-15',
  }));
  const [created, setCreated] = useState<Agent | null>(null);
  const [revokedNames, setRevokedNames] = useState<string[]>(initialState === 'revoked' ? ['Invoice reader'] : []);
  const [origin, setOrigin] = useState<'empty' | 'list' | 'expired'>('list');
  const [selected, setSelected] = useState<Agent>(SAMPLE_AGENTS[0]);

  const navigate = (next: AccessState) => {
    setScreen(next);
    if (typeof window !== 'undefined') window.history.replaceState(null, '', `#${next}`);
  };
  useEffect(() => {
    const onHash = () => {
      const hash = window.location.hash.slice(1);
      if (ALL_STATES.includes(hash)) setScreen(hash as AccessState);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  let agents = screen === 'empty' ? [] : created ? [created, ...SAMPLE_AGENTS.filter((a) => a.name !== created.name)] : [...SAMPLE_AGENTS];
  agents = agents.filter((a) => !revokedNames.includes(a.name));
  if (screen === 'revoked' && revokedNames.length === 0) agents = agents.filter((a) => a.name !== 'Invoice reader');

  const creating = ['create', 'create-error', 'expiry-custom', 'expiry-none'].includes(screen);
  const keyShown = ['key', 'key-copied', 'command-copied'].includes(screen);
  const revoking = screen === 'revoke';
  const onDetail = ['agent', 'never-used', 'expired', 'revoke', 'revoke-cancelled'].includes(screen);
  const detail = created && selected.name === created.name ? created : agentOf(screen);

  const createFooter = <>
    <Button variant="secondary" onClick={() => navigate(origin)}>Cancel</Button>
    <Button variant="primary" icon="plus" onClick={() => {
      if (!draft.name.trim()) { navigate('create-error'); return; }
      const name = draft.name.trim();
      setCreated({ name, access: draft.access, created: '22 Nov 2026', last: 'Never used', expires: expiryOf(draft.expiry, draft.date), state: 'agent' });
      setRevokedNames((names) => names.filter((n) => n !== name));
      navigate('key');
    }}>Create key</Button>
  </>;

  const list = (status?: string) => <div className="ui-card-stack">
    {status && <p role="status">{status}</p>}
    {agents.length
      ? agents.map((a) => <Card key={a.name} level={3} href={`#${a.state}`} onClick={() => setSelected(a)}
        trailing={<Icon name="chevronRight" />}
        title={a.state === 'expired' ? <>{a.name} <Badge variant="danger">Expired</Badge></> : a.name} sub={a.access} />)
      : <EmptyState variant="no-matches" icon="" title="No agents have access" sub="Create a key and paste the MCP connect command into an agent."
        actions={<Button variant="primary" icon="plus" onClick={() => { setOrigin('empty'); setDraft({ name: '', access: PRESETS[0], expiry: '30 days', date: '2027-01-15' }); navigate('create'); }}>Create key</Button>} />}
  </div>;

  const detailPage = <>
    <Card>
      <KeyValueList rows={[
        { label: 'Access', value: detail.access },
        { label: 'Created', value: detail.created },
        { label: 'Last use', value: detail.last },
        { label: 'Expires', value: detail.expires },
      ]} />
      {screen === 'revoke-cancelled' && <p role="status">Revoke cancelled.</p>}
      {detail.state === 'expired' && <Callout variant="danger">Expired. This key no longer works.</Callout>}
    </Card>
    <div className="ui-card-stack">
      {detail.state === 'expired'
        ? <Button variant="primary" icon="plus" onClick={() => { setOrigin('expired'); setSelected(detail); setDraft({ name: detail.name, access: detail.access, expiry: '30 days', date: '2027-01-15' }); navigate('create'); }}>Create a new key</Button>
        : null}
      <Button variant="danger" onClick={() => { setSelected(detail); navigate('revoke'); }}>Revoke access</Button>
    </div>
  </>;

  return <DemoShell layout="rail" nav={NAV} active="access"
    title={onDetail ? detail.name : 'Access & agents'}
    lede={onDetail ? 'Review this agent\'s access, and revoke it anytime.' : 'Connect agents to read over MCP. Each gets a scoped, revocable key.'}
    back={onDetail ? { href: '#list', label: 'Access & agents' } : undefined}
    tools={!creating && !keyShown && !onDetail && screen !== 'empty' ? <Button icon="plus" variant="primary" onClick={() => { setOrigin(screen === 'empty' ? 'empty' : 'list'); setDraft({ name: '', access: PRESETS[0], expiry: '30 days', date: '2027-01-15' }); navigate('create'); }}>Create key</Button> : undefined}>

    {onDetail ? detailPage : list(screen === 'revoked' ? 'Access revoked (sample).' : undefined)}

    {creating && <Modal open title="Create key" onClose={() => navigate(origin)} footer={createFooter}>
      <div className="ui-card-stack">
        <TextField label="Name" value={draft.name} error={screen === 'create-error' ? 'Enter a name.' : undefined}
          onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} />
        <SelectField label="Access preset" value={draft.access} onChange={(e) => setDraft((d) => ({ ...d, access: e.target.value }))}>
          {PRESETS.map((p) => <option key={p}>{p}</option>)}
        </SelectField>
        <SelectField label="Expiration" value={draft.expiry} onChange={(e) => {
          const expiry = e.target.value;
          setDraft((d) => ({ ...d, expiry }));
          if (expiry === 'Custom date') navigate('expiry-custom');
          else if (expiry === 'No expiry') navigate('expiry-none');
          else navigate('create');
        }}>
          {EXPIRY.map((o) => <option key={o}>{o}</option>)}
        </SelectField>
        {draft.expiry === 'Custom date' && <TextField label="Expiration date (YYYY-MM-DD)" value={draft.date} onChange={(e) => setDraft((d) => ({ ...d, date: e.target.value }))} />}
        {draft.expiry === 'No expiry' && <p className="ui-field__hint">This key works until you revoke it.</p>}
      </div>
    </Modal>}

    {keyShown && <Modal open title="Key created" onClose={() => navigate('list')} footer={<Button variant="primary" onClick={() => navigate('list')}>Done</Button>}>
      <div className="ui-card-stack">
        <p>Copy this key now. It shows only once.</p>
        <Snippet label="Key" code={DEMO_KEY} onCopy={() => navigate('key-copied')} />
        <Snippet label="MCP connect command" code={DEMO_COMMAND} wrap onCopy={() => navigate('command-copied')}>{highlighted(DEMO_COMMAND)}</Snippet>
        {screen === 'key-copied' && <p role="status">Key copied (sample).</p>}
        {screen === 'command-copied' && <p role="status">Command copied (sample).</p>}
      </div>
    </Modal>}

    {revoking && <Modal open title={`Revoke ${detail.name}?`} onClose={() => navigate('revoke-cancelled')} footer={<>
      <Button variant="ghost" onClick={() => navigate('revoke-cancelled')}>Keep access</Button>
      <Button variant="danger" onClick={() => { setRevokedNames((names) => [...names, detail.name]); navigate('revoked'); }}>Revoke access</Button>
    </>}>
      <p>This key will stop working. The agent will lose its access.</p>
    </Modal>}
  </DemoShell>;
}

export const Default: StoryObj = { render: () => <AccessFlow /> };
export const Empty: StoryObj = { render: () => <AccessFlow initialState="empty" /> };
export const CreateKey: StoryObj = { name: 'Create key', render: () => <AccessFlow initialState="create" /> };
export const CreateKeyError: StoryObj = { name: 'Create key error', render: () => <AccessFlow initialState="create-error" /> };
export const ExpiryCustom: StoryObj = { name: 'Custom expiration', render: () => <AccessFlow initialState="expiry-custom" /> };
export const ExpiryNone: StoryObj = { name: 'No expiration', render: () => <AccessFlow initialState="expiry-none" /> };
export const Key: StoryObj = { name: 'Key shown once', render: () => <AccessFlow initialState="key" /> };
export const KeyCopied: StoryObj = { name: 'Key copied', render: () => <AccessFlow initialState="key-copied" /> };
export const CommandCopied: StoryObj = { name: 'Command copied', render: () => <AccessFlow initialState="command-copied" /> };
export const Agent: StoryObj = { name: 'Agent details', render: () => <AccessFlow initialState="agent" /> };
export const NeverUsed: StoryObj = { name: 'Agent never used', render: () => <AccessFlow initialState="never-used" /> };
export const Expired: StoryObj = { name: 'Expired key', render: () => <AccessFlow initialState="expired" /> };
export const Revoke: StoryObj = { render: () => <AccessFlow initialState="revoke" /> };
export const RevokeCancelled: StoryObj = { name: 'Revoke cancelled', render: () => <AccessFlow initialState="revoke-cancelled" /> };
export const Revoked: StoryObj = { render: () => <AccessFlow initialState="revoked" /> };
