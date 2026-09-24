import { loadGuideline, withSpecimens } from './_markdown.js';
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
{ id: 'target-size', doHtml: targetDo, dontHtml: targetDont },
{ id: 'ring-contrast' },
{ id: 'disabled-legibility' },
{ id: 'touch-field-size' },
{ id: 'body-contrast' },
{ id: 'status-label' },
{ id: 'measurable-pair' },
{ id: 'keyboard-first' },
]);
