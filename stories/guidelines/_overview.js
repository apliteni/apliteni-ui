import { loadGuideline } from './_markdown.js';
// The index data, read off the pages. What ENTRIES adds is the ORDER, which
// mirrors the sidebar order in .storybook/preview.js.
// The shape of a rule: AGENTS.md#the-guidelines-collection
import * as destructiveContent from './_destructive-actions.js';
import * as colourContent from './_colour-and-theming.js';
import * as emptyContent from './_empty-states.js';
import * as stateContent from './_state-set.js';
import * as componentContent from './_component-choice.js';
import * as textContent from './_text-length.js';
import * as microcopyContent from './_microcopy.js';
import * as labelsContent from './_labels-and-titles.js';
import * as buttonLabelsContent from './_button-labels.js';
import * as iconographyContent from './_iconography.js';
import * as layoutContent from './_layout-and-density.js';
import * as spacingContent from './_spacing.js';
import * as denseContent from './_dense-tables.js';
import * as floorContent from './_accessibility-floor.js';
import * as paginationContent from './_pagination.js';
import * as statContent from './_stat-bands.js';
import * as drawerContent from './_drawer.js';
import * as fileDropContent from './_file-drop.js';
import * as motionContent from './_motion.js';
import * as paletteContent from './_command-palette.js';
import * as hoverContent from './_hover-readouts.js';
import * as backContent from './_going-back.js';
import * as pageContent from './_the-page.js';
import * as accountContent from './_account-and-settings.js';
import * as kindContent from './_dashboards-and-reports.js';
import * as densityAccentContent from './_density-and-accents.js';

// One row per guideline page, in the sidebar order. `title` and `name` are the
// React story's own — `name` is the story EXPORT name, which Storybook turns
// into the id half after the `--`. react/src/guidelines.test.tsx holds the ids
// built from these names against the ids Storybook's rule produces from the
// .stories.tsx modules, so a rename or a missing row fails there.
const ENTRIES = [
  [pageContent, 'Guidelines/The page', 'ThePage'],
  [kindContent, 'Guidelines/Dashboards and reports', 'DashboardsAndReports'],
  [destructiveContent, 'Guidelines/Destructive actions', 'DestructiveActions'],
  [colourContent, 'Guidelines/Colour and theming', 'ColourAndTheming'],
  [stateContent, 'Guidelines/The full state set', 'StateSet'],
  [emptyContent, 'Guidelines/Empty states', 'EmptyStates'],
  [componentContent, 'Guidelines/Component choice', 'ComponentChoice'],
  [microcopyContent, 'Guidelines/Microcopy and tone', 'Microcopy'],
  [textContent, 'Guidelines/Text length', 'TextLength'],
  [labelsContent, 'Guidelines/Labels and titles', 'LabelsAndTitles'],
  [buttonLabelsContent, 'Guidelines/Button labels', 'ButtonLabels'],
  [iconographyContent, 'Guidelines/Iconography', 'Iconography'],
  [layoutContent, 'Guidelines/Layout and density', 'LayoutAndDensity'],
  [spacingContent, 'Guidelines/Spacing', 'Spacing'],
  [densityAccentContent, 'Guidelines/Density and accents', 'DensityAndAccents'],
  [denseContent, 'Guidelines/Dense tables', 'DenseTables'],
  // The accessibility page kept its pre-#429 explicit id, so it is written out
  // rather than derived from the title.
  [floorContent, 'Guidelines/Accessibility minimums', 'AccessibilityFloor', 'guidelines-the-accessibility-floor'],
  [paginationContent, 'Guidelines/Pagination', 'Pagination'],
  [statContent, 'Guidelines/Stat bands', 'StatBands'],
  [drawerContent, 'Guidelines/Drawers', 'Drawers'],
  [fileDropContent, 'Guidelines/File drop', 'FileDrop'],
  [motionContent, 'Guidelines/Motion', 'Motion'],
  [paletteContent, 'Guidelines/The command palette', 'CommandPalette'],
  [hoverContent, 'Guidelines/Hover readouts', 'HoverReadouts'],
  [backContent, 'Guidelines/Going back', 'GoingBack'],
  [accountContent, 'Guidelines/Account and settings', 'AccountAndSettings'],
];

// Storybook's two-step id rule, reproduced rather than imported so the page
// bundles no Storybook internals; react/src/guidelines.test.tsx holds the two in step.
const sanitize = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const words = (key) => (String(key).match(/[A-Z]+(?![a-z])|[A-Z]?[a-z]+|\d+/g) || []).join('-');
export const storyId = ({ title, name, id }) =>
  `${sanitize(id ?? title)}--${sanitize(words(name))}`;

// `./` resolves against /iframe.html, so this is the manager URL in dev and in
// a static build alike. Whoever renders it needs target="_top".
export const storyHref = (entry) => `./?path=/story/${storyId(entry)}`;

export const PAGES = ENTRIES.map(([content, title, name, id]) => ({
  title: content.TITLE,
  blurb: content.BLURB,
  id: storyId({ title, name, id }),
  href: storyHref({ title, name, id }),
  rules: content.RULES,
  gaps: content.RULES.filter((r) => r.unmet),
}));

const overview = await loadGuideline('overview.md', new URL('../../guidelines/overview.md', import.meta.url));
export const INTRO = overview.blurb;
export const TITLE = overview.title;
export const LINKS = PAGES.map(({ title, href }) => ({ title, href }));
