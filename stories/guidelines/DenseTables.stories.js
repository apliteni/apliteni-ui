import { guidelinePage } from './_layout.js';
import { TITLE, RULES, SPEC_CSS } from './_dense-tables.js';
export default { title: 'Guidelines/Dense tables', parameters: { layout: 'fullscreen' } };
export const DenseTables = { render: () => guidelinePage({ title: TITLE, rules: RULES, css: SPEC_CSS }) };
