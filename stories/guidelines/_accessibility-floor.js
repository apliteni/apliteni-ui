// The shape of a rule and the gates that walk this page: docs/guidelines.md
//
// Three of the numbers on this page did not exist anywhere in this tree before
// #201, and each is pinned by a measurement in
// stories/guidelines/accessibility-floor.test.js rather than by this comment
// (ADR 0002). Two of the three are settled by a standard. The third is not
// settled by anybody, and says so.
import { button, toast } from '../../src/components/index.js';

export const TITLE = 'The accessibility floor';

export const BLURB = 'The three numbers under every control, what the kit aims at above them, '
  + 'and what its gates admit they cannot see.';

// ---- the three numbers -----------------------------------------------------

/** WCAG 2.5.8, AA. Not ours to choose; ours to hold and to measure against. */
export const TARGET_MIN = 24;

/** WCAG 1.4.11 for a focus indicator, and ADR 0010 says a 3px band earns it. */
export const RING_MIN = 3;

/**
 * PROPOSED. No standard sets a floor for a disabled control — 1.4.3 exempts it
 * outright — so this number is an argument, not a rule, and #220 holds the
 * decision. The argument: 3:1 is the bar WCAG already uses twice for "make it
 * out, do not read it comfortably" (large text, and a graphic), and a disabled
 * label has to stay identifiable as the word it is or a reader cannot tell
 * which control is unavailable.
 */
export const DISABLED_MIN = 3;

// Ratchets, not bars. Each is the worst the kit measured when #201 wrote the
// number down, so a token that makes one of them worse is a decision somebody
// writes, not a drift nobody notices. Same device as GLYPH_FLOOR in ADR 0010.
export const RING_FLOOR = 1.5;
export const DISABLED_FLOOR = 1.48;

/** The ring misses its own bar everywhere. What holds the gate open, and why. */
export const RING_LEDGER = {
  issue: 218,
  measured: { worst: 1.5, best: 1.82 },
  note: 'The ring clears nothing: 1.50:1 at worst in light, 1.82:1 at best in dark, across '
    + '64 selector x ground landings. src/tokens/tokens.css already said so and pointed at a '
    + 'closed issue.',
};

/** The disabled floor is proposed, and the kit does not meet it. */
export const DISABLED_LEDGER = {
  issue: 220,
  measured: { worst: 1.48, best: 4.46 },
  note: 'Worst is a disabled primary button in light — white on a faded accent. No disabled '
    + 'control in the light theme reaches 3:1.',
};

/**
 * Controls under 24px that the gate lets through, each with the reason.
 *
 * An entry is not an excuse: three of these four are failures with an issue on
 * them, and the fourth is not kit code. The gate refuses an entry that names a
 * control no story renders, or one that has since grown past the floor.
 */
export const TARGET_EXEMPT = [
  {
    control: 'a.brand',
    why: 'Not a kit control. It is the demo topbar a story builds for itself in '
      + 'stories/apps/AccountPreset.stories.js, styled by that story’s own <style> block. '
      + 'Measured at 21.06px and reported rather than hidden, because a walk that skipped '
      + 'story chrome would also skip a component that had not been moved into src yet.',
  },
  {
    control: 'button.ui-snippet__copy',
    issue: 219,
    why: 'Fails at 23.44px, short by 0.56px — padding 2 and a 12px label at line-height 1.62. '
      + 'The cheapest of the three to fix and the one nobody would notice moving.',
  },
  {
    control: 'button.ui-toast__close',
    issue: 219,
    why: 'Fails at 19x19. Five px on both axes is a visible change to a shipped component, '
      + 'and it sits beside the toast’s action, so 2.5.8’s spacing exception does not save it.',
  },
  {
    control: 'input.',
    issue: 219,
    why: 'Fails at 19x19 — the checkbox input under .ui-check, which is the target itself '
      + 'rather than a hidden input behind a painted box the way the switch works.',
  },
];

// ---- what the kit aims at above the floor ----------------------------------

