import { loadGuideline, withSpecimens } from './_markdown.js';
const content = await loadGuideline('component-choice.md', new URL('../../guidelines/component-choice.md', import.meta.url));
export const TITLE = content.title;
export const BLURB = content.blurb;
// The shape of a rule: AGENTS.md#the-guidelines-collection
import { button, callout, card, segmented, successPanel, toast } from '../../src/components/index.js';
import { filterBar } from '../../src/components/filter-bar.js';
import { confirm } from '../../src/components/confirm.js';
import { dropdown } from '../../src/components/dropdown.js';
import { success } from '../../src/components/success.js';
import { tabs } from '../../src/components/tabs.js';
import { currencyItems } from '../_currencies.js';

const stage = (html, mod = '') => `<div class="gl-stage${mod ? ` ${mod}` : ''}">${html}</div>`;

const pairedActions = (cancelVariant) => stage(`<div style="display:flex;gap:var(--space-3)">
  ${button({ label: 'Cancel', variant: cancelVariant })}
  ${button({ label: 'Save', variant: 'primary' })}
</div>`);
export const pairedActionsDo = () => pairedActions('ghost');
export const pairedActionsDont = () => pairedActions('primary');

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

const SECTORS = ['Technology', 'Energy', 'Health care'].map((label) => ({ label, value: label }));
const SAVED_VIEWS = ['All rows', 'Unclassified', 'This month'];

// Three categories, three groups. --space-6 between them against the filter
// bar's own --space-2 inside it: three times the gap, so the filter bar wrapping
// on a phone still reads as one group wrapping, not as three loose controls.
// The rule claims no vertical order — filters sit above the views here because
// that is the order #517 settles.
// The views take the plain strip, as panelsDo above does. The spec reserves the
// underline appearance for a column switch over one dataset; under views that
// re-draw rows it paints a tab bar, which is the distinction the panels rule
// above this one draws.
export const categoryDo = () => stage(`<div style="display:grid;gap:var(--space-6);justify-items:start">
  <div style="display:flex;flex-wrap:wrap;align-items:center;gap:var(--space-6);width:100%">
    ${filterBar({ filters: [{ id: 'sector', label: 'Sector', value: 'Technology', items: SECTORS }] })}
    <span style="margin-left:auto">${button({ label: 'Export', size: 'sm' })}</span>
  </div>
  ${segmented({ options: ['Overview', 'Performance'], ariaLabel: 'Dataset view', name: 'gl-view' })}
</div>`);
// What #508 reported: the saved views and the control that adds a condition, one
// bar and one style, so nothing says which of them re-draws every row.
export const categoryDont = () => stage(`<div style="display:flex;flex-wrap:wrap;gap:var(--space-2)">
  ${[...SAVED_VIEWS, 'Filter'].map((label) => button({ label, size: 'sm' })).join('')}
</div>`);

export const scaleDo = () => stage(card({
  body: successPanel({ title: 'Feedback sent', sub: 'It goes straight to the strategy owner.' }),
}));
export const scaleDont = () => stage(card({
  body: success({ layout: 'hero', title: 'Feedback sent' }),
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
{ id: 'paired-actions', doHtml: pairedActionsDo, dontHtml: pairedActionsDont },
{ id: 'interrupt', doHtml: interruptDo, dontHtml: interruptDont },
{ id: 'transient', doHtml: transientDo, dontHtml: transientDont },
{ id: 'panels', doHtml: panelsDo, dontHtml: panelsDont },
{ id: 'one-category', doHtml: categoryDo, dontHtml: categoryDont },
{ id: 'scale', doHtml: scaleDo, dontHtml: scaleDont },
{ id: 'dropdown-search', doHtml: searchDo, dontHtml: searchDont }
]);
