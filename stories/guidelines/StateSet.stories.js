// The shape of a rule and the gates that walk this page: docs/guidelines.md
import { guidelinePage } from './_layout.js';
import { TITLE, RULES, SPEC_CSS } from './_state-set.js';

export default {
  title: 'Guidelines/The full state set',
  parameters: { layout: 'fullscreen' },
};

export const StateSet = {
  name: 'The full state set',
  render: () => guidelinePage({ title: TITLE, rules: RULES, css: SPEC_CSS }),
};
