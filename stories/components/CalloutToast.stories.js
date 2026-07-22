import { callout, toast, successPanel, button } from '../../src/components/index.js';
import { wireToastStack, pushToast } from '../../src/components/toasts.js';
import { pad, specimen, stack, grid } from '../_gallery.js';

export default {
  title: 'Components/Callout & Toast',
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

// One line per status — same copy shape, re-themes across accents + light/dark.
const STATUSES = [
  ['success', 'Deployment live', 'phoenix-web is serving traffic.'],
  ['info', 'Sync scheduled', 'Next run in about 5 minutes.'],
  ['warn', 'Token expires soon', 'Rotate it before Friday to avoid downtime.'],
  ['danger', "Build failed", 'Step “test” exited with code 1.'],
  ['neutral', 'Draft saved', 'Autosaved just now.'],
];
const col = (...t) => `<div style="display:flex;flex-direction:column;gap:12px">${t.join('')}</div>`;
const columnFor = (style) => col(...STATUSES.map(([variant, title, body]) => toast({ variant, style, title, body })));

// The five-status set in the default (soft) style.
export const Toasts = {
  render: () => pad(stack(columnFor('soft'))),
};

// status (rows) × style (columns) — the full matrix on one canvas.
export const StatusAndStyle = {
  render: () => pad(grid(3,
    specimen('Soft', columnFor('soft')),
    specimen('Solid', columnFor('solid')),
    specimen('Outline', columnFor('outline')),
  )),
};

// Affordances: action buttons, a compact single-line form, and the auto-dismiss
// timer bar (shown here static; it animates in the Stack story).
export const Affordances = {
  render: () => pad(stack(
    specimen('With an action', col(
      toast({ variant: 'info', style: 'outline', title: 'A new version is available', body: 'Reload to pick up v0.4.0.', action: 'Reload' }),
      toast({ variant: 'success', style: 'soft', title: 'Note deleted', body: '“Q3 plan” was removed.', action: 'Undo' }),
      toast({ variant: 'danger', style: 'solid', icon: 'x', title: "Couldn't save", body: 'Check your connection and try again.', action: 'Retry' }),
    )),
    specimen('Compact (title only)', col(
      toast({ variant: 'success', style: 'soft', title: 'Copied to clipboard', compact: true }),
      toast({ variant: 'neutral', style: 'soft', title: 'Reconnecting…', compact: true }),
    )),
    specimen('Auto-dismiss timer', col(
      toast({ variant: 'info', style: 'soft', title: 'Uploading report.csv', body: 'This dismisses on its own.', timer: 5 }),
    )),
  )),
};

// Interactive: buttons queue toasts onto a live stack (newest on top). Each
// auto-dismisses on its timer, pauses on hover, and can be swiped away.
const SAMPLES = [
  { variant: 'success', style: 'soft', title: 'Saved', body: 'Your changes are live.', timer: 5 },
  { variant: 'danger', style: 'soft', icon: 'x', title: 'Upload failed', body: 'The file was larger than 25 MB.', timer: 6 },
  { variant: 'info', style: 'outline', title: 'Note deleted', body: '“Q3 plan” was removed.', action: 'Undo', timer: 6 },
];

export const Stack = {
  render: () => {
    const root = document.createElement('div');
    root.innerHTML = pad(`<div style="display:flex;flex-direction:column;gap:20px;align-items:flex-start">
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        ${button({ label: 'Success', variant: 'primary', size: 'sm' })}
        ${button({ label: 'Error', variant: 'danger', size: 'sm' })}
        ${button({ label: 'With action', variant: 'ghost', size: 'sm' })}
      </div>
      <div class="ui-toast-stack" data-stack></div>
    </div>`);
    requestAnimationFrame(() => {
      const s = root.querySelector('[data-stack]');
      wireToastStack(s);
      root.querySelectorAll('.ui-btn').forEach((b, i) => b.addEventListener('click', () => pushToast(s, SAMPLES[i])));
      pushToast(s, SAMPLES[0]); // seed one so the canvas isn't empty
    });
    return root;
  },
};

export const Success = {
  render: () => pad(`<div style="max-width:460px">${successPanel({ title: 'Feedback sent', sub: 'Thanks — it goes straight to the strategy owner.' })}</div>`),
};
