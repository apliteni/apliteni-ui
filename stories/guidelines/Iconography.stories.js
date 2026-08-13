// The shape of a rule and the gates that walk this page: docs/guidelines.md
import { guidelinePage } from './_layout.js';
import { TITLE, RULES, SPEC_CSS } from './_iconography.js';

export default {
  title: 'Guidelines/Iconography',
  parameters: { layout: 'fullscreen' },
};

export const Iconography = {
  name: 'Iconography',
  render: () => guidelinePage({ title: TITLE, rules: RULES, css: SPEC_CSS }),
};
