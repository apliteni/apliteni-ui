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

export const TITLE = 'The accessibility floor';

export const BLURB = 'The four numbers under every control, what the kit aims at above them, '
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
export const AIMS = [
  {
    aim: 'Body text lands near 7:1, not near 4.5:1.',
    apply: 'AA is 4.5:1 and the kit’s ordinary --text on --bg is well past it in both themes. '
      + 'A new component that lands at 4.6 is passing and is still the worst text in the kit. '
      + 'Use --text for words at every size. Hierarchy comes from size, weight and spacing; muted and dim ink are reserved for the closed glyph, state and empty-slot exceptions in Labels and titles.',
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
    file: 'stories/ring-surfaces.test.js',
    does: 'Discovers raised backgrounds and their aliases in both workspaces, requiring a matching gap and the shared ring composition; form focus rules use focus-visible.',
    blind: ['Rendered blur contrast, clipping and browser focus heuristics require the Chromium pixel and keyboard evidence.'],
  },
  {
    file: 'react/src/BackLink.test.tsx',
    does: 'Holds the React back link against the factory rule for rule: the arrow stays aria-hidden '
      + 'so the name is said in words, the name contains the visible text as WCAG 2.5.3 asks, and a '
      + 'name that already says "Back to" is not said twice.',
    blind: ['Whether the link is reachable where it sits. It is a static anchor with no state, so '
      + 'nothing here presses a key at it; the shell gate is what places it on a page.'],
  },
  {
    file: 'react/src/Dropdown.test.tsx',
    does: 'Presses real keys at the React dropdown: the arrows that open it onto the first row or '
      + 'the selected one, the ring they walk and the disabled row they step over, Home and End, '
      + 'Enter and Space, Escape and Tab, and where focus goes when the panel closes. With a search '
      + 'field it asks the other half: focus stays in the combobox, the row Enter would pick is the '
      + 'one aria-activedescendant names, and Home and End belong to the caret. It also holds every '
      + 'row role, aria-selected and aria-disabled against the factory.',
    blind: [
      'Whether the focus it asks for lands. JSDOM moves focus into a box the stylesheet has hidden, '
      + 'so the rule that makes an opening panel visible in the frame the key lands is held by '
      + 'stories/overlay-css.test.js against the sheet, not here.',
      'A row a caller draws is only as accessible as the element they spread the props onto: the '
      + 'gate checks the props reach it, not what they are spread onto in a consumer.',
    ],
  },
  {
    file: 'react/src/Pagination.test.tsx',
    does: 'Where focus lands when a pressed pager step turns disabled at an end or while loading, and that the jump box never commits a page the reader did not ask for.',
    blind: ['Real browser focus: jsdom does not blur a control that turns disabled, so the drop to <body> is simulated in the tests.'],
  },
  {
    file: 'stories/palette-keyboard.test.js',
    does: 'Presses real keys at the command palette: the hotkey that opens it, the arrows that '
      + 'move the active row while the caret stays in the text box, Enter, Escape closing the top '
      + 'overlay only, the trap that keeps Tab in, and what the live region says.',
    blind: [
      'Whether the focus it asks for lands. Same JSDOM limit as the drawer gate: there is no '
        + 'layout and no transition, so a focus() a browser would refuse is counted as arriving.',
      'The pointer. Hovering moves the active row and clicking runs it; neither is pressed here.',
    ],
  },
  {
    file: 'stories/guidelines/command-palette.test.js',
    does: 'Holds the palette guidelines page to the component: the keyboard contract against the '
      + 'keys the sources actually compare against, the label role the grouping rule claims, and '
      + 'every palette row any story renders against the rule that a row must go somewhere, run '
      + 'something, ask something or say it is unavailable.',
    blind: [
      'What a key DOES. It reads which keys are answered, never what happens next — '
        + 'stories/palette-keyboard.test.js presses them.',
      'A row a story does not render. The sweep is the catalogue, so a product\u2019s own palette is '
        + 'covered only by the parts of it the kit renders.',
    ],
  },
  {
    file: 'stories/guidelines/the-page.test.js',
    does: 'Renders every screen under stories/apps/ and holds it to the page rules: one h1, an '
      + 'outline that goes down one rank at a time and stops where the contract says, a navigation '
      + 'landmark named and named once, the head in the shell\u2019s order, and no overlay open '
      + 'before the reader has asked for one.',
    blind: [
      'Anything CSS decides. It reads the markup a story returns and resolves no stylesheet, so '
        + 'a heading hidden by display:none is still a heading to it, and a landmark pushed off '
        + 'screen is still on the page.',
      'What the headings SAY. A rank that is right and a title that is wrong read the same here \u2014 '
        + 'stories/guidelines/letter-case.test.js is the gate on the words.',
      'A screen no story draws. The sweep is stories/apps/, so a consumer\u2019s own page is covered '
        + 'only in as much as the kit draws the same shape.',
    ],
  },
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
    file: 'stories/elevation.test.js',
    does: 'Sweeps every box-shadow the kit’s sheets declare, reads each layer’s geometry per '
      + 'theme, and refuses a cast shadow that is not the floating treatment. It also holds the '
      + 'floor this page cares about: --muted on the raised surfaces clears AA in both themes.',
    blind: [
      'The rendered result. Its ratios are arithmetic over flat colours, and a blurred penumbra '
        + 'is not one — the drop is scored at its core, the darkest ink it lays down.',
      'filter: drop-shadow(). Two ship, both zero-offset glows of a signal colour; an offset one '
        + 'would pass here unread.',
      'A shadow arriving from markup — an inline style= in a story, or a consumer’s own sheet.',
      'A cast that appears only when two custom properties are off their winning values at the '
        + 'same time. Each name is tried against every value the kit gives it, one at a time.',
    ],
  },
  {
    file: 'stories/signal-contrast.test.js',
    does: 'Reads declarations out of the source and holds twenty status-glyph pairs to the bar '
      + 'the stroke-width rule sets by stroke width.',
    blind: ['Colour for every glyph that carries no status — width is held next door, ratio is not.'],
  },
  {
    file: 'stories/stat-basis.test.js',
    does: 'Every change a stat band shows says what it is measured against, in text a reader can '
      + 'reach: beside the change, or in the caption the change points at. Never a hover title.',
    blind: ['Whether the comparison named is the right one. It checks that one is there and reachable.'],
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
      + 'with the disabled attribute taken off, so the state has to change the pair. Every control '
      + 'in a rail the reader folded is measured on its own, with its name read while the label is '
      + 'off the screen.',
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
    file: 'stories/dropdown-field-ground.test.js',
    does: 'Measures how deep a well the dropdown\u2019s search field sinks into the panel it sits in, '
      + 'against the kit\u2019s own field on a card, per theme \u2014 the surface a sunken box sits in '
      + 'decides how far it sinks, and a floating panel is a rung above a card.',
    blind: [
      'Legibility. It reads a field\u2019s ground against its surround, which is a question about '
        + 'depth; whether the text inside clears AA is the contrast walk\u2019s.',
      'Every other field in the kit. One selector in one sheet, so a second field dropped into a '
        + 'panel tomorrow is not a subject here.',
    ],
  },
  {
    file: 'stories/dropdown-foot-role.test.js',
    does: 'Puts the same head and foot into each panel dropdown() can emit and runs axe over '
      + 'the three, so the rule that a control belongs only in the search variant\u2019s dialog is '
      + 'measured rather than written down.',
    blind: [
      'Everything the foot is not. It asks one question of one slot, and says nothing about '
        + 'the rows, the trigger or the keyboard.',
      'A control axe has no opinion about. The rule it leans on is aria-required-children, '
        + 'which counts children by role and not by what they do.',
    ],
  },
  {
    file: 'stories/field-zoom.test.js',
    does: 'Holds the touch-zoom net (#294). Mounts every story into a jsdom carrying no stylesheet '
      + 'at all, asks each field whether the net\u2019s own selector reaches it with matches(), and '
      + 'weighs that against every font-size rule read out of the kit\u2019s sheets as text \u2014 so it '
      + 'fails a rule sizing a field under 16px, one sizing a field above 16px that the flat net '
      + 'would shrink, a second !important font size anywhere in the kit, and a second '
      + '(pointer: coarse) rule outside the net\u2019s own file.',
    blind: [
      'The cascade. Nothing is resolved here: jsdom does not rank !important between rules and '
        + 'would hand back the component\u2019s size, so the contest is read off the declarations '
        + 'instead. What the gate proves is that the net is the kit\u2019s only important font '
        + 'size \u2014 not that a browser resolves it that way.',
      'Whether a browser matches (pointer: coarse) at all. jsdom evaluates no media query, and this '
        + 'gate evaluates none either \u2014 the net\u2019s block is read as text. The device end is the '
        + 'screenshots under docs/evidence/294/.',
      'Safari\u2019s threshold. 16px is an observed behaviour of one browser and not a standard, so '
        + 'nothing here can measure the number itself.',
      'Layout. The larger text grows the box around it and no box is laid out here \u2014 the pager '
        + 'strip on a phone is a review question, not a failure in this gate.',
      'A field no story renders, a host page\u2019s included. The net reaches those by element '
        + 'selector; this walk cannot see them.',
    ],
  },
  {
    file: 'stories/reduced-motion.test.js',
    does: 'Holds the prefers-reduced-motion net (WCAG 2.3.3). It parses '
      + 'src/styles/reduced-motion.css, so deleting one of the net’s !important durations fails; '
      + 'fails a duration written with !important outside a reduced-motion block, which would beat '
      + 'the net, one inside a component’s own block that does more than switch motion off, and an '
      + '!important loop count above one; and finds every script waiting on animationend or '
      + 'transitionend, a React onTransitionEnd prop included, and asks for a timer in the same '
      + 'function — a reduced-motion branch alone does not count.',
    blind: [
      'Which timer. Any setTimeout in the function counts as the fallback, even one that has nothing '
        + 'to do with the listener.',
      'Whether a browser applies the net. jsdom evaluates no media query, so the net is read, '
        + 'never run.',
      'Delays. The net does not zero animation-delay or transition-delay, and nothing here looks '
        + 'for one.',
      'Inline styles a script writes, and motion a script drives itself — requestAnimationFrame, '
        + 'element.animate().',
    ],
  },
  {
    file: 'stories/motion-coverage.test.js',
    does: 'Finds every state rule that shows, hides or moves an element and holds it to moving '
      + 'between its states, by a transition or an entrance animation, or to a `motion: still` '
      + 'note that says why. The other half of reduced motion: it keeps on record the motion the '
      + 'net has to stop.',
    blind: [
      'Whether anything plays. jsdom runs no animation, so each component’s unit test holds that '
        + 'the entrance class lands on the change and not at first render.',
      'Content a script swaps in by innerHTML, and React markup mounted or unmounted without a state '
        + 'class, such as a DataTable’s rows on a sort. The React overlays carry one, .rx-scrim.is-open '
        + 'and the kit drawer’s .is-open, and those are read.',
      'Ancestors. The element is matched by its rightmost classes, so a transition written under '
        + 'another parent counts for it.',
    ],
  },
  {
    file: 'stories/tooltip-specimens.test.js',
    does: 'Renders every story, wires it the way the preview does, and walks each readout rendered '
      + 'open with a pointer, focus and Escape. A picture of a readout has to be open and unchanged '
      + 'at the end, and a live one on the same pages has to open under the pointer.',
    blind: [
      'Where the readout sits. JSDOM lays nothing out, so it proves a picture stays shown, not '
        + 'that it sits on its mark.',
      'Whether a live readout can be reached by keyboard at all. The wiring adds no tab stop to a '
        + 'mark, which is the open question on #282.',
    ],
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
    file: 'stories/button-chrome.test.js',
    does: 'Mounts every clickable class the kit ships in the place a story renders it, once '
      + 'against the chrome a browser paints on a <button> and once against its absence, and '
      + 'holds the two readings equal on background, border, font-family, font-size, line-height, '
      + 'text-align and width. The three font facets are read separately because Chrome writes '
      + 'them as one shorthand \u2014 `font: 400 13.3333px Arial` \u2014 so a rule that answers '
      + 'with the `font-family` longhand restores the face and leaves the size and the leading. '
      + 'Width is the one facet where equal readings are not enough: `width: auto` and '
      + '`width: fit-content` make the two readings agree and ARE the defect, so the value is '
      + 'rejected as well as compared. The three classes it fails on are pinned by name, and so '
      + 'are the three it leaves out, because a derived count does not move when a subject stops '
      + 'being one.',
    blind: [
      'Layout. JSDOM computes no boxes, so shrink-to-fit is modelled as a width declaration '
        + 'rather than measured, and a row that fills its line for another reason reads as repaired.',
      'The chrome itself. The stand-in\u2019s values are Chromium\u2019s, measured on the branch '
        + 'that wrote this gate and not re-measured after; a browser that restyles its buttons '
        + 'leaves the stand-in stale with nothing to say so.',
      'Weight and style. `font: inherit` resets both, so a rule that means to keep one has to '
        + 'write it after the shorthand, and no facet here reads whether it did.',
      'State. Every reading is taken at rest, so chrome that only shows under :hover is unseen.',
      'The rows in its own ledger. A class the kit renders as a <button> is measured and counted '
        + 'there rather than failed, so sixteen rows keep chrome that nobody is repairing \u2014 '
        + 'twelve on text-align, four on line-height.',
      'Every ancestry of a deferred row. A class that fails here is read in every distinct '
        + 'ancestry a story gives it; a class the ledger holds is read in one. Fourteen classes '
        + 'rendered 415 times across 232 ancestries, fourteen read \u2014 218 cascades under a '
        + 'ledgered row nothing measures.',
      'A class that stops being clickable. The sweep starts at `cursor: pointer`, so a rule that '
        + 'moves the declaration onto a wrapper or a :hover takes the class out of the sweep '
        + 'entirely. The three subjects are pinned by name against that; the fourteen deferred '
        + 'classes are not.',
      'What is deliberately left out, and it is one bucket: a form control the browser owns, or '
        + 'decoration inside one \u2014 the `select` behind .ui-select, the `label` round the '
        + 'checkbox in .ui-check, the `span` .ui-switch__track draws on. It used to leave out far '
        + 'more, on a markup technicality, and .ui-fbpill sat unmeasured in it carrying the whole '
        + 'defect.',
    ],
  },
  {
    file: 'stories/apps/shell.test.js',
    does: 'The shell\u2019s composition: one <main>, a named navigation landmark, a rail item that '
      + 'stays named at every width, the crumb trail the caller owns, and the fold toggle \u2014 drawn '
      + 'only when asked for, a native button outside the landmark, named for the press.',
    blind: ['What the markup looks like once it meets the stylesheet \u2014 shell-states.test.js has that.'],
  },
  {
    file: 'stories/apps/shell-states.test.js',
    does: 'The shell resolved through the real cascade at every width, theme and accent, so '
      + 'nothing it draws goes missing at one of them \u2014 and the rail the reader folds held equal '
      + 'to the narrow rail rule for rule and on every element, at rest and focused.',
    blind: ['Layout, again. Width is a class here, not a viewport.'],
  },
  {
    file: 'stories/apps/shell-rail.test.js',
    does: 'Presses the fold toggle through wireShell() and asserts the rail, the announced state, '
      + 'where focus is, the titles a folded rail\u2019s rows take, the cookie and its path, the '
      + 'opt-out and the ui-rail event \u2014 then draws the next page and checks it remembered.',
    blind: [
      'Enter and Space. The toggle is a native button and JSDOM runs no activation for a key, so '
        + 'a press here is a click.',
      'The tooltip itself. A title is set and taken off; whether a browser shows it is the browser\u2019s.',
      'The paint before script. A server that does not read the cookie paints the rail open for '
        + 'one frame, and only a browser shows that.',
    ],
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
    file: 'stories/accent-without-theme.test.js',
    does: 'Renders the kit with data-theme absent and asserts it is still painted, still dark, '
      + 'and still wearing whatever accent data-accent asks for \u2014 the state a host produces by '
      + 'stamping nothing, which no other gate mounts.',
    blind: [
      '--accent alone. It reads the one token that names the sub-theme and not the ramp '
        + 'beside it, so a bare cell that re-points --accent and forgets --purple-light passes '
        + 'here on the strength of the one it did.',
      'Contrast, entirely. It measures that a colour arrives, never that the colour is legible '
        + 'once it does \u2014 accent-contrast reads all eight stamped cells and neither reads the '
        + 'unstamped one.',
      'prefers-color-scheme, which the kit does not ship. An unstamped document is dark on a '
        + 'light machine and this gate holds that as the intended answer (#250).',
    ],
  },
  {
    file: 'stories/guidelines/iconography.test.js',
    does: 'A control goes wordless only for an action on the closed list \u2014 the question a '
      + 'perfect aria-label cannot answer.',
    blind: ['Whether the glyph is legible at its size. The stroke-width rule governs that, for two families.'],
  },
  {
    file: 'react/src/Finance.test.tsx',
    does: 'Controlled filter removal keeps focus, disabled views are skipped, and pinned identity cells remain data cells beside selection.',
    blind: ['Browser geometry, touch, contrast and real screen-reader announcements.'],
  },
  {
    file: 'react/src/DataTable.test.tsx',
    does: 'Keyboard sorting keeps semantic column headers and the announced sort direction.',
    blind: ['Real browser focus and responsive layout; these mounted tests use jsdom.'],
  },
  {
    file: 'react/src/CommandPalette.test.tsx',
    does: 'Compares the React palette against the vanilla factory shape by shape — panel, roles, '
      + 'groups, every row — and then presses keys at the mounted one: where focus opens and where '
      + 'it goes back to, the arrows, Enter, and the destructive row it refuses to run.',
    blind: [
      'The hotkey. Cmd+K is the vanilla wiring\u2019s, and a React host binds its own key to the '
        + '`open` prop it already owns.',
      'Real browser focus and layout, as everywhere else in this workspace: these are jsdom mounts.',
    ],
  },
  {
    file: 'react/src/Modal.test.tsx',
    does: 'The React modal\u2019s focus and dismissal behaviour, mounted rather than serialised.',
    blind: ['The scrim\u2019s backdrop-filter, and anything else only a browser composites.'],
  },
  {
    file: 'react/src/Drawer.test.tsx',
    does: 'The React drawer\u2019s focus, Tab trap, Escape, scrim and close-button dismissal, mounted.',
    blind: ['Real browser focus and transitions; jsdom runs neither.'],
  },
  {
    file: 'react/src/a11y.test.tsx',
    does: 'The same axe contract for the React workspace, through vitest and Testing Library.',
    blind: ['The same two axe cannot do next door: contrast, and anything static markup hides.'],
  },
  {
    file: 'react/src/field-zoom.test.tsx',
    does: 'The touch-zoom net over this workspace: mounts every React story, asks the net\u2019s own '
      + 'selector whether it reaches each field, and reads react/src\u2019s stylesheets for a field '
      + 'size of their own \u2014 an important one there would outrank the net.',
    blind: [
      'Everything the vanilla gate is blind to, unchanged: no media query is evaluated, Safari\u2019s '
        + 'threshold is not measured, and nothing is laid out.',
    ],
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
    what: 'Keyboard, past the topbar and the tabs',
    note: 'The dropdown, the table, the segmented control, the feedback composer and the '
      + 'app-shell nav\u2019s rows have no keyboard gate. shell-rail.test.js presses the fold '
      + 'toggle and a group toggle; nothing presses Tab through the rail. They are untested, not covered.',
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
      { ref: 'src/styles/button.css:78', pattern: '.ui-btn--sm' },
      { ref: 'src/styles/input.css:134', pattern: '.ui-check input::before' },
    ],
  },
  {
    id: 'ring-contrast',
    imperative: `Hold a focus indicator to ${RING_MIN}:1 against the ground it lands on.`,
    why: 'The solid band carries the contrast; its surface-coloured gap separates it from an accent-filled control. '
      + 'The outer glow is decoration, not the indicator. The flat-ground gate still holds the band at '
      + `${RING_FLOOR}:1; real browser pixels must also clear 3:1 against the gap and the adjacent halo. `
      + 'Chosen as G2 in #343. A translucent glow alone did not reach 3:1 in the comparison.',
    kit: [{ ref: 'src/styles/base.css:146', pattern: 'box-shadow: var(--ring);' }],
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
      + 'instead: the ink is read on the surface beside it, both opaque. Every disabled label on '
      + `a box of its own measures 6.91:1 in dark and ${DISABLED_FLOOR}:1 in light. A ghost button `
      + 'paints no box, so its label is read on whatever is behind it; it takes '
      + `--disabled-ink-bare, set to clear ${DISABLED_FLOOR}:1 on the dullest ground, and reads `
      + 'between 5.20:1 and 7.49:1 depending where it is put (#273).',
    except: 'A disabled control also has to look weaker than an enabled one — and the measurement '
      + 'says that is not a contrast question. The disabled primary reads 6.91:1 in dark and '
      + `${DISABLED_FLOOR}:1 in light, against 5.70:1 and 7.34:1 enabled — MORE contrast than the `
      + 'enabled button in dark and less in light, and nobody confuses white on purple with grey '
      + 'on grey in either direction. Contrast carries legibility, the paint carries the state, '
      + 'and the second half of '
      + 'the imperative is what holds the state: the pair changes, and the accent goes. The one '
      + 'rule still fading with opacity is the switch track, which has no label inside it — its '
      + 'pair is 1.4.11’s, and no gate here measures it.',
    kit: [
      { ref: 'src/styles/button.css:95', pattern: '.ui-btn[aria-disabled="true"]' },
      { ref: 'src/tokens/tokens.css:166', pattern: '--disabled-ink: var(--muted);' },
    ],
  },
  {
    id: 'touch-field-size',
    imperative: `Set a field's text to ${FIELD_MIN}px where the pointer is coarse.`,
    why: 'iOS Safari zooms the page into a focused field whose text is smaller than that, and it '
      + 'does not zoom back out — a reader who tapped a search box is left panning a page they '
      + 'were typing into, one-handed. Every field the kit ships did it: 14.5px for the form '
      + 'controls, 13px for the pager\u2019s two, 12.5px for the dropdown\u2019s search field. One net '
      + 'answers it for all of them and for a host page\u2019s own fields, because it is written over '
      + '`input`, `select` and `textarea` rather than over kit classes. The size has to be real: '
      + 'the zoom reads the computed size, so a 16px field scaled back down with a transform still '
      + 'zooms, and takes the border and the focus ring down with it.',
    except: 'A host page’s own field designed above 16px, which the same element reach makes '
      + 'smaller on a touch screen than it is with a mouse — the net is a flat size, not a floor, '
      + 'and a floor on the element’s own font size cannot be written in CSS. Such a field is kept '
      + 'by the host’s own !important rule, one whose selector is more specific than the net’s '
      + 'bare element — a class on the field, .hero-search input — which then wins whichever '
      + 'stylesheet loads first. Also a control '
      + 'with nothing to type into — checkbox, radio, range, colour, file, and the button types — '
      + 'which does not zoom and keeps its size. The other way out of this is a '
      + 'viewport tag: `user-scalable=no`, or a `maximum-scale=1`, stops the zoom by taking '
      + 'pinch-zoom away from every reader of the page. That fails WCAG 1.4.4, Apple\u2019s own '
      + 'guidance argues against it, and it is not the kit\u2019s to set — a viewport tag belongs to '
      + 'the host page. A font size lives in the stylesheet the fields already come from.',
    kit: [
      { ref: 'src/styles/field-zoom.css:19', pattern: 'font-size: 16px !important;' },
      { ref: 'react/src/index.ts:9', pattern: "import '../../src/styles/field-zoom.css';" },
    ],
  },
  {
    id: 'floor-not-verdict',
    imperative: 'Read a green gate as a floor, never as a verdict.',
    why: 'Every number above is the least the kit accepts, not what it is trying to be. The '
      + 'four aims below the rules say what it reaches for, and a component that lands one '
      + 'thousandth over AA has passed the gate and is still the worst thing on the page.',
    kit: [{ ref: 'stories/contrast.test.js:272', pattern: 'the AA floor is a floor, not a verdict.' }],
  },
  {
    id: 'name-the-gap',
    imperative: 'Say what a gate cannot see, in the gate.',
    why: 'The gates in this repo state their own blind spots in a header comment, and the '
      + 'table below is that collection rather than a fresh audit. A gate that overstates itself '
      + 'is how contrast came to be "verified visually" in the first place.',
    kit: [{ ref: 'stories/contrast.test.js:216', pattern: 'What the walk never puts in front of the resolver, so the gate cannot see it' }],
  },
];
