// ---------------------------------------------------------------------------
// Guidelines — The full state set. The page is the shell in ./_layout.js; the
// rules, the specimens and the specimen CSS are in ./_state-set.js.
// ---------------------------------------------------------------------------
import { guidelinePage } from './_layout.js';
import { TITLE, RULES, SPEC_CSS } from './_state-set.js';

export default {
  title: 'Guidelines/The full state set',
  parameters: { layout: 'fullscreen' },
};

export const StateSet = {
  name: 'The full state set',
  render: () => guidelinePage({ title: TITLE, rules: RULES, css: SPEC_CSS }),
};
