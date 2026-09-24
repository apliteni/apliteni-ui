import { loadGuideline, withSpecimens, withNamedFiles } from './_markdown.js';
const content = await loadGuideline('accessibility-floor.md', new URL('../../guidelines/accessibility-floor.md', import.meta.url));
export const TITLE = content.title;
export const BLURB = content.blurb;
// The shape of a rule and the gates that walk this page: docs/guidelines.md
//
// Three of the numbers on this page did not exist anywhere in this tree before
// #201, and each is pinned by a measurement in
// stories/guidelines/accessibility-floor.test.js rather than by this comment
// (the measured-pin rule). Two of the three are settled by a standard. The third
// is settled by this repo, in #220, because no standard settles it. The fourth,
// added in #294, is a browser's behaviour rather than a standard, and it is
// pinned next door in stories/field-zoom.test.js, where the fields are.
//
// why: CONTRIBUTING.md#a-number-a-comment-argues-for-is-pinned-by-a-measured-test
import { button, checkbox } from '../../src/components/index.js';

// ---- the three numbers -----------------------------------------------------

/** WCAG 2.5.8, AA. Not ours to choose; ours to hold and to measure against. */
export const TARGET_MIN = 24;

/** WCAG 1.4.11 contrast minimum for the solid focus band. */
export const RING_MIN = 3;

/**
 * SETTLED IN #220, because no standard settles it — 1.4.3 exempts a disabled
 * control outright. 3:1 is the bar WCAG already uses twice for "make it out, do
 * not read it comfortably", and a disabled label has to stay identifiable as the
 * word it is or a reader cannot tell which control is unavailable.
 *
 * It is 3 and not 4.5 because contrast is not the axis the state travels on: the
 * kit's disabled primary button measures 6.91:1 in dark and 4.89:1 in light,
 * against 5.70:1 and 7.34:1 enabled — more contrast than the enabled button in
 * one theme and less in the other, and nobody would mistake the two either way
 * in either theme. The paint carries the state, this
 * number carries legibility only, and what stops the floor being cleared by
 * making a disabled control look enabled is the second half of the rule below.
 */
export const DISABLED_MIN = 3;

/**
 * The size a field's text has to reach before iOS Safari stops zooming the page
 * into it on focus. Not a standard either — it is a behaviour of one browser,
 * observed and long documented — and it is on this page because the alternative
 * fix is to take pinch-zoom away from the reader, which is 1.4.4's business.
 * Settled in #294; #291 had answered it for one field.
 */
export const FIELD_MIN = 16;

// Ratchets, not bars. Each is the worst the kit measures, so a token that makes
// one of them worse is a decision somebody writes, not a drift nobody notices.
// Same device as the GLYPH_FLOOR ratchet in stories/signal-contrast.test.js.
//
// RING_FLOOR sits ABOVE its bar, which is the point: #218 made --ring opaque
// and the worst cell now measures 4.22, so the ratchet is the warning that
// fires while the ring is still legal rather than once it is not. It was 1.5
// while the ring failed everywhere and a ledger held the gate open.
export const RING_FLOOR = 4.22;
// DISABLED_FLOOR sits well above its bar for the same reason RING_FLOOR does.
// It was 1.48 while a ledger held the gate open — #220 took the opacity out of
// every disabled rule that has a label under it and gave the state a paint of
// its own, and the whole kit collapsed into a band 5.56–6.11 wide. That band is
// narrow because a dedicated ink and surface composite predictably: the ink is
// read on the surface beside it, and neither is dragged toward the ground.
// It moved DOWN at #295, which is a decision written rather than a number edited:
// the band was a property of a white light app, and the light page came off white.
// why: docs/specification.md#elevation
export const DISABLED_FLOOR = 4.89;

/**
 * Controls under 24px that the gate lets through, each with the reason.
 *
 * An entry is not an excuse. #219 emptied this list of the three kit controls
 * that were on it, and what is left is not kit code. The gate refuses an entry
 * that names a control no story renders, or one that has since grown past the
 * floor — a fix retires its own entry, and the page's gap badge is derived from
 * whether any entry here still carries an issue.
 */
export const TARGET_EXEMPT = [
  {
    control: 'a.brand',
    why: 'Not a kit control. It is the demo topbar a story builds for itself in '
      + 'stories/apps/AccountPreset.stories.js, styled by that story’s own <style> block. '
      + 'Measured at 21.06px and reported rather than hidden, because a walk that skipped '
      + 'story chrome would also skip a component that had not been moved into src yet.',
  },
];

// ---- what the kit aims at above the floor ----------------------------------

/**
 * stories/contrast.test.js says the AA floor is a floor and not a verdict.
 * These are the four things the kit aims at above it, each stated so it can be
 * applied to a component nobody has written yet.
 */
export const AIMS = content.sections[0].entries.map(e => ({ aim: e.title, apply: e.Apply }));

// ---- what the gates already admit ------------------------------------------

/**
 * The gates, and the blind spot each one states about itself.
 *
 * This list is DECLARED here and held in step by the gate: accessibility-floor
 * .test.js discovers every test file that touches accessibility and fails when
 * one of them is not named below. Same contract as overview.test.js against
 * ENTRIES — a new gate fails the build until this page knows about it. What it
 * cannot check is whether the prose below still matches the gate's own header
 * after somebody edits one. That is the seam, and it is stated rather than
 * papered over: a gate cannot go missing here, but it can go stale.
 */
