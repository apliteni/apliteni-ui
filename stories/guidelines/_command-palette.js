import { loadGuideline } from './_markdown.js';
const content = await loadGuideline('command-palette.md', new URL('../../guidelines/command-palette.md', import.meta.url));
export const TITLE = content.title;
export const BLURB = content.blurb;
export const RULES = content.rules;
// The shape of a rule: AGENTS.md#the-guidelines-collection

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
