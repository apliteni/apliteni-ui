import { avatar } from '../../src/components/avatar.js';
import { pad, row, specimen, stack } from '../_gallery.js';

export default {
  title: 'Components/Avatar',
  parameters: { layout: 'fullscreen' },
};

const NAMES = ['Avery Example', 'Jordan Okafor', 'Mia Chen', 'Noor Haddad', 'Sam Rivera', 'Lena Novak', 'Omar Reyes', 'Priya Nair'];

export const Hues = {
  render: () => pad(stack(
    specimen('24 px, eight hues', row(...NAMES.map((name, i) => avatar({ key: `user_${i}`, name })))),
    specimen('32 px, eight hues', row(...NAMES.map((name, i) => avatar({ key: `user_${i}`, name, size: 32 })))),
  )),
};

export const Fallbacks = {
  render: () => pad(stack(
    specimen('One name, no name, no one', row(
      avatar({ key: 'user_1', name: 'Mia' }),
      avatar({ key: 'user_2', name: '' }),
      avatar({ empty: true }),
    )),
    specimen('A photo covers the letters', row(
      avatar({ key: 'user_3', name: 'Jordan Okafor', src: 'demo-assets/demo-logo.svg' }),
    )),
  )),
};
