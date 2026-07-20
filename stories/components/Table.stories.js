import { badge, button, icon } from '../../src/components/index.js';
import { pad } from '../_gallery.js';

export default {
  title: 'Components/Table',
  parameters: { layout: 'fullscreen' },
};

const AGENTS = [
  ['Research bot', 'Read only', '2 hours ago', 'live'],
  ['Deck summariser', 'Read only', 'Yesterday', 'live'],
  ['Old integration', 'Read only', '3 weeks ago', 'dead'],
];

export const AgentTokens = {
  render: () => pad(`<div class="ui-card" style="max-width:720px">
    <div class="ui-card__title">${icon('key')} Access &amp; agents</div>
    <div class="ui-card__sub">Personal tokens agents use to read the strategy over MCP.</div>
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
              : button({ label: 'Revoke', variant: 'danger', size: 'sm' })}</td>
          </tr>`).join('')}
      </tbody>
    </table>
  </div>`),
};

export const Empty = {
  render: () => pad(`<div class="ui-card" style="max-width:720px">
    <div class="ui-card__title">${icon('key')} Access &amp; agents</div>
    <div class="ui-empty">
      <div class="ui-empty__icon">${icon('plug')}</div>
      <div class="ui-empty__title">No agents connected yet</div>
      <div class="ui-empty__sub">Create a token and paste the MCP connect command into your agent to get started.</div>
      <div style="margin-top:18px">${button({ label: 'Create token', variant: 'primary', icon: 'key' })}</div>
    </div>
  </div>`),
};
