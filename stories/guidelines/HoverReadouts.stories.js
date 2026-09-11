// The shape of a rule and the gates that walk this page: docs/guidelines.md
import { guidelinePage } from './_layout.js';
import { TITLE, RULES, SPEC_CSS } from './_hover-readouts.js';

export default {
  title: 'Guidelines/Hover readouts',
  parameters: { layout: 'fullscreen' },
};

export const HoverReadouts = {
  name: 'Hover readouts',
  render: () => guidelinePage({ title: TITLE, rules: RULES, css: SPEC_CSS }),
};
