// The shape of a rule and the gates that walk this page: docs/guidelines.md
//
// Three of the numbers on this page did not exist anywhere in this tree before
// #201, and each is pinned by a measurement in
// stories/guidelines/accessibility-floor.test.js rather than by this comment
// (the measured-pin rule). Two of the three are settled by a standard. The third
// is settled by this repo, in #220, because no standard settles it.
//
// why: CONTRIBUTING.md#a-number-a-comment-argues-for-is-pinned-by-a-measured-test
import { button, checkbox } from '../../src/components/index.js';

export const TITLE = 'The accessibility floor';

export const BLURB = 'The three numbers under every control, what the kit aims at above them, '
  + 'and what its gates admit they cannot see.';

// ---- the three numbers -----------------------------------------------------

/** WCAG 2.5.8, AA. Not ours to choose; ours to hold and to measure against. */
export const TARGET_MIN = 24;

/** WCAG 1.4.11 for a focus indicator, and the stroke-width rule says a 3px band earns it. */
export const RING_MIN = 3;

/**
 * SETTLED IN #220, because no standard settles it — 1.4.3 exempts a disabled
 * control outright. 3:1 is the bar WCAG already uses twice for "make it out, do
 * not read it comfortably", and a disabled label has to stay identifiable as the
 * word it is or a reader cannot tell which control is unavailable.
 *
 * It is 3 and not 4.5 because contrast is not the axis the state travels on: the
 * kit's disabled primary button measures 5.56:1 against 5.70:1 enabled, a factor
 * of 1.03, and nobody would mistake the two. The paint carries the state, this
 * number carries legibility only, and what stops the floor being cleared by
 * making a disabled control look enabled is the second half of the rule below.
 */
