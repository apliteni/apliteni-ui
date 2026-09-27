import type { Preview } from '@storybook/react';
import { createElement } from 'react';
import '@apliteni/apliteni-ui/css';

const preview: Preview = {
  parameters: { layout: 'padded' },
  globalTypes: {
    theme: {
      description: 'Theme',
      toolbar: {
        title: 'Theme',
        icon: 'circlehollow',
        items: [
          { value: 'dark', title: 'Dark' },
          { value: 'light', title: 'Light' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { theme: 'dark' },
  decorators: [
    (Story, context) => {
      const theme = context.globals.theme === 'light' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', theme);
      document.documentElement.setAttribute('data-theme-choice', theme);
      return createElement(Story);
    },
  ],
};
export default preview;
