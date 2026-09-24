// The shape of a rule and the gates that walk this page: docs/guidelines.md
import { guidelinePage } from './_layout.js';
import { TITLE, BLURB, RULES } from './_labels-and-titles.js';

export default {
  title: 'Guidelines/Labels and titles',
  parameters: { layout: 'fullscreen' },
};

export const LabelsAndTitles = {
  name: 'Labels and titles',
  render: () => guidelinePage({ title: TITLE, blurb: BLURB, rules: RULES }),
};