export const DISABLED_MIN = 3;

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
export const DISABLED_FLOOR = 5.56;

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
export const AIMS = [
  {
    aim: 'Body text lands near 7:1, not near 4.5:1.',
    apply: 'AA is 4.5:1 and the kit’s ordinary --text on --bg is well past it in both themes. '
      + 'A new component that lands at 4.6 is passing and is still the worst text in the kit. '
      + 'Take --text or --dim; reach for --muted only for something a reader may skip.',
  },
  {
    aim: 'A status is carried by a mark and a word, never by a hue alone.',
    apply: 'Five statuses, and two of them are red and green. Every signal component in the '
      + 'kit pairs its colour with a glyph and a label, and the stroke-width rule gives the glyph a width '
      + 'wide enough to be a graphic rather than a smudge.',
  },
  {
    aim: 'A pair the gate can measure beats a pair it cannot.',
    apply: 'A gradient, a filter or a translucent layer over text is unjudgeable in the walk '
      + 'and stays unjudgeable forever. An opaque ground is a pair somebody can check.',
  },
  {
    aim: 'A control is operable before it is pretty.',
    apply: 'Keys first, then the pointer, then the paint. A component whose keyboard story '
      + 'was written last is a component whose keyboard story is a guess.',
  },
];

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
export const GATES = [
  {
    file: 'stories/contrast.test.js',
    does: 'Measures every text-owning element in every story, both themes, against the '
      + 'background composited above it.',
    blind: [
      'Anything layout decides — a toast over the page, a dropdown over a card, the drawer '
        + 'over its scrim. DOM ancestry stands in for visual stacking and is wrong wherever '
        + 'the two differ. The gate calls this its largest gap and only a browser closes it '
        + '(#131).',
      'A paint layer the walk cannot see: a ::before backdrop, a sibling glow. Nine pairs per '
        + 'backdrop come back judged — against the wrong ground.',
      'Gradients and images an element owns or inherits. Reported unjudgeable, not passed.',
      'filter. .ui-btn--primary:hover brightens, and the pre-filter colour is what is read.',
      'Inactive components and everything inside them, which is the hole this page’s third '
        + 'number fills.',
      'Non-text contrast — borders, focus rings, icon strokes — which needs geometry.',
      'More than one accent, and any state past hover / focus-visible / focus / active.',
    ],
  },
  {
    file: 'stories/a11y.test.js',
    does: 'Runs axe over every story in both themes, WCAG 2.0/2.1 A + AA, and asserts the '
      + 'number of checks equals stories x themes so nothing drops out quietly.',
    blind: [
      'Accents. Two themes at the default accent only — an accent repaints tokens and the '
        + 'matrix costs runtime.',
      'color-contrast, deliberately: axe cannot resolve var() in a headless DOM, so it would '
        + 'read the kit’s tokens as no colour at all.',
      'Anything static markup cannot show. Axe passed a tablist that controlled nothing.',
    ],
  },
  {
    file: 'stories/keyboard.test.js',
    does: 'Presses real keys and asserts what moved — the half axe cannot see. Wires markup '
      + 'with the kit’s own wireTopbar / initTabs, sends KeyboardEvents, checks activeElement.',
    blind: [
      'Every component it does not reach. Coverage stops at the topbar and the tabs.',
    ],
  },
  {
    file: 'stories/drawer-focus.test.js',
    does: 'Asserts the drawer asks focus to move into its panel on open.',
    blind: [
      'Whether the focus actually lands. JSDOM has no CSS and no transitions, and the bug this '
        + 'gate was written for was a transitioned visibility making focus() a no-op in Chrome. '
        + 'It can only prove the aim.',
    ],
  },
  {
    file: 'stories/accent-contrast.test.js',
    does: 'A token contract across all eight theme x accent cells — renders nothing, costs '
      + 'milliseconds, and so sees pairs no story happens to render.',
    blind: ['Anything a component composes that the tokens do not state on their own.'],
  },
  {
    file: 'stories/signal-contrast.test.js',
    does: 'Reads declarations out of the source and holds twenty status-glyph pairs to the bar '
      + 'the stroke-width rule sets by stroke width.',
    blind: ['Colour for every glyph that carries no status — width is held next door, ratio is not.'],
  },
  {
    file: 'stories/glyph-stroke.test.js',
    does: 'Renders every story and measures the width each stroked glyph actually paints at, '
      + 'inheritance and the icons.js default resolved, against the stroke-width rule’s 1.5 CSS px line.',
    blind: [
      'Colour. It measures width and nothing else — which bar a glyph then takes is the stroke-width rule’s.',
      'Anything no story renders, which is why it also refuses a sizing rule with no specimen.',
      'State: the corpus is what a story renders at rest, so a stroke stated in :hover is unseen.',
    ],
  },
  {
    file: 'stories/guidelines/accessibility-floor.test.js',
    does: 'Pins the three numbers on this page: target size against every control the stories '
      + 'render — the box it draws UNION the pseudo-elements it generates, which is what a '
      + 'pointer can land on — the ring against every ground it lands on, and the composite a '
      + 'disabled control leaves on the page, measured twice: as the story renders it, and again '
      + 'with the disabled attribute taken off, so the state has to change the pair.',
    blind: [
      'A disabled input’s VALUE. The walk measures text nodes, and an input holds its value in a '
        + 'property — so .ui-input:disabled is discovered, is repainted, and contributes no pair. '
        + 'The tokens it takes are measured on every other control that takes them.',
      'Width, for anything a line of text sizes — reported unmeasurable rather than passed. An '
        + 'overlay can only widen a width already known, never supply one.',
      '2.5.8’s spacing exception, which is a layout question end to end.',
      'Where an overlay sits. Its size is read, its offset is not, so one pushed clear of its '
        + 'control would still count and one overhanging a neighbour would not be reported.',
      'Clipping. An overflow: hidden ancestor can cut an overlay down and no boxes are '
        + 'composited here — .ui-toast clips, and its close was checked by hand.',
      'The ring’s inner edge. Only the ground outside is measured.',
    ],
  },
  {
    file: 'stories/confirm-keyboard.test.js',
    does: 'The same key-pressing method as keyboard.test.js, aimed at confirm(): focus arrives '
      + 'in the question, Escape answers it, and Tab does not walk out.',
    blind: ['Everything a browser does that JSDOM does not — a transition, a paint, a scroll.'],
  },
  {
    file: 'stories/overlay-stack.test.js',
    does: 'What the page is like with two overlays open at once — who owns Escape, what is '
      + 'inert now, where Tab goes, what is left behind when one closes out of order.',
    blind: ['Focus that is asked for and does not land. Same JSDOM limit as the drawer gate.'],
  },
  {
    file: 'stories/overlay-css.test.js',
    does: 'Reads both overlay stylesheets as text and asks the same questions of each, because '
      + 'the rules that broke were ones JSDOM cannot run — a transitioned visibility.',
    blind: ['Whether the rule reaches the element. It reads declarations, not the cascade.'],
  },
  {
    file: 'stories/nav-cascade.test.js',
    does: 'Holds three repaired rail declarations to the element they were written for — every '
      + 'one of them was present in the stylesheet and dead, including a cancelled focus ring.',
    blind: ['JSDOM ranks author rules faithfully and does not rank by origin; the UA boundary '
      + 'is a known exception \u2014 see '
      + 'CONTRIBUTING.md#the-cascade-jsdom-ranks-and-the-one-boundary-it-does-not.'],
  },
  {
    file: 'stories/apps/shell.test.js',
    does: 'The shell\u2019s composition: one <main>, a named navigation landmark, a rail item that '
      + 'stays named at every width, and the crumb trail the caller owns.',
    blind: ['What the markup looks like once it meets the stylesheet — shell-states.test.js has that.'],
  },
  {
    file: 'stories/apps/shell-states.test.js',
    does: 'The shell resolved through the real cascade at every width, theme and accent, so '
      + 'nothing it draws goes missing at one of them.',
    blind: ['Layout, again. Width is a class here, not a viewport.'],
  },
  {
    file: 'stories/danger-colour.test.js',
    does: 'A destructive control is never the accent, and is quiet until pointed at — so '
      + '\u201cdelete\u201d never lights up in the colour the kit uses for go.',
    blind: ['Whether the hover colour clears AA where it lands; that is the contrast gate.'],
  },
  {
    file: 'stories/accent-swatch.test.js',
    does: 'The accent picker\u2019s swatch is made of the tokens that accent selects, in all three '
      + 'copies of the picker \u2014 a stale swatch is the picker lying about what it offers.',
    blind: ['Whether the accent it promises is legible once selected; accent-contrast has that.'],
  },
  {
    file: 'stories/guidelines/iconography.test.js',
    does: 'A control goes wordless only for an action on the closed list \u2014 the question a '
      + 'perfect aria-label cannot answer.',
    blind: ['Whether the glyph is legible at its size. The stroke-width rule governs that, for two families.'],
  },
  {
    file: 'react/src/Modal.test.tsx',
    does: 'The React modal\u2019s focus and dismissal behaviour, mounted rather than serialised.',
    blind: ['The scrim\u2019s backdrop-filter, and anything else only a browser composites.'],
  },
  {
    file: 'react/src/a11y.test.tsx',
    does: 'The same axe contract for the React workspace, through vitest and Testing Library.',
    blind: ['The same two axe cannot do next door: contrast, and anything static markup hides.'],
  },
  {
    file: 'react/src/contrast.test.tsx',
    does: 'Mounts every React story in both themes against the kit’s sheet plus every CSS file '
      + 'under react/src, tokens substituted per theme.',
    blind: [
      'No state pass, and the vanilla gate’s whole list of blind spots applies here unchanged.',
    ],
  },
];

