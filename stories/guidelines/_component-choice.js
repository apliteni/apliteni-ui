import { loadGuideline, withSpecimens } from './_markdown.js';
const content = await loadGuideline('component-choice.md', new URL('../../guidelines/component-choice.md', import.meta.url));
export const TITLE = content.title;
export const BLURB = content.blurb;
// The shape of a rule and the gates that walk this page: docs/guidelines.md
import { callout, card, segmented, successPanel, toast } from '../../src/components/index.js';
import { confirm } from '../../src/components/confirm.js';
import { dropdown } from '../../src/components/dropdown.js';
import { success } from '../../src/components/success.js';
import { tabs } from '../../src/components/tabs.js';
import { currencyItems } from '../_currencies.js';





const stage = (html, mod = '') => `<div class="gl-stage${mod ? ` ${mod}` : ''}">${html}</div>`;

// `specimen: true` keeps the dialog open and inert — no aria-modal, no hook, so
// the page does not claim a modal owns it.
export const interruptDo = () => stage(confirm({
  title: 'Rotate this token?',
  body: 'The current token stops working the moment you do.',
  cancelLabel: 'Keep token',
  confirmLabel: 'Rotate token',
  specimen: true,
}), 'gl-stage--confirm');
export const interruptDont = () => stage(callout({
  variant: 'info',
  body: 'Rotate this token? The current one stops working the moment you do.',
}));

export const transientDo = () => stage(callout({
  variant: 'warn',
  icon: 'alert',
  body: 'This token is shown once. Copy it now — you won’t see it again.',
}));
// No `action` here on purpose: a warn toast carrying one paints --amber ink
// that misses AA in light (#131), and stories/contrast.test.js walks this page.
export const transientDont = () => stage(toast({
  variant: 'warn',
  style: 'soft',
  title: 'This token is shown once',
  body: 'Copy it now — you won’t see it again.',
}));

const FILTERS = ['Any', 'Verified', 'Pending'];

export const panelsDo = () => stage(segmented({
  ariaLabel: 'Status filter', options: FILTERS, active: 2,
}));
export const panelsDont = () => stage(tabs({
  name: 'gl-status', ariaLabel: 'Status filter', active: 2,
  items: FILTERS.map((label) => ({ label })),
}));

export const scaleDo = () => stage(card({
  body: successPanel({ title: 'Feedback sent', sub: 'It goes straight to the strategy owner.' }),
}));
export const scaleDont = () => stage(card({
  body: success({ layout: 'hero', backdrop: 'aurora', title: 'Feedback sent' }),
}));

// Both halves render open, so the stage keeps room below the trigger for the
// panel it drops.
const CURRENCY = { label: 'currency:', ariaLabel: 'Currency', items: currencyItems('EUR'), open: true };
const room = (html) => stage(`<div style="min-height:400px">${html}</div>`);
export const searchDo = () => room(dropdown({
  ...CURRENCY, search: { placeholder: 'Search currencies', query: 'dollar' },
}));
export const searchDont = () => room(dropdown({ ...CURRENCY, scroll: true }));

export const RULES = withSpecimens(content.rules, [
{ id: 'interrupt', doHtml: interruptDo, dontHtml: interruptDont, kit: [
      { ref: 'src/components/confirm.js:1', pattern: 'a question the page stops for' },
      { ref: 'src/components/index.js:220', pattern: 'export function callout(' },
      { ref: 'src/components/drawer.js:10', pattern: 'content over a scrim, focus-trapped, Esc-dismissable' },
    ] },
{ id: 'transient', doHtml: transientDo, dontHtml: transientDont, kit: [
      { ref: 'src/styles/callout.css:2', pattern: 'inline messages & transient notifications' },
      { ref: 'src/styles/callout.css:30', pattern: 'a floating, dismissible notification' },
      { ref: 'src/components/index.js:246', pattern: 'class="ui-toast__action"' },
    ] },
{ id: 'panels', doHtml: panelsDo, dontHtml: panelsDont, kit: [
      { ref: 'src/components/index.js:73', pattern: 'It is NOT a tablist: it controls no panel' },
      { ref: 'src/components/index.js:78', pattern: 'that one owns panels and earns the tab announcement' },
      { ref: 'src/components/nav.js:7', pattern: 'not role="tablist"' },
    ] },
{ id: 'scale', doHtml: scaleDo, dontHtml: scaleDont, kit: [
      { ref: 'src/components/index.js:263', pattern: 'Pick by how much of the screen the confirmation owns' },
      { ref: 'src/components/index.js:265', pattern: 'export function successPanel(' },
      { ref: 'src/components/success.js:55', pattern: 'The page-sized confirmation' },
    ] },
{ id: 'dropdown-search', doHtml: searchDo, dontHtml: searchDont, kit: [
      { ref: 'src/components/dropdown.js:97', pattern: 'export const dropdownMatch' },
      { ref: 'src/styles/dropdown.css:240', pattern: '.ui-dropdown__panel--search' },
      { ref: 'src/styles/dropdown.css:291', pattern: '.ui-dropdown__none {' },
    ] }
]);
