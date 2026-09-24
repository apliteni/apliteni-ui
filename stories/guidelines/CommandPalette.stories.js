// The shape of a rule and the gates that walk this page: docs/guidelines.md
import { guidelinePage } from './_layout.js';
import { TITLE, BLURB, RULES, SPEC_CSS } from './_command-palette.js';

export default {
  title: 'Guidelines/The command palette',
  parameters: { layout: 'fullscreen' },
};

export const CommandPalette = {
  name: 'The command palette',
  render: () => guidelinePage({ title: TITLE, blurb: BLURB, rules: RULES, css: SPEC_CSS }),
};
