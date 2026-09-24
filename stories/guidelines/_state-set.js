import { loadGuideline, withSpecimens } from './_markdown.js';
const content = await loadGuideline('state-set.md', new URL('../../guidelines/state-set.md', import.meta.url));
export const TITLE = content.title;
export const BLURB = content.blurb;
// The shape of a rule and the gates that walk this page: docs/guidelines.md
import { button, callout, field, input, card } from '../../src/components/index.js';
import { busyRegion, skeletonTable } from '../../src/components/loading.js';





// `.gl-ring` pins what :focus-visible paints (src/styles/base.css), because a
// focus ring exists only under a live keyboard and cannot be screenshotted.
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

const stage = (html, mod = '') => `<div class="gl-stage ${mod}">${html}</div>`;

const ringed = (mod) => `
  <div class="gl-stage gl-ring ${mod}">
    <div class="gl-row">
      ${button({ label: 'Save changes', variant: 'primary' })}
      ${input({ value: 'acme.io/hooks', ariaLabel: 'Webhook URL' })}
    </div>
    <div class="gl-cursor">Both reached by Tab</div>
  </div>`;

export const focusDo = () => ringed('');
export const focusDont = () => ringed('gl-ring--adhoc');

const saving = (busy) => stage(button({ label: 'Saving…', variant: 'primary', busy }));

export const busyDo = () => saving(true);
export const busyDont = () => saving(false);

const WHY_INVALID = 'Must start with https://';
const urlControl = () => input({ value: 'acme.io/hooks', invalid: true });

export const errorDo = () => stage(field({
  label: 'Webhook URL', error: WHY_INVALID, control: urlControl(),
}));
export const errorDont = () => `
  <div class="gl-stage gl-stack">
    ${field({ label: 'Webhook URL', control: urlControl() })}
    ${callout({ variant: 'danger', icon: 'alert', body: WHY_INVALID })}
  </div>`;

// The pending pair. Same screen, same in-flight moment, twice: on the left the
// region draws the shape that is coming and says so through the live region;
// on the right the button is the only thing that knows, and everything around
// it looks finished. Neither picture can show the announcement — the do side
// carries a real role="status", so a screen reader on this page hears it.
const pendingScreen = (body) => card({ title: 'Payouts', body });

export const pendingDo = () => stage(pendingScreen(
  busyRegion({ label: 'Loading 3 payouts…', body: skeletonTable({ rows: 3, cols: 3 }) })
  + `<div class="gl-row" style="margin-top:var(--space-3)">${button({ label: 'Refresh', busy: true })}</div>`,
));

export const pendingDont = () => stage(pendingScreen(
  '<p style="color:var(--muted);margin:0">Nothing here.</p>'
  + `<div class="gl-row" style="margin-top:var(--space-3)">${button({ label: 'Refresh', busy: true })}</div>`,
));

export const RULES = withSpecimens(content.rules, [
{ id: 'focus-visible', doHtml: focusDo, dontHtml: focusDont, kit: [
      { ref: 'src/styles/base.css:140', pattern: '.ui-focusable:focus-visible,' },
      { ref: 'src/styles/base.css:146', pattern: 'box-shadow: var(--ring);' },
      { ref: 'src/tokens/tokens.css:237', pattern: '--ring: 0 0 0 var(--ring-gap-width) var(--ring-gap),' },
    ] },
{ id: 'busy', doHtml: busyDo, dontHtml: busyDont, kit: [
      { ref: 'src/components/index.js:37', pattern: 'busy ⇒ disabled' },
      { ref: 'src/styles/button.css:130', pattern: '.ui-btn[aria-busy="true"] {' },
      { ref: 'stories/contrast.test.js:239', pattern: 'inactive components and their whole subtree' },
    ] },
{ id: 'error-in-markup', doHtml: errorDo, dontHtml: errorDont, kit: [
      { ref: 'src/components/index.js:187', pattern: '`invalid` paints the control red AND says so in aria-invalid' },
      { ref: 'src/components/index.js:173', pattern: "'aria-describedby': msgId," },
      { ref: 'src/components/index.js:159', pattern: "markup rather than in the label's wording" },
    ] },
{ id: 'loading', doHtml: pendingDo, dontHtml: pendingDont, kit: [
      { ref: 'src/components/loading.js:54', pattern: 'export function busyRegion({' },
      { ref: 'src/components/loading.js:74', pattern: 'export function setBusy(root,' },
      { ref: 'src/components/index.js:252', pattern: 'role="status" aria-live="polite"' },
    ] }
]);
