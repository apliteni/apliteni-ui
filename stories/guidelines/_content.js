// ---------------------------------------------------------------------------
// Content for the "Guidelines / Destructive actions" page: one guideline about
// destructive and dangerous actions, three sub-rules, live specimens, the
// boundary of each rule, and pointers into kit code that already applies it.
//
// Everything here is token-driven (no raw hex, no magic colour) and every
// specimen is a real kit component rendered live — including the "don't" ones.
// The wrongness on show is colour, wording and pattern, never broken markup,
// so the axe gate in stories/a11y.test.js stays green on the bad examples too.
//
// Every `kit` entry carries a `pattern` — a literal substring that must appear
// on the cited line. stories/guidelines/refs.test.js resolves all of them, so a
// reference that drifts out of date fails CI instead of misleading a reader.
// ---------------------------------------------------------------------------
import { button, badge, toast, esc } from '../../src/components/index.js';
import { dropdown } from '../../src/components/dropdown.js';

// ---- The rule -------------------------------------------------------------
export const TITLE = 'Destructive actions';

export const DECK =
  'A destructive action should look dangerous, name what it destroys, and either confirm or offer '
  + 'undo, depending on whether it can be reversed.';

export const WHY =
  '--pink is a signal colour that does not move with the accent, so it survives re-theming.';

// Wrap the technical fragments of a plain-text sentence — file references,
// token names, selectors — in <code>. Keeping the data plain text means the
// layout can style those fragments however it wants.
export const mono = (s) => String(s).replace(
  /(?:[\w/-]+(?:\.[\w-]+)*\.(?:css|js)(?::\d+)?|var\(--[a-z0-9-]+\)|--[a-z0-9-]+|\.[A-Za-z][\w-]*(?:__[\w-]+)?(?:\.[\w-]+)*(?::[a-z-]+)?)/g,
  (m) => `<code>${m}</code>`,
);

// ---- Specimen CSS ---------------------------------------------------------
// `.gl-stage` is the neutral surface every specimen sits on. `.gl-hovering`
// pins a dropdown's danger row into its hover appearance so the difference is
// visible in a screenshot instead of only under a live mouse; the two
// modifiers paint that row the way the rule asks (`--pink`) and the way it
// must not be painted (`--accent`).
export const SPEC_CSS = `
  <style>
    .gl code { font-family: var(--font-mono); font-size: .88em; color: var(--accent);
      background: color-mix(in srgb, var(--accent) 12%, transparent); border-radius: 6px; padding: 2px 6px; }
    .gl-stage { background: var(--surface); border-radius: var(--radius-lg);
      box-shadow: inset 0 0 0 1px var(--border); padding: 22px; }
    /* An open menu panel is absolutely positioned, so the stage reserves the
       room and the note underneath is pushed clear of it. */
    .gl-stage--menu { min-height: 262px; display: flex; flex-direction: column; align-items: flex-start; }
    .gl-stage--menu .gl-cursor { margin-top: auto; }
    .gl-hovering .ui-dropdown__item.is-danger { background: var(--surface); }
    .gl-hovering--accent .ui-dropdown__item.is-danger .ui-dropdown__label { color: var(--accent); }
    .gl-hovering--pink   .ui-dropdown__item.is-danger .ui-dropdown__label { color: var(--pink); }
    .gl-confirm { max-width: 380px; display: flex; flex-direction: column; gap: 14px; }
    .gl-confirm__title { font: 600 15px/1.35 Poppins; color: var(--strong); }
    .gl-confirm__acts { display: flex; gap: 10px; }
    /* Two steps guarding one click, stacked in the order the user meets them. */
    .gl-steps { display: flex; flex-direction: column; align-items: flex-start; gap: 13px; }
    .gl-steps__then { font: 500 11px/1 Poppins; letter-spacing: .06em;
      text-transform: uppercase; color: var(--muted); padding-left: 2px; }
    /* The toast timer bar only animates once wireToastStack() adds .is-running,
       so in a static specimen it would sit at full width. Pin it partway
       through instead — the same pinning trick as .gl-hovering above. */
    .gl-counting .ui-toast__timer { transform: scaleX(0.55); }
    .gl-cursor { display: inline-flex; align-items: center; gap: 7px; margin-top: 14px;
      font: 500 11px/1 Poppins; letter-spacing: .06em; text-transform: uppercase; color: var(--muted); }
    .gl-cursor::before { content: ""; width: 7px; height: 7px; border-radius: 50%;
      background: var(--muted); box-shadow: 0 0 0 4px color-mix(in srgb, var(--muted) 22%, transparent); }
  </style>`;

// ---- Live specimens -------------------------------------------------------
// Each returns a string of real component markup.

const MENU_ITEMS = [
  { label: 'Rename token', icon: 'edit' },
  { label: 'Duplicate', icon: 'copy' },
  '---',
  { label: 'Revoke access', icon: 'trash', danger: true },
];

