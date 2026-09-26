import { loadGuideline, withSpecimens } from './_markdown.js';
const content = await loadGuideline('text-length.md', new URL('../../guidelines/text-length.md', import.meta.url));
export const TITLE = content.title;
export const BLURB = content.blurb;

export const RULES = withSpecimens(content.rules, [
  { id: 'short-controls' },
  { id: 'useful-captions' },
  { id: 'useful-introductions' },
  { id: 'useful-callouts' },
  { id: 'remove-filler' },
]);
