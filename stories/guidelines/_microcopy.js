// The shape of a rule and the gates that walk this page: docs/guidelines.md
import { button, emptyState, switchToggle } from '../../src/components/index.js';

export const TITLE = 'Microcopy and tone';

export const BLURB = 'What a control announces itself by, and what a screen says when empty.';

const stage = (html) => `<div class="gl-stage">${html}</div>`;

// This pair renders identical pixels on purpose — `label` is the accessible
// name and nothing else — so the captions are what carry the difference.
export const stateDo = () => stage(switchToggle({
  checked: true, label: 'In-app notifications, on',
}));
export const stateDont = () => stage(switchToggle({
  checked: true, label: 'Turn off in-app notifications',
}));

export const namedDo = () => stage(button({ label: 'Dismiss', icon: 'x', iconOnly: true }));
export const namedDont = () => stage(button({ label: '', icon: 'x', iconOnly: true }));

const FILTERED = {
  art: 'invoices',
  title: 'No invoices match the current filters.',
  sub: 'Try widening the date range or clearing a filter.',
};

export const emptyDo = () => stage(emptyState(FILTERED));
export const emptyDont = () => stage(emptyState({
  ...FILTERED,
  actions: button({ label: '+ Add invoice', variant: 'primary' }),
}));

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
      { ref: 'src/components/index.js:81', pattern: 'not an accessible name' },
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
      { ref: 'src/components/index.js:274', pattern: 'export function emptyState(' },
    ],
  },
];
