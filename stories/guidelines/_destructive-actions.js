// The shape of a rule and the gates that walk this page: docs/guidelines.md
import { toast } from '../../src/components/index.js';
import { dropdown } from '../../src/components/dropdown.js';
import { confirm } from '../../src/components/confirm.js';

export const TITLE = 'Destructive actions';

export const BLURB = 'What a delete looks like, what its buttons say, and when undo lies.';

// `.gl-hovering` pins the dropdown's danger row into its hover appearance,
// because hover cannot be screenshotted.
export const SPEC_CSS = `
  <style>
    /* The panel joins the flow, so the stage is as tall as what it shows. */
    .gl-stage--menu { display: flex; flex-direction: column; align-items: flex-start; }
    .gl-stage--menu .ui-dropdown { display: flex; flex-direction: column; align-items: flex-start; }
    .gl-stage--menu .ui-dropdown__panel { position: static; transform: none; margin-top: var(--space-2); }
    .gl-hovering .ui-dropdown__item.is-danger { background: var(--surface); }
    .gl-hovering--accent .ui-dropdown__item.is-danger .ui-dropdown__label { color: var(--accent); }
    .gl-hovering--pink   .ui-dropdown__item.is-danger .ui-dropdown__label { color: var(--pink); }
  </style>`;

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

export const menuDo = () => menu('pink');
export const menuDont = () => menu('accent');

// `specimen: true` keeps the dialog open and inert — no aria-modal, no hook. A
// page of live confirms claims three modals own it and traps a keyboard reader.
const confirmSpec = (opts) => `
  <div class="gl-stage gl-stage--confirm">
    ${confirm({ ...opts, specimen: true })}
  </div>`;

export const wordingDo = () => confirmSpec({
  title: 'Revoke access for Research bot?',
  cancelLabel: 'Keep access',
  confirmLabel: 'Revoke access',
});
export const wordingDont = () => confirmSpec({
  title: 'Are you sure?',
  cancelLabel: 'Cancel',
  confirmLabel: 'OK',
});

export const undoDo = () => confirmSpec({
  title: 'Delete workspace “Acme”?',
  body: 'Its boards, tokens and history go with it.',
  cancelLabel: 'Keep workspace',
  confirmLabel: 'Delete workspace',
});
export const undoDont = () => `
  <div class="gl-stage">
    ${toast({
    variant: 'neutral', style: 'soft', title: 'Workspace “Acme” deleted',
    body: 'Its boards, tokens and history went with it.', action: 'Undo',
  })}
  </div>`;

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
      { ref: 'src/components/index.js:247', pattern: 'class="ui-toast__action"' },
      { ref: 'src/styles/callout.css:91', pattern: '.ui-toast__action { flex: none;' },
    ],
  },
];
