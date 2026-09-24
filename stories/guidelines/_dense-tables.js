import { loadGuideline } from './_markdown.js';
const content = await loadGuideline('dense-tables.md', new URL('../../guidelines/dense-tables.md', import.meta.url));
export const TITLE = content.title;
export const BLURB = content.blurb;
export const RULES = content.rules.map((rule, index) => index === 0 ? {
  ...rule,
  kit: [{ ref: 'src/styles/table.css:88', pattern: '.ui-table { background: var(--table-bg);' }],
} : rule);
