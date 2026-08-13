// The shape of a rule and the gates that walk this page: docs/guidelines.md
import { guidelinePage } from './_layout.js';
import { TITLE, RULES, SPEC_CSS } from './_layout-and-density.js';

export default {
  title: 'Guidelines/Layout and density',
  parameters: { layout: 'fullscreen' },
};

export const LayoutAndDensity = {
  name: 'Layout and density',
  render: () => guidelinePage({ title: TITLE, rules: RULES, css: SPEC_CSS }),
};
