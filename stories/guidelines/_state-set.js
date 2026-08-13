// ---------------------------------------------------------------------------
// Content for the "Guidelines / The full state set" page: the states a control
// owes beyond rest — focus, busy, error — and the one the kit still owes a
// screen.
//
// Same contract as _destructive-actions.js: every specimen is a real kit
// factory rendered live, the wrongness on show is pattern and never broken
// markup, and every `kit` entry carries the literal `pattern` that must be on
// the line it cites (stories/guidelines/refs.test.js resolves them all).
//
// One rule here carries `unmet`: the kit does not do what it asks, and says so
// with the issue it is tracked under rather than quietly overclaiming.
// ---------------------------------------------------------------------------
import { button, callout, field, input } from '../../src/components/index.js';

// ---- The page -------------------------------------------------------------
export const TITLE = 'The full state set';

// One line for an index that lists this page beside the other four. Same
// register as the imperatives, and short enough to sit on one line in a card.
export const BLURB = 'The states a control owes beyond rest — focus, busy, error, pending.';

// ---- Specimen CSS ---------------------------------------------------------
// A focus ring exists only under a live keyboard, so `.gl-ring` pins what
// :focus-visible paints (src/styles/base.css) and holds it still for a
// screenshot — the same trick `.gl-hovering` plays for hover on the destructive
// actions page. `.gl-ring--adhoc` then takes the ring off one of the two
// controls and gives it a hand-rolled outline instead, which is the whole of
// the wrongness on show.
export const SPEC_CSS = `
  <style>
    .gl-row { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-3); }
    /* .ui-input is width:100%, which as a flex item claims the whole row and
       wraps the button off it. Let it take the slack instead. */
    .gl-row .ui-input { flex: 1 1 11rem; width: auto; min-width: 0; }
    .gl-stack { display: flex; flex-direction: column; align-items: stretch; gap: var(--space-4); }
    .gl-ring .ui-btn, .gl-ring .ui-input { box-shadow: var(--ring); }
    .gl-ring--adhoc .ui-input { box-shadow: none; outline: 2px solid var(--muted); outline-offset: 2px; }
  </style>`;

// ---- Live specimens -------------------------------------------------------
const stage = (html, mod = '') => `<div class="gl-stage ${mod}">${html}</div>`;

const ringed = (mod) => `
  <div class="gl-stage gl-ring ${mod}">
    <div class="gl-row">
      ${button({ label: 'Save changes', variant: 'primary' })}
      ${input({ value: 'acme.io/hooks', ariaLabel: 'Webhook URL' })}
    </div>
    <div class="gl-cursor">Both reached by Tab</div>
  </div>`;

/** Two controls, one ring token. */
export const focusDo = () => ringed('');
/** The input opts out and draws its own. */
export const focusDont = () => ringed('gl-ring--adhoc');

const saving = (busy) => stage(button({ label: 'Saving…', variant: 'primary', busy }));

/** Busy, so disabled and aria-busy, from one flag. */
export const busyDo = () => saving(true);
/** The same label with none of the state behind it. */
export const busyDont = () => saving(false);

// field() mints the message an id and points the control at it with
// aria-describedby (src/components/index.js). The don't keeps the red and the
// aria-invalid — input({ invalid: true }) carries both — and moves the reason
// into a callout beside it, where nothing connects the two.
const WHY_INVALID = 'Must start with https://';
const urlControl = () => input({ value: 'acme.io/hooks', invalid: true });

/** The reason travels with the field. */
export const errorDo = () => stage(field({
  label: 'Webhook URL', error: WHY_INVALID, control: urlControl(),
}));
/** The reason sits beside it, tied to nothing. */
export const errorDont = () => `
  <div class="gl-stage gl-stack">
    ${field({ label: 'Webhook URL', control: urlControl() })}
    ${callout({ variant: 'danger', icon: 'alert', body: WHY_INVALID })}
  </div>`;

// ---- The rules ------------------------------------------------------------
export const RULES = [
  {
    id: 'focus-visible',
    imperative: 'Give every focusable control the same --ring, and only on :focus-visible.',
    why: 'One ring means a keyboard reader learns the shape once, and a mouse click never sees it.',
    except: '--ring is part of the accent family and re-points per sub-theme, so the colour moves even though the shape does not.',
    doCaption: 'Button and input wear one ring.',
    dontCaption: 'The input draws its own.',
    doHtml: focusDo,
    dontHtml: focusDont,
    kit: [
      { ref: 'src/styles/base.css:130', pattern: '.ui-focusable:focus-visible,' },
      { ref: 'src/styles/base.css:136', pattern: 'box-shadow: var(--ring);' },
      { ref: 'src/tokens/accents.css:28', pattern: '--ring:' },
    ],
  },
  {
    id: 'busy',
    imperative: 'Make busy mean disabled — aria-busy plus a real disabled, from one flag.',
    why: 'A control that still takes clicks while it works submits twice.',
    except: 'A disabled control drops out of the contrast gate under WCAG 1.4.3, so a busy one has to stay legible by eye.',
    doCaption: 'Disabled and aria-busy together.',
    dontCaption: 'Says “Saving…”, still takes clicks.',
    doHtml: busyDo,
    dontHtml: busyDont,
    kit: [
      { ref: 'src/components/index.js:33', pattern: 'busy ⇒ disabled' },
      { ref: 'src/styles/button.css:98', pattern: '.ui-btn[aria-busy="true"] {' },
      { ref: 'stories/contrast.test.js:35', pattern: 'Inactive components. Skipped on purpose per WCAG 1.4.3.' },
    ],
  },
  {
    id: 'error-in-markup',
    imperative: 'Say an error in the markup, not only the paint, and tie the message on.',
    why: 'Red on its own is a state only a sighted reader can read.',
    except: 'required goes in the attribute, not the label’s wording — the asterisk is decoration, hidden from assistive tech.',
    doCaption: 'The reason is read with the field.',
    dontCaption: 'Same red, reason attached to nothing.',
    doHtml: errorDo,
    dontHtml: errorDont,
    kit: [
      { ref: 'src/components/index.js:178', pattern: '`invalid` paints the control red AND says so in aria-invalid' },
      { ref: 'src/components/index.js:164', pattern: "'aria-describedby': msgId," },
      { ref: 'src/components/index.js:150', pattern: "markup rather than in the label's wording" },
    ],
  },
  {
    id: 'loading',
    // No specimen: there is no screen-scale pending state in the kit to
    // photograph, which is the rule's own point.
    imperative: 'Design the pending state of a screen, not only of its button — and announce it.',
    why: 'A screen that changes silently in flight leaves a screen-reader user with no event at all.',
    except: 'A toast carries its own live region, so a screen that reports through the toast stack needs no second one.',
    unmet: {
      issue: 128,
      note: 'No screen in stories/apps has a loading state, and no React component takes a busy flag; '
        + 'only the vanilla button gates one.',
    },
    kit: [
      { ref: 'src/components/index.js:233', pattern: 'role="status" aria-live="polite"' },
    ],
  },
];
