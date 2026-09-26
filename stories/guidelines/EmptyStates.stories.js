import { guidelinePage } from './_layout.js';
import { TITLE, BLURB, RULES } from './_empty-states.js';

export default {
  title: 'Guidelines/Empty states',
  parameters: { layout: 'fullscreen' },
};

export const EmptyStates = {
  name: 'Empty states',
  render: () => guidelinePage({ title: TITLE, blurb: BLURB, rules: RULES }),
};
