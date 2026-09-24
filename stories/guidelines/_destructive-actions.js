import { loadGuideline, withSpecimens } from './_markdown.js';
const content = await loadGuideline('destructive-actions.md', new URL('../../guidelines/destructive-actions.md', import.meta.url));
export const TITLE = content.title;
export const BLURB = content.blurb;
// The shape of a rule and the gates that walk this page: docs/guidelines.md
import { toast } from '../../src/components/index.js';
import { dropdown } from '../../src/components/dropdown.js';
import { confirm } from '../../src/components/confirm.js';





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

export const RULES = withSpecimens(content.rules, [
{ id: 'colour', doHtml: menuDo, dontHtml: menuDont, kit: [
      { ref: 'src/styles/button.css:68', pattern: '.ui-btn--danger:hover' },
      { ref: 'src/styles/dropdown.css:200', pattern: '.ui-dropdown__item.is-danger:hover' },
      { ref: 'src/styles/nav.css:111', pattern: '.ui-nav__item.is-danger:hover' },
    ] },
{ id: 'wording', doHtml: wordingDo, dontHtml: wordingDont, kit: [
      {
        ref: 'stories/components/Confirm.stories.js:45',
        pattern: "confirmLabel: 'Delete workspace', cancelLabel: 'Keep it'",
      },
      { ref: 'stories/apps/Access.stories.js:38', pattern: "label: 'Revoke access'" },
    ] },
{ id: 'undo', doHtml: undoDo, dontHtml: undoDont, kit: [
      { ref: 'src/components/confirm.js:61', pattern: 'role="alertdialog"' },
      { ref: 'src/components/index.js:246', pattern: 'class="ui-toast__action"' },
      { ref: 'src/styles/callout.css:87', pattern: '.ui-toast__action { flex: none;' },
    ] }
]);
