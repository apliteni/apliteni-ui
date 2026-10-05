// The shape of a rule: AGENTS.md#the-guidelines-collection
import { guidelinePage } from './_layout.js';
import { TITLE, BLURB, RULES, SPEC_CSS } from './_account-and-settings.js';

export default {
  title: 'Guidelines/Account and settings',
  parameters: { layout: 'fullscreen' },
};

export const AccountAndSettings = {
  name: 'Account and settings',
  render: () => guidelinePage({ title: TITLE, blurb: BLURB, rules: RULES, css: SPEC_CSS }),
};
