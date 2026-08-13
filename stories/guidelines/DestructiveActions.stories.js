// The shape of a rule and the gates that walk this page: docs/guidelines.md
import { guidelinePage } from './_layout.js';
import { TITLE, RULES, SPEC_CSS } from './_destructive-actions.js';

export default {
  title: 'Guidelines/Destructive actions',
  parameters: { layout: 'fullscreen' },
};

export const DestructiveActions = {
  name: 'Destructive actions',
  render: () => guidelinePage({ title: TITLE, rules: RULES, css: SPEC_CSS }),
};
