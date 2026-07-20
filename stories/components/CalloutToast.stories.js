import { callout, toast, successPanel } from '../../src/components/index.js';
import { pad, specimen, stack } from '../_gallery.js';

export default {
  title: 'Components/Callout & Toast',
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
};

export const Callouts = {
  render: () => pad(`<div style="max-width:560px;display:flex;flex-direction:column;gap:14px">
    ${callout({ variant: 'info', icon: 'info', body: 'MCP access is <b>live now</b>. The per-agent token registry lands with the Postgres store.' })}
    ${callout({ variant: 'success', icon: 'check', body: 'Your agent <b>Research bot</b> is connected and can read the strategy.' })}
    ${callout({ variant: 'warn', icon: 'alert', body: "This token is shown once. Copy it now — you won't see it again." })}
    ${callout({ variant: 'danger', icon: 'alert', body: 'Revoking removes access immediately for any agent using this token.' })}
  </div>`),
};

export const Toasts = {
  render: () => pad(stack(
    specimen('Success', toast({ variant: 'success', title: 'Token created', body: 'Copied to your clipboard.' })),
    specimen('Error', toast({ variant: 'danger', icon: 'x', title: "Couldn't save", body: 'Check your connection and try again.' })),
  )),
};

export const Success = {
  render: () => pad(`<div style="max-width:460px">${successPanel({ title: 'Feedback sent', sub: 'Thanks — it goes straight to the strategy owner.' })}</div>`),
};
