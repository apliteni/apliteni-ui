import { card, emptyState, button, input, segmented } from '../../src/components/index.js';
import { financeShell } from './_finance-nav.js';

export default {
  title: 'Apps/Empty states',
  parameters: { layout: 'fullscreen' },
};

// The same screen the finance portal draws, and drawn by the same call:
// financeShell() in _finance-nav.js is the portal's one composition, so these
// screens and the finance report cannot end up on different columns or with
// different trails.

// A filtered list that returned nothing — illustration + nudge, no action.
export const FilteredList = {
  render: () => financeShell({
    active: 'invoices',
    crumb: 'Invoices',
    title: 'Invoices',
    sub: 'Everything you have uploaded or received by email.',
    body: `
      <div class="ui-toolbar" style="margin-bottom:16px">
        ${input({ placeholder: 'Vendor' })}
        ${segmented({ ariaLabel: 'Status filter', options: ['Any', 'Verified', 'Pending'], active: 2 })}
        ${button({ label: 'Filter', variant: 'secondary' })}
      </div>
      ${card({ body: emptyState({
        art: 'invoices',
        title: 'No invoices match the current filters.',
        sub: 'Try widening the date range or clearing a filter.',
      }) })}
    `,
  }),
};

// A first-run page with no rows yet — illustration + guidance + a clear action.
export const FirstRun = {
  render: () => financeShell({
    active: 'prefs',
    crumb: 'People',
    title: 'People',
    sub: 'Contractors and staff, for cost attribution.',
    body: card({ body: emptyState({
      art: 'people',
      title: 'No people yet',
      sub: 'Contractors and staff you add show up here for attribution.',
      actions: button({ label: '+ Add person', variant: 'primary' }),
    }) }),
  }),
};