const menu = (mod) => `
  <div class="gl-stage gl-stage--menu gl-hovering gl-hovering--${mod}">
    ${dropdown({ value: 'Token actions', variant: 'menu', ariaLabel: 'Token actions', items: MENU_ITEMS, open: true })}
    <div class="gl-cursor">Pointer resting on “Revoke access”</div>
  </div>`;

/** Danger menu row that turns `--pink` on hover. */
export const menuDo = () => menu('pink');
/** The same row repainted `--accent` on hover, which drops the danger cue. */
export const menuDont = () => menu('accent');

const confirmStep = (title, actions) => `
  <div class="gl-confirm">
    <div class="gl-confirm__title">${esc(title)}</div>
    <div class="gl-confirm__acts">${actions}</div>
  </div>`;

const wording = (title, actions) => `
  <div class="gl-stage">${confirmStep(title, actions)}</div>`;

const REVOKE_PROMPT = 'Revoke access for Research bot?';
const revokeActions = () =>
  button({ label: 'Keep access', variant: 'ghost' }) + button({ label: 'Revoke access', variant: 'danger' });
const revokeToast = () => toast({
  variant: 'danger',
  compact: true,
  title: 'Research bot lost access',
  action: 'Undo',
  timer: 8,
});

/** Buttons that name the consequence. */
export const wordingDo = () => wording(REVOKE_PROMPT, revokeActions());
/** Buttons that name nothing. */
export const wordingDont = () => wording(
  'Are you sure?',
  button({ label: 'Cancel', variant: 'ghost' }) + button({ label: 'OK', variant: 'danger' }),
);

/** The revoke has already happened; the toast names it and offers the way back. */
export const undoDo = () => `
  <div class="gl-stage gl-counting">${revokeToast()}</div>`;

/** The same revoke guarded twice: a dialog to get through, then an undo window. */
export const undoDont = () => `
  <div class="gl-stage gl-counting">
    <div class="gl-steps">
      ${confirmStep(REVOKE_PROMPT, revokeActions())}
      <div class="gl-steps__then">then</div>
      ${revokeToast()}
    </div>
  </div>`;

// ---- The three sub-rules --------------------------------------------------
// `except` is the boundary of the rule: the one place it stops applying.
// `kit` points at code in this repository that already applies the rule, so a
// reader can copy a working implementation instead of writing one. Each entry
// carries the file, the line, and the `pattern` that must be on that line.
// A rule with nothing to copy from yet simply carries no `kit`.
export const RULES = [
  {
    id: 'colour',
    imperative: 'Keep destructive controls quiet at rest, and turn them --pink on hover.',
    why: 'A destructive control painted in --accent loses that cue.',
    except: '--pink also marks an error the reader has already hit, not an action they are about to take.',
    doCaption: 'Hover turns the danger row --pink.',
    dontCaption: 'Hover repaints the row --accent.',
    doHtml: menuDo,
    dontHtml: menuDont,
    kit: [
      {
        ref: 'src/styles/button.css:68',
        pattern: '.ui-btn--danger:hover',
        note: 'The danger button hovers to --pink.',
      },
      {
        ref: 'src/styles/dropdown.css:111',
        pattern: '.ui-dropdown__item.is-danger:hover',
        note: 'The danger row turns --pink on hover.',
      },
      {
        ref: 'src/styles/nav.css:81',
        pattern: '.ui-nav__item.is-danger:hover',
        note: 'The sign-out row hovers to --pink.',
      },
    ],
  },
  {
    id: 'wording',
    imperative: 'Name what you destroy in the button label.',
    why: '“OK” describes nothing; “Revoke access” names the cost.',
    except: 'Cancel is right when nothing exists yet to keep, like a new form or upload.',
    doCaption: 'Each label makes sense alone.',
    dontCaption: '“Are you sure?” of what?',
    doHtml: wordingDo,
    dontHtml: wordingDont,
    kit: [
      {
        ref: 'stories/apps/Access.stories.js:26',
        pattern: "label: 'Revoke'",
        note: 'Labelled Revoke, not OK.',
      },
    ],
  },
  {
    id: 'undo',
    imperative: 'Confirm or undo, never both — reversibility decides which.',
    why: 'If the action can be undone, confirming only adds friction; if it cannot, undo is a promise ' +
      'you can’t keep.',
    except: 'Irreversible actions confirm and offer nothing to restore.',
    doCaption: 'Reversible: it happens, Undo counts down.',
    dontCaption: 'Confirmed first, then offered Undo anyway.',
    doHtml: undoDo,
    dontHtml: undoDont,
  },
];

// ---- Small shared atoms ---------------------------------------------------
export const doBadge = () => badge('Do', 'live');
export const dontBadge = () => badge('Don’t', 'danger');
