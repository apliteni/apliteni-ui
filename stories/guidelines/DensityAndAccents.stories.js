import { guidelinePage } from './_layout.js';
import { TITLE, BLURB, RULES, SPEC_CSS } from './_density-and-accents.js';

export default {
  title: 'Guidelines/Density and accents',
  parameters: { layout: 'fullscreen' },
};

export const DensityAndAccents = {
  name: 'Density and accents',
  render: () => guidelinePage({ title: TITLE, blurb: BLURB, rules: RULES, css: SPEC_CSS }).replace('class="gl gc"', 'class="gl gc gda-page"'),
};
