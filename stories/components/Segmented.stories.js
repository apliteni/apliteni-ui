import { segmented } from '../../src/components/index.js';
import { pad, specimen, stack } from '../_gallery.js';

export default {
  title: 'Components/Segmented Control',
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
  render: (a) => segmented(a),
  argTypes: {
    active: { control: { type: 'number', min: 0, max: 3 } },
    size: { control: 'inline-radio', options: [undefined, 'sm'] },
    block: { control: 'boolean' },
  },
  args: { options: ['Deck', 'Text'], active: 0 },
};

export const Playground = {};

export const Examples = {
  parameters: { layout: 'fullscreen' },
  render: () => pad(stack(
    specimen('Two options — Deck / Text', segmented({ options: ['Deck', 'Text'], active: 0 })),
    specimen('Theme', segmented({ options: ['Dark', 'Light', 'System'], active: 0 })),
    specimen('Small', segmented({ options: ['EN', 'RU'], active: 0, size: 'sm' })),
    specimen('Full width (block)', `<div style="max-width:420px">${segmented({ options: ['Overview', 'Agents', 'Billing'], active: 1, block: true })}</div>`),
  )),
};
