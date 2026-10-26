import { loadGuideline } from './_markdown.js';
const content = await loadGuideline('component-choice.md', new URL('../../guidelines/component-choice.md', import.meta.url));
export const TITLE = content.title;
export const BLURB = content.blurb;
export const RULES = content.rules;
