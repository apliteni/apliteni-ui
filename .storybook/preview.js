import '../src/index.css';
import { wireTopbar, applyTheme } from '../src/components/topbar.js';

// Load Poppins once (Storybook manager/preview iframe).
if (!document.getElementById('ui-poppins')) {
  const pre1 = document.createElement('link');
  pre1.rel = 'preconnect'; pre1.href = 'https://fonts.gstatic.com'; pre1.crossOrigin = 'anonymous';
  const link = document.createElement('link');
  link.id = 'ui-poppins'; link.rel = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap';
  document.head.append(pre1, link);
}

/** @type { import('@storybook/html').Preview } */
const preview = {
  parameters: {
    layout: 'centered',
    backgrounds: { disable: true }, // theme decorator owns the canvas colour
    options: {
      storySort: {
        order: [
          'Foundations', ['Colors', 'Typography', 'Spacing & Radius', 'Elevation', 'Backgrounds', 'Iconography', 'Brand'],
          'Components', ['Button', 'Badge & Status', 'Card', 'Segmented Control', 'Inputs', 'Switch & Checkbox', 'Table', 'Callout & Toast', 'Feedback', 'Code Snippet', 'Topbar'],
          'Apps', ['Landing Page', 'Sign In (OAuth2)', 'Consent', 'Preferences', 'Access & Agents'],
        ],
      },
    },
    controls: { expanded: true, matchers: { color: /(background|color)$/i } },
    a11y: { context: '#storybook-root' },
  },

  globalTypes: {
    theme: {
      description: 'Deck theme',
      defaultValue: 'dark',
      toolbar: {
        title: 'Theme',
        icon: 'contrast',
        items: [
          { value: 'dark', title: 'Dark', icon: 'moon' },
          { value: 'light', title: 'Light', icon: 'sun' },
        ],
        dynamicTitle: true,
      },
    },
    accent: {
      description: 'Accent sub-theme',
      defaultValue: 'default',
      toolbar: {
        title: 'Accent',
        icon: 'paintbrush',
        items: [
          { value: 'default', title: 'Nebula (purple)' },
          { value: 'phoenix', title: 'Phoenix (ember)' },
          { value: 'ocean', title: 'Ocean (azure)' },
          { value: 'emerald', title: 'Emerald (jade)' },
        ],
        dynamicTitle: true,
      },
    },
  },

  decorators: [
    (story, ctx) => {
      const theme = ctx.globals.theme || 'dark';
      const accent = ctx.globals.accent || 'default';
      applyTheme(theme, document.documentElement);
      if (accent === 'default') document.documentElement.removeAttribute('data-accent');
      else document.documentElement.setAttribute('data-accent', accent);
      // Paint the whole canvas with the theme bg so centered/padded stories read true.
      const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
      const root = document.getElementById('storybook-root') || document.body;
      root.style.background = bg;
      document.body.style.background = bg;

      const wrap = document.createElement('div');
      const out = story();
      if (typeof out === 'string') wrap.innerHTML = out; else wrap.append(out);
      // Wire interactive behaviours after render.
      requestAnimationFrame(() => wireTopbar(wrap));
      return wrap;
    },
  ],
};

export default preview;
