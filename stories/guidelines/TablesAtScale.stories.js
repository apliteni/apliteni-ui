// The shape of a rule and the gates that walk this page: docs/guidelines.md
import { guidelinePage } from './_layout.js';
import { TITLE, RULES, SPEC_CSS } from './_tables-at-scale.js';

export default {
  title: 'Guidelines/Tables at scale',
  parameters: { layout: 'fullscreen' },
};

export const TablesAtScale = {
  name: 'Tables at scale',
  render: () => guidelinePage({ title: TITLE, rules: RULES, css: SPEC_CSS }),
};
