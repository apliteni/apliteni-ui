// ---------------------------------------------------------------------------
// Content for the "Guidelines / Microcopy and tone" page: the strings a control
// carries — the one it announces itself by, and the one a screen says when it
// has nothing to show.
//
// Two of the pairs here render identical pixels. That is the subject: the
// difference lives in the accessible name, so the caption under each half is
// what carries it, and both halves are real factory calls that pass axe.
//
// Naming what a destructive button costs belongs to rule `wording` on the
// Destructive actions page and is not restated here.
//
// Every `kit` entry carries a `pattern` that must appear on the cited line;
// stories/guidelines/refs.test.js resolves them all.
// ---------------------------------------------------------------------------
import { button, emptyState, switchToggle } from '../../src/components/index.js';

// ---- The rule -------------------------------------------------------------
export const TITLE = 'Microcopy and tone';

// One line for an index that lists this page beside the other four. Same
// register as the imperatives, and short enough to sit on one line in a card.
export const BLURB = 'What a control announces itself by, and what a screen says when empty.';

// ---- Live specimens -------------------------------------------------------
// Each returns a string of real component markup on the shared stage from
// _layout.js, so this page adds no CSS of its own.

const stage = (html) => `<div class="gl-stage">${html}</div>`;

// Both switches are on, and both are the same call: `label` is the input's
// accessible name and nothing else, so the two render pixel for pixel alike.
/** The name reports the state the switch is in. */
export const stateDo = () => stage(switchToggle({
  checked: true, label: 'In-app notifications, on',
}));
/** The name reports the state a click would leave behind. */
export const stateDont = () => stage(switchToggle({
  checked: true, label: 'Turn off in-app notifications',
}));

/** An icon-only button whose `label` names it. */
export const namedDo = () => stage(button({ label: 'Dismiss', icon: 'x', iconOnly: true }));
/** The same button with an empty label, falling back to the icon's name. */
export const namedDont = () => stage(button({ label: '', icon: 'x', iconOnly: true }));

const FILTERED = {
  art: 'invoices',
  title: 'No invoices match the current filters.',
  sub: 'Try widening the date range or clearing a filter.',
};

/** A list emptied by a filter: a nudge, and no action. */
export const emptyDo = () => stage(emptyState(FILTERED));
/** The same list carrying a first-run action. */
export const emptyDont = () => stage(emptyState({
  ...FILTERED,
  actions: button({ label: '+ Add invoice', variant: 'primary' }),
}));

// ---- The three sub-rules --------------------------------------------------
export const RULES = [
  {
    id: 'state-not-destination',
    imperative: 'Name the state a control is in, not the click, and rename it on every flip.',
    why: 'A name that is right once and never again tells a reader nothing.',
    except: 'An icon-only toggle may add the click after the state: “Theme: Dark. Switch to light.”',
    doCaption: 'Named for the state it is in.',
    dontCaption: 'Named for what the click would do.',
    doHtml: stateDo,
    dontHtml: stateDont,
    kit: [
      { ref: 'src/components/topbar.js:11', pattern: 'reports the state it is IN' },
      { ref: 'src/components/topbar.js:23', pattern: 'rewritten by applyTheme on every flip' },
      { ref: 'src/components/topbar.test.js:59', pattern: 'announces the theme it is in' },
    ],
  },
  {
    id: 'never-nameless',
    imperative: 'Give every control a name, even one with no visible text.',
    why: 'The glyph is aria-hidden, so the label is the control’s only accessible name.',
    except: 'An identifier is not a name — segmented()’s name seeds a data hook and is never read out.',
    doCaption: 'The name reads “Dismiss”.',
    dontCaption: 'The same button reads “x”.',
    doHtml: namedDo,
    dontHtml: namedDont,
    kit: [
      { ref: 'src/components/index.js:15', pattern: 'kit glyphs are aria-hidden' },
      { ref: 'src/components/index.js:17', pattern: 'an empty label falls back to the icon' },
      { ref: 'src/components/index.js:77', pattern: 'not an accessible name' },
    ],
  },
  {
    id: 'empty-state-copy',
    imperative: 'Match an empty state to why it is empty — a filter gets a nudge, no action.',
    why: '“Add invoice” under “No invoices match the filters” answers a question the reader did not ask.',
    except: 'A filtered list does get an action when the filter that emptied it is off screen.',
    doCaption: 'A nudge, and nothing to add.',
    dontCaption: 'An action for the wrong problem.',
    doHtml: emptyDo,
    dontHtml: emptyDont,
    kit: [
      { ref: 'stories/apps/EmptyStates.stories.js:14', pattern: 'illustration + nudge, no action' },
      { ref: 'stories/apps/EmptyStates.stories.js:36', pattern: 'illustration + guidance + a clear action' },
      { ref: 'src/components/index.js:254', pattern: 'export function emptyState(' },
    ],
  },
];
