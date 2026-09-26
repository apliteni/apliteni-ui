import { guidelinePage } from './_layout.js';
import { TITLE, BLURB, RULES } from './_text-length.js';

export default {
  title: 'Guidelines/Text length',
  parameters: { layout: 'fullscreen' },
};

export const TextLength = {
  name: 'Text length',
  render: () => guidelinePage({ title: TITLE, blurb: BLURB, rules: RULES }),
};
