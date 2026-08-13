// The index data, read off the pages. What ENTRIES adds is the ORDER, which
// mirrors the sidebar order in .storybook/preview.js.
// The shape of a rule and the gates that walk this page: docs/guidelines.md
import * as destructiveContent from './_destructive-actions.js';
import * as colourContent from './_colour-and-theming.js';
import * as stateContent from './_state-set.js';
import * as componentContent from './_component-choice.js';
import * as microcopyContent from './_microcopy.js';
import * as iconographyContent from './_iconography.js';

// Imported for their EXPORT NAMES, which is where a story's URL id comes from.
import * as destructiveStory from './DestructiveActions.stories.js';
import * as colourStory from './ColourAndTheming.stories.js';
import * as stateStory from './StateSet.stories.js';
import * as componentStory from './ComponentChoice.stories.js';
import * as microcopyStory from './Microcopy.stories.js';
import * as iconographyStory from './Iconography.stories.js';

const ENTRIES = [
  [destructiveContent, destructiveStory],
  [colourContent, colourStory],
  [stateContent, stateStory],
  [componentContent, componentStory],
  [microcopyContent, microcopyStory],
  [iconographyContent, iconographyStory],
];

// Storybook's two-step id rule, reproduced rather than imported so the page
// bundles no Storybook internals; overview.test.js holds the two in step.
const sanitize = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const words = (key) => (String(key).match(/[A-Z]+(?![a-z])|[A-Z]?[a-z]+|\d+/g) || []).join('-');
export const storyId = (mod) => {
  const key = Object.keys(mod).find((k) => k !== 'default');
  return `${sanitize(mod.default.title)}--${sanitize(words(key))}`;
};

// `./` resolves against /iframe.html, so this is the manager URL in dev and in
// a static build alike. Whoever renders it needs target="_top".
export const storyHref = (mod) => `./?path=/story/${storyId(mod)}`;

export const PAGES = ENTRIES.map(([content, story]) => ({
  title: content.TITLE,
  blurb: content.BLURB,
  id: storyId(story),
  href: storyHref(story),
  rules: content.RULES,
  gaps: content.RULES.filter((r) => r.unmet),
}));

const RULE_COUNT = PAGES.reduce((n, p) => n + p.rules.length, 0);
const GAPS = PAGES.flatMap((p) => p.gaps);
const ISSUES = GAPS.map((r) => `#${r.unmet.issue}`);

export const INTRO = `${RULE_COUNT} rules for building a screen with this kit, `
  + `on ${PAGES.length} pages. The kit does not meet ${GAPS.length} of them yet — `
  + `${ISSUES.join(' and ')} — and the table marks the pages that hold them.`;
