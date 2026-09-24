import { guidelinePage } from './_layout.js';
import { TITLE, BLURB, RULES, SPEC_CSS } from './_accessibility-floor.js';

export default {
  id: 'guidelines-the-accessibility-floor',
  title: 'Guidelines/Accessibility minimums',
  parameters: { layout: 'fullscreen' },
};

export const AccessibilityFloor = {
  name: 'Accessibility minimums',
  render: () => guidelinePage({ title: TITLE, blurb: BLURB, rules: RULES, css: SPEC_CSS }),
};
