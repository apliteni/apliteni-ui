// The shape of a rule and the gates that walk this page: docs/guidelines.md
//
// No rule here has a specimen pair. Motion is the one thing a still picture
// cannot show, so each rule stands on its why and on the gate named in
// docs/specification.md#motion.

export const TITLE = 'Motion';

export const BLURB = 'What moves after a page has loaded, how long it takes, and what happens when a reader asks for less.';

export const RULES = [
  {
    id: 'after-load',
    imperative: 'Move anything that appears or leaves after the page has loaded.',
    why: 'A panel that arrives in one frame reads as the page jumping. The same panel sliding in '
      + 'from its edge says where it came from and where it will go back to. What was on the page '
      + 'when it loaded stays still, because motion there is something the reader has to wait '
      + 'through before they can start.',
    except: 'Text that changes in place, such as a count, a range or a status line, changes at '
      + 'once. A number in motion is a number nobody can read yet.',
    kit: [
      { ref: 'src/styles/drawer.css:63', pattern: 'transform var(--dur-med) var(--ease),' },
      { ref: 'src/styles/callout.css:47', pattern: 'animation: ui-toast-in var(--dur-med) var(--ease-out) both;' },
    ],
  },
  {
    id: 'durations',
    imperative: 'Time a change by what moves: 150ms for a control, 250ms for a surface, 400ms for an entrance.',
    why: 'These are --dur-fast, --dur-med and --dur-slow, with --dur-instant at 80ms for a press. '
      + 'Every duration in the kit is one of the four, so a surface that invents 300ms fails the '
      + 'build rather than becoming a second tempo. The range is the one published systems settle '
      + 'on: Atlassian puts modals and panels between 150 and 400ms.',
    kit: [
      { ref: 'src/tokens/tokens.css:97', pattern: '--dur-fast: var(--duration-fast, 0.15s);' },
      { ref: 'src/tokens/tokens.css:98', pattern: '--dur-med: var(--duration-normal, 0.25s);' },
      { ref: 'src/tokens/tokens.css:99', pattern: '--dur-slow: var(--duration-slow, 0.4s);' },
    ],
  },
  {
    id: 'easing',
    imperative: 'Take the curve from the kit: --ease for a surface that comes and goes, --ease-out for one that arrives to stay, linear for visibility.',
    why: 'The CSS keyword ease is a different curve from --ease, and the two look the same in a '
      + 'stylesheet. visibility holds its old value for the whole transition, so a curve on it buys '
      + 'nothing, and a curve that overshoots flips it partway through the fade.',
    kit: [
      { ref: 'src/tokens/tokens.css:90', pattern: '--ease: var(--easing-ease-in-out' },
      { ref: 'src/tokens/tokens.css:91', pattern: '--ease-out: var(--easing-ease-out' },
      { ref: 'src/styles/drawer.css:33', pattern: 'transition: visibility var(--dur-med) linear;' },
    ],
  },
  {
    id: 'reduced',
    imperative: 'When a reader asks for less motion, change at once.',
    why: 'Under prefers-reduced-motion, reduced-motion.css holds every animation and transition in '
      + 'the kit to 0.01ms, in every bundle the kit publishes, so a component writes nothing of its '
      + 'own for it. WCAG 2.3.3 would allow a fade here, since it does not count opacity as motion, '
      + 'and Apple swaps slides for fades. The kit takes the answer Atlassian, Primer and Fluent '
      + 'give, off and instant, because one rule over everything is the only version a new '
      + 'component cannot forget.',
    except: 'A spinner or a skeleton stops too. What the reader is waiting on is announced by the '
      + 'region around it, not shown by the motion.',
    kit: [
      { ref: 'src/styles/reduced-motion.css:15', pattern: 'animation-duration: 0.01ms !important;' },
      { ref: 'src/styles/reduced-motion.css:17', pattern: 'transition-duration: 0.01ms !important;' },
    ],
  },
];
