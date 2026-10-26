import { loadGuideline } from './_markdown.js';
const content = await loadGuideline('empty-states.md', new URL('../../guidelines/empty-states.md', import.meta.url));
export const TITLE = content.title;
export const BLURB = content.blurb;
export const RULES = content.rules;
