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
// Measure behavior instead of matching the source text.
import { button, checkbox } from '../../src/components/index.js';

// ---- the three numbers -----------------------------------------------------

/** WCAG 2.5.8, AA. Not ours to choose; ours to hold and to measure against. */
export const TARGET_MIN = 24;

/**
 * The pointer target a phone deserves, below the phone step. Not 2.5.8's bar —
 * that is TARGET_MIN above and the kit holds it everywhere. 44 is 2.5.5 (AAA),
 * and the same number the iOS and Android guidelines land on.
 *
 * Settled in #488, where the choice was not the number but how to reach it:
 * growing every small control on a phone, or putting the extra size OUTSIDE the
 * drawn shape where nobody sees it. The second, with the clearance rule beside
 * it, because a layer that reaches 44 regardless of the gap takes the tap next
 * to it — measured, on a menu whose `Duplicate` row handed its bottom 3px to
 * `Revoke`.
 */
export const TAP_MIN = 44;

/** WCAG 1.4.11 contrast minimum for the solid focus band. */
export const RING_MIN = 3;

/**
 * SETTLED IN #220, because no standard settles it — 1.4.3 exempts a disabled
 * control outright. 3:1 is the bar WCAG already uses twice for "make it out, do
 * not read it comfortably", and a disabled label has to stay identifiable as the
 * word it is or a reader cannot tell which control is unavailable.
 *
 * It is 3 and not 4.5 because contrast is not the axis the state travels on: the
 * kit's disabled primary button measures 6.24:1 in dark and 6.11:1 in light,
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
// #448 gave the card back its white and lifted light's pair to 5.17, so this is the
// bar that decision set rather than what the kit measures today — a floor a theme
// clears by 0.28 is still the floor, and lowering it later is a decision too.
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

/**
 * Kit controls the phone floor does not reach, each with the reason and the
 * measurement. Not an excuse list: stories/tap-zone.test.js refuses an entry
 * naming a selector the kit's own stylesheets do not declare, an entry that is
 * also a carrier in src/styles/tap-zone.css, and an entry whose family has
 * since started reaching the floor. A fix retires its own entry.
 */
