import { loadGuideline } from './_markdown.js';
const content = await loadGuideline('wizard.md', new URL('../../guidelines/wizard.md', import.meta.url));
export const TITLE = content.title;
export const BLURB = content.blurb;
export const RULES = content.rules;
// The shape of a rule: AGENTS.md#the-guidelines-collection