/** Gaps with nothing measuring them at all. Named so they do not look covered. */
export const UNGATED = [
  {
    what: 'Reduced motion',
    note: 'prefers-reduced-motion has no accessibility gate anywhere in the kit. Nothing '
      + 'asserts that an animation stops when a reader asks it to.',
  },
  {
    what: 'Keyboard, past the topbar and the tabs',
    note: 'The dropdown, the table, the segmented control, the feedback composer and the whole '
      + 'app-shell nav have no keyboard gate. They are untested, not covered.',
  },
  {
    what: 'Stacking',
    note: 'The largest single gap, stated by the contrast gate about itself. A real browser is '
      + 'the only thing that closes it (#131).',
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

export const RULES = [
  {
    id: 'target-size',
    imperative: `Give every pointer target at least ${TARGET_MIN}x${TARGET_MIN} CSS px.`,
    doCaption: '2.5.8 measures the TARGET, not the ink. The checkbox is drawn 19x19 and hit at '
      + '24x24 — the dashed square is a centred ::before, which a pointer landing on hits the '
      + 'input, and nothing about the box under it moved. Reach for an overlay where the drawn '
      + 'box IS the design, and grow the box where it is not: the sm button beside it needs '
      + 'neither at 26.5px high, and .ui-snippet__copy was 0.56px short, where a min-height '
      + 'nobody can see beat an overlay nobody can measure.',
    dontCaption: 'Target and ink the same 19x19 square — five px short on both axes. Three of the '
      + 'kit’s controls sat here until #219.',
    doHtml: targetDo,
    dontHtml: targetDont,
    except: 'WCAG 2.5.8 lets five cases through — spacing, an equivalent control elsewhere, a '
      + 'target inline in a sentence, a size the user agent decides, and a presentation that is '
      + 'essential. None of them covers a control that is simply small, and none of the three the '
      + 'kit shipped under the floor qualified for one. An overlay has its own boundary instead: '
      + 'it must not reach a neighbouring target. The close has 12px of flex gap to the toast’s '
      + 'action and 12px between stacked toasts against 2.5px of overhang; the checkbox has 11px '
      + 'to a label that toggles the same input. Neither is measured — that is layout, and the '
      + 'gate says so about itself.',
    kit: [
      { ref: 'src/styles/button.css:75', pattern: '.ui-btn--sm' },
      { ref: 'src/styles/input.css:118', pattern: '.ui-check input::before' },
    ],
  },
  {
    id: 'ring-contrast',
    imperative: `Hold a focus indicator to ${RING_MIN}:1 against the ground it lands on.`,
    why: 'WCAG 1.4.11, and the stroke-width rule’s rider does not let this one out: --ring is a 3px spread, '
      + 'twice the 1.5 CSS px under which a stroke stops being a graphic and takes the text bar '
      + 'instead. The ground is the outer neighbour, so it is the pair that decides. #218 made '
      + `the ring opaque and it clears the bar everywhere now — ${RING_FLOOR}:1 at worst, in `
      + 'dark Nebula. It was eight rgba() literals reaching 1.35:1 at worst, and every one of '
      + 'them missed. A translucent focus ring is a glow; the bar wants a graphic.',
    kit: [{ ref: 'src/styles/base.css:123', pattern: 'box-shadow: var(--ring);' }],
  },
  {
    id: 'disabled-legibility',
    imperative: `Paint a disabled control, never fade it: ${DISABLED_MIN}:1 for the label, and a `
      + 'pair it does not show when it is on.',
    why: 'No standard sets this — 1.4.3 exempts a disabled control outright, which is exactly why '
      + 'nothing checks it — so #220 settled it here. `opacity` is a group property: it takes the '
      + 'label and the box under it toward the ground TOGETHER, and what a reader is left with is '
      + 'wherever that composite lands. A disabled primary button landed at 1.48:1, white on a '
      + 'washed-out accent, and not one disabled control in the light theme reached 3:1. The '
      + '--disabled-ink / --disabled-surface / --disabled-border trio composites predictably '
      + 'instead: the ink is read on the surface beside it, both opaque. Every disabled label in '
      + `the kit now measures between ${DISABLED_FLOOR}:1 and 6.11:1.`,
    except: 'A disabled control also has to look weaker than an enabled one — and the measurement '
      + 'says that is not a contrast question. The disabled primary reads 5.56:1 and the enabled '
      + 'one reads 5.70:1; white on purple and grey on grey are the same ratio and nobody confuses '
      + 'them. Contrast carries legibility, the paint carries the state, and the second half of '
      + 'the imperative is what holds the state: the pair changes, and the accent goes. The one '
      + 'rule still fading with opacity is the switch track, which has no label inside it — its '
      + 'pair is 1.4.11’s, and no gate here measures it.',
    kit: [
      { ref: 'src/styles/button.css:91', pattern: '.ui-btn[aria-disabled="true"]' },
      { ref: 'src/tokens/tokens.css:149', pattern: '--disabled-ink' },
    ],
  },
  {
    id: 'floor-not-verdict',
    imperative: 'Read a green gate as a floor, never as a verdict.',
    why: 'Every number above is the least the kit accepts, not what it is trying to be. The '
      + 'four aims below the rules say what it reaches for, and a component that lands one '
      + 'thousandth over AA has passed the gate and is still the worst thing on the page.',
    kit: [{ ref: 'stories/contrast.test.js:292', pattern: 'the AA floor is a floor, not a verdict.' }],
  },
  {
    id: 'name-the-gap',
    imperative: 'Say what a gate cannot see, in the gate.',
    why: 'Thirteen gates in this repo state their own blind spots in a header comment, and the '
      + 'table below is that collection rather than a fresh audit. A gate that overstates itself '
      + 'is how contrast came to be "verified visually" in the first place.',
    kit: [{ ref: 'stories/contrast.test.js:236', pattern: 'What the walk never puts in front of the resolver, so the gate cannot see it' }],
  },
];
