// The shape of a rule: AGENTS.md#the-guidelines-collection
import { guidelinePage } from './_layout.js';
import { TITLE, BLURB, RULES } from './_motion.js';

export default {
  title: 'Guidelines/Motion',
  parameters: { layout: 'fullscreen' },
};

export const Motion = {
  name: 'Motion',
  render: () => guidelinePage({ title: TITLE, blurb: BLURB, rules: RULES }),
};
