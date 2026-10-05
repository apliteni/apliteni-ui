// The shape of a rule: AGENTS.md#the-guidelines-collection
import { guidelinePage } from './_layout.js';
import { TITLE, BLURB, RULES, SPEC_CSS } from './_layout-and-density.js';

export default {
  title: 'Guidelines/Layout and density',
  parameters: { layout: 'fullscreen' },
};

export const LayoutAndDensity = {
  name: 'Layout and density',
  render: () => guidelinePage({ title: TITLE, blurb: BLURB, rules: RULES, css: SPEC_CSS }),
};
