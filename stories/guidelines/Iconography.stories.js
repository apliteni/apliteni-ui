// The shape of a rule: AGENTS.md#the-guidelines-collection
import { guidelinePage } from './_layout.js';
import { TITLE, BLURB, RULES, SPEC_CSS } from './_iconography.js';

export default {
  title: 'Guidelines/Iconography',
  parameters: { layout: 'fullscreen' },
};

export const Iconography = {
  name: 'Iconography',
  render: () => guidelinePage({ title: TITLE, blurb: BLURB, rules: RULES, css: SPEC_CSS }),
};
