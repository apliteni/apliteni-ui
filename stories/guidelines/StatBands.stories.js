// The shape of a rule and the gates that walk this page: docs/guidelines.md
import { guidelinePage } from './_layout.js';
import { TITLE, RULES, SPEC_CSS } from './_stat-bands.js';

export default {
  title: 'Guidelines/Stat bands',
  parameters: { layout: 'fullscreen' },
};

export const StatBands = {
  name: 'Stat bands',
  render: () => guidelinePage({ title: TITLE, rules: RULES, css: SPEC_CSS }),
};
