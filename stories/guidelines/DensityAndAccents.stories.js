import { guidelinePage } from './_layout.js';
import { TITLE, BLURB, RULES } from './_density-and-accents.js';

export default {
  title: 'Guidelines/Density and accents',
  parameters: { layout: 'fullscreen' },
};

export const DensityAndAccents = {
  name: 'Density and accents',
  render: () => guidelinePage({ title: TITLE, blurb: BLURB, rules: RULES }),
};
