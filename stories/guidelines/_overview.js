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
// `group` and `summary` are the index's own: a guideline page carries no
// introduction, so its one line lives here and nowhere else.
const ENTRIES = [
  [pageContent, 'Guidelines/The page', 'ThePage', 'Pages', 'The shell, the headings and the main action'],
  [kindContent, 'Guidelines/Dashboards and reports', 'DashboardsAndReports', 'Pages', 'What a dashboard shows and a report adds'],
  [destructiveContent, 'Guidelines/Destructive actions', 'DestructiveActions', 'Controls and states', 'Quiet controls, confirmation and undo'],
  [colourContent, 'Guidelines/Colour and theming', 'ColourAndTheming', 'Look and access', 'Tokens, accents and checks in both themes'],
  [stateContent, 'Guidelines/The full state set', 'StateSet', 'Controls and states', 'Focus, busy, error and loading states'],
  [emptyContent, 'Guidelines/Empty states', 'EmptyStates', 'Controls and states', 'What to show when there is no content'],
  [componentContent, 'Guidelines/Component choice', 'ComponentChoice', 'Controls and states', 'Which control, dialog or notice fits the job'],
  [microcopyContent, 'Guidelines/Microcopy and tone', 'Microcopy', 'Words', 'Names for controls and their current state'],
  [textContent, 'Guidelines/Text length', 'TextLength', 'Words', 'How long labels, captions and callouts can be'],
  [labelsContent, 'Guidelines/Labels and titles', 'LabelsAndTitles', 'Words', 'Ink, case and rank for labels and titles'],
  [buttonLabelsContent, 'Guidelines/Button labels', 'ButtonLabels', 'Words', 'Words, glyphs and wordless buttons'],
  [iconographyContent, 'Guidelines/Iconography', 'Iconography', 'Look and access', 'Glyphs, icon-only controls and status strokes'],
  [layoutContent, 'Guidelines/Layout and density', 'LayoutAndDensity', 'Pages', 'Page width, breakpoints and the spacing scale'],
  [spacingContent, 'Guidelines/Spacing', 'Spacing', 'Pages', 'Two gaps, titles and the text edge'],
  [densityAccentContent, 'Guidelines/Density and accents', 'DensityAndAccents', 'Data', 'Narrow stat bands and what an accent is for'],
  [denseContent, 'Guidelines/Dense tables', 'DenseTables', 'Data', 'Surface, alignment, units and scrolling'],
  // The accessibility page kept its pre-#429 explicit id, so it is written out
  // rather than derived from the title.
  [floorContent, 'Guidelines/Accessibility minimums', 'AccessibilityFloor', 'Look and access', 'Target size, contrast, focus and the keyboard', 'guidelines-the-accessibility-floor'],
  [paginationContent, 'Guidelines/Pagination', 'Pagination', 'Data', 'Counts, page steps and page sizes'],
  [statContent, 'Guidelines/Stat bands', 'StatBands', 'Data', 'Key figures, their colour and their basis'],
  [drawerContent, 'Guidelines/Drawers', 'Drawers', 'Panels', 'When one record opens in a drawer'],
  [fileDropContent, 'Guidelines/File drop', 'FileDrop', 'Panels', 'The upload row, its states and its errors'],
  [motionContent, 'Guidelines/Motion', 'Motion', 'Look and access', 'Timing, easing and reduced motion'],
  [paletteContent, 'Guidelines/The command palette', 'CommandPalette', 'Panels', 'What the palette holds, ranks and answers'],
  [hoverContent, 'Guidelines/Hover readouts', 'HoverReadouts', 'Data', 'Values beside chart marks, by pointer or touch'],
  [backContent, 'Guidelines/Going back', 'GoingBack', 'Pages', 'When to show a back link and where it goes'],
  [accountContent, 'Guidelines/Account and settings', 'AccountAndSettings', 'Panels', 'The account window and the account menu'],
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

export const PAGES = ENTRIES.map(([content, title, name, group, summary, id]) => ({
  title: content.TITLE,
  group,
  summary,
  id: storyId({ title, name, id }),
  href: storyHref({ title, name, id }),
  rules: content.RULES,
  gaps: content.RULES.filter((r) => r.unmet),
}));

const overview = await loadGuideline('overview.md', new URL('../../guidelines/overview.md', import.meta.url));
export const TITLE = overview.title;
export const LINKS = PAGES.map(({ title, href, group, summary }) => ({ title, href, group, summary }));
// The index's cards, in reading order: the page first, then what sits on it.
export const GROUPS = ['Pages', 'Data', 'Words', 'Look and access', 'Controls and states', 'Panels'];
