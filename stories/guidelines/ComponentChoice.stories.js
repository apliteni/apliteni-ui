// The shape of a rule and the gates that walk this page: docs/guidelines.md
import { guidelinePage } from './_layout.js';
import { TITLE, RULES } from './_component-choice.js';

export default {
  title: 'Guidelines/Component choice',
  parameters: { layout: 'fullscreen' },
};

export const ComponentChoice = {
  name: 'Component choice',
  render: () => guidelinePage({ title: TITLE, rules: RULES }),
};
