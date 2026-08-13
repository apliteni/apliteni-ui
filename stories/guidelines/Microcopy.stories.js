// The shape of a rule and the gates that walk this page: docs/guidelines.md
import { guidelinePage } from './_layout.js';
import { TITLE, RULES } from './_microcopy.js';

export default {
  title: 'Guidelines/Microcopy and tone',
  parameters: { layout: 'fullscreen' },
};

export const Microcopy = {
  name: 'Microcopy and tone',
  render: () => guidelinePage({ title: TITLE, rules: RULES }),
};
