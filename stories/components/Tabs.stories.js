import { tabs } from '../../src/components/tabs.js';
import { button, badge, segmented } from '../../src/components/index.js';

// Interactive stories return HTML strings; the preview decorator wires them via
// initTabs() after render (roving tabindex + Arrow/Home/End keys).
export default {
  title: 'Components/Tabs',
  parameters: { layout: 'centered' },
};

const bay = (html) => `<div style="width:min(560px,92vw)">${html}</div>`;
const p = (t) => `<p style="color:var(--dim);font:400 14px/1.6 Poppins;margin:0 0 16px">${t}</p>`;
const row = (...h) => `<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">${h.join('')}</div>`;

export const Default = {
  render: () =>
    bay(
      tabs({
        name: 'account',
        ariaLabel: 'Account sections',
        active: 0,
        items: [
          {
            label: 'Overview',
            panel:
              p('Everything about this workspace at a glance — the model, its status and who can reach it.') +
              row(
                '<span class="ui-badge ui-badge--live">Live</span>',
                '<span class="ui-badge ui-badge--info">3 members</span>',
                button({ label: 'Open workspace', variant: 'primary', size: 'sm' }),
              ),
          },
          {
            label: 'Activity',
            panel:
              p('Recent changes, newest first.') +
              '<ul style="margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:10px">' +
              ['Ada updated Preferences', 'Token “ci-bot” created', 'Access revoked for legacy-admin']
                .map(
                  (t) =>
                    `<li style="display:flex;gap:10px;align-items:center;color:var(--text);font:400 13.5px Poppins">` +
                    `<span style="width:7px;height:7px;border-radius:50%;background:var(--accent);flex:none"></span>${t}</li>`,
                )
                .join('') +
              '</ul>',
          },
          {
            label: 'Settings',
            panel:
              p('Switch the layout and toggle notifications.') +
              row(
                segmented({ options: ['Comfortable', 'Compact'], active: 0, size: 'sm', name: 'tabs-density', ariaLabel: 'Row density' }),
                '<label class="ui-switch"><input type="checkbox" checked aria-label="Email notifications"><span class="ui-switch__track"></span></label>',
              ),
          },
        ],
      }),
    ),
};

export const TwoUp = {
  name: 'Two tabs',
  render: () =>
    bay(
      tabs({
        name: 'billing',
        ariaLabel: 'Billing views',
        active: 0,
        items: [
          { label: 'Plan', panel: p('You are on the Team plan.') + button({ label: 'Change plan', variant: 'secondary', size: 'sm' }) },
          { label: 'Invoices', panel: p('No invoices yet — your first one lands at the end of the month.') },
        ],
      }),
    ),
};
