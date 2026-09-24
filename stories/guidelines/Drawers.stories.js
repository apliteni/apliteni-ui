// The shape of a rule and the gates that walk this page: docs/guidelines.md
import { guidelinePage } from './_layout.js';
import { TITLE, BLURB, RULES, SPEC_CSS } from './_drawer.js';

export default {
  title: 'Guidelines/Drawers',
  parameters: { layout: 'fullscreen' },
};

export const Drawers = {
  name: 'Drawers',
  render: () => guidelinePage({ title: TITLE, blurb: BLURB, rules: RULES, css: SPEC_CSS }),
};
