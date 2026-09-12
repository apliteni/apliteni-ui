// The shape of a rule and the gates that walk this page: docs/guidelines.md
import { guidelinePage } from './_layout.js';
import { TITLE, RULES } from './_motion.js';

export default {
  title: 'Guidelines/Motion',
  parameters: { layout: 'fullscreen' },
};

export const Motion = {
  name: 'Motion',
  render: () => guidelinePage({ title: TITLE, rules: RULES }),
};
