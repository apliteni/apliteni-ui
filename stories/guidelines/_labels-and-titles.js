import { loadGuideline } from './_markdown.js';
const content = await loadGuideline('labels-and-titles.md', new URL('../../guidelines/labels-and-titles.md', import.meta.url));
export const TITLE = content.title;
export const BLURB = content.blurb;
export const RULES = content.rules;
