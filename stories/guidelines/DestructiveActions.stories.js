// The shape of a rule: AGENTS.md#the-guidelines-collection
import { guidelinePage } from './_layout.js';
import { TITLE, BLURB, RULES, SPEC_CSS } from './_destructive-actions.js';

export default {
  title: 'Guidelines/Destructive actions',
  parameters: { layout: 'fullscreen' },
};

export const DestructiveActions = {
  name: 'Destructive actions',
  render: () => guidelinePage({ title: TITLE, blurb: BLURB, rules: RULES, css: SPEC_CSS }),
};