const gateFiles = {
  "Ring surfaces": "stories/ring-surfaces.test.js",
  "React: BackLink": "react/src/BackLink.test.tsx",
  "React: Dropdown": "react/src/Dropdown.test.tsx",
  "React: Pagination": "react/src/Pagination.test.tsx",
  "Palette keyboard": "stories/palette-keyboard.test.js",
  "Command palette": "stories/guidelines/command-palette.test.js",
  "The page": "stories/guidelines/the-page.test.js",
  "Contrast": "stories/contrast.test.js",
  "A11y": "stories/a11y.test.js",
  "Keyboard": "stories/keyboard.test.js",
  "Drawer focus": "stories/drawer-focus.test.js",
  "Accent contrast": "stories/accent-contrast.test.js",
  "Elevation": "stories/elevation.test.js",
  "Signal contrast": "stories/signal-contrast.test.js",
  "Stat basis": "stories/stat-basis.test.js",
  "Glyph stroke": "stories/glyph-stroke.test.js",
  "Accessibility floor": "stories/guidelines/accessibility-floor.test.js",
  "Confirm keyboard": "stories/confirm-keyboard.test.js",
  "Overlay stack": "stories/overlay-stack.test.js",
  "Overlay css": "stories/overlay-css.test.js",
  "Dropdown field ground": "stories/dropdown-field-ground.test.js",
  "Dropdown foot role": "stories/dropdown-foot-role.test.js",
  "Field zoom": "stories/field-zoom.test.js",
  "Reduced motion": "stories/reduced-motion.test.js",
  "Motion coverage": "stories/motion-coverage.test.js",
  "Tooltip specimens": "stories/tooltip-specimens.test.js",
  "Nav cascade": "stories/nav-cascade.test.js",
  "Button chrome": "stories/button-chrome.test.js",
  "Shell": "stories/apps/shell.test.js",
  "Shell states": "stories/apps/shell-states.test.js",
  "Shell rail": "stories/apps/shell-rail.test.js",
  "Danger colour": "stories/danger-colour.test.js",
  "Accent swatch": "stories/accent-swatch.test.js",
  "Accent without theme": "stories/accent-without-theme.test.js",
  "Iconography": "stories/guidelines/iconography.test.js",
  "React: DataTable": "react/src/DataTable.test.tsx",
  "React: CommandPalette": "react/src/CommandPalette.test.tsx",
  "React: Modal": "react/src/Modal.test.tsx",
  "React: Drawer": "react/src/Drawer.test.tsx",
  "React: A11y": "react/src/a11y.test.tsx",
  "React: Field zoom": "react/src/field-zoom.test.tsx",
  "React: Contrast": "react/src/contrast.test.tsx"
};
export const GATES = withNamedFiles(content.sections[1].entries, gateFiles)
  .map(e => ({ file: e.file, name: e.title, does: e.Checks, blind: e.Limit }));
export const SECTIONS = content.sections;

/** Gaps with nothing measuring them at all. Named so they do not look covered. */
export const UNGATED = content.sections[2].entries.map(e => ({ what: e.title, note: e.Note }));

// ---- the rules -------------------------------------------------------------

export const SPEC_CSS = `
  <style>
    .gl-stage--row { display: flex; align-items: center; gap: var(--space-3); flex-wrap: wrap; }

    /* The Do cell renders the real checkbox and REVEALS its target: the dashed
       square is the ::before src/styles/input.css declares, not a drawing of
       one, so an overlay that changed size would change this picture. */
    .gl-target .ui-check input::before { outline: 1.5px dashed var(--accent); }

    /* The Don't cell cannot be a live control. Every story in the tree is walked
       by the target gate next door, so a real 19px control here would fail the
       kit's own floor — the picture of the failure has to be inert. This is the
       checkbox's own paint at the size its target used to stop at, with the
       dashed line on the same square as the solid one, which IS the mistake. */
    .gl-target__ink { width: 19px; height: 19px;
      border: 1.5px solid var(--border-strong); border-radius: var(--radius-xs);
      background: var(--surface-2); outline: 1.5px dashed var(--pink); }
  </style>`;

const row = (...html) => `<div class="gl-stage gl-stage--row gl-target">${html.join('')}</div>`;

export const targetDo = () => row(
  checkbox({ label: 'Revoke on expiry', checked: true }),
  button({ label: 'Revoke', variant: 'secondary', size: 'sm' }),
);
export const targetDont = () => row(
  `<span class="gl-target__ink" aria-hidden="true"></span>`,
);

export const RULES = withSpecimens(content.rules, [
{ id: 'target-size', doHtml: targetDo, dontHtml: targetDont, kit: [
      { ref: 'src/styles/button.css:78', pattern: '.ui-btn--sm' },
      { ref: 'src/styles/input.css:134', pattern: '.ui-check input::before' },
    ] },
{ id: 'ring-contrast', kit: [{ ref: 'src/styles/base.css:146', pattern: 'box-shadow: var(--ring);' }] },
{ id: 'disabled-legibility', kit: [
      { ref: 'src/styles/button.css:95', pattern: '.ui-btn[aria-disabled="true"]' },
      { ref: 'src/tokens/tokens.css:165', pattern: '--disabled-ink: var(--muted);' },
    ] },
{ id: 'touch-field-size', kit: [
      { ref: 'src/styles/field-zoom.css:19', pattern: 'font-size: 16px !important;' },
      { ref: 'react/src/index.ts:9', pattern: "import '../../src/styles/field-zoom.css';" },
    ] },
{ id: 'floor-not-verdict', kit: [{ ref: 'stories/contrast.test.js:289', pattern: 'the AA floor is a floor, not a verdict.' }] },
{ id: 'name-the-gap', kit: [{ ref: 'stories/contrast.test.js:233', pattern: 'What the walk never puts in front of the resolver, so the gate cannot see it' }] }
]);
