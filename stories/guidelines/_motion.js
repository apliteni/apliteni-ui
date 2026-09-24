import { loadGuideline, withSpecimens } from './_markdown.js';
const content = await loadGuideline('motion.md', new URL('../../guidelines/motion.md', import.meta.url));
export const TITLE = content.title;
export const BLURB = content.blurb;
// The shape of a rule and the gates that walk this page: docs/guidelines.md
//
// No rule here has a specimen pair. Motion is the one thing a still picture
// cannot show, so each rule stands on its why and on the gate named in
// docs/specification.md#motion.

export const RULES = withSpecimens(content.rules, [
{ id: 'after-load' },
{ id: 'durations' },
{ id: 'easing' },
{ id: 'reduced' }
]);
