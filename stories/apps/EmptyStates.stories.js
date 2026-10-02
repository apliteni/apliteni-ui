import { card, emptyState, button, input, segmented } from '../../src/components/index.js';
import { financeShell } from './_finance-nav.js';

export default {
  title: 'Showcases/Empty states',
  id: 'apps-empty-states',
  parameters: { layout: 'fullscreen' },
};

// The same screen the finance portal draws, and drawn by the same call:
// financeShell() in _finance-nav.js is the portal's one composition, so these
// screens and the finance report cannot end up on different columns or with
// different trails.

// A filtered list with an action to clear the filters. The search box is the
// kit's standalone search field — the same part React's SearchField renders,
// so the two sides of the kit cannot drift apart. #517
export const FilteredList = {
  render: () => financeShell({
    active: 'invoices',
    crumb: 'Invoices',
    title: 'Invoices',
    sub: 'Everything you have uploaded or received by email.',
    body: `
      <div class="ui-toolbar" style="margin-bottom:16px">
        ${input({ type: 'search', icon: 'search', ariaLabel: 'Search invoices by vendor', placeholder: 'Vendor' })}
        ${segmented({ ariaLabel: 'Status filter', options: ['Any', 'Verified', 'Pending'], active: 2 })}
        ${button({ label: 'Filter', variant: 'secondary' })}
      </div>
      ${card({ body: emptyState({
        art: 'invoices',
        title: 'No invoices match the current filters.',
        sub: 'Clear the filters to see all invoices.',
        actions: button({ label: 'Clear filters', variant: 'primary' }),
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
