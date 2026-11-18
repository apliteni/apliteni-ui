import { loadGuideline } from './_markdown.js';
const content = await loadGuideline('text-length.md', new URL('../../guidelines/text-length.md', import.meta.url));
export const TITLE = content.title;
export const BLURB = content.blurb;

export const RULES = content.rules;
