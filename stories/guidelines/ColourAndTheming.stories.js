// The shape of a rule and the gates that walk this page: docs/guidelines.md
import { guidelinePage } from './_layout.js';
import { TITLE, RULES, SPEC_CSS } from './_colour-and-theming.js';

export default {
  title: 'Guidelines/Colour and theming',
  parameters: { layout: 'fullscreen' },
};

export const ColourAndTheming = {
  name: 'Colour and theming',
  render: () => guidelinePage({ title: TITLE, rules: RULES, css: SPEC_CSS }),
};
