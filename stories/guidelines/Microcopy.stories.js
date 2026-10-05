// The shape of a rule: AGENTS.md#the-guidelines-collection
import { guidelinePage } from './_layout.js';
import { TITLE, BLURB, RULES } from './_microcopy.js';

export default {
  title: 'Guidelines/Microcopy and tone',
  parameters: { layout: 'fullscreen' },
};

export const Microcopy = {
  name: 'Microcopy and tone',
  render: () => guidelinePage({ title: TITLE, blurb: BLURB, rules: RULES }),
};
