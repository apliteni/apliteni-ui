// ---------------------------------------------------------------------------
// Guidelines — Colour and theming. The page is the shell in ./_layout.js; the
// rules, the specimens and the specimen CSS are in ./_colour-and-theming.js.
// ---------------------------------------------------------------------------
import { guidelinePage } from './_layout.js';
import { TITLE, RULES, SPEC_CSS } from './_colour-and-theming.js';

export default {
  title: 'Guidelines/Colour and theming',
  parameters: { layout: 'fullscreen' },
};

export const ColourAndTheming = {
  name: 'Colour and theming',
  render: () => guidelinePage({ title: TITLE, rules: RULES, css: SPEC_CSS }),
};
