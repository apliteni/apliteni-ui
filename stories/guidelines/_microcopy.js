import { loadGuideline } from './_markdown.js';
const content = await loadGuideline('microcopy.md', new URL('../../guidelines/microcopy.md', import.meta.url));
export const TITLE = content.title;
export const BLURB = content.blurb;
export const RULES = content.rules;
