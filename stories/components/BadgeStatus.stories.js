import { badge, pill, statusDot } from '../../src/components/index.js';
import { pad, row, specimen, stack } from '../_gallery.js';

export default {
  title: 'Components/Badge & Status',
  parameters: { layout: 'fullscreen' },
};

export const Badges = {
  render: () => pad(stack(
    specimen('Status badges', row(
      badge('Live', 'live'), badge('Soon', 'soon'), badge('Info', 'info'),
      badge('Beta', 'warn'), badge('Revoked', 'danger'), badge('Archive', 'archive'),
      badge('Neutral'),
    )),
    specimen('Record status (data tables)', row(
      badge('Paid', 'success'), badge('Verified', 'success'),
      badge('Pending', 'pending'), badge('Failed', 'danger'),
      badge('Dismissed', 'neutral'),
    )),
    specimen('Metadata pills', row(
      pill('Product units'), pill('Live', 'live'), pill('Coming soon', 'soon'),
    )),
    specimen('Status dots', `<div style="display:flex;gap:26px;align-items:center;color:var(--text);font-size:14px">
      <span style="display:inline-flex;gap:9px;align-items:center">${statusDot(true)} API online</span>
      <span style="display:inline-flex;gap:9px;align-items:center">${statusDot(false)} Idle</span>
    </div>`),
  )),
};

export const InContext = {
  render: () => pad(`<div class="ui-card" style="max-width:460px">
    <div class="ui-card__title">phoenix.2026.002 ${badge('Live', 'live')}</div>
    <div class="ui-card__sub">Product units, animated deck. The current strategy version, served at the clean root.</div>
    <div style="display:flex;gap:8px">${pill('2 agents', 'live')} ${pill('MCP enabled', 'soon')}</div>
  </div>`),
};
