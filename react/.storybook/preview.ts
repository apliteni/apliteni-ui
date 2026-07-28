import type { Preview } from '@storybook/react';
import '@apliteni/apliteni-ui/css';

document.documentElement.setAttribute('data-theme', 'dark');

const preview: Preview = { parameters: { layout: 'padded' } };
export default preview;
