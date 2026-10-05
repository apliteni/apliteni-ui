// The shape of a rule: AGENTS.md#the-guidelines-collection
import { guidelinePage } from './_layout.js';
import { TITLE, BLURB, RULES, SPEC_CSS } from './_colour-and-theming.js';

export default {
  title: 'Guidelines/Colour and theming',
  parameters: { layout: 'fullscreen' },
};

export const ColourAndTheming = {
  name: 'Colour and theming',
  render: () => guidelinePage({ title: TITLE, blurb: BLURB, rules: RULES, css: SPEC_CSS }),
};
