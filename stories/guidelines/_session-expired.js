import { loadGuideline } from './_markdown.js';
const content = await loadGuideline('session-expired.md', new URL('../../guidelines/session-expired.md', import.meta.url));
export const TITLE = content.title;
export const BLURB = content.blurb;
export const RULES = content.rules;
// The shape of a rule: AGENTS.md#the-guidelines-collection

export const SPEC_CSS = '<style>.gl-stage .ui-app { background: var(--surface); }</style>';
