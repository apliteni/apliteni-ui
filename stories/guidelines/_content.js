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
//
// `--gl-cell` is the page's one measure. The specimens run from 147px (the
// bare "Are you sure?" confirm) to 345px (the undo toast) of content, so a
// cell is the widest of those plus the stage's own padding, and a page is two
// cells and the gap between them. Sizing the page off the specimens is what
// keeps a cell close to what it holds; the guidelines pages used to be 1120px
// wide, which put every one of these specimens in a 526px cell. 345px is
// measured, not chosen — the kit has no measure/container token scale to take
// it from, which is the one literal on this page that wants a token.
export const SPEC_CSS = `
  <style>
    .gl { --gl-specimen: 345px;
          --gl-cell: calc(var(--gl-specimen) + var(--space-5) * 2);
          --gl-page: calc(var(--gl-cell) * 2 + var(--space-4)); }
    .gl code { font-family: var(--font-mono); font-size: .88em; color: var(--accent);
      background: color-mix(in srgb, var(--accent) 12%, transparent); border-radius: 6px; padding: 2px 6px; }
    .gl-stage { background: var(--surface); border-radius: var(--radius-lg);
      box-shadow: inset 0 0 0 1px var(--border); padding: var(--space-5); }
    /* An open menu panel is absolutely positioned, so it contributes no height
       and the stage had to hold itself open around it — a hand-measured
       min-height, 24px of which nothing ever covered, and a note pinned to the
       bottom edge to stay clear. In a specimen the panel is the subject, not an
       overlay on top of the page, so it joins the flow: the stage is then
       exactly as tall as what it shows, at every width, and there is no number
       to keep in sync when the menu gains a row. */
    .gl-stage--menu { display: flex; flex-direction: column; align-items: flex-start; }
    .gl-stage--menu .ui-dropdown { display: flex; flex-direction: column; align-items: flex-start; }
    .gl-stage--menu .ui-dropdown__panel { position: static; transform: none; margin-top: var(--space-2); }
    .gl-hovering .ui-dropdown__item.is-danger { background: var(--surface); }
    .gl-hovering--accent .ui-dropdown__item.is-danger .ui-dropdown__label { color: var(--accent); }
    .gl-hovering--pink   .ui-dropdown__item.is-danger .ui-dropdown__label { color: var(--pink); }
    .gl-confirm { display: flex; flex-direction: column; gap: var(--space-3); }
    .gl-confirm__title { font: 600 15px/1.35 Poppins; color: var(--strong); }
    .gl-confirm__acts { display: flex; flex-wrap: wrap; gap: var(--space-2); }
    /* Two steps guarding one click, stacked in the order the user meets them. */
    .gl-steps { display: flex; flex-direction: column; align-items: flex-start; gap: var(--space-3); }
    .gl-steps__then { font: 500 11px/1 Poppins; letter-spacing: .06em;
      text-transform: uppercase; color: var(--muted); padding-left: 2px; }
    /* The toast timer bar only animates once wireToastStack() adds .is-running,
       so in a static specimen it would sit at full width. Pin it partway
       through instead — the same pinning trick as .gl-hovering above. */
    .gl-counting .ui-toast__timer { transform: scaleX(0.55); }
    .gl-cursor { display: inline-flex; align-items: center; gap: 7px; margin-top: var(--space-3);
      font: 500 11px/1 Poppins; letter-spacing: .06em; text-transform: uppercase; color: var(--muted); }
    .gl-cursor::before { content: ""; width: 7px; height: 7px; border-radius: 50%; flex: none;
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
//
// The sentence about those lines belongs to the rule, not to each address:
// three entries used to read "The danger button hovers to --pink", "The danger
// row turns --pink on hover", "The sign-out row hovers to --pink" — one fact,
// three times, and the file names already said which component was which. So
// `kitNote` says it once for the whole group and the addresses stand alone.
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
    kitNote: 'Three components already hover to --pink.',
    kit: [
      { ref: 'src/styles/button.css:68', pattern: '.ui-btn--danger:hover' },
      { ref: 'src/styles/dropdown.css:111', pattern: '.ui-dropdown__item.is-danger:hover' },
      { ref: 'src/styles/nav.css:81', pattern: '.ui-nav__item.is-danger:hover' },
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
    kitNote: 'Labelled Revoke, not OK.',
    kit: [
      { ref: 'stories/apps/Access.stories.js:26', pattern: "label: 'Revoke'" },
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
