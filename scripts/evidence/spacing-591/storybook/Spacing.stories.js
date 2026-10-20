// Temporary page for the #591 follow-up: one story per wording of the option B rules.
import { guidelinePage } from './_layout.js';
import { pages, SPEC_CSS } from './_spacing.js';

export default {
  title: 'Guidelines/Spacing draft',
  parameters: { layout: 'fullscreen' },
};

const page = (k) => () => guidelinePage({ title: pages[k].title, rules: pages[k].rules, css: SPEC_CSS });
export const Pixels = { render: page('px') };
export const Tokens = { render: page('tokens') };
export const Words = { render: page('words') };
