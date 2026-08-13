// ---------------------------------------------------------------------------
// Guidelines — Overview, the content half.
//
// Everything the index says about the collection is read off the five content
// modules and their story modules. Nothing here is written down twice: a rule
// added to _microcopy.js moves the count, the sentence and the row without
// anyone remembering to come back.
//
// The one thing this file states outright is the ORDER of the five pages,
// which mirrors the sidebar order set in .storybook/preview.js — no module
// knows where it sits in the collection.
//
// It sits beside the story module, like every other page in this directory,
// rather than inside it: a named export of a *.stories.js file is a story to
// Storybook, and the gate in overview.test.js wants this data, not a story.
// ---------------------------------------------------------------------------
import * as destructiveContent from './_destructive-actions.js';
import * as colourContent from './_colour-and-theming.js';
import * as stateContent from './_state-set.js';
import * as componentContent from './_component-choice.js';
import * as microcopyContent from './_microcopy.js';

// The pages' own story modules, imported for one reason: a story's URL id comes
// from its EXPORT NAME, not from its title. 'Guidelines/The full state set' is
// story `state-set`, not `the-full-state-set`, and a link built from the title
// alone is a 404 on two of the five pages. Reading the export name is the only
// way to link the collection without a hand-kept table of ids.
import * as destructiveStory from './DestructiveActions.stories.js';
import * as colourStory from './ColourAndTheming.stories.js';
import * as stateStory from './StateSet.stories.js';
import * as componentStory from './ComponentChoice.stories.js';
import * as microcopyStory from './Microcopy.stories.js';

const ENTRIES = [
  [destructiveContent, destructiveStory],
  [colourContent, colourStory],
  [stateContent, stateStory],
  [componentContent, componentStory],
  [microcopyContent, microcopyStory],
];

// Storybook's own two-step id rule, reproduced.
//
// `sanitize` (storybook/internal/csf) lowercases and collapses every run of
// non-alphanumerics into one dash. An export name goes through lodash
// `startCase` first, which also splits at a lower→upper boundary and between
// letters and digits — so `StateSet` is "State Set" before it is `state-set`.
//
// Reproduced rather than imported so the page bundles no Storybook internals.
// overview.test.js holds the two in step: it derives every id again through
// Storybook's real `toId` and `storyNameFromExport`, and checks the ids the
// static build actually published.
const sanitize = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const words = (key) => (String(key).match(/[A-Z]+(?![a-z])|[A-Z]?[a-z]+|\d+/g) || []).join('-');
export const storyId = (mod) => {
  const key = Object.keys(mod).find((k) => k !== 'default');
  return `${sanitize(mod.default.title)}--${sanitize(words(key))}`;
};

// A story link out of the preview iframe. `./` resolves against /iframe.html,
// so this is the manager URL in dev and in a static build alike; `target="_top"`
// is what stops the whole of Storybook loading inside its own preview pane.
export const storyHref = (mod) => `./?path=/story/${storyId(mod)}`;

/** The five pages, each with what an index is allowed to say about it. */
export const PAGES = ENTRIES.map(([content, story]) => ({
  title: content.TITLE,
  blurb: content.BLURB,
  id: storyId(story),
  href: storyHref(story),
  rules: content.RULES,
  // The rules on this page the kit does not currently meet, each with its issue.
  gaps: content.RULES.filter((r) => r.unmet),
}));

const RULE_COUNT = PAGES.reduce((n, p) => n + p.rules.length, 0);
const GAPS = PAGES.flatMap((p) => p.gaps);
const ISSUES = GAPS.map((r) => `#${r.unmet.issue}`);

// Every number in the sentence is counted, not written down: a rule added to a
// content module moves the sentence with it, and so does closing a gap.
export const INTRO = `${RULE_COUNT} rules for building a screen with this kit, `
  + `on ${PAGES.length} pages. The kit does not meet ${GAPS.length} of them yet — `
  + `${ISSUES.join(' and ')} — and the table marks the pages that hold them.`;