/**
 * stories/contrast.test.js:90 says the AA floor is a floor and not a verdict.
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
      + 'kit pairs its colour with a glyph and a label, and ADR 0010 gives the glyph a width '
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
      + 'ADR 0010 sets by stroke width.',
    blind: ['Every other stroked glyph in the kit — ten of them sit under that line (#217).'],
  },
  {
    file: 'stories/guidelines/accessibility-floor.test.js',
    does: 'Pins the three numbers on this page: target size against every control the stories '
      + 'render, the ring against every ground it lands on, and the composite a disabled '
      + 'control leaves on the page.',
    blind: [
      'Width, for anything a line of text sizes — reported unmeasurable rather than passed.',
      '2.5.8’s spacing exception, which is a layout question end to end.',
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
      + 'is a known exception (stories/contrast.test.js:102-110).'],
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
    blind: ['Whether the glyph is legible at its size. ADR 0010 governs that, for two families.'],
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
  </style>`;

const row = (...html) => `<div class="gl-stage gl-stage--row">${html.join('')}</div>`;

export const targetDo = () => row(
  button({ label: 'Revoke', variant: 'secondary', size: 'sm' }),
  // moreHorizontal, not gear: the icon-only closed list is a rule of this same
  // collection, and a specimen of one rule must not break another.
  button({ label: 'More actions', icon: 'moreHorizontal', iconOnly: true, variant: 'secondary' }),
);
export const targetDont = () => row(
  button({ label: 'Revoke', variant: 'secondary', size: 'sm' }),
  toast({ variant: 'success', title: 'Token revoked', body: 'The close is 19px square.' }),
);

export const RULES = [
  {
    id: 'target-size',
    imperative: `Give every pointer target at least ${TARGET_MIN}x${TARGET_MIN} CSS px.`,
    doCaption: 'A sm button measures 26.5px high — 6 + 12.5 + 6 and two hairlines. It clears.',
    dontCaption: 'The toast’s close is 19x19. It is the smallest target the kit ships.',
    doHtml: targetDo,
    dontHtml: targetDont,
    except: 'WCAG 2.5.8 lets five cases through — spacing, an equivalent control elsewhere, a '
      + 'target inline in a sentence, a size the user agent decides, and a presentation that is '
      + 'essential. None of them covers a control that is simply small, and none of the three '
      + 'the kit ships under the floor qualifies for one.',
    unmet: {
      issue: 219,
      note: '.ui-snippet__copy at 23.44px, .ui-toast__close and the .ui-check input at 19x19.',
    },
    kit: [{ ref: 'src/styles/button.css:75', pattern: '.ui-btn--sm' }],
  },
  {
    id: 'ring-contrast',
    imperative: `Hold a focus indicator to ${RING_MIN}:1 against the ground it lands on.`,
    why: 'WCAG 1.4.11, and ADR 0010’s rider does not let this one out: --ring is a 3px spread, '
      + 'twice the 1.5 CSS px under which a stroke stops being a graphic and takes the text bar '
      + 'instead. The ground is the outer neighbour and also what the translucent band is '
      + 'composited onto, so it is the pair that decides.',
    unmet: {
      issue: RING_LEDGER.issue,
      note: `--ring measures ${RING_LEDGER.measured.worst}:1 at worst and `
        + `${RING_LEDGER.measured.best}:1 at best, over 64 landings in two themes. It clears nothing.`,
    },
    kit: [{ ref: 'src/styles/base.css:136', pattern: 'box-shadow: var(--ring);' }],
  },
  {
    id: 'disabled-legibility',
    imperative: `Keep a disabled label readable at ${DISABLED_MIN}:1 — proposed, not settled.`,
    why: 'No standard sets this: 1.4.3 exempts a disabled control outright, which is exactly '
      + 'why nothing checks it. The number here is an argument — 3:1 is the bar WCAG already '
      + 'uses for large text and for a graphic, and a disabled label has to stay identifiable as '
      + 'the word it is. Nobody has accepted it, and #220 is where that decision goes.',
    except: 'A disabled control also has to look weaker than an enabled one, and that pulls the '
      + 'other way. A floor set too high erases the difference the state exists to show; where '
      + 'the two meet has not been ruled on.',
    unmet: {
      issue: DISABLED_LEDGER.issue,
      note: `Measured ${DISABLED_LEDGER.measured.worst}:1 at worst — a disabled primary button in `
        + 'light. Not one disabled control in the light theme reaches 3:1.',
    },
    kit: [{ ref: 'src/styles/button.css:86', pattern: '.ui-btn[aria-disabled="true"]' }],
  },
  {
    id: 'floor-not-verdict',
    imperative: 'Read a green gate as a floor, never as a verdict.',
    why: 'Every number above is the least the kit accepts, not what it is trying to be. The '
      + 'four aims below the rules say what it reaches for, and a component that lands one '
      + 'thousandth over AA has passed the gate and is still the worst thing on the page.',
    kit: [{ ref: 'stories/contrast.test.js:90', pattern: 'The AA floor is a floor, not a verdict.' }],
  },
  {
    id: 'name-the-gap',
    imperative: 'Say what a gate cannot see, in the gate.',
    why: 'Thirteen gates in this repo state their own blind spots in a header comment, and the '
      + 'table below is that collection rather than a fresh audit. A gate that overstates itself '
      + 'is how contrast came to be "verified visually" in the first place.',
    kit: [{ ref: 'stories/contrast.test.js:17', pattern: 'WHAT IT WILL NOT CATCH' }],
  },
];
