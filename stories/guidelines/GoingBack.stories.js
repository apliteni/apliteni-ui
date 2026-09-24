// The shape of a rule and the gates that walk this page: docs/guidelines.md
import { guidelinePage } from './_layout.js';
import { TITLE, BLURB, RULES, SPEC_CSS } from './_going-back.js';

export default {
  title: 'Guidelines/Going back',
  parameters: { layout: 'fullscreen' },
};

export const GoingBack = {
  name: 'Going back',
  render: () => guidelinePage({ title: TITLE, blurb: BLURB, rules: RULES, css: SPEC_CSS }),
};
