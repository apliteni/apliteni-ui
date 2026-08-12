// ---------------------------------------------------------------------------
// Guidelines — Component choice. Content, specimens and citations live in
// ./_component-choice.js; the shell around them is guidelinePage().
// ---------------------------------------------------------------------------
import { guidelinePage } from './_layout.js';
import { TITLE, RULES } from './_component-choice.js';

export default {
  title: 'Guidelines/Component choice',
  parameters: { layout: 'fullscreen' },
};

export const ComponentChoice = {
  name: 'Component choice',
  render: () => guidelinePage({ title: TITLE, rules: RULES }),
};
