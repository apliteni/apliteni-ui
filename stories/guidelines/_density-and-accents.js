import { loadGuideline, withSpecimens } from './_markdown.js';
const content = await loadGuideline('density-and-accents.md', new URL('../../guidelines/density-and-accents.md', import.meta.url));
export const TITLE = content.title;
export const BLURB = content.blurb;
export const RULES = withSpecimens(content.rules, [
  { id: 'check-density' },
  { id: 'reduce-density' },
  { id: 'purposeful-accent' },
]);
