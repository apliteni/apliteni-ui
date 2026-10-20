// The shape of a rule: AGENTS.md#the-guidelines-collection
import { guidelinePage } from './_layout.js';
import { TITLE, BLURB, RULES, SPEC_CSS } from './_spacing.js';

export default {
  title: 'Guidelines/Spacing',
  parameters: { layout: 'fullscreen' },
};

export const Spacing = {
  render: () => guidelinePage({ title: TITLE, blurb: BLURB, rules: RULES, css: SPEC_CSS }),
};
