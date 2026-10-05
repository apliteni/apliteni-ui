// The shape of a rule: AGENTS.md#the-guidelines-collection
import { guidelinePage } from './_layout.js';
import { TITLE, BLURB, RULES, SPEC_CSS } from './_hover-readouts.js';

export default {
  title: 'Guidelines/Hover readouts',
  parameters: { layout: 'fullscreen' },
};

export const HoverReadouts = {
  name: 'Hover readouts',
  render: () => guidelinePage({ title: TITLE, blurb: BLURB, rules: RULES, css: SPEC_CSS }),
};
