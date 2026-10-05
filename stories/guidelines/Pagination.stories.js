// The shape of a rule: AGENTS.md#the-guidelines-collection
import { guidelinePage } from './_layout.js';
import { TITLE, BLURB, RULES, SPEC_CSS } from './_pagination.js';

export default {
  title: 'Guidelines/Pagination',
  parameters: { layout: 'fullscreen' },
};

export const Pagination = {
  name: 'Pagination',
  render: () => guidelinePage({ title: TITLE, blurb: BLURB, rules: RULES, css: SPEC_CSS }),
};
