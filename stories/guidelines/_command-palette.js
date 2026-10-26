import { loadGuideline } from './_markdown.js';
const content = await loadGuideline('command-palette.md', new URL('../../guidelines/command-palette.md', import.meta.url));
export const TITLE = content.title;
export const BLURB = content.blurb;
export const RULES = content.rules;
// The shape of a rule: AGENTS.md#the-guidelines-collection

/**
 * The keys the palette answers, and what each one does.
 *
 * DECLARED here and held against the React palette by
 * react/src/command-palette-guideline.test.tsx: a key the code compares against
 * and this list has never heard of fails the build, and so does a key this list
 * promises that nothing handles. The prose and the keyboard cannot drift.
 *
 * `owner` is the file that answers it — Escape and Tab belong to the dialog
 * stack every React overlay is on, which is why one Escape closes one overlay
 * and the confirm a row opened is the one it closes first.
 */
export const KEYS = [
  { key: 'k', does: 'Cmd+K opens it from anywhere; Ctrl+K is left to a text box the reader is typing in.', owner: 'react/src/AppShell.tsx' },
  { key: 'ArrowDown', does: 'Moves to the next row, and wraps round to the first.', owner: 'react/src/CommandPalette.tsx' },
  { key: 'ArrowUp', does: 'Moves to the previous row, and wraps round to the last.', owner: 'react/src/CommandPalette.tsx' },
  { key: 'Enter', does: 'Runs the active row. Cmd or Ctrl held opens a row that goes somewhere in a new tab.', owner: 'react/src/CommandPalette.tsx' },
  { key: 'Escape', does: 'Closes the top overlay — the confirm a row opened before the palette under it.', owner: 'react/src/dialog.ts' },
  { key: 'Tab', does: 'Stays inside the palette. There is one stop in it, so nothing moves.', owner: 'react/src/dialog.ts' },
];

// The specimens are dialogs, and a dialog is `position: fixed` — six of them
// over the page would be one picture with five behind it. The stage puts each
// panel back in the flow at the width the pair needs, and takes the scrim away:
// a scrim is a statement about the page, and there is no page here.
export const SPEC_CSS = `
  <style>
    .gc-stage .ui-cmdk { position: static; inset: auto; pointer-events: auto; }
    .gc-stage .ui-cmdk__scrim { display: none; }
    .gc-stage .ui-cmdk.is-open .ui-cmdk__panel {
      position: static; transform: none; opacity: 1;
      width: auto; max-height: none;
    }
    .gc-stage .ui-cmdk__list { max-height: none; }
  </style>`;
