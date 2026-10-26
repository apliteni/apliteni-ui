import { loadGuideline } from './_markdown.js';
const content = await loadGuideline('drawer.md', new URL('../../guidelines/drawer.md', import.meta.url));
export const TITLE = content.title;
export const BLURB = content.blurb;
export const RULES = content.rules;
// The shape of a rule: AGENTS.md#the-guidelines-collection

// A drawer is position: fixed, so each specimen is held inside a frame of its
// own. The panel is narrowed so a strip of scrim shows beside it: a drawer with
// no page behind it reads as a card.
export const SPEC_CSS = `
  <style>
    .gd-frame { position: relative; height: 460px; overflow: hidden; border-radius: var(--radius-md);
      background: var(--bg); box-shadow: inset 0 0 0 1px var(--border); }
    .gd-frame .ui-drawer { position: absolute; }
    .gd-frame .ui-drawer__panel { width: calc(100% - var(--space-12)); }
    .gd-frame .ui-drawer__body .ui-card { padding: var(--space-4); }
    .gd-frame .ui-drawer__body .ui-card + .ui-card { margin-top: var(--space-4); }
    /* The page half: the canvas carrying one surface, because a form and the words
       around it sit on a page's surface, not on the ground behind it. The pair then
       differs by container alone — this surface against the drawer's panel over the list.
       The minimum is a floor, not a fixed height: both halves start at one screen and the
       page half grows past it at 390.
       why: #492, decided by Artur on 2026-10-03 */
    .gd-page { height: auto; min-height: 460px; overflow: visible;
      padding: var(--space-4); display: flex; }
    .gd-page > .ui-card { flex: 1; display: flex; flex-direction: column; gap: var(--space-5); }
    /* The order the page guideline asks a page to open in: the way back, the title,
       then a short introduction. */
    .gd-page__head { display: flex; flex-direction: column; gap: var(--space-2); }
    /* The drawer title's own rank and face, so the pair differs by container alone and
       no specimen outranks the rule headings on this page. */
    .gd-page__title { margin: 0; color: var(--strong); font-family: var(--font-sans);
      font-size: calc(var(--text-base) + 0.5px); font-weight: 600; letter-spacing: 0.01em; }
    .gd-page__intro { margin: 0; color: var(--text); font-size: var(--text-sm); max-width: var(--prose-dense); }
    .gd-page__cols { display: grid; gap: var(--space-6); align-items: start;
      grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); }
    /* The group heading the drawer draws, in the same ink and rank. */
    .gd-group__title { margin: 0 0 var(--space-2); color: var(--strong); font-family: var(--font-sans);
      font-size: var(--text-sm); font-weight: var(--weight-semibold); }
    /* The drawer's own row grid: a value sits beside its label, not at the far edge,
       and one row height keeps both columns stepping together. */
    .gd-stack { display: grid; grid-template-columns: minmax(0, 2fr) minmax(0, 3fr);
      column-gap: var(--space-4); align-items: center;
      grid-auto-rows: minmax(calc(26px + var(--space-2)), auto); }
    .gd-stack > .ui-check { grid-column: 1 / -1; }
    .gd-unit { display: contents; }
    /* The phone tap floor, by the kit's own mechanism: below the phone step a
       coarse pointer gets a transparent layer outside each small control,
       clamped to the clear space its container declares. Packed for reading at
       34px rows, this form gave a finger 24px on a checkbox and 26 on a switch,
       and a tap 20px below the Ledger switch ran nothing. The rows open to
       --tap-min and the stack declares that much clearance, so the clamp caps
       every layer at --tap-min and each one fills its own row. The controls
       keep their drawn size; only the space between them grows.
       why: #492 review, guidelines/accessibility-floor.md (tap-zone, tap-spacing) */
    @media (max-width: 560px) and (pointer: coarse) {
      .gd-page .gd-stack { grid-auto-rows: minmax(var(--tap-min), auto);
        --tap-clear-x: var(--tap-min); --tap-clear-y: var(--tap-min); }
      /* Save is 33px tall with --space-5 above it and the card's padding below,
         so its layer grows 5.5px each way and the row opens nothing. */
      .gd-page__act { --tap-clear-y: var(--tap-gap); }
    }
    /* The ruled rows a page writes by hand, which is the fault the don't shows. */
    .gd-ruled__row { display: flex; justify-content: space-between; gap: var(--space-4);
      padding-block: var(--space-3); border-bottom: 1px solid var(--border); }
    .gd-ruled__row:last-child { border-bottom: 0; }
    .gd-ruled__row > :first-child { color: var(--strong); }
  </style>`;
