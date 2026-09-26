import { loadGuideline } from './_markdown.js';
// The index data, read off the pages. What ENTRIES adds is the ORDER, which
// mirrors the sidebar order in .storybook/preview.js.
// The shape of a rule and the gates that walk this page: docs/guidelines.md
import * as destructiveContent from './_destructive-actions.js';
import * as colourContent from './_colour-and-theming.js';
import * as stateContent from './_state-set.js';
import * as componentContent from './_component-choice.js';
import * as textContent from './_text-length.js';
import * as microcopyContent from './_microcopy.js';
import * as labelsContent from './_labels-and-titles.js';
import * as iconographyContent from './_iconography.js';
import * as layoutContent from './_layout-and-density.js';
import * as denseContent from './_dense-tables.js';
import * as floorContent from './_accessibility-floor.js';
import * as paginationContent from './_pagination.js';
import * as statContent from './_stat-bands.js';
import * as drawerContent from './_drawer.js';
import * as motionContent from './_motion.js';
import * as paletteContent from './_command-palette.js';
import * as hoverContent from './_hover-readouts.js';
import * as backContent from './_going-back.js';
import * as pageContent from './_the-page.js';

// Imported for their EXPORT NAMES, which is where a story's URL id comes from.
import * as destructiveStory from './DestructiveActions.stories.js';
import * as colourStory from './ColourAndTheming.stories.js';
import * as stateStory from './StateSet.stories.js';
import * as componentStory from './ComponentChoice.stories.js';
import * as textStory from './TextLength.stories.js';
import * as microcopyStory from './Microcopy.stories.js';
import * as labelsStory from './LabelsAndTitles.stories.js';
import * as iconographyStory from './Iconography.stories.js';
import * as layoutStory from './LayoutAndDensity.stories.js';
import * as denseStory from './DenseTables.stories.js';
import * as floorStory from './AccessibilityFloor.stories.js';
import * as paginationStory from './Pagination.stories.js';
import * as statStory from './StatBands.stories.js';
import * as drawerStory from './Drawers.stories.js';
import * as motionStory from './Motion.stories.js';
import * as paletteStory from './CommandPalette.stories.js';
import * as hoverStory from './HoverReadouts.stories.js';
import * as backStory from './GoingBack.stories.js';
import * as pageStory from './ThePage.stories.js';

const ENTRIES = [
  [pageContent, pageStory],
  [destructiveContent, destructiveStory],
  [colourContent, colourStory],
  [stateContent, stateStory],
  [componentContent, componentStory],
  [microcopyContent, microcopyStory],
  [textContent, textStory],
  [labelsContent, labelsStory],
  [iconographyContent, iconographyStory],
  [layoutContent, layoutStory],
  [denseContent, denseStory],
  [floorContent, floorStory],
  [paginationContent, paginationStory],
  [statContent, statStory],
  [drawerContent, drawerStory],
  [motionContent, motionStory],
  [paletteContent, paletteStory],
  [hoverContent, hoverStory],
  [backContent, backStory],
];

// Storybook's two-step id rule, reproduced rather than imported so the page
// bundles no Storybook internals; overview.test.js holds the two in step.
const sanitize = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const words = (key) => (String(key).match(/[A-Z]+(?![a-z])|[A-Z]?[a-z]+|\d+/g) || []).join('-');
export const storyId = (mod) => {
  const key = Object.keys(mod).find((k) => k !== 'default');
  return `${sanitize(mod.default.id || mod.default.title)}--${sanitize(words(key))}`;
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

const overview = await loadGuideline('overview.md', new URL('../../guidelines/overview.md', import.meta.url));
export const INTRO = overview.blurb;
export const TITLE = overview.title;
export const LINKS = PAGES.map(({ title, href }) => ({ title, href }));
