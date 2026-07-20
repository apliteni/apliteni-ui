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
