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
{ id: 'after-load', kit: [
      { ref: 'src/styles/drawer.css:72', pattern: 'transition: transform var(--dur-med) var(--ease);' },
      { ref: 'src/styles/callout.css:51', pattern: 'animation: ui-toast-in var(--dur-med) var(--ease-out) both;' },
    ] },
{ id: 'durations', kit: [
      { ref: 'src/tokens/tokens.css:96', pattern: '--dur-instant: var(--duration-instant, 0.08s);' },
      { ref: 'src/tokens/tokens.css:97', pattern: '--dur-fast: var(--duration-fast, 0.15s);' },
      { ref: 'src/tokens/tokens.css:98', pattern: '--dur-med: var(--duration-normal, 0.25s);' },
      { ref: 'src/tokens/tokens.css:99', pattern: '--dur-slow: var(--duration-slow, 0.4s);' },
    ] },
{ id: 'easing', kit: [
      { ref: 'src/tokens/tokens.css:90', pattern: '--ease: var(--easing-ease-in-out' },
      { ref: 'src/tokens/tokens.css:91', pattern: '--ease-out: var(--easing-ease-out' },
      { ref: 'src/styles/drawer.css:34', pattern: 'transition: visibility var(--dur-med) linear;' },
    ] },
{ id: 'reduced', kit: [
      { ref: 'src/styles/reduced-motion.css:15', pattern: 'animation-duration: 0.01ms !important;' },
      { ref: 'src/styles/reduced-motion.css:17', pattern: 'transition-duration: 0.01ms !important;' },
      { ref: 'src/styles/drawer.css:247', pattern: '.ui-drawer.is-open * { transition: none !important; }' },
    ] }
]);
