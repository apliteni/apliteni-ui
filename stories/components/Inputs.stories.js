import { field, input, textarea, button, select, card } from '../../src/components/index.js';
import { pad, stack } from '../_gallery.js';

// Every specimen sits on the card, because that is where a form lives: a field's
// own paint IS --surface, so on the page ground an inert one has nothing left to
// show — the disabled field below measured 1.11:1 fill and 1.12:1 border against
// light's page, and read as empty space. On the card the edge is what draws it,
// and the measurements are in stories/field-ground.test.js.
export default {
  title: 'Components/Inputs',
  parameters: { layout: 'fullscreen' },
};

export const TextFields = {
  render: () => pad(`<div style="max-width:calc(var(--panel-md) + var(--space-6) * 2)">${card({ body: `<div style="display:flex;flex-direction:column;gap:22px">
    ${field({ label: 'Work email', required: true, control: input({ type: 'email', placeholder: 'you@apliteni.com', icon: 'mail' }), hint: 'We only allow apliteni.com addresses.' })}
    ${field({ label: 'Agent name', control: input({ placeholder: 'e.g. Research bot' }) })}
    ${field({ label: 'Password', required: true, control: input({ type: 'password', value: 'hunter2', icon: 'lock' }) })}
    ${field({ label: 'API token', error: 'This token has already been revoked.', control: input({ value: 'sk-live-9f2c…', invalid: true }) })}
    ${field({ label: 'Disabled', control: input({ placeholder: 'Read only', disabled: true }) })}
  </div>` })}</div>`),
};

export const Textarea = {
  render: () => pad(`<div style="max-width:calc(var(--panel-lg) + var(--space-6) * 2)">${card({ body: `<div>
    ${field({ label: 'Feedback', control: textarea({ placeholder: 'What would make the strategy clearer?', rows: 5 }), hint: 'Goes straight to the strategy owner.' })}
    <div style="margin-top:16px;display:flex;justify-content:flex-end">${button({ label: 'Send feedback', variant: 'primary', iconRight: 'arrowRight' })}</div>
  </div>` })}</div>`),
};

export const SelectAndSearch = {
  render: () => pad(stack(
    card({ title: 'Search input', body: `<div style="max-width:360px">${input({ placeholder: 'Search components…', icon: 'search', ariaLabel: 'Search components' })}</div>` }),
    card({ title: 'Select', body: `<div style="max-width:280px">${select({ options: ['Product units', 'Superconnectors', 'Governance'], ariaLabel: 'Team' })}</div>` }),
    card({ title: 'Input and button on one row', body: `<div style="display:flex;gap:10px">${input({ placeholder: 'New agent name', ariaLabel: 'New agent name' })}${button({ label: 'Create', variant: 'primary' })}</div>` }),
  )),
};
