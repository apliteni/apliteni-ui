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
import { toast } from '../../src/components/index.js';
import { dropdown } from '../../src/components/dropdown.js';
import { confirm } from '../../src/components/confirm.js';

// ---- The rule -------------------------------------------------------------
export const TITLE = 'Destructive actions';

// ---- Specimen CSS ---------------------------------------------------------
// `.gl-hovering` pins a dropdown's danger row into its hover appearance so the
// difference is visible in a screenshot instead of only under a live mouse; the
// two modifiers paint that row the way the rule asks (`--pink`) and the way it
// must not be painted (`--accent`).
export const SPEC_CSS = `
  <style>
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
    /* The same containment the menu needs, for the same reason. A confirm is
       fixed to the viewport, so left alone its scrim would leave the cell and
       cover the whole page. In a specimen the panel is the subject rather than
       something laid over a page, so it joins the flow and the scrim goes with
       the fixed positioning it belonged to. */
    .gl-stage--confirm .ui-confirm { position: static; }
    .gl-stage--confirm .ui-confirm__scrim { display: none; }
    .gl-stage--confirm .ui-confirm__panel { position: static; translate: none; width: auto; }
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

// `specimen: true` renders the dialog open and inert as documentation: no
// data-confirm hook, no aria-modal. A page with three live confirms on it claims
// three modal dialogs own it, traps a keyboard reader in the first, and loses a
// specimen for good the first time someone answers one.
const confirmSpec = (opts) => `
  <div class="gl-stage gl-stage--confirm">
    ${confirm({ ...opts, specimen: true })}
  </div>`;

/** Buttons that name the consequence. */
export const wordingDo = () => confirmSpec({
  title: 'Revoke access for Research bot?',
  cancelLabel: 'Keep access',
  confirmLabel: 'Revoke access',
});
/** Buttons that name nothing. */
export const wordingDont = () => confirmSpec({
  title: 'Are you sure?',
  cancelLabel: 'Cancel',
  confirmLabel: 'OK',
});

/** An irreversible delete asks first, because there is nothing to restore. */
export const undoDo = () => confirmSpec({
  title: 'Delete workspace “Acme”?',
  body: 'Its boards, tokens and history go with it.',
  cancelLabel: 'Keep workspace',
  confirmLabel: 'Delete workspace',
});
/** The same delete offering a way back it does not have. */
export const undoDont = () => `
  <div class="gl-stage">
    ${toast({
    variant: 'neutral', style: 'soft', title: 'Workspace “Acme” deleted',
    body: 'Its boards, tokens and history went with it.', action: 'Undo',
  })}
  </div>`;

// ---- The three sub-rules --------------------------------------------------
// `except` is the boundary of the rule: the one place it stops applying.
// `kit` points at code in this repository that already applies the rule, so a
// reader can copy a working implementation instead of writing one. Each entry
// carries the file, the line, and the `pattern` that must be on that line.
// A rule with nothing to copy from yet simply carries no `kit`.
//
// `doHtml`/`dontHtml` are a rule's specimen pair, and are optional.
export const RULES = [
  {
    id: 'colour',
    imperative: 'Keep destructive controls quiet at rest, and turn them --pink on hover.',
    why: 'A destructive control that turns --accent on hover reads as an ordinary one.',
    except: '--pink also marks an error the reader has already hit, not an action they are about to take.',
    doCaption: 'Hover turns the danger row --pink.',
    dontCaption: 'Hover repaints the row --accent.',
    doHtml: menuDo,
    dontHtml: menuDont,
    kit: [
      { ref: 'src/styles/button.css:68', pattern: '.ui-btn--danger:hover' },
      { ref: 'src/styles/dropdown.css:111', pattern: '.ui-dropdown__item.is-danger:hover' },
      { ref: 'src/styles/nav.css:81', pattern: '.ui-nav__item.is-danger:hover' },
    ],
  },
  {
    id: 'wording',
    imperative: 'Name what each button does — the one that destroys, and the one that doesn’t.',
    why: '“OK” describes nothing; “Revoke access” names the cost.',
    except: 'Cancel is right when nothing exists yet to keep, like a new form or upload.',
    doCaption: 'Each label makes sense alone.',
    dontCaption: '“Are you sure?” of what?',
    doHtml: wordingDo,
    dontHtml: wordingDont,
    kit: [
      {
        ref: 'stories/components/Confirm.stories.js:45',
        pattern: "confirmLabel: 'Delete workspace', cancelLabel: 'Keep it'",
      },
      { ref: 'stories/apps/Access.stories.js:37', pattern: "label: 'Revoke access'" },
    ],
  },
  {
    id: 'undo',
    imperative: 'Confirm or undo, never both — reversibility decides which.',
    why: 'If the action can be undone, confirming only costs the reader a click; if it cannot, undo ' +
      'is a promise you can’t keep.',
    except: 'A reversible action still confirms when it fans out: one row is one click back, ' +
      'a whole selection is not.',
    doCaption: 'Nothing to restore, so it asks first.',
    dontCaption: 'Undo on a workspace already gone.',
    doHtml: undoDo,
    dontHtml: undoDont,
    kit: [
      { ref: 'src/components/confirm.js:62', pattern: 'role="alertdialog"' },
      { ref: 'src/components/index.js:227', pattern: 'class="ui-toast__action"' },
      { ref: 'src/styles/callout.css:75', pattern: '.ui-toast__action { flex: none;' },
    ],
  },
];
