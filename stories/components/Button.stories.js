import { button } from '../../src/components/index.js';
import { pad, row, specimen, stack } from '../_gallery.js';

export default {
  title: 'Components/Button',
  parameters: { layout: 'centered' },
  render: (a) => button(a),
  argTypes: {
    label: { control: 'text' },
    variant: { control: 'select', options: ['primary', 'secondary', 'ghost', 'danger'] },
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    icon: { control: 'select', options: [undefined, 'bolt', 'plug', 'key', 'arrowRight', 'check'] },
    iconRight: { control: 'select', options: [undefined, 'arrowRight'] },
    block: { control: 'boolean' },
    disabled: { control: 'boolean' },
    busy: { control: 'boolean' },
  },
  args: { label: 'Connect agent', variant: 'primary', size: 'md' },
};

export const Playground = {};

export const Variants = {
  parameters: { layout: 'fullscreen' },
  render: () => pad(stack(
    specimen('Primary', row(
      button({ label: 'Connect agent', variant: 'primary' }),
      button({ label: 'With icon', variant: 'primary', icon: 'plug' }),
      button({ label: 'Continue', variant: 'primary', iconRight: 'arrowRight' }),
    )),
    specimen('Secondary', row(
      button({ label: 'Manage', variant: 'secondary' }),
      button({ label: 'Copy token', variant: 'secondary', icon: 'copy' }),
    )),
    specimen('Ghost', row(
      button({ label: 'Cancel', variant: 'ghost' }),
      button({ label: 'Learn more', variant: 'ghost', iconRight: 'arrowRight' }),
    )),
    specimen('Danger', row(
      button({ label: 'Revoke', variant: 'danger' }),
      button({ label: 'Revoke access', variant: 'danger', icon: 'x' }),
    )),
  )),
};

export const Sizes = {
  parameters: { layout: 'fullscreen' },
  render: () => pad(stack(
    specimen('Small', row(
      button({ label: 'Small', variant: 'primary', size: 'sm' }),
      button({ label: 'Small', variant: 'secondary', size: 'sm' }),
    )),
    specimen('Medium (default)', row(
      button({ label: 'Medium', variant: 'primary' }),
      button({ label: 'Medium', variant: 'secondary' }),
    )),
    specimen('Large', row(
      button({ label: 'Large', variant: 'primary', size: 'lg' }),
      button({ label: 'Large', variant: 'secondary', size: 'lg' }),
    )),
  )),
};

export const States = {
  parameters: { layout: 'fullscreen' },
  render: () => pad(stack(
    specimen('Default / hover / active — hover the buttons', row(
      button({ label: 'Primary', variant: 'primary' }),
      button({ label: 'Secondary', variant: 'secondary' }),
    )),
    specimen('Disabled', row(
      button({ label: 'Primary', variant: 'primary', disabled: true }),
      button({ label: 'Secondary', variant: 'secondary', disabled: true }),
    )),
    specimen('Busy / loading', row(
      button({ label: 'Saving…', variant: 'primary', busy: true }),
      button({ label: 'Saving…', variant: 'secondary', busy: true }),
    )),
    specimen('Icon-only', row(
      button({ label: 'Settings', variant: 'secondary', icon: 'gear', iconOnly: true }),
      button({ label: 'Copy', variant: 'ghost', icon: 'copy', iconOnly: true }),
      button({ label: 'Close', variant: 'danger', icon: 'x', iconOnly: true }),
    )),
    specimen('Full width', button({ label: 'Sign in with Apliteni', variant: 'primary', block: true, icon: 'lock' })),
  )),
};

// Branded/third-party glyphs the kit's icon set doesn't own go through `iconSvg`
// (raw leading SVG) — so buttons like "Continue with Google" still come from
// button() instead of hand-rolled markup. Loading is just busy:true.
const googleG = `<svg width="17" height="17" viewBox="0 0 48 48" aria-hidden="true"><path fill="#4285F4" d="M45 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h11.8c-.5 2.7-2 5-4.4 6.6v5.5h7.1C42.7 36.4 45 30.9 45 24.5z"/><path fill="#34A853" d="M24 46c6 0 11-2 14.6-5.4l-7.1-5.5c-2 1.3-4.5 2.1-7.5 2.1-5.8 0-10.7-3.9-12.4-9.2H4.3v5.7C7.9 41.1 15.3 46 24 46z"/><path fill="#FBBC05" d="M11.6 27.9c-.4-1.3-.7-2.6-.7-4s.3-2.7.7-4v-5.7H4.3C2.8 17.3 2 20.6 2 24s.8 6.7 2.3 9.6l7.3-5.7z"/><path fill="#EA4335" d="M24 10.8c3.3 0 6.2 1.1 8.5 3.3l6.3-6.3C35 4.2 30 2 24 2 15.3 2 7.9 6.9 4.3 14.4l7.3 5.7C13.3 14.7 18.2 10.8 24 10.8z"/></svg>`;

export const BrandIcon = {
  name: 'Branded (iconSvg)',
  parameters: { layout: 'fullscreen' },
  render: () => pad(stack(
    specimen('Continue with Google — idle', button({ label: 'Continue with Google', variant: 'secondary', size: 'lg', iconSvg: googleG })),
    specimen('Signing in — busy:true', button({ label: 'Signing you in', variant: 'secondary', size: 'lg', iconSvg: googleG, busy: true })),
  )),
};
