// The shape of a rule: AGENTS.md#the-guidelines-collection
import { guidelinePage } from './_layout.js';
import { TITLE, BLURB, RULES } from './_component-choice.js';

export default {
  title: 'Guidelines/Component choice',
  parameters: { layout: 'fullscreen' },
};

export const ComponentChoice = {
  name: 'Component choice',
  render: () => guidelinePage({ title: TITLE, blurb: BLURB, rules: RULES }),
};
