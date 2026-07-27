import { field, input, textarea, button, select } from '../../src/components/index.js';
import { pad, grid, specimen, stack } from '../_gallery.js';

export default {
  title: 'Components/Inputs',
  parameters: { layout: 'fullscreen' },
};

export const TextFields = {
  render: () => pad(`<div style="max-width:420px;display:flex;flex-direction:column;gap:22px">
    ${field({ label: 'Work email', control: input({ type: 'email', placeholder: 'you@apliteni.com', icon: 'mail' }), hint: 'We only allow apliteni.com addresses.' })}
    ${field({ label: 'Agent name', control: input({ placeholder: 'e.g. Research bot' }) })}
    ${field({ label: 'Password', control: input({ type: 'password', value: 'hunter2', icon: 'lock' }) })}
    ${field({ label: 'API token', error: 'This token has already been revoked.', control: input({ value: 'sk-live-9f2c…', invalid: true }) })}
    ${field({ label: 'Disabled', control: input({ placeholder: 'Read only', disabled: true }) })}
  </div>`),
};

export const Textarea = {
  render: () => pad(`<div style="max-width:520px">
    ${field({ label: 'Feedback', control: textarea({ placeholder: 'What would make the strategy clearer?', rows: 5 }), hint: 'Goes straight to the strategy owner.' })}
    <div style="margin-top:16px;display:flex;justify-content:flex-end">${button({ label: 'Send feedback', variant: 'primary', iconRight: 'arrowRight' })}</div>
  </div>`),
};

export const SelectAndSearch = {
  render: () => pad(stack(
    specimen('Search input', `<div style="max-width:360px">${input({ placeholder: 'Search components…', icon: 'search', ariaLabel: 'Search components' })}</div>`),
    specimen('Select', `<div style="max-width:280px">${select({ options: ['Product units', 'Superconnectors', 'Governance'], ariaLabel: 'Team' })}</div>`),
    specimen('Create row (input + button)', `<div style="max-width:520px;display:flex;gap:10px">${input({ placeholder: 'New agent name' })}${button({ label: 'Create', variant: 'primary' })}</div>`),
  )),
};