export const TAP_EXEMPT = [
  {
    selector: '.ui-dropdown__item',
    why: 'A menu\u2019s rows share an edge, so there is no space outside a row to put a '
      + 'layer in. Measured at 390: a 44px layer moved the boundary rather than widening '
      + 'the target \u2014 the first rows lost a sliver and the last one took the whole '
      + 'gain, and the bottom of `Duplicate` started running `Revoke`. Reaching 44 here '
      + 'costs row height or row spacing, both of which a reader sees.',
  },
  {
    selector: '.ui-cmdk__item',
    why: 'The palette\u2019s result list is the same contiguous stack as a menu, for the '
      + 'same reason: a row\u2019s neighbour starts where it ends.',
  },
  {
    selector: '.ui-app__rail .ui-nav__item',
    why: 'A sidebar\u2019s rows touch. The rail already holds its own rows to 44px high '
      + 'below the phone step, which is the visible answer this family takes instead.',
  },
  {
    selector: '.ui-filter-bar__remove',
    why: 'The filter row around it opens at this width, but inside a chip there is nothing '
      + 'to open: the value trigger and the remove mark share an edge by design, and parting '
      + 'them would draw two controls where the reader sees one. The mark keeps the 24px '
      + 'target the chip gives it, which clears 2.5.8.',
  },
  {
    selector: '.ui-toast',
    why: 'A toast clips to its own rounded corners so the timer bar can run along the bottom '
      + 'edge, and both its controls sit against that clip \u2014 the close mark in the corner, '
      + 'the action at the end of the row. Measured: each zone is laid out at 44 and the toast '
      + 'trims it to the padding box. Opening the padding would grow the surface rather than the '
      + 'space between two controls, and bought four marks for 8px on every toast. The row\u2019s '
      + 'gap opens; the box does not.',
  },
  {
    selector: '.ui-select',
    why: 'A `select` generates no pseudo-element in any browser the kit targets, with or '
      + 'without `appearance: none`, so it cannot carry a layer at all. It measures 42px '
      + 'tall \u2014 two short \u2014 and is reached by its own height or not at all. The '
      + 'same is true of `input` and `textarea`; both already draw taller than the floor.',
  },
  {
    selector: '.ui-table__act',
    why: 'A dense table\u2019s rows touch top to bottom, so a row action can open ACROSS at '
      + 'this width \u2014 which is what the cell does \u2014 and cannot open down. Its zone '
      + 'takes the row\u2019s own padding either side and stops there rather than reaching '
      + 'into the row above.',
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

    /* The phone floor's two pairs. The layer src/styles/tap-zone.css declares is
       live only below the phone step and only to a coarse pointer, so on this
       page there is nothing to reveal the way .gl-target reveals the checkbox's.
       These cells redraw it at reading width instead, with the SAME expression
       the sheet writes — stories/tap-zone.test.js reads both and fails if the
       two drift — and a dashed edge so the invisible thing can be seen. */
    /* The cells carry their own values rather than reading the sheet's: this
       page is a picture of the rule, and a picture that changed shape when
       the sheet was not loaded would be measuring the sheet instead of
       showing it. The numbers are the sheet's own and the gate compares the
       expression below against it. */
    .gl-tap { display: flex; align-items: center; --tap-min: 44px; --tap-clear-x: 20px; --tap-clear-y: 20px; }
    .gl-tap .ui-btn { position: relative; }
    .gl-tap .ui-btn::after {
      content: ""; position: absolute; left: 50%; top: 50%;
      transform: translate(-50%, -50%);
      width: min(max(100%, var(--tap-min)), calc(100% + var(--tap-clear-x)));
      height: min(max(100%, var(--tap-min)), calc(100% + var(--tap-clear-y)));
      outline: 1.5px dashed var(--accent);
      /* A drawing of the layer, not a layer: this page is read at reading width
         with a mouse, where the real one is not live, and a hit area here would
         be the one place in the kit that breaks the rule it illustrates. */
      pointer-events: none;
    }
    /* Do: the row is open to --tap-gap, which is the gap the kit's own rows
       take at the phone step, and both zones stop at its midpoint. */
    .gl-tap--room { gap: var(--tap-clear-x); }
    /* The Don't for the layer rule: the answer #488 turned down. Same button,
       drawn at the floor instead of reaching it — inert ink, because a real
       control this size would be the page breaking its own rule, and the point
       is the box, not the press. The pink edge is where the row grows to. */
    .gl-tap__fat { display: inline-flex; align-items: center; justify-content: center;
      height: 44px; padding: 0 17px; border-radius: var(--radius-sm);
      border: 1px solid var(--control-edge); background: var(--surface);
      color: var(--text); font-family: var(--font-sans); font-size: var(--text-sm);
      font-weight: var(--weight-medium); outline: 1.5px dashed var(--pink); }

    /* The Don't for the spacing rule: the same two marks left at the desktop
       --space-2 with the zone sized to the floor regardless. The edges cross,
       and the mark written later takes the overlap. */
    .gl-tap--tight { gap: var(--space-2); --tap-clear-x: 44px; --tap-clear-y: 44px; }
    .gl-tap--tight .gl-tap__ink { position: relative; width: 24px; height: 24px;
      border: 1px solid var(--control-edge); border-radius: var(--radius-sm);
      background: var(--surface); }
    .gl-tap--tight .gl-tap__ink::after {
      content: ""; position: absolute; left: 50%; top: 50%;
      width: 44px; height: 44px; transform: translate(-50%, -50%);
      outline: 1.5px dashed var(--pink); pointer-events: none;
    }
  </style>`;

const row = (...html) => `<div class="gl-stage gl-stage--row gl-target">${html.join('')}</div>`;

export const targetDo = () => row(
  checkbox({ label: 'Revoke on expiry', checked: true }),
  button({ label: 'Revoke', variant: 'secondary', size: 'sm' }),
);
export const targetDont = () => row(
  `<span class="gl-target__ink" aria-hidden="true"></span>`,
);

const tapRow = (mod, ...html) =>
  `<div class="gl-stage gl-stage--row gl-tap gl-tap--${mod}">${html.join('')}</div>`;

const mark = (label, icon) => button({ label, icon, iconOnly: true, variant: 'ghost', size: 'xs' });

export const tapZoneDo = () => tapRow(
  'room',
  button({ label: 'Approve', variant: 'primary', size: 'sm' }),
  button({ label: 'Hold', variant: 'secondary', size: 'sm' }),
);
export const tapZoneDont = () => tapRow(
  'room',
  '<span class="gl-tap__fat" aria-hidden="true">Approve</span>',
  '<span class="gl-tap__fat" aria-hidden="true">Hold</span>',
);

export const tapSpacingDo = () => tapRow('room', mark('Copy', 'copy'), mark('More actions', 'moreHorizontal'));
export const tapSpacingDont = () => tapRow(
  'tight',
  '<span class="gl-tap__ink" aria-hidden="true"></span>',
  '<span class="gl-tap__ink" aria-hidden="true"></span>',
);

export const RULES = withSpecimens(content.rules, [
{ id: 'target-size', doHtml: targetDo, dontHtml: targetDont },
{ id: 'tap-zone', doHtml: tapZoneDo, dontHtml: tapZoneDont },
{ id: 'tap-spacing', doHtml: tapSpacingDo, dontHtml: tapSpacingDont },
{ id: 'ring-contrast' },
{ id: 'disabled-legibility' },
{ id: 'touch-field-size' },
{ id: 'body-contrast' },
{ id: 'status-label' },
{ id: 'measurable-pair' },
{ id: 'keyboard-first' },
]);
