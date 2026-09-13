// The shape of a rule and the gates that walk this page: docs/guidelines.md
import { guidelinePage } from './_layout.js';
import { TITLE, RULES, SPEC_CSS } from './_the-page.js';

export default {
  title: 'Guidelines/The page',
  parameters: { layout: 'fullscreen' },
};

export const ThePage = {
  name: 'The page',
  render: () => guidelinePage({ title: TITLE, rules: RULES, css: SPEC_CSS }),
};
