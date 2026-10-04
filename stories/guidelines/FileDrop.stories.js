// The shape of a rule and the gates that walk this page: docs/guidelines.md
import { guidelinePage } from './_layout.js';
import { TITLE, BLURB, RULES, SPEC_CSS } from './_file-drop.js';

export default {
  title: 'Guidelines/File drop',
  parameters: { layout: 'fullscreen' },
};

export const FileDrop = {
  name: 'File drop',
  render: () => guidelinePage({ title: TITLE, blurb: BLURB, rules: RULES, css: SPEC_CSS }),
};
