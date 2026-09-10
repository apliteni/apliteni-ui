// The shape of a rule and the gates that walk this page: docs/guidelines.md
import { guidelinePage } from './_layout.js';
import { TITLE, RULES, SPEC_CSS } from './_pagination.js';

export default {
  title: 'Guidelines/Pagination',
  parameters: { layout: 'fullscreen' },
};

export const Pagination = {
  name: 'Pagination',
  render: () => guidelinePage({ title: TITLE, rules: RULES, css: SPEC_CSS }),
};
