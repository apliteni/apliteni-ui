import { appShell, ACCOUNT_NAV } from '../../src/components/shell.js';
import { card, button, badge, input, snippet, hlShell, callout, icon } from '../../src/components/index.js';
import { busyRegion, skeletonTable, deniedState } from '../../src/components/loading.js';

export default {
  title: 'Apps/Access & Agents',
  parameters: { layout: 'fullscreen' },
};

// Overview is this demo's own screen, not the kit's default — a consuming
// /account page that took ACCOUNT_NAV whole would get a link to nothing.
const NAV = [{ id: 'overview', icon: 'chart', label: 'Overview' }, ...ACCOUNT_NAV];
const READER = { name: 'Ada Lovelace', email: 'ada@apliteni.com' };
const CRUMBS = [{ label: 'Account', href: '#' }, { label: 'Access & agents' }];
// A crumb `label` is text and nav.js escapes it; `title` is a raw-HTML slot.
const screen = (opts) => appShell({
  nav: NAV, active: 'access', crumbs: CRUMBS, title: 'Access &amp; agents',
  account: READER, signOutHref: '#logout', ...opts,
});

const AGENTS = [
  ['Research bot', 'Read only', '2 hours ago', 'live'],
  ['Deck summariser', 'Read only', 'Yesterday', 'live'],
  ['Old integration', 'Read only', '3 weeks ago', 'dead'],
];

const tokenTable = () => `
  <table class="ui-table ui-table--hover">
    <thead><tr><th>Agent</th><th>Scope</th><th>Last used</th><th></th></tr></thead>
    <tbody>
      ${AGENTS.map(([name, scope, used, state]) => `
        <tr class="${state === 'dead' ? 'is-dead' : ''}">
          <td class="ui-table__title">${name}</td>
          <td>${scope}</td>
          <td>${used}</td>
          <td class="ui-table__act">${state === 'dead'
            ? '<span style="color:var(--muted);font-size:13px">Revoked</span>'
            : button({ label: 'Revoke access', variant: 'danger', size: 'sm' })}</td>
        </tr>`).join('')}
    </tbody>
  </table>`;

export const Default = {
  render: () => screen({
    sub: 'Connect agents to read over MCP. Each gets a scoped, revocable token.',
    body: `
      ${card({ title: `Connect over MCP ${badge('Live', 'live')}`, icon: 'plug', sub: 'Paste this into your agent. It reads as you — read-only.',
        body: snippet({ label: 'Terminal', code: hlShell('claude mcp add apliteni \\\n  --url "https://ui.apli.tech/mcp" \\\n  --header "Authorization: Bearer $TOKEN"') }) })}
      ${card({ title: 'Your agents', body: `
        ${tokenTable()}
        <div style="display:flex;gap:10px;margin-top:20px">
          ${input({ placeholder: 'New agent name — e.g. Research bot', ariaLabel: 'New agent name' })}
          ${button({ label: 'Create token', variant: 'primary', icon: 'key' })}
        </div>
      ` })}
    `,
  }),
};

export const NewToken = {
  name: 'New token revealed',
  render: () => screen({
    sub: 'Connect agents to read over MCP.',
    body: `
      ${card({ variant: 'live', title: `Token created ${badge('Copy now', 'warn')}`, icon: 'key',
        sub: "This is the only time you'll see it. Paste it into your agent's config.",
        body: snippet({ label: 'Research bot — shown once', reveal: true, code: 'apli_sk_live_9f2c4b7e1a06d8f3c5b2e9a1d4f70c83' })
          + `<div style="margin-top:14px;display:flex;gap:10px">${button({ label: 'Copy token', variant: 'primary', icon: 'copy' })}${button({ label: 'Done', variant: 'secondary' })}</div>` })}
      ${card({ title: 'Your agents', body: tokenTable() })}
    `,
  }),
};

export const Empty = {
  render: () => screen({
    sub: 'Connect agents to read over MCP.',
    body: `
      ${callout({ variant: 'info', icon: 'info', body: 'No agents yet. Create a token, then paste the connect command into your agent.' })}
      ${card({ body: `
        <div class="ui-empty">
          <div class="ui-empty__icon">${icon('plug')}</div>
          <div class="ui-empty__title">No agents connected yet</div>
          <div class="ui-empty__sub">Create a token and paste the MCP connect command into your agent to get started.</div>
          <div style="margin-top:18px">${button({ label: 'Create token', variant: 'primary', icon: 'key' })}</div>
        </div>` })}
    `,
  }),
};

// The state this screen is in for as long as the token list is in flight — and
// the state it had no drawing of until #128. The skeleton takes the shape of
// the table that is coming, so the page does not jump when the rows land, and
// the region says "Loading your agents…" to a reader who cannot see either.
//
// The Create-token button is busy in the same breath: one flag, two scales.
// The button alone was what the kit shipped, and a lit button surrounded by a
// finished-looking page is exactly the lie this state has to stop telling.
export const Loading = {
  render: () => screen({
    sub: 'Connect agents to read over MCP.',
    body: `
      ${card({ title: 'Your agents', body: `
        ${busyRegion({ label: 'Loading your agents…', body: skeletonTable({ rows: 3, cols: 4 }) })}
        <div style="display:flex;gap:10px;margin-top:20px">
          ${input({ placeholder: 'New agent name — e.g. Research bot', ariaLabel: 'New agent name', disabled: true })}
          ${button({ label: 'Create token', variant: 'primary', icon: 'key', busy: true })}
        </div>
      ` })}
    `,
  }),
};

// 403. A reader on a scoped token — the thing this very screen hands out — will
// meet this page, so the kit owes it a drawing. `need` names the scope verbatim
// because a reader who can name what they lack can ask for it; "insufficient
// permissions" sends them to a ticket to find out what to ask for.
//
// It sits inside busyRegion({ busy: false }): denial is how the fetch RESOLVED,
// so it is announced by the region that was already saying "Loading…" rather
// than by a second live region of its own.
export const Denied = {
  name: 'Permission denied',
  render: () => screen({
    sub: 'Connect agents to read over MCP.',
    body: card({ body: busyRegion({
      busy: false,
      readyLabel: 'You don’t have access to agent tokens.',
      body: deniedState({
        title: 'You don’t have access to agent tokens',
        sub: 'Tokens are managed by account owners and admins. Your role can read the account, but not the credentials that reach it.',
        need: 'tokens.read',
        actions: [
          { label: 'Request access', variant: 'primary', icon: 'mail' },
          { label: 'Back to overview', variant: 'secondary', href: '#overview' },
        ],
      }),
    }) }),
  }),
};
