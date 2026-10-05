// The shape of a rule: AGENTS.md#the-guidelines-collection
import { guidelinePage } from './_layout.js';
import { TITLE, BLURB, RULES, SPEC_CSS } from './_state-set.js';

export default {
  title: 'Guidelines/The full state set',
  parameters: { layout: 'fullscreen' },
};

export const StateSet = {
  name: 'The full state set',
  render: () => guidelinePage({ title: TITLE, blurb: BLURB, rules: RULES, css: SPEC_CSS }),
};
