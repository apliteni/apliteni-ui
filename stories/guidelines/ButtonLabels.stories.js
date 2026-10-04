// The shape of a rule and the gates that walk this page: docs/guidelines.md
import { guidelinePage } from './_layout.js';
import { TITLE, BLURB, RULES, SPEC_CSS } from './_button-labels.js';

export default {
  title: 'Guidelines/Button labels',
  parameters: { layout: 'fullscreen' },
};

export const ButtonLabels = {
  name: 'Button labels',
  render: () => guidelinePage({ title: TITLE, blurb: BLURB, rules: RULES, css: SPEC_CSS }),
};
