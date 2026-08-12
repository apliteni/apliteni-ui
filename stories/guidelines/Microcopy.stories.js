// ---------------------------------------------------------------------------
// Guidelines — Microcopy and tone. Content, specimens and citations live in
// ./_microcopy.js; the shell around them is guidelinePage().
// ---------------------------------------------------------------------------
import { guidelinePage } from './_layout.js';
import { TITLE, RULES } from './_microcopy.js';

export default {
  title: 'Guidelines/Microcopy and tone',
  parameters: { layout: 'fullscreen' },
};

export const Microcopy = {
  name: 'Microcopy and tone',
  render: () => guidelinePage({ title: TITLE, rules: RULES }),
};
